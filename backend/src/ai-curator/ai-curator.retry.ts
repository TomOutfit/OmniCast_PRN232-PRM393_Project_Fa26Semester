// ============================================================
// OmniCast - AI Curator Retry Helper
//
// Wraps an async operation with exponential backoff and jitter.
// Used for OpenAI API calls so a single network blip doesn't drop
// the curator back to the heuristic fallback (which destroys the
// "real GPT-4o" signal in the report).
//
// Design choices:
//   - Up to 3 attempts by default (1 initial + 2 retries).
//   - Exponential backoff: 500ms, 1.5s, 4.5s (× 3^attempt).
//   - +20% jitter to avoid thundering herd on shared rate limits.
//   - Only retries on transient errors: network failures, 5xx,
//     and 429 rate-limit. 4xx (except 429) is treated as terminal
//     — retrying a malformed request will just fail again.
//   - Logs each retry at `console.warn` level so production ops
//     can see the curator flapping in Vercel logs.
// ============================================================

/**
 * The subset of OpenAI SDK error shapes we care about. The actual
 * SDK exports `OpenAIError`, `APIError`, etc., but importing them
 * just for `instanceof` checks is overkill — duck-typing on `status`
 * is enough.
 */
export interface RetryableError extends Error {
  status?: number;
  code?: string;
  headers?: Record<string, string | string[] | undefined>;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 10_000;
const JITTER_RATIO = 0.2;

export interface RetryOptions {
  /** Total attempts (including the first one). Default 3. */
  maxAttempts?: number;
  /** Initial backoff in ms; subsequent attempts use baseDelay × 3^(n-1). */
  baseDelayMs?: number;
  /** Hard cap on per-attempt delay. Default 10 000 ms. */
  maxDelayMs?: number;
  /** Override which errors are retryable. */
  isRetryable?: (err: unknown) => boolean;
  /** Override the on-retry hook (defaults to console.warn). */
  onRetry?: (info: { attempt: number; delayMs: number; err: unknown }) => void;
  /** Label used in log lines so Vercel logs are searchable. */
  label?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableByDefault(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as RetryableError;

  // 429 — rate limited (always retry)
  if (e.status === 429) return true;
  // 408 — request timeout
  if (e.status === 408) return true;
  // 5xx — server side (transient)
  if (typeof e.status === 'number' && e.status >= 500 && e.status < 600) {
    return true;
  }
  // Network-level errors (no `status`)
  if (e.code && /^(ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED)$/.test(e.code)) {
    return true;
  }
  // Common Node.js fetch failure modes
  if (e.message && /(fetch failed|network error|socket hang up)/i.test(e.message)) {
    return true;
  }
  return false;
}

function computeBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  // attempt is 1-indexed: attempt 1 (first retry) = baseDelay
  const exp = baseDelayMs * Math.pow(3, attempt - 1);
  const capped = Math.min(exp, maxDelayMs);
  // Add ±20% jitter
  const jitter = capped * JITTER_RATIO * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(capped + jitter));
}

/**
 * Run `fn` with retry-on-transient-error semantics.
 *
 *   const text = await withRetry(
 *     () => this.openai.chat.completions.create({...}),
 *     { label: 'curator.openai' },
 *   );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    isRetryable = isRetryableByDefault,
    onRetry,
    label = 'withRetry',
  } = opts;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= maxAttempts) break;
      if (!isRetryable(err)) break;

      const delayMs = computeBackoff(attempt, baseDelayMs, maxDelayMs);
      const logLine = `[${label}] attempt ${attempt}/${maxAttempts} failed (${
        (err as RetryableError)?.status ?? (err as Error)?.message ?? 'unknown'
      }); retrying in ${delayMs}ms`;

      if (onRetry) {
        onRetry({ attempt, delayMs, err });
      } else {
        console.warn(logLine);
      }
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

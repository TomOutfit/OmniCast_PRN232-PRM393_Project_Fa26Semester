// ============================================================
// OmniCast - Safe Logger (frontend)
// ============================================================
//
// Thin wrapper around `console.error` / `console.warn` that scrubs
// any value before it reaches the console. Mirrors the spirit of
// `backend/src/common/utils/logger.service.ts` so the contract
// across the stack is "anything we log is safe to copy-paste into
// a bug report or a Slack channel".
//
// When Sentry / a telemetry sink gets added, swap the `console.*`
// calls inside `write()` for the Sentry client; the call sites
// don't have to change.

import { redactSecrets, safeReplacer } from './redact';

/**
 * Coerce an unknown value into something safe to feed to
 * `console.*`. Strings are redacted in place. Errors are
 * serialised (name + redacted message + redacted stack) without
 * exposing the original `Error` toString format. Plain objects
 * go through JSON.stringify with a circular-safe replacer, then
 * the whole JSON blob is redacted — that catches any deeply
 * nested `Authorization` header that an axios error drags along.
 */
export function toSafeLogValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactSecrets(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (value instanceof Error) {
    return {
      __type: 'Error',
      name: value.name,
      message: redactSecrets(value.message),
      stack: redactSecrets(value.stack ?? ''),
    };
  }

  if (typeof value === 'object') {
    try {
      // Wrap in a WeakSet-guarded stringify to avoid
      // "Converting circular structure to JSON" blowing up
      // when the input is an AxiosError (which keeps a
      // back-reference to the request that produced it).
      const seen = new WeakSet<object>();
      const circularSafe = (k: string, v: unknown) => {
        if (typeof v === 'function') return undefined;
        if (typeof v === 'bigint') return v.toString();
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[Circular]';
          seen.add(v);
        }
        return safeReplacer(k, v);
      };
      return redactSecrets(JSON.stringify(value, circularSafe));
    } catch {
      return '<unserialisable object>';
    }
  }

  return String(value);
}

/**
 * Replace `console.error(prefix, value, ...rest)` with
 * `logError(prefix, value, ...rest)`. Every argument is run
 * through `toSafeLogValue` before being printed.
 */
export function logError(prefix: string, value: unknown, ...rest: unknown[]): void {
  // eslint-disable-next-line no-console
  console.error(prefix, toSafeLogValue(value), ...rest.map(toSafeLogValue));
}

/** Same as `logError` but for `console.warn`. */
export function logWarn(prefix: string, value: unknown, ...rest: unknown[]): void {
  // eslint-disable-next-line no-console
  console.warn(prefix, toSafeLogValue(value), ...rest.map(toSafeLogValue));
}

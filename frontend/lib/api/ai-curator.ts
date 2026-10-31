// ============================================================
// OmniCast - AI Curator API Client
// ============================================================

import { apiClient } from '../api';
import type { AiCuratorReport } from '@/types';

/** Period filter for `fetchStats` / `useAiCuratorStats`. */
export type AiCuratorStatsPeriod = 'day' | 'week' | 'month';

/**
 * Aggregate stats payload returned by `GET /ai-curator/stats`.
 *
 * Shape mirrors the backend's AiCuratorStatsDto. All fields are
 * optional so older backends (without the donut or trend data)
 * still satisfy the type and the dashboard can degrade to empty
 * states gracefully.
 */
export interface AiCuratorStats {
  /** Total reports written within the selected period. */
  totalReports?: number;
  /** Average engagement (0–100) across persisted reports. */
  avgEngagement?: number;
  /** Average end-to-end pipeline duration in milliseconds. */
  avgProcessingTimeMs?: number;
  /** Server cache hit rate for the period (0–1). */
  cacheHitRate?: number;
  /** Counts by `broadcastSuitability` (used by the donut chart). */
  broadcastSuitability?: {
    PRIME_TIME?: number | { count: number; percentage: number };
    STANDARD?: number | { count: number; percentage: number };
    RESTRICTED?: number | { count: number; percentage: number };
  };
  /** Age rating distribution. */
  ageRating?: Record<string, { count: number; percentage: number }>;
  /** AI model version stats. */
  aiModelVersion?: {
    counts?: Record<string, number>;
    cacheHitRate?: number;
  };
  /** Last 7 days report counts, oldest first (used by bar chart). */
  last7Days?: Array<{
    date: string; // YYYY-MM-DD
    count: number;
    avgEngagement?: number;
  }>;
  /** Most-flagged compliance terms in the period. */
  topFlaggedContent?: Array<{
    label: string;
    count: number;
  }>;
  /** Programs marked applied count. */
  programsMarkedApplied?: number;
  /** Total tokens used count. */
  totalTokensUsed?: number;
  /** Selected period echoed back from the server (sanity check). */
  period?: AiCuratorStatsPeriod;
}

/** Preview/ad-hoc analyze payload — matches `AnalyzeContentPreviewDto`. */
export interface AnalyzeRequest {
  title: string;
  description?: string;
  category?: string;
  language?: string;
  scheduledAt?: string;
  tags?: string[];
  /** Program duration in seconds (used for pacing / slot analysis). */
  duration?: number;
  channelName?: string;
}

/** Apply-curation payload — matches `ApplyCurationDto`. */
export interface ApplyCurationRequest {
  scheduledAt?: string;
  status?: string;
  description?: string;
  markApplied?: boolean;
}

/** Persisted history row — full `AiCuratorReport` with DB metadata. */
export interface AiCuratorHistoryItem extends AiCuratorReport {
  id: string;
  programId: string;
  createdBy: string | null;
  createdAt: string;
  tokenUsed: number | null;
  /**
   * True when this row was returned from the server's cache rather
   * than a fresh pipeline run. Always `false` (or undefined) for
   * persisted rows; the field is only set when the row came from a
   * `forceRefresh: false` call.
   */
  cached?: boolean;
}

/**
 * Mode 2 — Preview/ad-hoc analysis. The server NEVER persists this
 * report — we just get a transient `AiCuratorReport` back.
 */
export async function analyzeContent(
  payload: AnalyzeRequest,
): Promise<AiCuratorReport> {
  const { data } = await apiClient.post('/ai-curator/analyze', payload);
  return data;
}

// ---------------------------------------------------------------
// Streaming preview (Mode 2b — Server-Sent Events)
//
// The backend exposes a streaming variant of the preview endpoint
// that returns SSE chunks while OpenAI generates the report:
//
//   event: meta     → { type: 'started', promptVersion, model, startedAt }
//   event: delta    → { text: '...' }            (repeated)
//   event: complete → { type: 'complete', report, processingTimeMs, confidence, openaiRetries? }
//   event: error    → { type, message, retryable, partialText? }
//
// `analyzeContentStream` is a low-level helper that POSTs to the
// streaming endpoint and yields the typed events as they arrive.
// The React hook in `lib/hooks/useAiCurator.ts` wraps this and
// exposes the accumulating progress to the UI.
//
// We use `fetch()` (not the axios `apiClient`) because:
//   - `EventSource` is GET-only; this endpoint takes a body
//   - We need a `ReadableStream` for incremental parsing
//   - The 401-refresh interceptor is awkward to retrofit onto SSE
//     streams (we'd have to re-issue the request mid-stream)
// ---------------------------------------------------------------

export interface StreamStartedMeta {
  type: 'started';
  promptVersion: string;
  model: string;
  startedAt: string;
}

export interface StreamCompleteEvent {
  type: 'complete';
  report: AiCuratorReport & { preview?: true };
  processingTimeMs: number;
  confidence: number;
  openaiRetries?: number;
}

export interface StreamErrorEvent {
  type:
    | 'openai-connection-failed'
    | 'openai-stream-failed'
    | 'schema-validation-failed';
  message: string;
  retryable: boolean;
  partialText?: string;
}

export type StreamEvent =
  | { event: 'meta'; data: StreamStartedMeta }
  | { event: 'delta'; data: { text: string } }
  | { event: 'complete'; data: StreamCompleteEvent }
  | { event: 'error'; data: StreamErrorEvent };

/**
 * Internal: parse a single SSE frame (one or more lines between two
 * blank lines) into a typed `StreamEvent`, or `null` if the frame
 * is a comment / heartbeat that carries no event.
 *
 * Exported for unit-testability. The hook calls `analyzeContentStream`
 * which assembles the byte stream into frames and dispatches each one
 * through this parser.
 */
export function parseSseFrame(frame: string): StreamEvent | null {
  if (!frame) return null;
  let event: string | null = null;
  const dataLines: string[] = [];

  for (const rawLine of frame.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line || line.startsWith(':')) continue; // heartbeat / comment
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const field = line.slice(0, colon);
    let value = line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
  }

  if (!event) return null;
  const dataStr = dataLines.join('\n');
  if (!dataStr) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(dataStr);
  } catch {
    return null;
  }

  if (event === 'meta') return { event: 'meta', data: parsed as StreamStartedMeta };
  if (event === 'delta') return { event: 'delta', data: parsed as { text: string } };
  if (event === 'complete') return { event: 'complete', data: parsed as StreamCompleteEvent };
  if (event === 'error') return { event: 'error', data: parsed as StreamErrorEvent };
  return null;
}

/**
 * Consume the streaming preview endpoint and yield each typed event
 * as it arrives. The generator completes naturally after the
 * terminal `complete` or `error` event is emitted.
 *
 * The caller is responsible for surfacing the `AccessToken` to the
 * server (we read it from `localStorage` for parity with the
 * `apiClient` interceptor). The retry-on-401 dance used by the
 * axios interceptor is not applied here — if the token expires
 * mid-stream the backend will close the connection with a 401
 * SSE comment, which the caller should treat as a normal
 * `error` event and prompt the user to re-authenticate.
 */
export async function* analyzeContentStream(
  payload: AnalyzeRequest,
  options: { token?: string | null; signal?: AbortSignal } = {},
): AsyncGenerator<StreamEvent, void, void> {
  const baseUrl = apiClient.defaults.baseURL ?? '/api/v1';
  const url = `${baseUrl}/ai-curator/analyze-stream`;
  const token =
    options.token ??
    (typeof window !== 'undefined'
      ? localStorage.getItem('accessToken')
      : null);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    // Try to surface the server's error message; fall back to status.
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.text();
      if (body) {
        try {
          const parsed = JSON.parse(body);
          message =
            parsed?.message ?? parsed?.error?.message ?? body.slice(0, 200);
        } catch {
          message = body.slice(0, 200);
        }
      }
    } catch {
      // ignore
    }
    yield {
      event: 'error',
      data: {
        type: 'openai-connection-failed',
        message,
        retryable: response.status >= 500 || response.status === 429,
      },
    };
    return;
  }

  if (!response.body) {
    yield {
      event: 'error',
      data: {
        type: 'openai-connection-failed',
        message: 'Response had no body (SSE unsupported by runtime)',
        retryable: false,
      },
    };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line (\n\n). Split
      // on that boundary, keep the partial tail in `buffer`.
      let sepIndex: number;
      // eslint-disable-next-line no-cond-assign
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        const evt = parseSseFrame(frame);
        if (evt) yield evt;
      }
    }

    // Flush any trailing frame that didn't end with \n\n.
    if (buffer.trim()) {
      const evt = parseSseFrame(buffer);
      if (evt) yield evt;
    }
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      // Caller cancelled; surface as a normal error so the UI can
      // distinguish cancellation from a real failure.
      yield {
        event: 'error',
        data: {
          type: 'openai-stream-failed',
          message: 'Stream was cancelled',
          retryable: false,
        },
      };
      return;
    }
    yield {
      event: 'error',
      data: {
        type: 'openai-stream-failed',
        message: (err as Error)?.message ?? 'Stream read failed',
        retryable: false,
      },
    };
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore — already released
    }
  }
}

/**
 * Mode 1 — Curate an EXISTING program. The server persists the report.
 */
export async function curateExistingProgram(payload: {
  programId: string;
  forceRefresh?: boolean;
}): Promise<AiCuratorHistoryItem> {
  const { data } = await apiClient.post('/ai-curator/curate', payload);
  return data;
}

/**
 * Apply an AI suggestion (time-slot / status / description) to an
 * existing program.
 */
export async function applyCuration(
  programId: string,
  payload: ApplyCurationRequest,
): Promise<{
  programId: string;
  appliedFields: string[];
  updatedAt: string;
  channel: { id: string; name: string };
}> {
  const { data } = await apiClient.post(
    `/ai-curator/apply/${programId}`,
    payload,
  );
  return data;
}

/**
 * History of the last 10 reports for a program.
 */
export async function fetchCurationHistory(
  programId: string,
): Promise<AiCuratorHistoryItem[]> {
  const { data } = await apiClient.get(`/ai-curator/history/${programId}`);
  // Backend may wrap in { data: [...] } or return [...] directly.
  return Array.isArray(data) ? data : (data?.data ?? []);
}

/**
 * Aggregate stats for the Curator dashboard.
 *
 * GET /ai-curator/stats?period=<day|week|month>
 *
 * The endpoint is restricted to STAFF/ADMIN — non-curator tokens
 * receive a 403 from the backend. The hook layer adds an
 * `enabled` guard so the call isn't issued when the user lacks
 * the `aiCurator.run` capability.
 */
export async function fetchStats(
  period: AiCuratorStatsPeriod,
): Promise<AiCuratorStats> {
  const { data } = await apiClient.get('/ai-curator/stats', {
    params: { period },
  });
  // Unwrap the standard ApiResponse envelope when present.
  return (data && typeof data === 'object' && 'data' in data
    ? (data as { data: AiCuratorStats }).data
    : data) as AiCuratorStats;
}
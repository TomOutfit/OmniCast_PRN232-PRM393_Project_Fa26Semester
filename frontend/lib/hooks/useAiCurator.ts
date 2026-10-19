// ============================================================
// OmniCast - AI Curator React Query Hooks
// ============================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  analyzeContent,
  analyzeContentStream,
  applyCuration,
  curateExistingProgram,
  fetchCurationHistory,
  type AnalyzeRequest,
  type ApplyCurationRequest,
  type AiCuratorHistoryItem,
  type StreamErrorEvent,
  type StreamEvent,
  type StreamStartedMeta,
} from '@/lib/api/ai-curator';
import type { AiCuratorReport, LiveEvent } from '@/types';

// ---------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------

export const aiCuratorKeys = {
  all: ['ai-curator'] as const,
  reports: () => [...aiCuratorKeys.all, 'reports'] as const,
  /** Per-program latest report (preview OR persisted) */
  latest: (programId: string) =>
    [...aiCuratorKeys.reports(), programId, 'latest'] as const,
  /** Per-program history of persisted reports */
  history: (programId: string) =>
    [...aiCuratorKeys.reports(), programId, 'history'] as const,
};

// ---------------------------------------------------------------
// useAnalyzeContent — preview / ad-hoc analysis (no DB write)
// ---------------------------------------------------------------

export function useAnalyzeContent(
  options?: Omit<
    UseMutationOptions<AiCuratorReport, Error, AnalyzeRequest>,
    'mutationFn'
  >,
) {
  return useMutation<AiCuratorReport, Error, AnalyzeRequest>({
    mutationFn: analyzeContent,
    ...options,
  });
}

// ---------------------------------------------------------------
// useCurateProgram — analyze + persist a report for an EXISTING program
// ---------------------------------------------------------------

export function useCurateProgram(
  options?: Omit<
    UseMutationOptions<
      AiCuratorHistoryItem,
      Error,
      { programId: string; forceRefresh?: boolean },
      { previousHistory?: AiCuratorHistoryItem[] }
    >,
    'mutationFn'
  >,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: curateExistingProgram,
    // Optimistic-cache bust: when a curator re-runs the model we want
    // the latest cache slot to reflect the new run immediately.
    onSuccess: (data, vars, ctx) => {
      qc.setQueryData(aiCuratorKeys.latest(vars.programId), data);
      qc.invalidateQueries({
        queryKey: aiCuratorKeys.history(vars.programId),
      });
    },
    ...options,
  });
}

// ---------------------------------------------------------------
// useCurationHistory — last 10 reports for a program
// ---------------------------------------------------------------

export function useCurationHistory(
  programId: string | undefined,
  options?: Omit<
    UseQueryOptions<AiCuratorHistoryItem[]>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<AiCuratorHistoryItem[]>({
    queryKey: aiCuratorKeys.history(programId ?? ''),
    queryFn: () => fetchCurationHistory(programId as string),
    enabled: !!programId,
    staleTime: 60 * 1000,
    ...options,
  });
}

// ---------------------------------------------------------------
// useApplyCuration — push AI suggestions back to a program
// ---------------------------------------------------------------

export function useApplyCuration(
  options?: Omit<
    UseMutationOptions<
      Awaited<ReturnType<typeof applyCuration>>,
      Error,
      { programId: string; payload: ApplyCurationRequest },
      { previousProgram?: LiveEvent }
    >,
    'mutationFn'
  >,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, payload }) =>
      applyCuration(programId, payload),
    // Invalidate program lists & detail so the UI shows the updated
    // scheduledAt / status immediately.
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['programs', 'detail', vars.programId] });
      qc.invalidateQueries({ queryKey: ['programs', 'live', 'list'] });
      qc.invalidateQueries({ queryKey: aiCuratorKeys.history(vars.programId) });
    },
    ...options,
  });
}

// ---------------------------------------------------------------
// useCachedCuratorReport — read the latest report from cache
// ---------------------------------------------------------------

export function useCachedCuratorReport(programId: string | undefined) {
  const qc = useQueryClient();
  if (!programId) return undefined;
  return qc.getQueryData<AiCuratorHistoryItem>(
    aiCuratorKeys.latest(programId),
  );
}

/**
 * Imperatively write a report into the React Query cache. Useful for
 * optimistic UI flows that ran a preview analysis and want the
 * StudioCurator page to remember it across navigations.
 */
export function useCacheCuratorReport() {
  const qc = useQueryClient();
  return (programId: string, report: AiCuratorReport) => {
    qc.setQueryData(aiCuratorKeys.latest(programId), report);
  };
}

// ---------------------------------------------------------------
// useAnalyzeContentStream — progressive preview via SSE
//
// Pairs with the backend's `POST /ai-curator/analyze-stream`
// endpoint. The Web Studio can use this to render a "thinking…"
// indicator + live-accumulating raw JSON while OpenAI streams
// tokens, then surface the final `AiCuratorReport` once the
// `complete` event arrives.
//
// Status machine:
//   idle → connecting → streaming → (complete | error) → idle
//
// The accumulated `delta.text` is exposed via `progressText` for
// debugging / "what's the model thinking right now" UIs. Most
// production code paths should use `report` (filled only on
// `complete`) instead of trying to parse `progressText`.
// ---------------------------------------------------------------

export type StreamStatus =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface UseAnalyzeContentStreamResult {
  /** Current high-level status. */
  status: StreamStatus;
  /** True while a stream is open (status === 'connecting' | 'streaming'). */
  isStreaming: boolean;
  /** True only after a `complete` event has resolved with a report. */
  isComplete: boolean;
  /** True if the last attempt ended in a `complete` or `error`. */
  isSettled: boolean;
  /**
   * Concatenated raw model output (JSON string), updated as each
   * `delta` event arrives. Useful for a "live JSON" debug panel.
   * Empty when no stream is active.
   */
  progressText: string;
  /**
   * Resolved `AiCuratorReport` from the terminal `complete` event.
   * Cleared by `reset()`.
   */
  report: (AiCuratorReport & { preview?: true }) | null;
  /** Final confidence score (0-100) reported by the server. */
  confidence: number | null;
  /** Wall-clock time the server took end-to-end (ms). */
  processingTimeMs: number | null;
  /** OpenAI retry count reported by the server (1 = no retries). */
  openaiRetries: number | null;
  /** First `meta` event we received — pin it for the audit row. */
  meta: StreamStartedMeta | null;
  /** Terminal `error` event, if any. */
  error: StreamErrorEvent | null;
  /** Fired when the caller has resolved a brand-new stream. */
  start: (payload: AnalyzeRequest) => void;
  /** Aborts the in-flight stream (if any) and clears state. */
  cancel: () => void;
  /** Clears terminal state without aborting an in-flight stream. */
  reset: () => void;
}

export function useAnalyzeContentStream(): UseAnalyzeContentStreamResult {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [progressText, setProgressText] = useState('');
  const [report, setReport] =
    useState<(AiCuratorReport & { preview?: true }) | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);
  const [openaiRetries, setOpenaiRetries] = useState<number | null>(null);
  const [meta, setMeta] = useState<StreamStartedMeta | null>(null);
  const [error, setError] = useState<StreamErrorEvent | null>(null);

  // We keep the abort controller and the most-recently-started stream
  // generation in refs so that `start()` can cancel a previous run.
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setProgressText('');
    setReport(null);
    setConfidence(null);
    setProcessingTimeMs(null);
    setOpenaiRetries(null);
    setMeta(null);
    setError(null);
    setStatus('idle');
  }, []);

  // Unmount-time cleanup: if the user navigates away mid-stream we
  // must release the connection or the server keeps streaming.
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  const start = useCallback((payload: AnalyzeRequest) => {
    // Cancel any in-flight stream before starting a new one.
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    setStatus('connecting');
    setProgressText('');
    setReport(null);
    setConfidence(null);
    setProcessingTimeMs(null);
    setOpenaiRetries(null);
    setMeta(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        for await (const evt of analyzeContentStream(payload, {
          signal: controller.signal,
        })) {
          // If a new stream started or we were aborted externally,
          // stop consuming this generator.
          if (abortRef.current !== controller) return;

          switch (evt.event) {
            case 'meta':
              setMeta(evt.data);
              setStatus('streaming');
              break;
            case 'delta':
              setProgressText((prev) => prev + evt.data.text);
              break;
            case 'complete': {
              setReport(evt.data.report);
              setConfidence(evt.data.confidence);
              setProcessingTimeMs(evt.data.processingTimeMs);
              setOpenaiRetries(evt.data.openaiRetries ?? null);
              setStatus('complete');
              break;
            }
            case 'error':
              setError(evt.data);
              setStatus(
                evt.data.type === 'openai-connection-failed' &&
                  (controller.signal as AbortSignal).aborted
                  ? 'cancelled'
                  : 'error',
              );
              break;
            default: {
              // Exhaustiveness check: every StreamEvent variant
              // must be handled. The cast is safe because the
              // variant above is unreachable but TS will warn.
              const _exhaustive: never = evt;
              void _exhaustive;
            }
          }
        }
      } catch (err) {
        // analyzeContentStream yields `error` events instead of
        // throwing, but defensively catch anything that escapes
        // (e.g. fetch rejects on a network failure before the
        // first byte).
        setError({
          type: 'openai-connection-failed',
          message: (err as Error)?.message ?? 'Stream failed unexpectedly',
          retryable: true,
        });
        setStatus('error');
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    })();
  }, []);

  return {
    status,
    isStreaming: status === 'connecting' || status === 'streaming',
    isComplete: status === 'complete',
    isSettled: status === 'complete' || status === 'error' || status === 'cancelled',
    progressText,
    report,
    confidence,
    processingTimeMs,
    openaiRetries,
    meta,
    error,
    start,
    cancel,
    reset,
  };
}
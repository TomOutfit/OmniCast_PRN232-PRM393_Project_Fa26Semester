// ============================================================
// OmniCast - AI Curator React Query Hooks
// ============================================================

'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  analyzeContent,
  applyCuration,
  curateExistingProgram,
  fetchCurationHistory,
  type AnalyzeRequest,
  type ApplyCurationRequest,
  type AiCuratorHistoryItem,
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
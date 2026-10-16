// ============================================================
// OmniCast - AI Curator Stats React Query Hook
// ============================================================
//
// Aggregate stats for the Curator dashboard (4 KPI cards, donut,
// bar chart, top-flagged table). Lives in its own file so we can
// colocate tests for the hook without touching `useAiCurator.ts`
// (which is reserved for per-program flows).
//
// Cache strategy: 5-minute staleTime matches the dashboard's
// refresh cadence — curators don't need sub-minute freshness for
// aggregate counters and the backend already caches these queries.
// ============================================================

'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import {
  fetchStats,
  type AiCuratorStats,
  type AiCuratorStatsPeriod,
} from '@/lib/api/ai-curator';
import { aiCuratorKeys } from '@/lib/hooks/useAiCurator';

export type UseAiCuratorStatsOptions = Omit<
  UseQueryOptions<AiCuratorStats>,
  'queryKey' | 'queryFn' | 'enabled'
> & {
  /** Disable the query until the curator is allowed to view stats. */
  enabled?: boolean;
};

/**
 * Fetch aggregate AI Curator stats for the given period.
 *
 * The query key is registered under `aiCuratorKeys.all` so a
 * `invalidateQueries({ queryKey: aiCuratorKeys.all })` from any
 * other curator flow (e.g. after a fresh report is persisted)
 * also refetches the dashboard counters.
 */
export function useAiCuratorStats(
  period: AiCuratorStatsPeriod,
  options: UseAiCuratorStatsOptions = {},
) {
  const { enabled = true, ...rest } = options;

  return useQuery<AiCuratorStats>({
    queryKey: [...aiCuratorKeys.all, 'stats', period] as const,
    queryFn: () => fetchStats(period),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...rest,
  });
}
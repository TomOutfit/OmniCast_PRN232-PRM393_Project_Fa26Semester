// ============================================================
// OmniCast - AI Curator React Query Hooks
// ============================================================

'use client';

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import {
  analyzeContent,
  type AnalyzeRequest,
} from '@/lib/api/ai-curator';
import type { AiCuratorReport } from '@/types';

export const aiCuratorKeys = {
  all: ['ai-curator'] as const,
  reports: () => [...aiCuratorKeys.all, 'reports'] as const,
};

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

/**
 * Cache the latest report per program in the React Query cache so the UI can
 * read it back without re-running the model.
 */
export function useCacheCuratorReport() {
  const qc = useQueryClient();
  return (programId: string, report: AiCuratorReport) => {
    qc.setQueryData([...aiCuratorKeys.reports(), programId], report);
  };
}

export function useCachedCuratorReport(programId: string | undefined) {
  const qc = useQueryClient();
  if (!programId) return undefined;
  return qc.getQueryData<AiCuratorReport>([
    ...aiCuratorKeys.reports(),
    programId,
  ]);
}
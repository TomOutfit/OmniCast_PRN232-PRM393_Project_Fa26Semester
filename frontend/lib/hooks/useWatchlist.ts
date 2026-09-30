// ============================================================
// OmniCast - Watchlist React Query Hooks
// ============================================================

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  addToWatchlist,
  fetchMyWatchlist,
  fetchMyWatchlistGrouped,
  removeFromWatchlistById,
  removeFromWatchlistByProgramId,
  type GroupedWatchlist,
  type WatchlistItem,
} from '@/lib/api/watchlist';

export const watchlistKeys = {
  all: ['watchlist'] as const,
  grouped: () => [...watchlistKeys.all, 'grouped'] as const,
  list: (params?: { page?: number; limit?: number; upcomingOnly?: boolean }) =>
    [...watchlistKeys.all, 'list', params ?? {}] as const,
};

export function useWatchlistGrouped(
  options?: { enabled?: boolean },
) {
  return useQuery<GroupedWatchlist>({
    queryKey: watchlistKeys.grouped(),
    queryFn: fetchMyWatchlistGrouped,
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  });
}

export function useWatchlistList(
  params?: { page?: number; limit?: number; upcomingOnly?: boolean },
  options?: { enabled?: boolean },
) {
  return useQuery<{
    data: WatchlistItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: watchlistKeys.list(params),
    queryFn: () => fetchMyWatchlist(params),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Check whether a given program is already in the user's watchlist.
 * Cheap: we read the grouped list once (staleTime 30s) and do an
 * in-memory lookup.
 */
export function useIsInWatchlist(programId: string | undefined) {
  const grouped = useWatchlistGrouped({ enabled: !!programId });
  if (!programId) return { isInWatchlist: false, watchlistId: undefined, isLoading: false };
  const all = [
    ...(grouped.data?.upcoming ?? []),
    ...(grouped.data?.live ?? []),
    ...(grouped.data?.past ?? []),
  ];
  const match = all.find((i) => i.programId === programId);
  return {
    isInWatchlist: !!match,
    watchlistId: match?.id,
    isLoading: grouped.isLoading,
  };
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      programId: string;
      channelId?: string;
      note?: string;
    }) => addToWatchlist(vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
}

export function useRemoveFromWatchlistByProgramId() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (programId: string) =>
      removeFromWatchlistByProgramId(programId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
}

export function useRemoveFromWatchlistById() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeFromWatchlistById(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: watchlistKeys.all });
    },
  });
}

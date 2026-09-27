// ============================================================
// OmniCast - Search React Query Hook
// ============================================================

'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { globalSearch, type SearchParams, type SearchResultData } from '@/lib/api/search';

export const searchKeys = {
  all: ['search'] as const,
  query: (params: SearchParams) => [...searchKeys.all, params] as const,
};

export function useSearch(
  params: SearchParams,
  options?: Omit<
    UseQueryOptions<SearchResultData>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<SearchResultData>({
    queryKey: searchKeys.query(params),
    queryFn: () => globalSearch(params),
    enabled: !!params.query && params.query.length > 1,
    staleTime: 30 * 1000,
    ...options,
  });
}

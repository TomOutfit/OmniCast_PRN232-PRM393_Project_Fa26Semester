// ============================================================
// OmniCast - Search API Client
// ============================================================

import { apiClient } from '../api';
import { withQuery } from '@/lib/query-builder';
import type { Channel, LiveEvent } from '@/types';

export interface SearchParams {
  query: string;
  type?: 'all' | 'channels' | 'programs' | 'recordings';
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'recent' | 'popular';
}

export interface SearchResultData {
  channels: Channel[];
  liveEvents: LiveEvent[];
  recordings: any[];
  totalResults: number;
}

export async function globalSearch(params: SearchParams): Promise<SearchResultData> {
  // Reuse the centralised query builder so `undefined` values are
  // dropped consistently across the app — `axios.get({ params })`
  // would happily stringify them as `"undefined"` and trip the server
  // validator. The contract on the wire: `q=<query>` + the rest.
  const qs = withQuery(`/search`, {
    q: params.query,
    type: params.type,
    category: params.category,
    page: params.page,
    limit: params.limit,
    sortBy: params.sortBy,
  });
  const { data } = await apiClient.get(qs);
  return data;
}

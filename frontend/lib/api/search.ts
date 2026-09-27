// ============================================================
// OmniCast - Search API Client
// ============================================================

import { apiClient } from '../api';
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
  const { data } = await apiClient.get('/search', {
    params: { q: params.query, ...params },
  });
  return data;
}

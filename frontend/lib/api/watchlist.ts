// ============================================================
// OmniCast - Watchlist API Client
// ============================================================

import { apiClient } from '../api';

export interface WatchlistProgramRef {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  scheduledAt: string;
  duration: number | null;
  status: string;
  channel: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
}

export interface WatchlistItem {
  id: string;
  programId: string;
  channelId: string | null;
  note: string | null;
  addedAt: string;
  updatedAt: string;
  program: WatchlistProgramRef;
}

export interface GroupedWatchlist {
  upcoming: WatchlistItem[];
  live: WatchlistItem[];
  past: WatchlistItem[];
}

export async function fetchMyWatchlistGrouped(): Promise<GroupedWatchlist> {
  const { data } = await apiClient.get('/me/watchlist/grouped');
  return data as GroupedWatchlist;
}

export async function fetchMyWatchlist(params?: {
  page?: number;
  limit?: number;
  upcomingOnly?: boolean;
}) {
  const { data } = await apiClient.get('/me/watchlist', { params });
  return data;
}

export async function addToWatchlist(payload: {
  programId: string;
  channelId?: string;
  note?: string;
}): Promise<WatchlistItem> {
  const { data } = await apiClient.post('/me/watchlist', payload);
  // Some backends wrap the row in `{ data: ... }`, others return the row
  // directly — accept both shapes.
  return (data?.data ?? data) as WatchlistItem;
}

export async function removeFromWatchlistByProgramId(programId: string) {
  // Look up the watchlist row for this program first, then DELETE by id.
  const list = await apiClient
    .get('/me/watchlist', { params: { limit: 100 } })
    .catch(() => ({ data: { data: [] } }));
  const items = (list.data?.data ?? []) as Array<{
    id: string;
    programId: string;
  }>;
  const match = items.find((i) => i.programId === programId);
  if (!match) return { removed: false };
  await apiClient.delete(`/me/watchlist/${match.id}`);
  return { removed: true, id: match.id };
}

export async function removeFromWatchlistById(id: string) {
  await apiClient.delete(`/me/watchlist/${id}`);
}

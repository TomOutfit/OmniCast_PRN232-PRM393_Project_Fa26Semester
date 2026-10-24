// ============================================================
// OmniCast - Live Stream API Client
// ============================================================

import apiClient from '@/lib/api';

export interface LiveEventInteractionSnapshot {
  eventId: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status: string;
  streamUrl?: string | null;
  startedAt?: string | null;
  duration?: number | null;
  viewerCount: number;
  channel?: {
    id: string;
    slug: string;
    name: string;
    logoUrl?: string | null;
    category?: string | null;
    subcategory?: string | null;
    bannerColor?: string | null;
  } | null;
  comments: LiveComment[];
  reactions: Record<string, number>;
  totalReactions: number;
}

export interface LiveComment {
  id: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  user?: {
    id: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    role?: string | null;
  } | null;
  _count?: {
    replies?: number;
    likes?: number;
  };
}

export async function fetchLiveInteraction(
  eventId: string,
): Promise<LiveEventInteractionSnapshot> {
  const res = await apiClient.get<any>(
    `/programs/studio/events/${eventId}/interaction`,
  );
  return (res.data as any)?.data ?? res.data;
}

export async function fetchLiveEventComments(
  eventId: string,
  options: { page?: number; limit?: number } = {},
): Promise<{
  data: LiveComment[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const res = await apiClient.get(
    `/programs/live-events/${eventId}/comments`,
    { params: options },
  );
  return res.data;
}

export async function postLiveEventComment(
  eventId: string,
  content: string,
  parentId?: string,
): Promise<LiveComment> {
  const res = await apiClient.post<LiveComment>(
    `/programs/live-events/${eventId}/comments`,
    { content, parentId },
  );
  return res.data;
}

export async function postLiveEventReaction(
  eventId: string,
  type: string,
): Promise<{ toggled: boolean; type: string; counts?: Record<string, number> }> {
  const res = await apiClient.post(
    `/programs/live-events/${eventId}/reactions`,
    { type },
  );
  return res.data;
}

export async function deleteLiveEventComment(commentId: string): Promise<void> {
  await apiClient.delete(`/comments/${commentId}`);
}

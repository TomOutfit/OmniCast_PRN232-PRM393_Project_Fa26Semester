// ============================================================
// OmniCast - Social API Client (Comments & Reactions)
// ============================================================

import { apiClient } from '../api';
import type {
  Comment,
  PaginatedResponse,
  ReactionSummary,
  ReactionTypeValue,
} from '@/types';

export async function fetchComments(
  recordingId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<Comment>> {
  const { data } = await apiClient.get(
    `/recordings/${recordingId}/comments`,
    { params: { page, limit } },
  );
  return data;
}

export async function createComment(
  recordingId: string,
  content: string,
  parentId?: string,
): Promise<Comment> {
  const { data } = await apiClient.post(
    `/recordings/${recordingId}/comments`,
    { content, parentId },
  );
  return data;
}

export async function deleteComment(commentId: string): Promise<unknown> {
  const { data } = await apiClient.delete(`/comments/${commentId}`);
  return data;
}

export async function fetchReactions(
  recordingId: string,
): Promise<ReactionSummary> {
  const { data } = await apiClient.get(`/recordings/${recordingId}/reactions`);
  return data;
}

export async function toggleReaction(
  recordingId: string,
  type: ReactionTypeValue,
): Promise<{ toggled: boolean; type: ReactionTypeValue }> {
  const { data } = await apiClient.post(`/recordings/${recordingId}/reactions`, {
    type,
  });
  return data;
}

// ============================================================
// LIVE EVENT reactions (mirror of recording endpoints)
// ============================================================

export async function fetchLiveEventReactions(liveEventId: string): Promise<ReactionSummary> {
  const { data } = await apiClient.get(`/live-events/${liveEventId}/reactions`);
  return data;
}

export async function toggleLiveEventReaction(
  liveEventId: string,
  type: ReactionTypeValue,
) {
  const { data } = await apiClient.post(`/live-events/${liveEventId}/reactions`, {
    type,
  });
  return data;
}

// ============================================================
// SHARE / VIEW counters
// ============================================================

export async function bumpRecordingShare(recordingId: string) {
  const { data } = await apiClient.post(`/recordings/${recordingId}/share`);
  return data as { id: string; shareCount: number | null };
}

export async function bumpLiveEventShare(liveEventId: string) {
  const { data } = await apiClient.post(`/live-events/${liveEventId}/share`);
  return data as { id: string; shareCount: number | null };
}

export async function bumpRecordingView(recordingId: string) {
  const { data } = await apiClient.post(`/recordings/${recordingId}/view`);
  return data as { recordingId: string; viewCount: number | bigint | null };
}

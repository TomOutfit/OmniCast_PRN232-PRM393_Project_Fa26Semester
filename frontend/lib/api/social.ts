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

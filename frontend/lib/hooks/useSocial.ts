// ============================================================
// OmniCast - Social React Query Hooks (Comments & Reactions)
// ============================================================

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchComments,
  createComment,
  deleteComment,
  fetchReactions,
  fetchLiveEventReactions,
  toggleReaction,
  toggleLiveEventReaction,
} from '@/lib/api/social';
import type {
  Comment,
  PaginatedResponse,
  ReactionSummary,
  ReactionTypeValue,
} from '@/types';

export const socialKeys = {
  all: ['social'] as const,
  comments: (recordingId: string) =>
    [...socialKeys.all, 'comments', recordingId] as const,
  reactions: (recordingId: string) =>
    [...socialKeys.all, 'reactions', recordingId] as const,
  liveEventReactions: (liveEventId: string) =>
    [...socialKeys.all, 'liveEventReactions', liveEventId] as const,
};

export function useComments(recordingId: string | undefined, page = 1, limit = 20) {
  return useQuery<PaginatedResponse<Comment>>({
    queryKey: [...socialKeys.comments(recordingId ?? ''), page, limit],
    queryFn: () => fetchComments(recordingId as string, page, limit),
    enabled: !!recordingId,
  });
}

export function useReactions(recordingId: string | undefined) {
  return useQuery<ReactionSummary>({
    queryKey: socialKeys.reactions(recordingId ?? ''),
    queryFn: () => fetchReactions(recordingId as string),
    enabled: !!recordingId,
    staleTime: 30 * 1000,
  });
}

export function useLiveEventReactions(liveEventId: string | undefined) {
  return useQuery<ReactionSummary>({
    queryKey: socialKeys.liveEventReactions(liveEventId ?? ''),
    queryFn: () => fetchLiveEventReactions(liveEventId as string),
    enabled: !!liveEventId,
    staleTime: 30 * 1000,
  });
}

export function useCreateComment(recordingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { content: string; parentId?: string }) =>
      createComment(recordingId, vars.content, vars.parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialKeys.comments(recordingId) });
    },
  });
}

export function useDeleteComment(recordingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialKeys.comments(recordingId) });
    },
  });
}

export function useToggleReaction(recordingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: ReactionTypeValue) =>
      toggleReaction(recordingId, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialKeys.reactions(recordingId) });
    },
  });
}

export function useToggleLiveEventReaction(liveEventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: ReactionTypeValue) =>
      toggleLiveEventReaction(liveEventId, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialKeys.liveEventReactions(liveEventId) });
    },
  });
}

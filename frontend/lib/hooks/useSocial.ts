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
  fetchLiveEventComments,
  createComment,
  createLiveEventComment,
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
  comments: (targetId: string, kind: 'recording' | 'liveEvent' = 'recording') =>
    [...socialKeys.all, 'comments', kind, targetId] as const,
  reactions: (recordingId: string) =>
    [...socialKeys.all, 'reactions', recordingId] as const,
  liveEventReactions: (liveEventId: string) =>
    [...socialKeys.all, 'liveEventReactions', liveEventId] as const,
};

export function useComments(
  targetId: string | undefined,
  page = 1,
  limit = 20,
  kind: 'recording' | 'liveEvent' = 'recording',
) {
  return useQuery<PaginatedResponse<Comment>>({
    queryKey: [...socialKeys.comments(targetId ?? '', kind), page, limit],
    queryFn: () =>
      kind === 'liveEvent'
        ? fetchLiveEventComments(targetId as string, page, limit)
        : fetchComments(targetId as string, page, limit),
    enabled: !!targetId,
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

export function useCreateComment(
  targetId: string,
  kind: 'recording' | 'liveEvent' = 'recording',
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { content: string; parentId?: string }) =>
      kind === 'liveEvent'
        ? createLiveEventComment(targetId, vars.content, vars.parentId)
        : createComment(targetId, vars.content, vars.parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: socialKeys.comments(targetId, kind) });
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

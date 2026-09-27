// ============================================================
// OmniCast - Channels React Query Hooks
// ============================================================

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  fetchChannels,
  fetchChannelBySlug,
  fetchChannelById,
  fetchChannelCategories,
  fetchFollowedChannels,
  followChannel,
  unfollowChannel,
  isFollowingChannel,
  type ChannelsListParams,
  type CategorySummary,
} from '@/lib/api/channels';
import type { Channel, PaginatedResponse } from '@/types';

export const channelsKeys = {
  all: ['channels'] as const,
  lists: () => [...channelsKeys.all, 'list'] as const,
  list: (params: ChannelsListParams) =>
    [...channelsKeys.lists(), params] as const,
  details: () => [...channelsKeys.all, 'detail'] as const,
  detail: (slug: string) => [...channelsKeys.details(), slug] as const,
  categories: () => [...channelsKeys.all, 'categories'] as const,
  followed: () => [...channelsKeys.all, 'followed'] as const,
};

export function useChannels(
  params: ChannelsListParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Channel>>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<PaginatedResponse<Channel>>({
    queryKey: channelsKeys.list(params),
    queryFn: () => fetchChannels(params),
    ...options,
  });
}

export function useChannelBySlug(
  slug: string,
  options?: Omit<UseQueryOptions<Channel>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Channel>({
    queryKey: channelsKeys.detail(slug),
    queryFn: () => fetchChannelBySlug(slug),
    enabled: !!slug,
    ...options,
  });
}

export function useChannelCategories(
  options?: Omit<
    UseQueryOptions<CategorySummary[]>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<CategorySummary[]>({
    queryKey: channelsKeys.categories(),
    queryFn: fetchChannelCategories,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useFollowedChannels(
  page = 1,
  limit = 20,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Channel>>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<PaginatedResponse<Channel>>({
    queryKey: [...channelsKeys.followed(), page, limit],
    queryFn: () => fetchFollowedChannels(page, limit),
    ...options,
  });
}

export function useIsFollowingChannel(channelId: string | undefined) {
  return useQuery({
    queryKey: [...channelsKeys.detail(channelId ?? ''), 'is-following'],
    queryFn: () => isFollowingChannel(channelId as string),
    enabled: !!channelId,
    staleTime: 30 * 1000,
  });
}

export function useFollowChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => followChannel(channelId),
    onSuccess: (_data, channelId) => {
      qc.invalidateQueries({ queryKey: channelsKeys.detail(channelId) });
      qc.invalidateQueries({ queryKey: channelsKeys.followed() });
    },
  });
}

export function useUnfollowChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => unfollowChannel(channelId),
    onSuccess: (_data, channelId) => {
      qc.invalidateQueries({ queryKey: channelsKeys.detail(channelId) });
      qc.invalidateQueries({ queryKey: channelsKeys.followed() });
    },
  });
}

export { fetchChannelById };

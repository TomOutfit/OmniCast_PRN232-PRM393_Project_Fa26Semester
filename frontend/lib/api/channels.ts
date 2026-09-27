// ============================================================
// OmniCast - Channels API Client
// ============================================================

import { apiClient } from '../api';
import type { Channel, LiveCategory, PaginatedResponse } from '@/types';

export interface ChannelsListParams {
  page?: number;
  limit?: number;
  category?: LiveCategory | string;
  isActive?: boolean;
  isFeatured?: boolean;
  search?: string;
}

export interface CategorySummary {
  category: LiveCategory;
  count: number;
}

export async function fetchChannels(
  params: ChannelsListParams = {},
): Promise<PaginatedResponse<Channel>> {
  const { data } = await apiClient.get('/channels', { params });
  return data;
}

export async function fetchChannelBySlug(slug: string): Promise<Channel> {
  const { data } = await apiClient.get(`/channels/slug/${slug}`);
  return data;
}

export async function fetchChannelById(id: string): Promise<Channel> {
  const { data } = await apiClient.get(`/channels/${id}`);
  return data;
}

export async function fetchChannelCategories(): Promise<CategorySummary[]> {
  const { data } = await apiClient.get('/channels/categories');
  return data;
}

export async function fetchFollowedChannels(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<Channel>> {
  const { data } = await apiClient.get('/channels/followed', {
    params: { page, limit },
  });
  return data;
}

export async function followChannel(channelId: string): Promise<unknown> {
  const { data } = await apiClient.post(`/channels/${channelId}/follow`);
  return data;
}

export async function unfollowChannel(channelId: string): Promise<unknown> {
  const { data } = await apiClient.post(`/channels/${channelId}/unfollow`);
  return data;
}

export async function isFollowingChannel(
  channelId: string,
): Promise<{ isFollowing: boolean }> {
  const { data } = await apiClient.get(`/channels/${channelId}/is-following`);
  return data;
}

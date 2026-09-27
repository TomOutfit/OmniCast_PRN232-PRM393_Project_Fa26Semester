// ============================================================
// OmniCast - Users API Client
// ============================================================

import { apiClient } from '../api';
import type { Channel, PaginatedResponse, User, UserStats } from '@/types';

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get('/users/me');
  return data;
}

export async function updateMe(payload: Partial<User>): Promise<User> {
  const { data } = await apiClient.patch('/users/me', payload);
  return data;
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const { data } = await apiClient.post('/users/me/change-password', payload);
  return data;
}

export async function fetchMyStats(): Promise<UserStats> {
  const { data } = await apiClient.get('/users/me/stats');
  return data;
}

export async function fetchMyFollows(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<Channel>> {
  const { data } = await apiClient.get('/users/me/follows', {
    params: { page, limit },
  });
  return data;
}

export interface AdminUsersParams {
  page?: number;
  limit?: number;
  role?: string;
}

export async function fetchAllUsers(
  params: AdminUsersParams = {},
): Promise<PaginatedResponse<User>> {
  const { data } = await apiClient.get('/users', { params });
  return data;
}

export async function deactivateUser(id: string): Promise<unknown> {
  const { data } = await apiClient.patch(`/users/${id}/deactivate`);
  return data;
}

export async function activateUser(id: string): Promise<unknown> {
  const { data } = await apiClient.patch(`/users/${id}/activate`);
  return data;
}

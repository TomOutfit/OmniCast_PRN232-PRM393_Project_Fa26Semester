// ============================================================
// OmniCast - Users React Query Hooks
// ============================================================

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchMe,
  updateMe,
  fetchMyStats,
  fetchMyFollows,
  fetchAllUsers,
  deactivateUser,
  activateUser,
  changePassword,
  type AdminUsersParams,
} from '@/lib/api/users';
import type {
  Channel,
  PaginatedResponse,
  User,
  UserStats,
} from '@/types';

export const usersKeys = {
  all: ['users'] as const,
  me: () => [...usersKeys.all, 'me'] as const,
  stats: () => [...usersKeys.all, 'me', 'stats'] as const,
  follows: () => [...usersKeys.all, 'me', 'follows'] as const,
  admin: () => [...usersKeys.all, 'admin'] as const,
  adminList: (params: AdminUsersParams) =>
    [...usersKeys.admin(), 'list', params] as const,
};

export function useMe() {
  return useQuery<User>({
    queryKey: usersKeys.me(),
    queryFn: fetchMe,
    retry: false,
  });
}

export function useMyStats() {
  return useQuery<UserStats>({
    queryKey: usersKeys.stats(),
    queryFn: fetchMyStats,
  });
}

export function useMyFollows(page = 1, limit = 20) {
  return useQuery<PaginatedResponse<Channel>>({
    queryKey: [...usersKeys.follows(), page, limit],
    queryFn: () => fetchMyFollows(page, limit),
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<User>) => updateMe(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersKeys.me() });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      changePassword(payload),
  });
}

export function useAdminUsers(params: AdminUsersParams = {}) {
  return useQuery<PaginatedResponse<User>>({
    queryKey: usersKeys.adminList(params),
    queryFn: () => fetchAllUsers(params),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKeys.admin() }),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKeys.admin() }),
  });
}

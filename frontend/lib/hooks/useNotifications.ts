// ============================================================
// OmniCast - Notifications React Query Hooks
// ------------------------------------------------------------
// Polling is enabled with a 30s interval so the bell badge
// stays fresh without forcing the user to refresh. Clicking
// the bell invalidates both the list and the unread count.
// ============================================================

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type NotificationListResponse,
  type UnreadCountResponse,
  type ListNotificationsParams,
} from '@/lib/api/notifications';

export const notificationsKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationsKeys.all, 'list'] as const,
  list: (params: ListNotificationsParams) =>
    [...notificationsKeys.lists(), params] as const,
  unread: () => [...notificationsKeys.all, 'unread-count'] as const,
};

export function useNotifications(
  params: ListNotificationsParams = {},
  options?: Omit<
    UseQueryOptions<NotificationListResponse>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<NotificationListResponse>({
    queryKey: notificationsKeys.list(params),
    queryFn: () => fetchNotifications(params),
    refetchInterval: 30_000, // keep the bell fresh
    refetchOnWindowFocus: true,
    ...options,
  });
}

export function useUnreadCount(
  options?: Omit<UseQueryOptions<UnreadCountResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<UnreadCountResponse>({
    queryKey: notificationsKeys.unread(),
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    ...options,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    // Optimistic update — flip the item to "read" instantly
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationsKeys.all });
      const previousLists = qc.getQueriesData<NotificationListResponse>({
        queryKey: notificationsKeys.lists(),
      });
      qc.setQueriesData<NotificationListResponse>(
        { queryKey: notificationsKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            unreadCount: Math.max(0, old.unreadCount - (old.items.find((n) => n.id === id && !n.isRead) ? 1 : 0)),
            items: old.items.map((n) =>
              n.id === id
                ? { ...n, isRead: true, readAt: new Date().toISOString() }
                : n,
            ),
          };
        },
      );
      qc.setQueryData<UnreadCountResponse>(notificationsKeys.unread(), (old) =>
        old ? { unreadCount: Math.max(0, old.unreadCount - 1) } : old,
      );
      return { previousLists };
    },
    onError: (_e, _id, ctx) => {
      ctx?.previousLists.forEach(([key, value]) => {
        qc.setQueryData(key, value);
      });
      qc.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationsKeys.all });
      const previousLists = qc.getQueriesData<NotificationListResponse>({
        queryKey: notificationsKeys.lists(),
      });
      qc.setQueriesData<NotificationListResponse>(
        { queryKey: notificationsKeys.lists() },
        (old) =>
          old
            ? {
                ...old,
                unreadCount: 0,
                items: old.items.map((n) => ({
                  ...n,
                  isRead: true,
                  readAt: n.readAt ?? new Date().toISOString(),
                })),
              }
            : old,
      );
      qc.setQueryData<UnreadCountResponse>(notificationsKeys.unread(), {
        unreadCount: 0,
      });
      return { previousLists };
    },
    onError: (_e, _v, ctx) => {
      ctx?.previousLists.forEach(([key, value]) => {
        qc.setQueryData(key, value);
      });
      qc.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}

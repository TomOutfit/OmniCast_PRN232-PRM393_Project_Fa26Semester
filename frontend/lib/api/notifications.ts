// ============================================================
// OmniCast - Notifications API Client
// ============================================================

import { apiClient } from '../api';

export interface NotificationActor {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  actionUrl: string | null;
  actorId: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  eventId: string | null;
  recordingId: string | null;
  channelId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  total: number;
  unreadCount: number;
  items: NotificationItem[];
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface MarkReadResponse {
  success: true;
  updated: number;
}

export interface ListNotificationsParams {
  limit?: number;
  offset?: number;
  filter?: 'all' | 'unread' | 'read';
}

export async function fetchNotifications(
  params: ListNotificationsParams = {},
): Promise<NotificationListResponse> {
  const { data } = await apiClient.get('/me/notifications', { params });
  // Some backends wrap inside { data: ... }, normalise to the same shape.
  return (data?.data ?? data) as NotificationListResponse;
}

export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  const { data } = await apiClient.get('/me/notifications/unread-count');
  return (data?.data ?? data) as UnreadCountResponse;
}

export async function markNotificationRead(id: string): Promise<MarkReadResponse> {
  const { data } = await apiClient.post(`/me/notifications/${id}/read`);
  return (data?.data ?? data) as MarkReadResponse;
}

export async function markAllNotificationsRead(): Promise<MarkReadResponse> {
  const { data } = await apiClient.post('/me/notifications/read-all');
  return (data?.data ?? data) as MarkReadResponse;
}

export async function deleteNotification(id: string): Promise<{ success: true }> {
  const { data } = await apiClient.delete(`/me/notifications/${id}`);
  return (data?.data ?? data) as { success: true };
}

// ============================================================
// OmniCast - Admin API Client
// ============================================================

import { apiClient } from '../api';

export interface AdminAnalyticsOverviewData {
  users: {
    total: number;
    active: number;
    deactivated: number;
    roles: {
      viewer: number;
      staff: number;
      admin: number;
      guest: number;
    };
    newLast7Days: number;
  };
  channels: {
    total: number;
    active: number;
    featured: number;
  };
  broadcasts: {
    recordingsCount: number;
    liveEventsCount: number;
    activeLiveCount: number;
  };
  security: {
    totalAuditLogs: number;
    auditLogsLast24h: number;
    topActions: { action: string; count: number }[];
  };
  system: {
    status: string;
    uptimeSeconds: number;
    memoryUsageMb: number;
    nodeVersion: string;
    timestamp: string;
  };
}

export async function fetchAdminOverview(): Promise<AdminAnalyticsOverviewData> {
  const { data } = await apiClient.get('/admin/analytics/overview');
  return data;
}

export async function broadcastAnnouncement(payload: {
  title: string;
  message: string;
  actionUrl?: string;
}): Promise<{ success: boolean; recipientsCount: number; timestamp: string }> {
  const { data } = await apiClient.post('/admin/system/announcement', payload);
  return data;
}

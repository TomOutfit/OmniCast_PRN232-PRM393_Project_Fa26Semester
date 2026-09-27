// ============================================================
// OmniCast - Audit Logs API Client
// ============================================================

import { apiClient } from '../api';
import type { AuditLogEntry, PaginatedResponse } from '@/types';

export interface AuditLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
}

export async function fetchAuditLogs(
  params: AuditLogsParams = {},
): Promise<PaginatedResponse<AuditLogEntry>> {
  const { data } = await apiClient.get('/audit-logs', { params });
  return data;
}

export async function fetchRecentActivity(
  limit = 10,
): Promise<AuditLogEntry[]> {
  const { data } = await apiClient.get('/audit-logs/recent', {
    params: { limit },
  });
  return data;
}

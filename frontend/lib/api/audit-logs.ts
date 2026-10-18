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

export async function exportAuditLogs(params: {
  format?: 'csv' | 'json';
  action?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
} = {}): Promise<Blob> {
  const response = await apiClient.get('/audit-logs/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
}

export async function fetchAuditLogsForExport(params: {
  action?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
} = {}): Promise<AuditLogEntry[]> {
  const { data } = await apiClient.get('/audit-logs/export', {
    params: { ...params, format: 'json' },
  });
  return data;
}

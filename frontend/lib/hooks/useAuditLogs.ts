// ============================================================
// OmniCast - Audit Logs React Query Hook
// ============================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchAuditLogs,
  fetchRecentActivity,
  type AuditLogsParams,
} from '@/lib/api/audit-logs';
import type { AuditLogEntry, PaginatedResponse } from '@/types';

export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (params: AuditLogsParams) => [...auditKeys.all, 'list', params] as const,
  recent: (limit: number) => [...auditKeys.all, 'recent', limit] as const,
};

export function useAuditLogs(params: AuditLogsParams = {}) {
  return useQuery<PaginatedResponse<AuditLogEntry>>({
    queryKey: auditKeys.list(params),
    queryFn: () => fetchAuditLogs(params),
  });
}

export function useRecentActivity(limit = 10) {
  return useQuery<AuditLogEntry[]>({
    queryKey: auditKeys.recent(limit),
    queryFn: () => fetchRecentActivity(limit),
    refetchInterval: 30 * 1000,
  });
}

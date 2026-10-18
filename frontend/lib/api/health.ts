// ============================================================
// OmniCast - Health & DB Pool API Client
// ============================================================

import { apiClient } from '../api';

export interface DbPoolMetrics {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  totalConnections: number;
  maxConnections: number;
  activeConnections: number;
  idleConnections: number;
  usagePercent: number;
  poolerPort: number;
  poolerMode: string;
  byApplication?: Record<string, number>;
  timestamp?: string;
  error?: string;
}

export async function fetchDbPoolMetrics(): Promise<DbPoolMetrics> {
  const { data } = await apiClient.get('/health/db-pool');
  return data;
}

// ============================================================
// OmniCast - DB Pool Hook
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { fetchDbPoolMetrics, type DbPoolMetrics } from '@/lib/api/health';

export function useDbPoolMetrics() {
  return useQuery<DbPoolMetrics>({
    queryKey: ['health', 'db-pool'],
    queryFn: fetchDbPoolMetrics,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

// ============================================================
// OmniCast - AI Curator API Client
// ============================================================

import { apiClient } from '../api';
import type { AiCuratorReport } from '@/types';

export interface AnalyzeRequest {
  title: string;
  description?: string;
  category?: string;
  language?: string;
  scheduledAt?: string;
  tags?: string[];
  channelName?: string;
}

export async function analyzeContent(
  payload: AnalyzeRequest,
): Promise<AiCuratorReport> {
  const { data } = await apiClient.post('/ai-curator/analyze', payload);
  return data;
}

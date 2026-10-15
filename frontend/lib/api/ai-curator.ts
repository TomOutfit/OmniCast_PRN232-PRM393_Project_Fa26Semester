// ============================================================
// OmniCast - AI Curator API Client
// ============================================================

import { apiClient } from '../api';
import type { AiCuratorReport } from '@/types';

/** Preview/ad-hoc analyze payload — matches `AnalyzeContentPreviewDto`. */
export interface AnalyzeRequest {
  title: string;
  description?: string;
  category?: string;
  language?: string;
  scheduledAt?: string;
  tags?: string[];
  channelName?: string;
}

/** Apply-curation payload — matches `ApplyCurationDto`. */
export interface ApplyCurationRequest {
  scheduledAt?: string;
  status?: string;
  description?: string;
  markApplied?: boolean;
}

/** Persisted history row — full `AiCuratorReport` with DB metadata. */
export interface AiCuratorHistoryItem extends AiCuratorReport {
  id: string;
  programId: string;
  createdBy: string | null;
  createdAt: string;
  tokenUsed: number | null;
  /**
   * True when this row was returned from the server's cache rather
   * than a fresh pipeline run. Always `false` (or undefined) for
   * persisted rows; the field is only set when the row came from a
   * `forceRefresh: false` call.
   */
  cached?: boolean;
}

/**
 * Mode 2 — Preview/ad-hoc analysis. The server NEVER persists this
 * report — we just get a transient `AiCuratorReport` back.
 */
export async function analyzeContent(
  payload: AnalyzeRequest,
): Promise<AiCuratorReport> {
  const { data } = await apiClient.post('/ai-curator/analyze', payload);
  return data;
}

/**
 * Mode 1 — Curate an EXISTING program. The server persists the report.
 */
export async function curateExistingProgram(payload: {
  programId: string;
  forceRefresh?: boolean;
}): Promise<AiCuratorHistoryItem> {
  const { data } = await apiClient.post('/ai-curator/curate', payload);
  return data;
}

/**
 * Apply an AI suggestion (time-slot / status / description) to an
 * existing program.
 */
export async function applyCuration(
  programId: string,
  payload: ApplyCurationRequest,
): Promise<{
  programId: string;
  appliedFields: string[];
  updatedAt: string;
  channel: { id: string; name: string };
}> {
  const { data } = await apiClient.post(
    `/ai-curator/apply/${programId}`,
    payload,
  );
  return data;
}

/**
 * History of the last 10 reports for a program.
 */
export async function fetchCurationHistory(
  programId: string,
): Promise<AiCuratorHistoryItem[]> {
  const { data } = await apiClient.get(`/ai-curator/history/${programId}`);
  // Backend may wrap in { data: [...] } or return [...] directly.
  return Array.isArray(data) ? data : (data?.data ?? []);
}
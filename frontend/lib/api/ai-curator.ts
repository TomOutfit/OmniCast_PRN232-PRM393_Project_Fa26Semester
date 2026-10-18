// ============================================================
// OmniCast - AI Curator API Client
// ============================================================

import { apiClient } from '../api';
import type { AiCuratorReport } from '@/types';

/** Period filter for `fetchStats` / `useAiCuratorStats`. */
export type AiCuratorStatsPeriod = 'day' | 'week' | 'month';

/**
 * Aggregate stats payload returned by `GET /ai-curator/stats`.
 *
 * Shape mirrors the backend's AiCuratorStatsDto. All fields are
 * optional so older backends (without the donut or trend data)
 * still satisfy the type and the dashboard can degrade to empty
 * states gracefully.
 */
export interface AiCuratorStats {
  /** Total reports written within the selected period. */
  totalReports?: number;
  /** Average engagement (0–100) across persisted reports. */
  avgEngagement?: number;
  /** Average end-to-end pipeline duration in milliseconds. */
  avgProcessingTimeMs?: number;
  /** Server cache hit rate for the period (0–1). */
  cacheHitRate?: number;
  /** Counts by `broadcastSuitability` (used by the donut chart). */
  broadcastSuitability?: {
    PRIME_TIME?: number | { count: number; percentage: number };
    STANDARD?: number | { count: number; percentage: number };
    RESTRICTED?: number | { count: number; percentage: number };
  };
  /** Age rating distribution. */
  ageRating?: Record<string, { count: number; percentage: number }>;
  /** AI model version stats. */
  aiModelVersion?: {
    counts?: Record<string, number>;
    cacheHitRate?: number;
  };
  /** Last 7 days report counts, oldest first (used by bar chart). */
  last7Days?: Array<{
    date: string; // YYYY-MM-DD
    count: number;
    avgEngagement?: number;
  }>;
  /** Most-flagged compliance terms in the period. */
  topFlaggedContent?: Array<{
    label: string;
    count: number;
  }>;
  /** Programs marked applied count. */
  programsMarkedApplied?: number;
  /** Total tokens used count. */
  totalTokensUsed?: number;
  /** Selected period echoed back from the server (sanity check). */
  period?: AiCuratorStatsPeriod;
}

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

/**
 * Aggregate stats for the Curator dashboard.
 *
 * GET /ai-curator/stats?period=<day|week|month>
 *
 * The endpoint is restricted to STAFF/ADMIN — non-curator tokens
 * receive a 403 from the backend. The hook layer adds an
 * `enabled` guard so the call isn't issued when the user lacks
 * the `aiCurator.run` capability.
 */
export async function fetchStats(
  period: AiCuratorStatsPeriod,
): Promise<AiCuratorStats> {
  const { data } = await apiClient.get('/ai-curator/stats', {
    params: { period },
  });
  // Unwrap the standard ApiResponse envelope when present.
  return (data && typeof data === 'object' && 'data' in data
    ? (data as { data: AiCuratorStats }).data
    : data) as AiCuratorStats;
}
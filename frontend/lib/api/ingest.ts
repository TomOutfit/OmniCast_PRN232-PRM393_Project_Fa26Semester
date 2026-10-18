// ============================================================
// OmniCast - Ingest API Client
// Triggers Content Aggregator, YouTube RSS, and external APIs
// to sync the channel program library ("kho chương trình") and EPG.
// ============================================================

import { apiClient } from '../api';

export interface IngestRunResult {
  channels?: number;
  upserted?: number;
  skipped?: number;
  totalChannels?: number;
  totalFetched?: number;
  totalUpserted?: number;
  totalIngested?: number;
  totalErrors?: number;
  durationMs?: number;
  source?: string;
}

export interface IngestStatusResponse {
  sources: Array<{
    sourceName: string;
    category: string;
    isConfigured: boolean;
    requiredEnvVars: readonly string[];
  }>;
  totalActiveChannels: number;
  categoryMappings: Record<string, string[]>;
}

/**
 * Trigger full aggregator pipeline across all categories & channels.
 * Ingests external API data into the channel program repository and EPG.
 */
export async function triggerIngestAll(): Promise<IngestRunResult> {
  const { data } = await apiClient.post('/programs/ingest/all');
  return data;
}

/**
 * Trigger YouTube RSS public feeds sync for all mapped channels.
 * Pulls latest uploads, audiobooks, and live streams.
 */
export async function triggerIngestYoutubeRss(): Promise<IngestRunResult> {
  const { data } = await apiClient.post('/programs/ingest/youtube-rss');
  return data;
}

/**
 * Trigger YouTube Data API sync.
 */
export async function triggerIngestYoutube(): Promise<IngestRunResult> {
  const { data } = await apiClient.post('/programs/ingest/youtube');
  return data;
}

/**
 * Trigger ingest for a specific channel category (e.g. CINE, SPORTS, PODCAST).
 */
export async function triggerIngestCategory(category: string): Promise<IngestRunResult> {
  const { data } = await apiClient.post(`/programs/ingest/category/${category}`);
  return data;
}

/**
 * Get status of all 16 external API sources and channels.
 */
export async function fetchIngestStatus(): Promise<IngestStatusResponse> {
  const { data } = await apiClient.get('/programs/ingest/status');
  return data;
}

// ============================================================
// OmniCast - Live Studio API Client
// ============================================================

import apiClient from '@/lib/api';

export interface BroadcastableRecording {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  videoUrl: string;
  contentSource: string;
  externalPlatform?: string | null;
  duration: number;
  viewCount: number;
  publishedAt: string;
  tags: string[];
  channel: {
    id: string;
    slug: string;
    name: string;
  };
}

export interface CurateLiveInput {
  channelId: string;
  recordingIds: string[];
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface StopLiveInput {
  keepAsVod?: boolean;
}

export interface SelfRecordUploadInput {
  channelId: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  tags?: string[];
  visibility?: 'IMMEDIATE' | 'SCHEDULED' | 'PRIVATE';
}

export interface SelfRecordFileUploadResult {
  url: string;
  size: number;
  storageKey: string;
  originalName: string;
  mimeType: string;
}

export interface StudioCatalogStream {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  format: 'HLS' | 'MP4' | 'DASH' | 'WEBM';
  codec?: string;
  resolution?: string;
  durationSec: number;
  channelSlugs: string[];
  tags: string[];
  source: string;
  verified: boolean;
  license: string;
  notes?: string;
}

export interface StudioCatalogSummary {
  total: number;
  verified: number;
  byFormat: Record<string, number>;
  bySource: Record<string, number>;
}

export interface AddFromCatalogInput {
  channelId: string;
  catalogId: string;
  title?: string;
  description?: string;
  isPublished?: boolean;
}

export async function fetchBroadcastableRecordings(
  channelId: string,
  search?: string,
  limit: number = 50,
): Promise<{ total: number; items: BroadcastableRecording[] }> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (limit) params.append('limit', limit.toString());

  const res = await apiClient.get(
    `/programs/studio/channels/${channelId}/recordings?${params.toString()}`,
  );
  return res.data;
}

export async function fetchCatalogStreams(
  channelSlug?: string,
  options: { verifiedOnly?: boolean; search?: string } = {},
): Promise<{
  total: number;
  summary: StudioCatalogSummary;
  items: StudioCatalogStream[];
}> {
  const params = new URLSearchParams();
  if (channelSlug) params.append('channel', channelSlug);
  if (options.verifiedOnly) params.append('verified', 'true');
  if (options.search) params.append('search', options.search);
  const qs = params.toString();
  const res = await apiClient.get(
    `/programs/studio/catalog/streams${qs ? `?${qs}` : ''}`,
  );
  return res.data;
}

export async function addFromCatalog(payload: AddFromCatalogInput) {
  const res = await apiClient.post(
    '/programs/studio/recordings/library/from-catalog',
    payload,
  );
  return res.data;
}

export async function curateLive(payload: CurateLiveInput) {
  const res = await apiClient.post('/programs/studio/curate-live', payload);
  return res.data;
}

export async function stopLive(eventId: string, payload?: StopLiveInput) {
  const res = await apiClient.post(
    `/programs/studio/live-events/${eventId}/stop`,
    payload || {},
  );
  return res.data;
}

export async function uploadSelfRecordFile(
  file: File,
  title?: string,
  onProgress?: (percent: number) => void,
): Promise<SelfRecordFileUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);

  const res = await apiClient.post(
    '/programs/studio/recordings/upload/file',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percent);
        }
      },
    },
  );
  return res.data;
}

export async function uploadSelfRecord(payload: SelfRecordUploadInput) {
  const res = await apiClient.post(
    '/programs/studio/recordings/upload',
    payload,
  );
  return res.data;
}

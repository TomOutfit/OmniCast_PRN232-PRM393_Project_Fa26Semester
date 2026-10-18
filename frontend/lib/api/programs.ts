// ============================================================
// OmniCast - Programs API Client
// ============================================================

import { apiClient } from '../api';
import { withQuery } from '@/lib/query-builder';
import type {
  LiveEvent,
  PaginatedResponse,
  Recording,
} from '@/types';

export interface LiveEventsListParams {
  page?: number;
  limit?: number;
  channelId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RecordingsListParams {
  page?: number;
  limit?: number;
  channelId?: string;
  category?: string;
  isFeatured?: boolean;
  search?: string;
}

export interface EpgDayParams {
  date: string; // YYYY-MM-DD
  channelIds?: string[];
}

export interface EpgProgramItem {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  status: string;
  thumbnailUrl: string | null;
  streamUrl?: string | null;
  durationMinutes: number;
  tags: string[];
  category: string;
  isFiller: boolean;
  fillerKind: 'recording-replay' | 'channel-branding' | null;
  sourceRecordingId: string | null;
}

export interface EpgDayChannel {
  channelId: string;
  channelName: string;
  channelSlug?: string;
  channelLogoUrl: string | null;
  channelCategory: string;
  programs: EpgProgramItem[];
}

export interface EpgDayResponse {
  date: string;
  generatedAt: string;
  totalChannels: number;
  totalPrograms: number;
  channels: EpgDayChannel[];
}

export async function fetchEpgDay(
  params: EpgDayParams,
): Promise<EpgDayResponse> {
  // The backend DTO expects `channelIds` as a **single comma-separated
  // string** (e.g. `?channelIds=a,b,c`), validated by `@IsString()`. The
  // builder would otherwise emit `?channelIds=a&channelIds=b` (the
  // multi-value shape) and NestJS rejects it with 400 "channelIds must
  // be a string". Pre-join here so the request matches the contract.
  const path = withQuery(`/programs/epg/day`, {
    date: params.date,
    ...(params.channelIds && params.channelIds.length > 0
      ? { channelIds: params.channelIds.join(',') }
      : {}),
  });
  const { data } = await apiClient.get(path);
  return data.data ?? data;
}

export async function fetchLiveEvents(
  params: LiveEventsListParams = {},
): Promise<PaginatedResponse<LiveEvent>> {
  const path = withQuery(`/programs/live-events`, {
    ...params,
  });
  const { data } = await apiClient.get(path);
  return data;
}

export async function fetchLiveNow(): Promise<LiveEvent[]> {
  const { data } = await apiClient.get('/programs/live-events/live-now');
  return data;
}

export async function fetchLiveEventById(id: string): Promise<LiveEvent> {
  const { data } = await apiClient.get(`/programs/live-events/${id}`);
  return data;
}

export async function fetchRecordings(
  params: RecordingsListParams = {},
): Promise<PaginatedResponse<Recording>> {
  const path = withQuery(`/programs/recordings`, {
    ...params,
  });
  const { data } = await apiClient.get(path);
  return data;
}

export async function fetchRecordingById(id: string): Promise<Recording> {
  const { data } = await apiClient.get(`/programs/recordings/${id}`);
  return data;
}

export async function fetchSimilarRecordings(
  id: string,
  limit = 6,
): Promise<Recording[]> {
  const { data } = await apiClient.get(`/programs/recordings/${id}/similar`, {
    params: { limit },
  });
  // Backend may wrap in { data: [...] } or return [...] directly.
  return Array.isArray(data) ? data : (data?.data ?? []);
}

// ============================================================
// OmniCast - Programs API Client
// ============================================================

import { apiClient } from '../api';
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
}

export interface RecordingsListParams {
  page?: number;
  limit?: number;
  channelId?: string;
  category?: string;
  isFeatured?: boolean;
  search?: string;
}

export async function fetchLiveEvents(
  params: LiveEventsListParams = {},
): Promise<PaginatedResponse<LiveEvent>> {
  const { data } = await apiClient.get('/programs/live-events', { params });
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
  const { data } = await apiClient.get('/programs/recordings', { params });
  return data;
}

export async function fetchRecordingById(id: string): Promise<Recording> {
  const { data } = await apiClient.get(`/programs/recordings/${id}`);
  return data;
}

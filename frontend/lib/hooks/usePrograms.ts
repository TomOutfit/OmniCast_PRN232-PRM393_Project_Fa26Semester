// ============================================================
// OmniCast - Programs / EPG React Query Hooks
// ============================================================

'use client';

import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  fetchLiveEvents,
  fetchLiveNow,
  fetchLiveEventById,
  fetchRecordings,
  fetchRecordingById,
  type LiveEventsListParams,
  type RecordingsListParams,
} from '@/lib/api/programs';
import type {
  LiveEvent,
  PaginatedResponse,
  Recording,
} from '@/types';

export const programsKeys = {
  all: ['programs'] as const,
  live: () => [...programsKeys.all, 'live'] as const,
  liveList: (params: LiveEventsListParams) =>
    [...programsKeys.live(), 'list', params] as const,
  liveNow: () => [...programsKeys.live(), 'now'] as const,
  detail: (id: string) => [...programsKeys.live(), 'detail', id] as const,
  recordings: () => [...programsKeys.all, 'recordings'] as const,
  recordingsList: (params: RecordingsListParams) =>
    [...programsKeys.recordings(), 'list', params] as const,
  recordingDetail: (id: string) =>
    [...programsKeys.recordings(), 'detail', id] as const,
};

export function useLiveEvents(
  params: LiveEventsListParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<LiveEvent>>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<PaginatedResponse<LiveEvent>>({
    queryKey: programsKeys.liveList(params),
    queryFn: () => fetchLiveEvents(params),
    ...options,
  });
}

export function useLiveNow(
  options?: Omit<UseQueryOptions<LiveEvent[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<LiveEvent[]>({
    queryKey: programsKeys.liveNow(),
    queryFn: fetchLiveNow,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useLiveEventById(id: string | undefined) {
  return useQuery<LiveEvent>({
    queryKey: programsKeys.detail(id ?? ''),
    queryFn: () => fetchLiveEventById(id as string),
    enabled: !!id,
  });
}

export function useRecordings(
  params: RecordingsListParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Recording>>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<PaginatedResponse<Recording>>({
    queryKey: programsKeys.recordingsList(params),
    queryFn: () => fetchRecordings(params),
    ...options,
  });
}

export function useRecordingById(id: string | undefined) {
  return useQuery<Recording>({
    queryKey: programsKeys.recordingDetail(id ?? ''),
    queryFn: () => fetchRecordingById(id as string),
    enabled: !!id,
  });
}

// Convenience hook for EPG grid: get live events for a given channel on a given date range
export function useEpgSchedule(
  date: Date,
  channelIds: string[] = [],
) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);

  // Send one channelId at a time if we have specific channels to filter by
  const sortedIds = [...channelIds].sort();
  const firstChannelId = sortedIds[0];

  return useQuery({
    queryKey: programsKeys.liveList({
      fromDate: day.toISOString(),
      toDate: nextDay.toISOString(),
      limit: 500,
      channelId: firstChannelId,
    }),
    queryFn: () =>
      fetchLiveEvents({
        fromDate: day.toISOString(),
        toDate: nextDay.toISOString(),
        limit: 500,
      }),
    staleTime: 60 * 1000,
  });
}

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
  fetchSimilarRecordings,
  fetchEpgDay,
  type LiveEventsListParams,
  type RecordingsListParams,
  type EpgDayResponse,
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
  epgDay: (date: string, channelIds: string[] | undefined) =>
    [...programsKeys.all, 'epgDay', { date, channelIds }] as const,
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

export function useLiveEventById(
  id: string | undefined,
  options?: Omit<
    import('@tanstack/react-query').UseQueryOptions<LiveEvent>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<LiveEvent>({
    queryKey: programsKeys.detail(id ?? ''),
    queryFn: () => fetchLiveEventById(id as string),
    enabled: !!id,
    ...options,
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

export function useSimilarRecordings(id: string | undefined, limit = 6) {
  return useQuery<Recording[]>({
    queryKey: [...programsKeys.recordings(), 'similar', id, limit],
    queryFn: () => fetchSimilarRecordings(id as string, limit),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

// ============================================================
// EPG Day Hook
// ============================================================

/**
 * Convert a Date to YYYY-MM-DD in the **local** timezone so the EPG day
 * matches the user's wall-clock day, not UTC. The backend treats the
 * `date` parameter as UTC, so we add an offset hint via ISO string with
 * timezone. To keep things simple and consistent with the rest of the app
 * we send the local Y-M-D and let the server treat it as UTC — for
 * Vietnam (UTC+7) this is the same calendar day the user sees.
 */
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Fetch a single day's EPG (24-hour schedule) for one or more channels.
 *
 * The backend `/programs/epg/day` endpoint guarantees **dense coverage**:
 * it returns the real `LiveEvent` rows plus synthesised filler slots
 * (recording-replay or channel-branding) so every channel is fully
 * scheduled from 00:00 to 23:59 on the requested day, every day.
 *
 * @param date     Any date within the desired day (local timezone).
 * @param channelIds Optional whitelist. When omitted, the backend returns
 *                 every active channel.
 */
export function useEpgDay(
  date: Date,
  channelIds?: string[],
  options?: Omit<
    UseQueryOptions<EpgDayResponse>,
    'queryKey' | 'queryFn'
  >,
) {
  const isoDate = toIsoDate(date);
  const stableChannelIds = channelIds && channelIds.length > 0
    ? [...channelIds].sort()
    : undefined;

  return useQuery<EpgDayResponse>({
    queryKey: programsKeys.epgDay(isoDate, stableChannelIds),
    queryFn: () => fetchEpgDay({ date: isoDate, channelIds: stableChannelIds }),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

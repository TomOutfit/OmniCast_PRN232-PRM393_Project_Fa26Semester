// ============================================================
// OmniCast - Live Studio React Query Hooks
// ============================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBroadcastableRecordings,
  fetchCatalogStreams,
  curateLive,
  stopLive,
  uploadSelfRecordFile,
  uploadSelfRecord,
  broadcastLocalFile,
  addFromCatalog,
  type CurateLiveInput,
  type StopLiveInput,
  type SelfRecordUploadInput,
  type AddFromCatalogInput,
  type BroadcastLocalFileInput,
  type BroadcastLocalFileResult,
} from '@/lib/api/live-studio';

export const liveStudioKeys = {
  all: ['live-studio'] as const,
  broadcastable: (channelId: string, search?: string) =>
    [...liveStudioKeys.all, 'broadcastable', channelId, search] as const,
  catalog: (channelSlug?: string, search?: string) =>
    [...liveStudioKeys.all, 'catalog', channelSlug ?? '__all__', search ?? '__none__'] as const,
};

export function useBroadcastableRecordings(
  channelId: string | undefined,
  search?: string,
  limit: number = 50,
  allOmnicast: boolean = false,
) {
  return useQuery({
    queryKey: [...liveStudioKeys.broadcastable(allOmnicast ? 'all' : (channelId || ''), search), allOmnicast],
    queryFn: () => fetchBroadcastableRecordings(channelId || 'all', search, limit, allOmnicast),
    enabled: !!channelId || allOmnicast,
    staleTime: 10 * 1000,
  });
}

export function useCatalogStreams(
  channelSlug?: string,
  options: { verifiedOnly?: boolean; search?: string } = {},
) {
  return useQuery({
    queryKey: liveStudioKeys.catalog(channelSlug, options.search),
    queryFn: () => fetchCatalogStreams(channelSlug, options),
    staleTime: 5 * 60 * 1000, // catalog is static — cache for 5 minutes
  });
}

export function useCurateLive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CurateLiveInput) => curateLive(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs', 'live-events'] });
      queryClient.invalidateQueries({ queryKey: ['programs', 'live-now'] });
    },
  });
}

export function useStopLive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      payload,
    }: {
      eventId: string;
      payload?: StopLiveInput;
    }) => stopLive(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs', 'live-events'] });
      queryClient.invalidateQueries({ queryKey: ['programs', 'live-now'] });
    },
  });
}

export function useUploadSelfRecordFile() {
  return useMutation({
    mutationFn: ({
      file,
      title,
      onProgress,
    }: {
      file: File;
      title?: string;
      onProgress?: (percent: number) => void;
    }) => uploadSelfRecordFile(file, title, onProgress),
  });
}

export function useUploadSelfRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SelfRecordUploadInput) => uploadSelfRecord(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs', 'live-events'] });
      queryClient.invalidateQueries({ queryKey: ['programs', 'live-now'] });
      queryClient.invalidateQueries({ queryKey: ['programs', 'recordings'] });
    },
  });
}

export function useAddFromCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddFromCatalogInput) => addFromCatalog(payload),
    onSuccess: () => {
      // Invalidate broadcastable recordings so the newly added
      // catalog item appears in the picker immediately.
      queryClient.invalidateQueries({
        queryKey: liveStudioKeys.broadcastable(''),
      });
    },
  });
}

/**
 * Broadcast a local PC file (drag-and-drop or file picker) up to
 * Cloudinary, then register it on the channel library. Surfaces
 * per-file progress via `onProgress` and supports `AbortSignal`
 * for cancel mid-flight. On register failure, the helper
 * best-effort deletes the orphan Cloudinary asset.
 *
 * Used by the new `<UploadQueue />` in Mode 1 of the Studio.
 */
export function useBroadcastLocalFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BroadcastLocalFileInput): Promise<BroadcastLocalFileResult> =>
      broadcastLocalFile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs', 'live-events'] });
      queryClient.invalidateQueries({ queryKey: ['programs', 'live-now'] });
      queryClient.invalidateQueries({ queryKey: ['programs', 'recordings'] });
      queryClient.invalidateQueries({
        queryKey: ['live-studio', 'broadcastable'],
      });
    },
  });
}

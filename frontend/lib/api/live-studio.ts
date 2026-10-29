// ============================================================
// OmniCast - Live Studio API Client
// ============================================================

import apiClient, { getApiBaseUrl } from '@/lib/api';
import {
  deleteCloudinaryAsset,
  signCloudinaryUpload,
  uploadToCloudinaryDirect,
  CloudinaryAbortError,
  type CloudinaryUploadEnvelope,
} from '@/lib/api/cloudinary';

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
  allowDevLicense?: boolean;
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

// ============================================================
// Webcam Live (WebRTC / WHIP publish)
// ============================================================

export interface IngestConfig {
  /** LAN IP / hostname of the machine running MediaMTX. */
  publicHost: string;
  /** Base HLS URL, e.g. `http://192.168.2.74:8888`. */
  hlsUrl: string;
  /** Template for the multivariant manifest. */
  hlsIndexUrlTemplate: string;
  /** Base WebRTC URL, e.g. `ws://192.168.2.74:8889`. */
  webrtcUrl: string;
  /** Base WHIP URL, e.g. `http://192.168.2.74:8889`. */
  whipUrl: string;
  /** Template for the WHIP publish endpoint. */
  whipUrlTemplate: string;
  /** Base RTMP URL. */
  rtmpUrl: string;
  rtmpUrlTemplate: string;
  /** Codecs MediaMTX can remux into HLS. */
  supportedVideoCodecs: string[];
  supportedAudioCodecs: string[];
}

export interface WebcamLiveStartInput {
  channelSlug: string;
  title?: string;
  description?: string;
}

export interface WebcamLiveStartResult {
  event: any;
  eventId: string;
  channelSlug: string;
  streamUrl: string;
  ingestConfig: IngestConfig;
  message: string;
}

export interface WebcamLiveStopResult {
  event: any;
  message: string;
}

export async function fetchIngestConfig(): Promise<IngestConfig> {
  const res = await apiClient.get('/programs/studio/live/ingest-config');
  const data = res.data;

  // Wi-Fi Stream Optimization: If accessed from another device on the same LAN,
  // adapt any localhost URLs to the active LAN hostname
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    const lanHost = window.location.hostname;
    const rewrite = (u?: string) =>
      u ? u.replace(/\b(localhost|127\.0\.0\.1)\b/g, lanHost) : u;

    return {
      ...data,
      publicHost:
        data.publicHost === 'localhost' || data.publicHost === '127.0.0.1'
          ? lanHost
          : data.publicHost,
      hlsUrl: rewrite(data.hlsUrl)!,
      hlsIndexUrlTemplate: rewrite(data.hlsIndexUrlTemplate)!,
      webrtcUrl: rewrite(data.webrtcUrl)!,
      whipUrl: rewrite(data.whipUrl)!,
      whipUrlTemplate: rewrite(data.whipUrlTemplate)!,
    };
  }

  return data;
}

export async function startWebcamLive(
  payload: WebcamLiveStartInput,
): Promise<WebcamLiveStartResult> {
  const res = await apiClient.post(
    '/programs/studio/live/webcam/start',
    payload,
    { timeout: 30000 },
  );
  return res.data;
}

export async function stopWebcamLive(
  eventId: string,
): Promise<WebcamLiveStopResult> {
  const res = await apiClient.post(
    '/programs/studio/live/webcam/stop',
    { eventId },
    { timeout: 30000 },
  );
  return res.data;
}

/**
 * Best-effort "stop the live" call used when the broadcaster
 * component is unmounted (page reload / navigation / tab close).
 *
 * `navigator.sendBeacon()` cannot be used here because the endpoint
 * requires the `Authorization: Bearer` header, and sendBeacon does
 * not support custom headers. `fetch(..., { keepalive: true })` does
 * — and `keepalive` lets the request survive the page teardown.
 *
 * Failures are swallowed on purpose: this runs during unmount, so
 * there is no UI left to report an error to.
 */
export function stopWebcamLiveOnUnmount(eventId: string): void {
  if (typeof window === 'undefined' || !eventId) return;

  try {
    const token = localStorage.getItem('accessToken');
    void fetch(`${getApiBaseUrl()}/programs/studio/live/webcam/stop`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ eventId }),
    }).catch(() => undefined);
  } catch {
    /* ignore — best effort only */
  }
}

export async function fetchBroadcastableRecordings(
  channelId: string,
  search?: string,
  limit: number = 50,
  allOmnicast: boolean = false,
): Promise<{ total: number; items: BroadcastableRecording[] }> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (limit) params.append('limit', limit.toString());
  if (allOmnicast) params.append('all', 'true');

  const targetChannel = allOmnicast ? 'all' : channelId;
  const res = await apiClient.get(
    `/programs/studio/channels/${targetChannel}/recordings?${params.toString()}`,
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
  const res = await apiClient.post('/programs/studio/curate-live', payload, {
    timeout: 60000,
  });
  return res.data;
}

export async function stopLive(eventId: string, payload?: StopLiveInput) {
  const res = await apiClient.post(
    `/programs/studio/live-events/${eventId}/stop`,
    payload || {},
    { timeout: 30000 },
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
      timeout: 0, // Disable 15s timeout for large media uploads
      headers: {
        'Content-Type': undefined, // Let Axios/browser automatically supply boundary
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
    { timeout: 60000 },
  );
  return res.data;
}

// ============================================================
// Broadcast a local file to Cloudinary + register it as a
// Recording on the channel library. Used by Mode 1 of the web
// Studio (drag-and-drop + "PHÁT SÓNG" button).
//
// Flow:
//   1. `useCloudinaryUpload` signs + uploads the bytes directly to
//      Cloudinary (bypasses the 4.5 MB Vercel body limit).
//   2. We then POST the resulting `secure_url` to
//      `/programs/studio/recordings/upload` so the Recording
//      row is persisted with metadata (title, duration, visibility).
//   3. If step 2 fails, we best-effort delete the orphan asset
//      on Cloudinary so it doesn't accumulate.
//
// On cancel (caller aborts `signal`), we delete the Cloudinary
// asset ONLY if the upload step finished (`publicId` is set).
// Mid-flight cancels are handled by the XHR abort inside the
// Cloudinary client — we don't need to call delete in that case.
// ============================================================

export interface BroadcastLocalFileInput {
  file: File;
  channelSlug: string;
  title: string;
  description?: string;
  visibility?: 'IMMEDIATE' | 'SCHEDULED' | 'PRIVATE';
  tags?: string[];
  duration?: number;
  /** AbortSignal — abort() cancels the Cloudinary XHR mid-flight. */
  signal?: AbortSignal;
  /** Progress callback (percent 0..100). */
  onProgress?: (percent: number, loaded: number, total: number) => void;
  /** Callback fired when transitioning between stages (signing -> uploading -> registering -> done). */
  onPhaseChange?: (phase: 'signing' | 'uploading' | 'registering' | 'done') => void;
}

export interface BroadcastLocalFileResult {
  recording: any;
  videoUrl: string;
  envelope: CloudinaryUploadEnvelope;
}

export async function broadcastLocalFile(
  input: BroadcastLocalFileInput,
): Promise<BroadcastLocalFileResult> {
  const {
    file,
    channelSlug,
    title,
    description,
    visibility = 'SCHEDULED',
    tags,
    duration = 180,
    signal,
    onProgress,
    onPhaseChange,
  } = input;

  // 1. Sign + upload to Cloudinary
  let envelope: CloudinaryUploadEnvelope;
  try {
    onPhaseChange?.('signing');
    const signed = await signCloudinaryUpload({
      channelSlug,
      title,
      tags: ['studio-local-upload', ...(tags ?? [])],
    });

    onPhaseChange?.('uploading');
    const result = await uploadToCloudinaryDirect(signed, file, {
      onProgress,
      signal,
    });
    envelope = {
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      durationSec: result.duration,
      width: result.width,
      height: result.height,
      thumbnailUrl:
        result.eager?.[0]?.secure_url ??
        (signed.cloudName && result.public_id
          ? `https://res.cloudinary.com/${signed.cloudName}/image/upload/w_640,h_360,c_fill,so_1.0/${result.public_id}.jpg`
          : undefined),
      format: result.format,
      resourceType: result.resource_type,
    };
  } catch (err) {
    // Re-throw aborts so the page can mark the row `cancelled`.
    if (err instanceof CloudinaryAbortError || signal?.aborted) {
      throw err;
    }
    // Other failures (sign 503, upload 4xx) bubble up.
    throw err;
  }

  // 2. Persist the Recording on the channel library.
  try {
    onPhaseChange?.('registering');
    const res = await uploadSelfRecord({
      channelId: channelSlug,
      title,
      description,
      videoUrl: envelope.url,
      thumbnailUrl: envelope.thumbnailUrl,
      duration: Math.max(1, Math.round(envelope.durationSec ?? duration)),
      visibility,
      tags: ['studio-local-upload', ...(tags ?? [])],
    });
    onPhaseChange?.('done');
    return {
      recording: res?.recording ?? res?.data?.recording ?? res,
      videoUrl: envelope.url,
      envelope,
    };
  } catch (err) {
    // 3. Best-effort orphan cleanup. We log but don't rethrow
    //    the cleanup failure — the real error (register failed)
    //    is what the user cares about.
    await deleteCloudinaryAsset(envelope.publicId, 'video', 'register_failed');
    throw err;
  }
}

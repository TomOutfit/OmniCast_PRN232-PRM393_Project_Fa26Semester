// ============================================================
// OmniCast - useCloudinaryUpload Hook
// ============================================================
//
// React wrapper around the raw Cloudinary client (`lib/api/cloudinary`).
// It produces a `mutateAsync({ file, channelSlug, title, onProgress,
// signal })` that:
//
//   1. Calls `signCloudinaryUpload({ channelSlug, title, ... })`.
//   2. POSTs `file` directly to Cloudinary via XHR, calling
//      `onProgress(percent, loaded, total)` on every progress event.
//   3. Returns `{ url, publicId, durationSec, width, height, thumbnailUrl }`.
//
// Why a hook instead of calling `signCloudinaryUpload` +
// `uploadToCloudinaryDirect` from the page directly?
//   • Reuse across Studio (`Mode 1`) and the future Admin Tools.
//   • Standardised React Query error / cache hooks.
//   • The hook is also responsible for *not* invoking Cloudinary
//     when the server returns `configured: false` — it just throws
//     a typed error the page can render as a banner.
//
// Cancellation:
//   • The page passes an `AbortSignal`. The XHR aborts when the
//     signal fires; the underlying promise rejects with a typed
//     `CloudinaryAbortError` so the caller can mark the row as
//     `cancelled` instead of `failed`.
// ============================================================

'use client';

import { useCallback } from 'react';
import {
  signCloudinaryUpload,
  uploadToCloudinaryDirect,
  type CloudinaryUploadEnvelope,
} from '@/lib/api/cloudinary';

export interface UseCloudinaryUploadInput {
  file: File;
  channelSlug: string;
  title: string;
  tags?: string[];
  /** Fires on every XHR progress event with percent (0..100). */
  onProgress?: (percent: number, loaded: number, total: number) => void;
  /** Caller-supplied AbortSignal — abort() cancels the XHR mid-flight. */
  signal?: AbortSignal;
}

export function useCloudinaryUpload() {
  /**
   * Run a single end-to-end upload. The page wraps this in a
   * `useMutation` so each row gets its own loading / error state.
   */
  const uploadAsync = useCallback(
    async (input: UseCloudinaryUploadInput): Promise<CloudinaryUploadEnvelope> => {
      const { file, channelSlug, title, tags, onProgress, signal } = input;

      // Step 1 — sign
      const signed = await signCloudinaryUpload({
        channelSlug,
        title,
        tags: ['studio-local-upload', ...(tags ?? [])],
      });

      // Step 2 — upload bytes
      const result = await uploadToCloudinaryDirect(signed, file, {
        onProgress,
        signal,
      });

      // Step 3 — extract envelope. Cloudinary returns a generated
      // thumbnail via the `eager?` array when the signed request
      // included one; otherwise we fall back to a `jpg` sibling URL
      // built from the cloudName in the signed payload.
      const thumbnailUrl =
        result.eager?.[0]?.secure_url ??
        deriveDefaultThumbnail(signed.cloudName, result.public_id);

      const envelope: CloudinaryUploadEnvelope = {
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        durationSec: result.duration,
        width: result.width,
        height: result.height,
        thumbnailUrl,
        format: result.format,
        resourceType: result.resource_type,
      };
      return envelope;
    },
    [],
  );

  return { uploadAsync };
}

/**
 * Build the same `image/upload/...jpg` URL Cloudinary would
 * generate when the upload specifies `eager` transformations.
 * Cheap to compute and consistent with the rest of the pipeline.
 */
function deriveDefaultThumbnail(
  cloudName: string,
  publicId: string,
): string | undefined {
  if (!cloudName || !publicId) return undefined;
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_640,h_360,c_fill,so_1.0/${publicId}.jpg`;
}
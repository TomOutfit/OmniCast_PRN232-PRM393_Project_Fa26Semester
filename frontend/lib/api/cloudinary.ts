// ============================================================
// OmniCast - Cloudinary API Client
// ============================================================
//
// The web Studio uses Cloudinary as its primary upload backend.
// This module exposes three functions:
//
//   1. `signCloudinaryUpload` — asks the API host to sign a
//      direct-upload payload. The API returns the full signed
//      envelope (apiKey, signature, timestamp, folder, publicId,
//      uploadUrl).
//
//   2. `uploadToCloudinaryDirect` — POSTs the actual file bytes
//      straight to Cloudinary using the signed payload. Uses
//      XMLHttpRequest (not `axios`) because we need granular
//      `progress.loaded / progress.total` events AND a clean
//      `abort()` mid-flight. Axios can't do both reliably.
//
//   3. `deleteCloudinaryAsset` — best-effort cleanup. Called
//      fire-and-forget by the Studio when an upload is cancelled
//      or the register step fails.
//
//   4. `getCloudinaryHealth` — operator-facing snapshot used by
//      the Studio banner to decide whether to show the "Cloudinary
//      chưa cấu hình" warning.
//
// All four functions are tree-shakeable; the page imports only
// what it needs.
// ============================================================

import apiClient from '@/lib/api';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface SignCloudinaryInput {
  channelSlug: string;
  title: string;
  maxBytes?: number;
  tags?: string[];
}

export interface CloudinarySignedPayload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  resourceType: 'video' | 'image' | 'raw' | 'auto';
  tags: string[];
  allowedFormats: string[];
  maxFileSize: number;
  context: string;
  uploadUrl: string;
}

export interface CloudinaryUploadInput {
  url: string;
  publicId: string;
  bytes: number;
  resourceType: string;
  format: string;
  durationSec?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export interface CloudinaryHealthStatus {
  configured: boolean;
  cloudName: string;
  defaultFolder: string;
}

/**
 * Final envelope returned by the Cloudinary upload flow. Lives in
 * the API module (not the hook) so any consumer — including the
 * Studio page that calls `broadcastLocalFile` directly — can refer
 * to a single shared shape.
 */
export interface CloudinaryUploadEnvelope {
  url: string;
  publicId: string;
  bytes: number;
  resourceType: string;
  format?: string;
  durationSec?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

// ------------------------------------------------------------
// Errors
// ------------------------------------------------------------

/**
 * Base error thrown by `uploadToCloudinaryDirect`. Subclasses let
 * the Studio queue decide which retry copy to show.
 */
export class CloudinaryError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'CloudinaryError';
    this.code = code;
    this.cause = cause;
  }
}

export class CloudinarySignError extends CloudinaryError {
  constructor(message: string, cause?: unknown) {
    super('sign_failed', message, cause);
    this.name = 'CloudinarySignError';
  }
}

export class CloudinaryUploadError extends CloudinaryError {
  readonly status?: number;
  constructor(message: string, status?: number, cause?: unknown) {
    super('upload_failed', message, cause);
    this.name = 'CloudinaryUploadError';
    this.status = status;
  }
}

export class CloudinaryAbortError extends CloudinaryError {
  constructor(message = 'Upload cancelled by user.') {
    super('aborted', message);
    this.name = 'CloudinaryAbortError';
  }
}

// ------------------------------------------------------------
// 1. Sign
// ------------------------------------------------------------

export async function signCloudinaryUpload(
  input: SignCloudinaryInput,
): Promise<CloudinarySignedPayload> {
  try {
    const res = await apiClient.post('/uploads/cloudinary/sign', input);
    // The interceptor in lib/api.ts auto-unwraps `data` when the
    // response is `{ success, data, message }` without `meta`.
    // If the controller returned `{ data: payload }` or nested envelopes,
    // safely unwrap down to the payload containing `signature` / `uploadUrl`.
    let payload = res.data as any;
    while (
      payload &&
      typeof payload === 'object' &&
      'data' in payload &&
      payload.data &&
      typeof payload.data === 'object' &&
      !('signature' in payload)
    ) {
      payload = payload.data;
    }
    if (!payload || typeof payload !== 'object' || !payload.signature || !payload.uploadUrl) {
      throw new CloudinarySignError('Invalid signed Cloudinary response payload from server.');
    }
    return payload as CloudinarySignedPayload;
  } catch (err: any) {
    const apiMsg =
      err?.response?.data?.message ??
      err?.message ??
      'Cloudinary sign request failed.';
    throw new CloudinarySignError(apiMsg, err);
  }
}

// ------------------------------------------------------------
// 2. Direct upload (XHR with progress + AbortSignal)
// ------------------------------------------------------------

export interface UploadToCloudinaryDirectOptions {
  onProgress?: (percent: number, loaded: number, total: number) => void;
  signal?: AbortSignal;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  bytes: number;
  resource_type: string;
  format: string;
  duration?: number;
  width?: number;
  height?: number;
  eager?: Array<{ secure_url: string }>;
}

/**
 * POSTs `file` to `signed.uploadUrl` with the required signed
 * form fields. Returns Cloudinary's JSON envelope.
 *
 * Why XHR?
 *   • `axios.post` doesn't expose `progress.loaded / progress.total`
 *     without the `onUploadProgress` adapter — and even then,
 *     aborting mid-upload requires manual `CancelToken` plumbing.
 *   • The mobile repo uses `XMLHttpRequest` for the same reason.
 *
 * Throws:
 *   • `CloudinaryAbortError` if `signal.aborted` fires.
 *   • `CloudinaryUploadError` if Cloudinary replies non-2xx or
 *     the network drops.
 */
export function uploadToCloudinaryDirect(
  signed: CloudinarySignedPayload,
  file: File,
  options: UploadToCloudinaryDirectOptions = {},
): Promise<CloudinaryUploadResponse> {
  return new Promise<CloudinaryUploadResponse>((resolve, reject) => {
    if (!signed || !signed.uploadUrl) {
      reject(new CloudinaryUploadError('Missing uploadUrl in signed Cloudinary payload.'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', signed.uploadUrl, true);
    // Cloudinary accepts multipart/form-data with these fields.
    // The browser fills in the boundary when we set the header
    // ourselves.
    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const percent = Math.round((evt.loaded * 100) / evt.total);
      options.onProgress?.(percent, evt.loaded, evt.total);
    };
    xhr.onerror = () => {
      reject(
        new CloudinaryUploadError(
          'Network error during Cloudinary upload.',
          undefined,
          xhr,
        ),
      );
    };
    xhr.onabort = () => {
      reject(new CloudinaryAbortError());
    };
    xhr.onload = () => {
      // Cloudinary replies with 200 on success and a JSON body.
      // Any 2xx is OK; non-2xx carries an `error` message.
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body: CloudinaryUploadResponse = JSON.parse(xhr.responseText);
          resolve(body);
        } catch (parseErr) {
          reject(
            new CloudinaryUploadError(
              'Cloudinary response was not valid JSON.',
              xhr.status,
              parseErr,
            ),
          );
        }
        return;
      }

      // Try to surface the Cloudinary error message verbatim.
      let message = `Cloudinary upload failed (HTTP ${xhr.status}).`;
      try {
        const body = JSON.parse(xhr.responseText);
        if (body?.error?.message) message = body.error.message;
      } catch {
        // keep generic message
      }
      reject(new CloudinaryUploadError(message, xhr.status, xhr));
    };

    // Hook up AbortSignal -> xhr.abort()
    if (options.signal) {
      if (options.signal.aborted) {
        reject(new CloudinaryAbortError());
        return;
      }
      options.signal.addEventListener('abort', () => {
        // The `onabort` handler will reject with the right error.
        xhr.abort();
      });
    }

    // Build the multipart payload. We use `FormData` so the
    // browser sets the correct `Content-Type` with boundary.
    const fd = new FormData();
    fd.append('file', file);
    if (signed.apiKey) fd.append('api_key', signed.apiKey);
    if (signed.timestamp) fd.append('timestamp', String(signed.timestamp));
    if (signed.signature) fd.append('signature', signed.signature);
    if (signed.folder) fd.append('folder', signed.folder);
    if (signed.publicId) fd.append('public_id', signed.publicId);

    const tags = Array.isArray(signed.tags)
      ? signed.tags.join(',')
      : (typeof signed.tags === 'string' ? signed.tags : '');
    if (tags) {
      fd.append('tags', tags);
    }

    if (signed.context) {
      fd.append('context', signed.context);
    }

    const allowedFormats = Array.isArray(signed.allowedFormats)
      ? signed.allowedFormats.join(',')
      : (typeof signed.allowedFormats === 'string'
        ? signed.allowedFormats
        : (typeof (signed as any)?.allowed_formats === 'string'
          ? (signed as any).allowed_formats
          : 'mp4,mov,m4v,webm,mkv'));
    if (allowedFormats) {
      fd.append('allowed_formats', allowedFormats);
    }

    xhr.send(fd);
  });
}

// ------------------------------------------------------------
// 3. Delete (best-effort cleanup)
// ------------------------------------------------------------

export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType: 'video' | 'image' | 'raw' | 'auto' = 'video',
  reason?: string,
): Promise<{ result: 'ok' | 'not found'; publicId: string }> {
  try {
    const res = await apiClient.delete('/uploads/cloudinary/asset', {
      data: { publicId, resourceType, reason },
    });
    let data = res.data as any;
    while (
      data &&
      typeof data === 'object' &&
      'data' in data &&
      data.data &&
      typeof data.data === 'object' &&
      !('result' in data)
    ) {
      data = data.data;
    }
    return data as { result: 'ok' | 'not found'; publicId: string };
  } catch (err: any) {
    // Swallow non-2xx so callers can `.catch(noop)` for cleanup.
    // Log so dev / preview mode still surfaces the failure.
    if (typeof console !== 'undefined') {
      console.warn('[Cloudinary] delete failed for', publicId, err?.message);
    }
    return { result: 'not found', publicId };
  }
}

// ------------------------------------------------------------
// 4. Health snapshot
// ------------------------------------------------------------

export async function getCloudinaryHealth(): Promise<CloudinaryHealthStatus> {
  const res = await apiClient.get('/uploads/cloudinary/health');
  let data = res.data as any;
  while (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    data.data &&
    typeof data.data === 'object' &&
    !('configured' in data)
  ) {
    data = data.data;
  }
  return data as CloudinaryHealthStatus;
}
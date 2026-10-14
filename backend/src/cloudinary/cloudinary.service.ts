// ============================================================
// OmniCast - Cloudinary Storage Adapter
// ============================================================
//
// Production storage backend for Studio uploads. The previous
// `StorageService` writes to the local filesystem, which:
//   • Works fine on a long-running Node host (Railway / Fly).
//   • **Breaks on Vercel** — serverless functions have no
//     persistent filesystem, so the URL a client just got points
//     at a file that disappears once the cold-start cycle ends.
//   • Hits Vercel's 4.5 MB body size limit on the route that
//     proxies the file through the API.
//
// Cloudinary fixes both:
//   • Videos live on Cloudinary's CDN, not on the API host.
//   • Mobile uploads the file directly to Cloudinary using a
//     signed payload that the API hands out. The video bytes
//     never go through Vercel at all → no 4.5 MB limit.
//   • Free tier: 25 GB storage + 25 GB bandwidth/month.
//
// Two flows are exposed:
//
//   1. `signDirectUpload(params)`  — returns a signed payload the
//      mobile client uses to PUT/POST the file straight to
//      `https://api.cloudinary.com/v1_1/<cloud>/auto/upload`.
//      The mobile app then calls `addToLibrary` with the
//      resulting `secure_url`. This is the primary path.
//
//   2. `uploadFromBuffer(buffer, opts)` — for callers that
//      already have a Buffer (e.g. admin web tool). Uses
//      `upload_stream` so we never materialise the whole file
//      in memory twice. 100 MB hard cap (Cloudinary free tier).
//
// All operations are gated on the CLOUDINARY_* env vars; if
// the credentials are missing we throw a clear "not configured"
// error so the caller can fall back to local storage. Either
// CLOUDINARY_URL (preferred for Heroku / Vercel / Render) or the
// three individual CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY /
// CLOUDINARY_API_SECRET vars may be used.
// ============================================================

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, ConfigOptions, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

export interface CloudinarySignParams {
  /** Channel slug (used as folder name so operators can browse per-channel). */
  channelSlug: string;
  /** Original filename — Cloudinary will keep this as the public_id stem. */
  originalName: string;
  /** Override the resource type (default: 'video'). */
  resourceType?: 'video' | 'image' | 'raw' | 'auto';
  /** Tag the upload so it shows up in Studio filters. */
  tags?: string[];
  /** Optional context key/value pairs (Cloudinary metadata). */
  context?: Record<string, string>;
  /** Max upload size in bytes (capped at 100 MB on the free tier). */
  maxBytes?: number;
}

export interface CloudinarySignedPayload {
  /** Cloudinary cloud name — the client needs it to build the URL. */
  cloudName: string;
  /** Cloudinary API key (NOT the secret — safe to send over TLS). */
  apiKey: string;
  /** Unix timestamp the signature expires. */
  timestamp: number;
  /** HMAC-SHA1 signature, hex-encoded. */
  signature: string;
  /** Folder to upload into. */
  folder: string;
  /** Public ID (without extension). Empty string → Cloudinary generates. */
  publicId: string;
  /** Resource type ('video' for our case). */
  resourceType: 'video' | 'image' | 'raw' | 'auto';
  /** Tags to attach. */
  tags: string[];
  /** Allowed formats. */
  allowedFormats: string[];
  /** Max file size in bytes (Cloudinary rejects uploads larger). */
  maxFileSize: number;
  /** Context metadata as `key=value` pairs joined by `|`. */
  context: string;
  /** Direct upload endpoint URL. */
  uploadUrl: string;
}

export interface CloudinaryUploadResult {
  /** Public, CDN-served URL (https). The Studio persists this in `videoUrl`. */
  url: string;
  /** Cloudinary public_id (used for later delete / re-transform). */
  publicId: string;
  /** Asset bytes. */
  bytes: number;
  /** Cloudinary resource type as the platform reports it. */
  resourceType: string;
  /** Cloudinary format (mp4 / mov / ...). */
  format: string;
  /** Duration in seconds for video assets. */
  durationSec?: number;
  /** Thumbnail URL (auto-generated for videos). */
  thumbnailUrl?: string;
  /** Width × Height for video. */
  width?: number;
  height?: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  /** Cached credentials — pulled once at construction. */
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly defaultFolder: string;

  /** Free-tier hard cap. 100 MB per file. */
  static readonly FREE_TIER_MAX_BYTES = 100 * 1024 * 1024;

  constructor(config: ConfigService) {
    // Resolve credentials from either CLOUDINARY_URL (preferred for
    // platforms that expose a single env field) or the individual
    // CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
    // trio (preferred for local .env files). If both are set, the
    // URL wins.
    const urlCreds = CloudinaryService.parseCloudinaryUrl(
      config.get<string>('CLOUDINARY_URL') ?? '',
    );

    this.cloudName =
      urlCreds?.cloudName ??
      config.get<string>('CLOUDINARY_CLOUD_NAME') ??
      '';
    this.apiKey =
      urlCreds?.apiKey ?? config.get<string>('CLOUDINARY_API_KEY') ?? '';
    this.apiSecret =
      urlCreds?.apiSecret ??
      config.get<string>('CLOUDINARY_API_SECRET') ??
      '';
    this.defaultFolder =
      config.get<string>('CLOUDINARY_DEFAULT_FOLDER') ?? 'omnicast-studio';

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      this.logger.warn(
        '[CloudinaryService] Cloudinary credentials not set — set either ' +
          'CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / ' +
          'CLOUDINARY_API_SECRET. Until then, signed uploads and server-side ' +
          'uploads will fail with ServiceUnavailableException. Add them to ' +
          'backend/.env to enable the Studio upload flow.',
      );
      this.configured = false;
      return;
    }

    const opts: ConfigOptions = {
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    };
    cloudinary.config(opts);
    this.configured = true;
    this.logger.log(
      `[CloudinaryService] Configured for cloud "${this.cloudName}", ` +
        `default folder "${this.defaultFolder}".`,
    );
  }

  /**
   * Parse `cloudinary://<api_key>:<api_secret>@<cloud_name>` into its
   * three components. Returns `null` for missing / malformed URLs.
   *
   * Why a custom parser instead of `new URL(...)`?
   * ------------------------------------------------
   * The `cloudinary://` scheme has no host part in the standard URL
   * sense — the `cloud_name` lives in the userinfo segment. `new URL`
   * either rejects the scheme or mis-parses it depending on the
   * runtime, so a tiny explicit regex is more reliable across Node
   * versions and easier to audit. URL-decodes each piece so a secret
   * with `@` / `:` / `/` survives the round-trip.
   */
  private static parseCloudinaryUrl(
    raw: string,
  ): { cloudName: string; apiKey: string; apiSecret: string } | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed.toLowerCase().startsWith('cloudinary://')) return null;
    const match = trimmed.match(
      /^cloudinary:\/\/([^:/]+):([^@]+)@([^/?#]+)/i,
    );
    if (!match) return null;
    const apiKey = safeDecode(match[1]);
    const apiSecret = safeDecode(match[2]);
    const cloudName = safeDecode(match[3]);
    if (!apiKey || !apiSecret || !cloudName) return null;
    return { apiKey, apiSecret, cloudName };
  }

  /**
   * True if all three credentials are present. Controllers can use
   * this to short-circuit before throwing.
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Operator-facing health snapshot. Returns ONLY non-sensitive
   * metadata so it is safe to expose to staff/admin tooling.
   *
   *   - `configured` — whether the service can sign / upload.
   *   - `cloudName`  — public identifier of the Cloudinary tenant.
   *   - `defaultFolder` — base folder under which uploads land.
   *
   * NEVER add `apiKey` / `apiSecret` / `CLOUDINARY_URL` here. If
   * you need them for a one-off ops check, do it from the terminal
   * via `heroku config:get CLOUDINARY_URL` etc., not via an API.
   */
  getStatus(): {
    configured: boolean;
    cloudName: string;
    defaultFolder: string;
  } {
    return {
      configured: this.configured,
      // Only surface the cloud name if configured. Otherwise we'd
      // leak "I have NO cloud" to anonymous callers — fine, but
      // returning a uniform shape is cleaner.
      cloudName: this.configured ? this.cloudName : '',
      defaultFolder: this.defaultFolder,
    };
  }

  /**
   * Returns a signed payload the client uses to upload directly to
   * `https://api.cloudinary.com/v1_1/<cloud>/<resource_type>/upload`.
   *
   * Why signed direct upload?
   * -------------------------
   * Without a signature, anyone could push arbitrary bytes to the
   * cloud's `auto/upload` endpoint using a public API key alone.
   * The signature is a server-side HMAC over `(timestamp + params)`
   * that proves the upload was authorised by the API host.
   *
   * Important: the `apiSecret` is NEVER sent to the client. Only
   * the resulting `signature` and the public `apiKey` are exposed.
   */
  signDirectUpload(params: CloudinarySignParams): CloudinarySignedPayload {
    this.assertConfigured();

    const timestamp = Math.floor(Date.now() / 1000);
    const resourceType = params.resourceType ?? 'video';
    const folder = `${this.defaultFolder}/${sanitizeSegment(params.channelSlug)}`;
    const publicId = sanitizePublicId(stripExt(params.originalName));
    const tags = (params.tags ?? []).map(sanitizeSegment);
    const context = Object.entries(params.context ?? {})
      .map(([k, v]) => `${sanitizeSegment(k)}=${escapeContextValue(v)}`)
      .join('|');

    // Cloudinary signs the params *other* than `file`, `api_key`,
    // and `resource_type`. The order doesn't matter but the
    // concatenation rule is: `key=value&key=value` joined with
    // the API secret at the end.
    const signParams: Record<string, string | number> = {
      timestamp,
      folder,
      public_id: publicId,
      tags: tags.join(','),
      allowed_formats: 'mp4,mov,m4v,webm,mkv',
      // `notification_url` / `eager` could be added later; keep
      // the surface small for v1.
    };
    if (context) {
      signParams.context = context;
    }

    const signature = cloudinary.utils.api_sign_request(
      signParams,
      this.apiSecret,
    );

    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;

    return {
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      timestamp,
      signature,
      folder,
      publicId,
      resourceType,
      tags,
      allowedFormats: ['mp4', 'mov', 'm4v', 'webm', 'mkv'],
      maxFileSize: Math.min(
        params.maxBytes ?? CloudinaryService.FREE_TIER_MAX_BYTES,
        CloudinaryService.FREE_TIER_MAX_BYTES,
      ),
      context,
      uploadUrl,
    };
  }

  /**
   * Server-side upload. Use only when the caller already has a
   * Buffer (e.g. the existing self-record file route if we ever
   * add it). Direct mobile uploads should prefer
   * `signDirectUpload` to avoid the 4.5 MB Vercel body limit.
   */
  async uploadFromBuffer(
    buffer: Buffer,
    options: {
      folder: string;
      publicId: string;
      resourceType?: 'video' | 'image' | 'raw' | 'auto';
      tags?: string[];
      context?: Record<string, string>;
    },
  ): Promise<CloudinaryUploadResult> {
    this.assertConfigured();
    if (!buffer || buffer.length === 0) {
      throw new ServiceUnavailableException('Empty upload buffer.');
    }
    if (buffer.length > CloudinaryService.FREE_TIER_MAX_BYTES) {
      throw new ServiceUnavailableException(
        `File too large (${buffer.length} bytes). Free-tier hard cap is ` +
          `${CloudinaryService.FREE_TIER_MAX_BYTES} bytes (100 MB).`,
      );
    }

    const resourceType = options.resourceType ?? 'video';
    const folder = sanitizeSegment(options.folder);
    const publicId = sanitizePublicId(options.publicId);
    const tags = (options.tags ?? []).map(sanitizeSegment);
    const context =
      Object.entries(options.context ?? {})
        .map(([k, v]) => `${sanitizeSegment(k)}=${escapeContextValue(v)}`)
        .join('|') || undefined;

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: resourceType,
          tags: tags.length ? tags : undefined,
          context,
          // Free tier: don't request eager transcoding. The CDN
          // will deliver a `sp_auto` adaptive rendition on first
          // GET, which is enough for the Studio demo.
          eager_async: false,
        },
        (err, result) => {
          if (err || !result) {
            this.logger.error(
              `Cloudinary upload_stream failed: ${err?.message ?? 'unknown'}`,
            );
            return reject(
              new ServiceUnavailableException(
                `Cloudinary upload failed: ${err?.message ?? 'no result'}`,
              ),
            );
          }
          resolve(this.toResult(result));
        },
      );
      streamifier.createReadStream(buffer).pipe(stream);
    });
  }

  /**
   * Convert a Cloudinary API response to our internal shape. Pulls
   * the public CDN URL (`secure_url`) and a couple of convenience
   * fields the Studio needs.
   */
  private toResult(res: UploadApiResponse): CloudinaryUploadResult {
    const result: CloudinaryUploadResult = {
      url: res.secure_url,
      publicId: res.public_id,
      bytes: res.bytes,
      resourceType: res.resource_type,
      format: res.format,
    };
    if (typeof res.duration === 'number') {
      result.durationSec = res.duration;
    }
    if (typeof res.width === 'number') {
      result.width = res.width;
    }
    if (typeof res.height === 'number') {
      result.height = res.height;
    }
    // Cloudinary auto-generates a `jpg` thumbnail sibling for
    // video uploads. The URL is `<public_id>.jpg` with the
    // `image/upload/<transformations>` family.
    if (res.resource_type === 'video') {
      // `so_1` = seek-offset 1s, `w_640,h_360,c_fill` = 360p crop
      result.thumbnailUrl = cloudinary.url(res.public_id, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [
          { width: 640, height: 360, crop: 'fill' },
          { start_offset: '1.0' },
        ],
        secure: true,
      });
    }
    return result;
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Cloudinary chưa được cấu hình trên server. Vui lòng thêm ' +
          'CLOUDINARY_URL (hoặc CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, ' +
          'CLOUDINARY_API_SECRET) vào backend/.env rồi khởi động lại API.',
      );
    }
  }
}

// ============================================================
// Internal helpers
// ============================================================

/** Strip extension; Cloudinary will add it back on response. */
function stripExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

/** Allow only `[a-zA-Z0-9_-]` so a malicious filename can't escape folder. */
function sanitizeSegment(s: string): string {
  return String(s ?? '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled';
}

/** Same rules as sanitize, but also lowercase for public_id. */
function sanitizePublicId(s: string): string {
  return sanitizeSegment(s).toLowerCase();
}

/** Escape `|` in context values so the metadata parses cleanly. */
function escapeContextValue(v: string): string {
  return String(v ?? '').replace(/\|/g, '\\|');
}

/** Best-effort URL-decode that swallows malformed escapes. */
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

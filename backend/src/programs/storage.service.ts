// ============================================================
// OmniCast - Local Storage Service
// ============================================================
//
// Self-hosted storage for Studio "self-record" uploads. The demo
// runs on Vercel serverless + Supabase; the simplest, cheapest
// option for a student demo is to write the file to a local
// `uploads/` directory and serve it back through a static route.
//
// In production this would be swapped for Supabase Storage /
// Bunny Storage / S3 by replacing `writeFile` + `getPublicUrl`.
// The interface is small enough that the call sites don't have
// to change.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs, createReadStream } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadRoot: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.uploadRoot = path.resolve(
      this.config.get<string>('UPLOAD_ROOT') ??
        path.join(process.cwd(), 'uploads'),
    );
    this.publicBaseUrl =
      this.config.get<string>('UPLOAD_PUBLIC_BASE_URL') ?? '';

    // Best-effort: ensure the upload root exists. log if it fails
    // (e.g. read-only FS) and let the request handler surface a
    // 500 — better than silently dropping the upload.
    fs.mkdir(this.uploadRoot, { recursive: true })
      .then(() => {
        this.logger.log(`Storage root: ${this.uploadRoot}`);
      })
      .catch((e) => {
        this.logger.error(
          `Failed to ensure upload root at ${this.uploadRoot}: ${e.message}`,
        );
      });
  }

  /**
   * Persist a buffer to disk under a content-addressed name. The
   * returned URL is the public path the mobile client should fetch
   * from. We generate the file name ourselves (rather than
   * trusting the original) to dodge path traversal and collisions.
   *
   * `publicBaseUrlOverride` lets the controller pass the current
   * request's origin (e.g. `https://omnicast-api.vercel.app`) so
   * the returned URL is always **absolute** even when no
   * `UPLOAD_PUBLIC_BASE_URL` env var is set. This is critical:
   * clients (Flutter `VideoPlayerController.networkUrl` and the
   * web `<video src>`) reject relative URLs because they have no
   * host to dial.
   */
  async saveBuffer(
    buffer: Buffer,
    options: {
      prefix: 'self-record';
      originalName: string;
      contentType?: string;
      publicBaseUrlOverride?: string;
    },
  ): Promise<{ url: string; size: number; storageKey: string }> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty upload buffer.');
    }
    const ext = this.sanitizeExt(options.originalName);
    const hash = crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex')
      .slice(0, 16);
    const day = this.formatYmd(new Date());
    const fileName = `${options.prefix}-${Date.now()}-${hash}${ext}`;
    const relativeDir = path.join(options.prefix, day);
    const absoluteDir = path.join(this.uploadRoot, relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });
    const absolutePath = path.join(absoluteDir, fileName);
    await fs.writeFile(absolutePath, buffer);

    const publicPath = `/uploads/${relativeDir
      .split(path.sep)
      .join('/')}/${fileName}`;

    // Pick the most authoritative base URL we have, in priority:
    //   1. Caller-provided override (current request origin)
    //   2. `UPLOAD_PUBLIC_BASE_URL` env (prod CDN root)
    //   3. Empty (legacy / dev) — URL stays relative
    //
    // The caller-provided override is what makes the URL absolute
    // for mobile/web clients without requiring any env config.
    const baseUrl =
      options.publicBaseUrlOverride?.trim() || this.publicBaseUrl || '';
    const url = baseUrl
      ? `${baseUrl.replace(/\/$/, '')}${publicPath}`
      : publicPath;

    return {
      url,
      size: buffer.length,
      storageKey: path.relative(this.uploadRoot, absolutePath),
    };
  }

  /**
   * Resolve a public URL back to an absolute path on disk. Used
   * by the static-serve middleware.
   */
  resolveLocalPath(publicPath: string): string | null {
    if (!publicPath.startsWith('/uploads/')) return null;
    const relative = publicPath.replace(/^\/uploads\//, '');
    const absolute = path.join(this.uploadRoot, relative);
    const normalized = path.resolve(absolute);
    if (!normalized.startsWith(this.uploadRoot)) return null; // path traversal
    return normalized;
  }

  private sanitizeExt(name: string): string {
    const ext = path.extname(name || '').toLowerCase();
    const safe = ['.mp4', '.mov', '.mkv', '.webm', '.m4v', '.aac', '.mp3'];
    return safe.includes(ext) ? ext : '.mp4';
  }

  private formatYmd(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
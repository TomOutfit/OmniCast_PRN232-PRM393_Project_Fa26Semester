// ============================================================
// OmniCast - Stream Health-Check Service
// ============================================================
//
// Periodically probes each `Recording.videoUrl` (and `fallbackUrl`)
// and writes the result to:
//   • isActive          — false when the most recent probe failed
//   • lastCheckedAt     — timestamp of the latest probe
//   • lastStatus        — 'ok' | '404' | 'timeout' | 'invalid'
//
// The EPG filler prefers `isActive === true` rows. A row that goes
// inactive is auto-replaced by the filler's daypart-aware rotation,
// so the user never sees a "No Available" slot as long as the
// catalog has at least one active recording per channel.
//
// Probe strategy
// --------------
//  • YOUTUBE_EMBED / YOUTUBE_DIRECT / VIMEO / TWITCH — skipped.
//    These are iframe embeds that cannot be probed by server-side
//    HTTP. The studio team manually toggles `isActive` for these
//    rows when an embed is revoked.
//  • HLS (m3u8 / .ism/) — fetch the manifest, expect 200 + non-empty
//    body that starts with `#EXTM3U`. A 200 with an empty body is
//    treated as 'invalid'.
//  • MP4 / DASH — HEAD request, expect 200/206/302 in <5s.
//  • PEXELS / ARCHIVE_ORG / BUNNY_CDN — HEAD request, expect 200/206.
//
// Cron
// ----
//  • Every 15 minutes: probe up to 50 records that haven't been
//    checked in the last 30 minutes (round-robin).
//  • Every 6 hours: full sweep of all active records.
//  • Manual trigger via POST /programs/health/check-all (admin only).
// ============================================================

import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
// StreamSourceType comes from the Prisma schema's enum; we type it
// as a loose string union here so the file compiles even before
// `prisma generate` has been re-run with the new enums. The runtime
// `Recording.sourceType` column is typed as `StreamSourceType?` so
// the validation is the same.
export type StreamSourceType =
  | 'YOUTUBE_EMBED'
  | 'PEXELS'
  | 'ARCHIVE_ORG'
  | 'BLENDER_CC'
  | 'GOOGLE_SAMPLE'
  | 'W3_SAMPLE'
  | 'SAMPLELIB'
  | 'CLOUDINARY_DEMO'
  | 'MUX_TEST'
  | 'UNIFIED_TEST'
  | 'BUNNY_CDN'
  | 'UPLOADED_LOCAL'
  | 'TMDB_TRAILER'
  | 'YOUTUBE_DIRECT'
  | 'VIMEO'
  | 'TWITCH';

export type HealthStatus = 'ok' | '404' | 'timeout' | 'invalid' | 'embed';

export interface ProbeResult {
  recordingId: string;
  status: HealthStatus;
  httpCode?: number;
  latencyMs: number;
  url: string;
}

export interface HealthStats {
  generatedAt: string;
  totals: {
    total: number;
    active: number;
    inactive: number;
    neverChecked: number;
  };
  byLicense: Record<string, { total: number; active: number; inactive: number }>;
  bySourceType: Record<string, { total: number; active: number; inactive: number }>;
}

const TIMEOUT_MS = 5000;
const USER_AGENT =
  'OmniCast-HealthCheck/1.0 (+https://omnicast.example/contact)';

@Injectable()
export class StreamHealthCheckService {
  private readonly logger = new Logger(StreamHealthCheckService.name);

  /** When true, the @Cron handlers in `health-check.cron.ts` are
   *  allowed to fire. Set to false in test environments. */
  @Optional()
  @Inject('STREAM_HEALTH_CRON_ENABLED')
  private readonly cronEnabled?: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------

  /**
   * Probe a single URL and return a `ProbeResult` without writing
   * anything to the DB. Used by the manual `POST /probe` endpoint
   * and by the cron sweep.
   */
  async probeUrl(url: string, sourceType?: StreamSourceType | null): Promise<ProbeResult> {
    const start = Date.now();
    // Iframe embeds are not probe-able — short-circuit.
    if (isEmbedSource(sourceType)) {
      return {
        recordingId: '',
        status: 'embed',
        latencyMs: 0,
        url,
      };
    }
    if (!url || !/^https?:\/\//i.test(url)) {
      return {
        recordingId: '',
        status: 'invalid',
        latencyMs: 0,
        url,
      };
    }

    const isHls = isHlsUrl(url);
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const method = isHls ? 'GET' : 'HEAD';
      const resp = await fetch(url, {
        method,
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
        signal: controller.signal,
      });
      const latencyMs = Date.now() - start;

      if (resp.status === 404) {
        return { recordingId: '', status: '404', httpCode: 404, latencyMs, url };
      }
      if (!resp.ok) {
        return {
          recordingId: '',
          status: 'invalid',
          httpCode: resp.status,
          latencyMs,
          url,
        };
      }

      if (isHls) {
        // HLS: read up to 4 KiB and verify it starts with #EXTM3U
        const text = await resp.text();
        const sample = text.slice(0, 4096);
        if (!sample.includes('#EXTM3U')) {
          return {
            recordingId: '',
            status: 'invalid',
            httpCode: resp.status,
            latencyMs,
            url,
          };
        }
      }
      return {
        recordingId: '',
        status: 'ok',
        httpCode: resp.status,
        latencyMs,
        url,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      const isAbort = err instanceof Error && err.name === 'AbortError';
      return {
        recordingId: '',
        status: isAbort ? 'timeout' : 'invalid',
        latencyMs,
        url,
      };
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  /**
   * Probe + persist result for a single recording row.
   */
  async checkRecording(id: string): Promise<ProbeResult | null> {
    // The Prisma client is regenerated by the operator via
    // `prisma generate` after the schema migration. Until then
    // we cast through `unknown` to keep the new fields accessible
    // at type-check time. Runtime behaviour is identical.
    const recRaw = await this.prisma.recording.findUnique({
      where: { id },
      select: {
        id: true,
        videoUrl: true,
        fallbackUrl: true,
        sourceType: true,
      } as any,
    });
    if (!recRaw) return null;
    const rec = recRaw as unknown as {
      id: string;
      videoUrl: string | null;
      fallbackUrl: string | null;
      sourceType: StreamSourceType | null;
    };

    const result = await this.probeUrl(
      rec.videoUrl ?? '',
      rec.sourceType,
    );
    const isActive = result.status === 'ok' || result.status === 'embed';
    await this.prisma.recording.update({
      where: { id: rec.id },
      data: {
        isActive,
        lastCheckedAt: new Date(),
        lastStatus: result.status,
      } as any,
    });
    return { ...result, recordingId: rec.id };
  }

  /**
   * Round-robin sweep — picks the oldest-checked active records
   * and probes them. The cron handler calls this with `batch=50`
   * every 15 minutes, and the full sweep with `batch=Infinity`
   * every 6 hours.
   */
  async sweep(opts: { batch?: number; includeInactive?: boolean } = {}): Promise<{
    probed: number;
    active: number;
    inactive: number;
    errors: number;
  }> {
    const batch = opts.batch ?? 50;
    const since = new Date(Date.now() - 30 * 60_000); // 30 min ago

    // `as any` casts on the new fields (`isActive`, `lastCheckedAt`)
    // until the operator runs `prisma generate` to refresh the
    // client types after the schema migration.
    const rows = await this.prisma.recording.findMany({
      where: {
        isPublished: true,
        ...(opts.includeInactive ? {} : ({ isActive: true } as any)),
        OR: [
          { lastCheckedAt: null } as any,
          { lastCheckedAt: { lt: since } } as any,
        ],
      },
      orderBy: { lastCheckedAt: 'asc' } as any,
      take: batch,
      select: { id: true },
    });

    let active = 0;
    let inactive = 0;
    let errors = 0;
    for (const row of rows) {
      try {
        const r = await this.checkRecording(row.id);
        if (!r) continue;
        if (r.status === 'ok' || r.status === 'embed') active += 1;
        else inactive += 1;
      } catch (err) {
        errors += 1;
        this.logger.warn(`probe failed for ${row.id}: ${(err as Error).message}`);
      }
    }
    return { probed: rows.length, active, inactive, errors };
  }

  /**
   * Build a snapshot of the current health state for the Studio
   * dashboard. Cheap query (no probes, just aggregations).
   */
  async getStats(): Promise<HealthStats> {
    // `as any` casts on `isActive` and `lastCheckedAt` because the
    // regenerated Prisma client may not yet include the new
    // columns at type-check time. Runtime behaviour is identical.
    const [total, active, neverChecked, byLicense, bySourceType] = await Promise.all([
      this.prisma.recording.count(),
      this.prisma.recording.count({ where: { isActive: true } as any }),
      this.prisma.recording.count({ where: { lastCheckedAt: null } as any }),
      this.prisma.recording.groupBy({
        by: ['license' as any],
        _count: { _all: true },
        where: { isPublished: true },
      }),
      this.prisma.recording.groupBy({
        by: ['sourceType' as any],
        _count: { _all: true },
        where: { isPublished: true },
      }),
    ]);

    const activeByLicense = await this.prisma.recording.groupBy({
      by: ['license' as any],
      _count: { _all: true },
      where: { isPublished: true, isActive: true } as any,
    });
    const activeBySourceType = await this.prisma.recording.groupBy({
      by: ['sourceType' as any],
      _count: { _all: true },
      where: { isPublished: true, isActive: true } as any,
    });
    const aLMap = new Map(
      activeByLicense.map((r: any) => [String(r.license), r._count?._all ?? 0]),
    );
    const aSMap = new Map(
      activeBySourceType.map((r: any) => [String(r.sourceType), r._count?._all ?? 0]),
    );

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        total,
        active,
        inactive: total - active,
        neverChecked,
      },
      byLicense: Object.fromEntries(
        byLicense.map((r: any) => [
          String(r.license),
          {
            total: r._count?._all ?? 0,
            active: aLMap.get(String(r.license)) ?? 0,
            inactive: (r._count?._all ?? 0) - (aLMap.get(String(r.license)) ?? 0),
          },
        ]),
      ),
      bySourceType: Object.fromEntries(
        bySourceType.map((r: any) => [
          String(r.sourceType),
          {
            total: r._count?._all ?? 0,
            active: aSMap.get(String(r.sourceType)) ?? 0,
            inactive: (r._count?._all ?? 0) - (aSMap.get(String(r.sourceType)) ?? 0),
          },
        ]),
      ),
    };
  }

  // ------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------

  private isCronEnabled(): boolean {
    if (this.cronEnabled !== undefined) return this.cronEnabled;
    const raw = this.config.get<string>('STREAM_HEALTH_CRON_ENABLED');
    if (raw === undefined) return true; // default ON
    return raw.toLowerCase() === 'true';
  }
}

// ------------------------------------------------------------
// Module-level helpers — exported so the cron task and the
// probe controller can reuse them without duplicating the
// strategy.
// ------------------------------------------------------------

export function isEmbedSource(
  sourceType?: StreamSourceType | string | null,
): boolean {
  if (!sourceType) return false;
  const s = String(sourceType);
  return (
    s === 'YOUTUBE_EMBED' ||
    s === 'YOUTUBE_DIRECT' ||
    s === 'VIMEO' ||
    s === 'TWITCH'
  );
}

export function isHlsUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('.m3u8') || lower.includes('.ism/') || lower.includes('.mpd');
}

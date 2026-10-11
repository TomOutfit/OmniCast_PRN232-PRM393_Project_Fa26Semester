// ============================================================
// OmniCast - Live Studio Service
// ============================================================
//
// Business logic for the Studio "control surface". Staff/Admin use
// this to:
//   • curate live — pick existing recordings and mark them LIVE
//   • stop live   — end a curated broadcast
//   • self-record — upload a freshly-recorded clip and (optionally)
//                   push it live immediately
//
// Anti-piracy guard
// -----------------
// The Studio REJECTS any recording whose `contentSource = EXTERNAL`
// with a blacklisted `externalPlatform` (YouTube / Twitch / Vimeo /
// Facebook / TikTok / Dailymotion / iframe embeds). Only UPLOADED,
// GENERATED, or `CUSTOM_*` URLs (self-hosted) are accepted.
//
// Why a hard block (vs. just a flag)?
// ---------------------------------
// Student demo runs under demo. Display flagged: ensure no
// pirated source ever reaches the LIVE NOW slot. The flag is set
// defensively so even a buggy UI cannot bypass it.
// ============================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentLicense,
  ContentSource,
  EventStatus,
  ExternalPlatform,
  Prisma,
  StreamQuality,
  StreamSourceType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../audit-logger/audit-logger.service';
import { EpgNowService } from './epg-now.service';
import {
  AddToLibraryDto,
  CurateLiveDto,
  SelfRecordUploadDto,
  StopLiveDto,
  StudioSelfRecordVisibility,
} from './dto/live-studio.dto';

/**
 * External platforms that must NEVER be re-broadcast as "live"
 * through the Studio. These are commercial broadcasters / user
 * platforms that do not grant re-distribution rights.
 */
const BLOCKED_EXTERNAL_PLATFORMS: ReadonlySet<ExternalPlatform> = new Set([
  ExternalPlatform.YOUTUBE,
  ExternalPlatform.TWITCH,
  ExternalPlatform.VIMEO,
  ExternalPlatform.FACEBOOK,
  ExternalPlatform.TIKTOK,
  ExternalPlatform.DAILYMOTION,
  ExternalPlatform.EMBED_IFRAME,
]);

/**
 * Custom platforms that are acceptable for re-broadcast (self-hosted
 * HLS / RTMP / MP4). Everything outside of these + `BLOCKED_*` is
 * also blocked by the guard.
 */
const ALLOWED_CUSTOM_PLATFORMS: ReadonlySet<ExternalPlatform> = new Set([
  ExternalPlatform.CUSTOM_HLS,
  ExternalPlatform.CUSTOM_RTMP,
  ExternalPlatform.CUSTOM_MP4,
]);

/**
 * Trusted public CDN domains we don't HEAD-probe. They are well-known
 * hosting providers of royalty-free / open-license media. Skipping the
 * probe for these drastically reduces false negatives in environments
 * that block HEAD (403) but allow the player GET (the player's the
 * source of truth anyway).
 *
 * Adding a domain here is a 1-character audit-log entry. Treat the
 * list as the "trusted origin" allow-list for the Studio.
 */
const TRUSTED_CDN_DOMAINS: ReadonlySet<string> = new Set([
  // Mux canonical test fixtures
  'test-streams.mux.dev',
  'stream.mux.com',
  // Unified Streaming demos
  'demo.unified-streaming.com',
  // Bitmovin / Akamai hosted HLS demos
  'bitdash-a.akamaihd.net',
  'test-streams.akamaized.net',
  // Generic test streams
  'test-videos.co.uk',
  'download.samplelib.com',
  'sample-videos.com',
  // W3 Schools & W3C fixtures
  'www.w3schools.com',
  'media.w3.org',
  // Cloudinary public sample bucket
  'res.cloudinary.com',
  // Pexels free stock video CDN
  'videos.pexels.com',
  // Internet Archive (public domain)
  'archive.org',
  // Mixkit free stock videos
  'assets.mixkit.co',
  // Coverr CDN
  'coverr.co',
  // Wikimedia Commons (PD media)
  'upload.wikimedia.org',
  // Coverr CDN mirror
  'cdn.coverr.co',
  // Pixabay free video CDN
  'cdn.pixabay.com',
  // Videvo free stock footage
  'www.videvo.net',
  // Mazwai cinematic footage
  'mazwai.com',
  // Splitshire free video
  'www.splitshire.com',
  // Life of Vids free clips
  'www.lifeofvids.com',
  // Pexels CDN aliases
  'video.pscpstatic.com',
  // Coverr CDN alias
  'video.coverr.io',
  // Vimeo Pro demos
  'player.vimeo.com',
  // Cloudflare Stream demos
  'commondatastorage.googleapis.com',
  // Free Music Archive CDN
  'files.freemusicarchive.org',
  // Wikimedia video
  'upload.wikimedia.org',
  // Archive.org CDN
  'archive.org',
  'ia601800.us.archive.org',
  'ia601809.us.archive.org',
]);

/**
 * Helper that classifies a URL as "well-formed video URL" by extension.
 * Used by the probe bypass — we trust known-good CDNs and known-good
 * extensions, so we don't even need to hit the network for them.
 */
const VIDEO_EXTENSIONS =
  /\.(m3u8|mpd|mp4|m4v|mov|webm|mkv|qt|f4m|ts|m4s)(?:\?|#|$)/i;

/**
 * License classes that are safe to ship to production. Anything
 * outside this set is rejected by [enforcePublishGate] unless the
 * operator explicitly opts in via the DTO `allowDevLicense` flag
 * (e.g. for a Staff-only test stream on a non-production env).
 */
const PRODUCTION_SAFE_LICENSES: ReadonlySet<ContentLicense> = new Set([
  ContentLicense.PEXELS_LICENSE,
  ContentLicense.CC0_PUBLIC_DOMAIN,
  ContentLicense.CC_BY_3,
  ContentLicense.CC_BY_4,
  ContentLicense.BLENDER_OPEN_MOVIE,
  ContentLicense.BUNNY_SELF_HOSTED,
  ContentLicense.DEMO_PRODUCTION_OK,
]);

/**
 * Catalog v2.1 publish gate
 * -------------------------
 * A recording cannot enter the broadcastable library unless it has
 * a recognised [StreamSourceType] and a license that ships with
 * production traffic. This block is the single source of truth for
 * the gate — DTOs, services and the seed script all defer to it.
 */
export interface PublishGateDecision {
  ok: boolean;
  reason?: string;
  normalized: {
    sourceType: StreamSourceType;
    license: ContentLicense;
    sourceAttribution: string;
  };
}

/**
 * URL → StreamSourceType mapping. Mirrors the catalog
 * (`scripts/catalog-data.ts`) so the Studio and the seed file
 * produce identical classifications.
 */
function inferSourceTypeFromUrl(url: string): StreamSourceType {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com/embed/') || lower.includes('youtu.be/')) {
    return StreamSourceType.YOUTUBE_EMBED;
  }
  if (lower.includes('youtube.com/watch')) return StreamSourceType.YOUTUBE_DIRECT;
  if (lower.includes('vimeo.com')) return StreamSourceType.VIMEO;
  if (lower.includes('twitch.tv')) return StreamSourceType.TWITCH;
  if (lower.includes('pexels.com') || lower.includes('pscpstatic.com')) {
    return StreamSourceType.PEXELS;
  }
  if (lower.includes('archive.org')) return StreamSourceType.ARCHIVE_ORG;
  if (lower.includes('blender.org') || lower.includes('durian.blender')) {
    return StreamSourceType.BLENDER_CC;
  }
  if (lower.includes('commondatastorage.googleapis.com')) {
    return StreamSourceType.GOOGLE_SAMPLE;
  }
  if (lower.includes('w3schools.com')) return StreamSourceType.W3_SAMPLE;
  if (lower.includes('samplelib.com')) return StreamSourceType.SAMPLELIB;
  if (lower.includes('cloudinary.com')) return StreamSourceType.CLOUDINARY_DEMO;
  if (lower.includes('test-streams.mux.dev') || lower.includes('stream.mux.com')) {
    return StreamSourceType.MUX_TEST;
  }
  if (lower.includes('unified-streaming.com') || lower.includes('bitdash-a.akamaihd.net')) {
    return StreamSourceType.UNIFIED_TEST;
  }
  if (lower.includes('b-cdn.net') || lower.includes('bunny')) {
    return StreamSourceType.BUNNY_CDN;
  }
  if (lower.startsWith('/uploads/') || lower.includes('/uploads/')) {
    return StreamSourceType.UPLOADED_LOCAL;
  }
  return StreamSourceType.UPLOADED_LOCAL;
}

function inferDefaultLicenseFromSourceType(sourceType: StreamSourceType): ContentLicense {
  switch (sourceType) {
    case StreamSourceType.PEXELS:
      return ContentLicense.PEXELS_LICENSE;
    case StreamSourceType.ARCHIVE_ORG:
      return ContentLicense.CC0_PUBLIC_DOMAIN;
    case StreamSourceType.BLENDER_CC:
      return ContentLicense.BLENDER_OPEN_MOVIE;
    case StreamSourceType.BUNNY_CDN:
    case StreamSourceType.UPLOADED_LOCAL:
      return ContentLicense.BUNNY_SELF_HOSTED;
    case StreamSourceType.GOOGLE_SAMPLE:
    case StreamSourceType.W3_SAMPLE:
    case StreamSourceType.SAMPLELIB:
    case StreamSourceType.CLOUDINARY_DEMO:
    case StreamSourceType.MUX_TEST:
    case StreamSourceType.UNIFIED_TEST:
      return ContentLicense.DEMO_PRODUCTION_OK;
    default:
      return ContentLicense.UNKNOWN;
  }
}

/**
 * Free-text license string (from the catalog) → ContentLicense enum.
 * Falls back to UNKNOWN so the publish gate can reject it.
 */
function normalizeLicense(raw: string | null | undefined): ContentLicense {
  if (!raw) return ContentLicense.UNKNOWN;
  const upper = raw.toUpperCase().replace(/[\s\-]+/g, '_');
  // Allow either the enum name or common shorthand.
  const aliases: Record<string, ContentLicense> = {
    PEXELS: ContentLicense.PEXELS_LICENSE,
    PEXELS_LICENSE: ContentLicense.PEXELS_LICENSE,
    CC0: ContentLicense.CC0_PUBLIC_DOMAIN,
    CC0_PUBLIC_DOMAIN: ContentLicense.CC0_PUBLIC_DOMAIN,
    PUBLIC_DOMAIN: ContentLicense.CC0_PUBLIC_DOMAIN,
    CC_BY: ContentLicense.CC_BY_4,
    CC_BY_3: ContentLicense.CC_BY_3,
    CC_BY_4: ContentLicense.CC_BY_4,
    CREATIVE_COMMONS: ContentLicense.CC_BY_4,
    CREATIVE_COMMONS_BY: ContentLicense.CC_BY_4,
    CREATIVE_COMMONS_BY_3: ContentLicense.CC_BY_3,
    CREATIVE_COMMONS_BY_4: ContentLicense.CC_BY_4,
    BLENDER: ContentLicense.BLENDER_OPEN_MOVIE,
    BLENDER_FOUNDATION: ContentLicense.BLENDER_OPEN_MOVIE,
    BLENDER_OPEN_MOVIE: ContentLicense.BLENDER_OPEN_MOVIE,
    BUNNY: ContentLicense.BUNNY_SELF_HOSTED,
    BUNNY_SELF_HOSTED: ContentLicense.BUNNY_SELF_HOSTED,
    DEMO: ContentLicense.DEMO_PRODUCTION_OK,
    DEMO_PRODUCTION_OK: ContentLicense.DEMO_PRODUCTION_OK,
    TEST: ContentLicense.DEV_ONLY_TEST_FIXTURE,
    DEV_ONLY_TEST_FIXTURE: ContentLicense.DEV_ONLY_TEST_FIXTURE,
    ROYALTY_FREE: ContentLicense.DEMO_PRODUCTION_OK,
  };
  return aliases[upper] ?? ContentLicense.UNKNOWN;
}

/**
 * Returns a human-readable attribution string for the given
 * (sourceType, license) pair. Used as a fallback when the
 * caller did not supply `sourceAttribution` explicitly.
 */
function defaultAttribution(
  sourceType: StreamSourceType,
  license: ContentLicense,
): string {
  if (sourceType === StreamSourceType.PEXELS) {
    return 'Video by Pexels (Pexels License — miễn phí thương mại)';
  }
  if (sourceType === StreamSourceType.BLENDER_CC) {
    return 'Blender Foundation — Creative Commons BY 3.0';
  }
  if (sourceType === StreamSourceType.ARCHIVE_ORG) {
    return 'Internet Archive — Public Domain';
  }
  if (sourceType === StreamSourceType.BUNNY_CDN || sourceType === StreamSourceType.UPLOADED_LOCAL) {
    return 'Nội dung tự host (Bunny CDN / Self-Recorded)';
  }
  if (license === ContentLicense.CC0_PUBLIC_DOMAIN) {
    return 'Public Domain (CC0)';
  }
  if (license === ContentLicense.CC_BY_3 || license === ContentLicense.CC_BY_4) {
    return `Creative Commons BY ${license === ContentLicense.CC_BY_3 ? '3.0' : '4.0'}`;
  }
  return '';
}

/**
 * Decide whether a recording is allowed to be published into the
 * broadcastable library. Always returns a normalised triple so the
 * caller can persist it without further branching.
 */
function enforcePublishGate(
  meta: {
    sourceType?: StreamSourceType | null;
    license?: ContentLicense | null;
    sourceAttribution?: string | null;
  },
  options: { allowDevLicense?: boolean } = {},
): PublishGateDecision {
  const sourceType = meta.sourceType ?? inferSourceTypeFromUrl('');
  const license = meta.license ?? ContentLicense.UNKNOWN;

  if (!meta.sourceType) {
    return {
      ok: false,
      reason: 'sourceType is required (Studio publish gate).',
      normalized: { sourceType, license, sourceAttribution: '' },
    };
  }
  if (!meta.license) {
    return {
      ok: false,
      reason: 'license is required (Studio publish gate).',
      normalized: { sourceType, license, sourceAttribution: '' },
    };
  }
  if (license === ContentLicense.UNKNOWN) {
    return {
      ok: false,
      reason:
        'license is UNKNOWN — Studio publish gate refuses to broadcast ' +
        'content with undetermined redistribution rights.',
      normalized: { sourceType, license, sourceAttribution: '' },
    };
  }
  if (license === ContentLicense.DEV_ONLY_TEST_FIXTURE && !options.allowDevLicense) {
    return {
      ok: false,
      reason:
        'license is DEV_ONLY_TEST_FIXTURE — set `allowDevLicense=true` ' +
        'in the request to opt in (Staff/Admin only, non-production).',
      normalized: { sourceType, license, sourceAttribution: '' },
    };
  }
  if (!PRODUCTION_SAFE_LICENSES.has(license) && license !== ContentLicense.DEV_ONLY_TEST_FIXTURE) {
    return {
      ok: false,
      reason: `license "${license}" is not in the production-safe set.`,
      normalized: { sourceType, license, sourceAttribution: '' },
    };
  }

  const sourceAttribution =
    meta.sourceAttribution?.trim() ||
    defaultAttribution(sourceType, license);

  return {
    ok: true,
    normalized: { sourceType, license, sourceAttribution },
  };
}

@Injectable()
export class LiveStudioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
    private readonly epgNow: EpgNowService,
  ) {}

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * List recordings on a channel that the Studio is allowed to
   * broadcast as "live" — i.e. uploaded, generated, or self-hosted.
   * External embeds (YouTube etc.) are filtered out so the picker
   * UI cannot even show them.
   */
  async listBroadcastableRecordings(
    channelIdentifier: string,
    options: { search?: string; limit?: number } = {},
  ) {
    const channel = await this.findChannel(channelIdentifier);
    if (!channel) {
      throw new NotFoundException(`Channel not found: ${channelIdentifier}`);
    }

    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);

    const items = await this.prisma.recording.findMany({
      where: {
        channelId: channel.id,
        isPublished: true,
        ...(options.search
          ? {
              title: {
                contains: options.search,
                mode: Prisma.QueryMode.insensitive,
              },
            }
          : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        videoUrl: true,
        contentSource: true,
        externalPlatform: true,
        duration: true,
        viewCount: true,
        publishedAt: true,
        tags: true,
        channel: {
          select: { id: true, slug: true, name: true },
        },
      },
    });

    // Defensive filter: hide anything the guard would reject.
    return items.filter((r) => this.isBroadcastAllowed(r.contentSource, r.externalPlatform));
  }

  /**
   * Curate a live broadcast from one or more recordings.
   *
   * Behavior:
   *   • Validates that every recordingId belongs to `channelId`.
   *   • Validates the anti-piracy guard on every recording.
   *   • Stops any LIVE event already running on the channel so we
   *     never have two concurrent ones.
   *   • Creates a new `LiveEvent` with status=LIVE and uses the
   *     first recording's `videoUrl` as the `streamUrl`.
   *   • Tags the event with the channel slug + recording IDs so the
   *     audit log is self-explanatory.
   */
  async curateLive(dto: CurateLiveDto, userId: string) {
    if (!dto.recordingIds?.length) {
      throw new BadRequestException('recordingIds must not be empty.');
    }

    const channel = await this.findChannel(dto.channelId);
    if (!channel) {
      throw new NotFoundException(`Channel not found: ${dto.channelId}`);
    }

    // Dedup + preserve order
    const uniqueIds = Array.from(new Set(dto.recordingIds));
    const recordings = await this.prisma.recording.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        videoUrl: true,
        contentSource: true,
        externalPlatform: true,
        duration: true,
        channelId: true,
        // Catalog v2.1 — pull the licensing metadata so the
        // publish-gate check can short-circuit before we even
        // attempt to create a LiveEvent.
        sourceType: true,
        license: true,
        sourceAttribution: true,
        isActive: true,
      },
    });

    if (recordings.length !== uniqueIds.length) {
      throw new NotFoundException(
        `One or more recordings not found. Got ${uniqueIds.length}, found ${recordings.length}.`,
      );
    }

    // Channel scope + anti-piracy
    for (const r of recordings) {
      if (r.channelId !== channel.id) {
        throw new BadRequestException(
          `Recording ${r.id} does not belong to channel ${channel.slug}.`,
        );
      }
      this.assertBroadcastAllowed(r.contentSource, r.externalPlatform, r.id);
      if (!r.videoUrl) {
        throw new BadRequestException(
          `Recording ${r.id} has no playable videoUrl.`,
        );
      }
      // Catalog v2.1 — refuse to broadcast any recording that
      // doesn't have a known license / sourceType, or that the
      // health-check flagged as dead.
      if (!r.isActive) {
        throw new BadRequestException(
          `Recording ${r.id} was flagged inactive by the health-check. ` +
            `Re-run scripts/health-check.ts to bring it back.`,
        );
      }
      const allowDev =
        dto.allowDevLicense === true ||
        process.env.NODE_ENV !== 'production';
      const gate = enforcePublishGate(
        {
          sourceType: r.sourceType,
          license: r.license,
          sourceAttribution: r.sourceAttribution,
        },
        { allowDevLicense: allowDev },
      );
      if (!gate.ok) {
        throw new ForbiddenException(
          `Recording ${r.id} cannot be broadcast: ${gate.reason}`,
        );
      }
    }

    // End any in-flight curated event on this channel so we don't
    // double-broadcast. Live events with status=LIVE / SCHEDULED
    // within the next 24h are stopped.
    const now = new Date();
    await this.prisma.liveEvent.updateMany({
      where: {
        channelId: channel.id,
        status: { in: [EventStatus.LIVE, EventStatus.SCHEDULED] },
        scheduledAt: { lte: new Date(now.getTime() + 24 * 3600 * 1000) },
      },
      data: {
        status: EventStatus.ENDED,
        endedAt: now,
      },
    });

    // Pick the longest recording as the duration hint (minutes).
    const longestSec = Math.max(...recordings.map((r) => r.duration || 0));
    const longestMin = Math.max(10, Math.round(longestSec / 60));

    const first = recordings[0];
    const event = await this.prisma.liveEvent.create({
      data: {
        title: dto.title?.trim() || first.title,
        description:
          dto.description?.trim() ??
          first.description ??
          `Curated live broadcast (${recordings.length} clip${recordings.length === 1 ? '' : 's'}) on ${channel.name}.`,
        thumbnailUrl: dto.thumbnailUrl || first.thumbnailUrl || null,
        streamSource: first.contentSource,
        externalPlatform: first.externalPlatform ?? null,
        streamUrl: first.videoUrl,
        status: EventStatus.LIVE,
        scheduledAt: now,
        startedAt: now,
        // `duration` is stored in seconds per the existing schema
        // convention used by ingest pipelines.
        duration: longestMin * 60,
        language: 'vi',
        quality: StreamQuality.AUTO,
        chatEnabled: true,
        autoRecord: false,
        channelId: channel.id,
        tags: [
          'studio-curated',
          channel.slug,
          ...recordings.map((r) => `rec:${r.id.slice(0, 8)}`),
        ],
      },
      include: {
        channel: {
          select: { id: true, slug: true, name: true },
        },
      },
    });

    await this.auditLogger.log({
      userId,
      action: 'STUDIO_CURATE_LIVE',
      entityType: 'LiveEvent',
      entityId: event.id,
      newValues: {
        recordingIds: uniqueIds,
        channelId: channel.id,
        channelSlug: channel.slug,
      },
    });

    // Invalidate the Studio live cache so the very next /epg/now
    // poll reflects this new LIVE event (instead of waiting up to
    // 10s for the cache window to expire).
    this.epgNow.invalidateStudioLiveCache(channel.id);

    return {
      event,
      recordings,
      message: `Đã phát sóng trực tiếp "${event.title}" trên kênh ${channel.name}.`,
    };
  }

  /**
   * Stop a curated live event.
   *
   * `keepAsVod=true` moves it to ON_DEMAND so viewers can re-watch
   * the same `streamUrl`; default (`false`) just ends it.
   */
  async stopLive(
    eventId: string,
    userId: string,
    dto: StopLiveDto = {},
  ) {
    const event = await this.prisma.liveEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        status: true,
        title: true,
        channel: { select: { id: true, slug: true, name: true } },
      },
    });

    if (!event) {
      throw new NotFoundException(`Live event not found: ${eventId}`);
    }

    if (event.status !== EventStatus.LIVE) {
      throw new BadRequestException(
        `Event "${event.title}" is not live (status=${event.status}).`,
      );
    }

    const nextStatus = dto.keepAsVod
      ? EventStatus.ON_DEMAND
      : EventStatus.ENDED;

    const updated = await this.prisma.liveEvent.update({
      where: { id: eventId },
      data: {
        status: nextStatus,
        endedAt: new Date(),
      },
      include: {
        channel: { select: { id: true, slug: true, name: true } },
      },
    });

    await this.auditLogger.log({
      userId,
      action: 'STUDIO_STOP_LIVE',
      entityType: 'LiveEvent',
      entityId: eventId,
      newValues: { status: nextStatus },
    });

    // Stop changes the live status — flush the Studio cache so the
    // very next /epg/now poll returns the day-grid fallback instead
    // of stale "curated live" data. Guard against test mocks that
    // don't include the channel relation (defensive — the real
    // query always returns it).
    if (event.channel?.id) {
      this.epgNow.invalidateStudioLiveCache(event.channel.id);
    }

    return {
      event: updated,
      message:
        nextStatus === EventStatus.ON_DEMAND
          ? `Đã lưu "${updated.title}" thành video xem lại (ON_DEMAND).`
          : `Đã kết thúc phát sóng "${updated.title}".`,
    };
  }

  /**
   * Upload a self-recorded video (mobile camera capture) and
   * optionally mark it as LIVE NOW.
   *
   * The upload itself happens client-side (mobile pushes the file
   * to a pre-signed URL on Supabase / Bunny Storage); this method
   * only persists the metadata.
   */
  async uploadSelfRecord(dto: SelfRecordUploadDto, userId: string) {
    const channel = await this.findChannel(dto.channelId);
    if (!channel) {
      throw new NotFoundException(`Channel not found: ${dto.channelId}`);
    }

    // Self-recorded clips are always treated as UPLOADED content
    // with CUSTOM_MP4 platform (raw MP4 uploaded to storage).
    // The publish gate is satisfied automatically because we set
    // both sourceType and license to their self-hosted values
    // up front — no further inference needed.
    const recording = await this.prisma.recording.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        videoUrl: dto.videoUrl,
        contentSource: ContentSource.UPLOADED,
        externalPlatform: ExternalPlatform.CUSTOM_MP4,
        // Catalog v2.1 — self-recorded clips are always classified
        // as UPLOADED_LOCAL on a BUNNY_SELF_HOSTED license. The
        // health-check service will still re-probe the URL to flip
        // `isActive` if the storage object is dead.
        sourceType: StreamSourceType.UPLOADED_LOCAL,
        license: ContentLicense.BUNNY_SELF_HOSTED,
        sourceAttribution: 'Nội dung tự ghi hình — Live Studio',
        duration: dto.duration,
        quality: StreamQuality.HD_720P,
        language: 'vi',
        isPublished:
          dto.visibility !== StudioSelfRecordVisibility.IPRIVATE,
        tags: [
          'self-recorded',
          channel.slug,
          ...(dto.tags ?? []),
        ],
        channelId: channel.id,
        // Auto-publish so the recording shows up immediately.
        publishedAt:
          dto.visibility === StudioSelfRecordVisibility.IPRIVATE
            ? new Date(0) // hidden: pin to epoch so it sorts last
            : new Date(),
      },
      include: {
        channel: { select: { id: true, slug: true, name: true } },
      },
    });

    await this.auditLogger.log({
      userId,
      action: 'STUDIO_SELF_RECORD_UPLOAD',
      entityType: 'Recording',
      entityId: recording.id,
      newValues: {
        channelId: channel.id,
        channelSlug: channel.slug,
        duration: dto.duration,
        visibility: dto.visibility ?? StudioSelfRecordVisibility.ISCHEDULED,
      },
    });

    // Optionally broadcast immediately.
    if (dto.visibility === StudioSelfRecordVisibility.IMEDIA) {
      const live = await this.curateLive(
        {
          channelId: channel.slug,
          recordingIds: [recording.id],
        },
        userId,
      );
      return {
        recording,
        liveEvent: live.event,
        message: `Đã phát trực tiếp "${recording.title}" trên kênh ${channel.name}.`,
      };
    }

    return {
      recording,
      liveEvent: null,
      message:
        dto.visibility === StudioSelfRecordVisibility.IPRIVATE
          ? `Đã lưu bản nháp "${recording.title}" (chỉ Staff/Admin xem được).`
          : `Đã xuất bản "${recording.title}" lên kênh ${channel.name}.`,
    };
  }

  // ============================================================
  // 4. Add to library (mở rộng kho nội dung từ URL bất kỳ)
  // ============================================================

  private readonly logger = new Logger(LiveStudioService.name);

  /**
   * Persist a new `Recording` row pointing at any reachable
   * http(s) video URL. The URL is HEAD-checked before the write
   * so we never store a dead source. Anti-piracy guard is
   * relaxed for this method (Staff explicitly added it) but
   * YouTube / Twitch / Vimeo / Facebook / TikTok / Dailymotion
   * are still rejected because those platforms don't grant
   * re-broadcast rights through Studio.
   *
   * The resulting row is **immediately selectable** in the
   * Studio "Chọn nội dung" picker (so the operator can stream
   * it up on the very next "PHÁT SÓNG" click).
   */
  async addToLibrary(dto: AddToLibraryDto, userId: string) {
    const channel = await this.findChannel(dto.channelId);
    if (!channel) {
      throw new NotFoundException(`Channel not found: ${dto.channelId}`);
    }

    // Anti-piracy: hard-reject commercial broadcasters even when
    // the operator pastes them by hand. The Studio is for
    // royalty-free / self-hosted content only.
    const platform = dto.platform ?? this.sniffPlatform(dto.videoUrl);
    if (BLOCKED_EXTERNAL_PLATFORMS.has(platform)) {
      throw new ForbiddenException(
        `Không thể thêm video từ nguồn "${platform}" — đây là nền tảng thương mại, ` +
          `không được phép tái phát sóng qua Studio. Vui lòng dùng nguồn MP4/HLS tự host.`,
      );
    }

    // HEAD-probe the URL so we don't persist a dead link. We
    // tolerate anything 2xx, 3xx, or 405 (some CDNs refuse HEAD
    // but accept GET) as "reachable".
    const probe = await this.probeUrl(dto.videoUrl);
    if (!probe.ok) {
      throw new BadRequestException(
        `URL video không truy cập được (status=${probe.status ?? 'no-response'}). ` +
          `Vui lòng kiểm tra link công khai trước khi thêm vào kho.`,
      );
    }

    // Catalog v2.1 — run the publish gate BEFORE persisting. We
    // honour explicit overrides from the DTO but fall back to
    // URL-pattern inference so the operator doesn't have to know
    // the internal `StreamSourceType` enum.
    const inferredSourceType = inferSourceTypeFromUrl(dto.videoUrl);
    const sourceType = (dto.sourceTypeOverride as StreamSourceType | undefined) ?? inferredSourceType;
    let license = normalizeLicense(dto.licenseOverride);
    if (license === ContentLicense.UNKNOWN) {
      license = inferDefaultLicenseFromSourceType(sourceType);
    }
    const gate = enforcePublishGate(
      {
        sourceType,
        license,
        sourceAttribution: dto.sourceAttribution ?? null,
      },
      { allowDevLicense: dto.allowDevLicense === true },
    );
    if (!gate.ok) {
      throw new BadRequestException(
        `Publish gate rejected the recording: ${gate.reason}`,
      );
    }

    const recording = await this.prisma.recording.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() ?? null,
        thumbnailUrl: dto.thumbnailUrl?.trim() ?? channel.logoUrl ?? null,
        videoUrl: dto.videoUrl.trim(),
        externalUrl: dto.videoUrl.trim(),
        externalPlatform: platform,
        // Library entries are always EXTERNAL even when the URL
        // happens to be a self-hosted MP4 — the field describes
        // the source, not where we store it.
        contentSource: ContentSource.EXTERNAL,
        // Catalog v2.1 — write the gate-decision so the player,
        // EPG filler and LICENSE.md audit can read it back.
        sourceType: gate.normalized.sourceType,
        license: gate.normalized.license,
        sourceAttribution: gate.normalized.sourceAttribution || null,
        duration: dto.duration,
        quality: StreamQuality.HD_720P,
        language: 'vi',
        isPublished: dto.isPublished !== false,
        tags: ['studio-library', channel.slug, ...(dto.tags ?? [])],
        channelId: channel.id,
        category: channel.category,
        publishedAt: dto.isPublished === false ? new Date(0) : new Date(),
      },
      include: {
        channel: { select: { id: true, slug: true, name: true } },
      },
    });

    await this.auditLogger.log({
      userId,
      action: 'STUDIO_LIBRARY_ADD',
      entityType: 'Recording',
      entityId: recording.id,
      newValues: {
        channelId: channel.id,
        channelSlug: channel.slug,
        videoUrl: recording.videoUrl,
        platform,
        sourceType: gate.normalized.sourceType,
        license: gate.normalized.license,
        sourceAttribution: gate.normalized.sourceAttribution,
        reachableStatus: probe.status,
        bypassed: probe.bypassed ?? false,
        contentLengthBytes: probe.contentLength,
        isPublished: recording.isPublished,
        allowDevLicense: dto.allowDevLicense === true,
      },
    });

    return {
      recording,
      message: `Đã thêm "${recording.title}" vào kho nội dung kênh ${channel.name}.`,
    };
  }

  /**
   * Add a catalog entry (from StudioCatalogService) to the
   * broadcastable library of a channel. The probe is bypassed
   * for catalog entries — they are pre-vetted at build time
   * (`verified=true`) or known-good by origin (`verified=false`
   * but URL is canonical / well-formed video).
   *
   * `overrideTitle` / `overrideDescription` let the operator
   * rename the entry to fit the channel before persisting.
   */
  async addFromCatalog(
    catalogEntry: {
      id: string;
      title: string;
      description: string;
      url: string;
      thumbnailUrl: string;
      format: string;
      durationSec: number;
      tags: string[];
      source: string;
      license: string;
    },
    channelIdentifier: string,
    userId: string,
    options: {
      overrideTitle?: string;
      overrideDescription?: string;
      isPublished?: boolean;
      // Catalog v2.1 — let the operator opt-in to
      // DEV_ONLY_TEST_FIXTURE entries from the picker UI.
      allowDevLicense?: boolean;
    } = {},
  ) {
    const channel = await this.findChannel(channelIdentifier);
    if (!channel) {
      throw new NotFoundException(`Channel not found: ${channelIdentifier}`);
    }

    // Sniff platform from URL extension — the catalog already
    // classifies by format, but we keep the single helper so the
    // resulting `externalPlatform` is consistent with the rest
    // of the codebase.
    const platform = this.sniffPlatform(catalogEntry.url);

    // Lightweight probe: skip for trusted-CDN entries, do a HEAD
    // for everything else. We do NOT throw on probe failure —
    // the catalog already vetted the URL — but we log the result
    // so the audit log records what we observed.
    const probe = await this.probeUrl(catalogEntry.url);
    this.logger.log(
      `addFromCatalog: ${catalogEntry.id} on ${channel.slug} → probe.ok=${probe.ok}` +
        ` status=${probe.status ?? 'n/a'} bypassed=${probe.bypassed ?? false}`,
    );

    // Catalog v2.1 — translate the catalog's free-text `source`
    // and `license` strings into the Prisma enums, then run the
    // publish gate. The DTO's `allowDevLicense` is the only way
    // for the operator to bypass the DEV_ONLY_TEST_FIXTURE block.
    const sourceType = inferSourceTypeFromUrl(catalogEntry.url);
    let license = normalizeLicense(catalogEntry.license);
    if (license === ContentLicense.UNKNOWN) {
      license = inferDefaultLicenseFromSourceType(sourceType);
    }
    const gate = enforcePublishGate(
      {
        sourceType,
        license,
        sourceAttribution: catalogEntry.license ?? null,
      },
      { allowDevLicense: options.allowDevLicense === true },
    );
    if (!gate.ok) {
      // Catalog entries are pre-vetted, so a gate failure here
      // means the catalog has a bad entry (or dev license
      // protection was toggled off). Reject loudly.
      throw new BadRequestException(
        `Publish gate rejected catalog entry ${catalogEntry.id}: ${gate.reason}`,
      );
    }

    const recording = await this.prisma.recording.create({
      data: {
        title: (options.overrideTitle ?? catalogEntry.title).trim(),
        description:
          (options.overrideDescription ?? catalogEntry.description).trim() ??
          null,
        thumbnailUrl: catalogEntry.thumbnailUrl || channel.logoUrl || null,
        videoUrl: catalogEntry.url.trim(),
        externalUrl: catalogEntry.url.trim(),
        externalPlatform: platform,
        contentSource: ContentSource.EXTERNAL,
        // Catalog v2.1 — write the gate-decision so downstream
        // consumers (player, EPG filler, LICENSE.md audit) see
        // the same classification the catalog was curated for.
        sourceType: gate.normalized.sourceType,
        license: gate.normalized.license,
        sourceAttribution: gate.normalized.sourceAttribution || null,
        duration: catalogEntry.durationSec,
        quality: StreamQuality.HD_720P,
        language: 'vi',
        isPublished: options.isPublished !== false,
        tags: [
          'studio-library',
          'catalog',
          `catalog:${catalogEntry.id}`,
          `format:${catalogEntry.format}`,
          channel.slug,
          ...catalogEntry.tags,
        ],
        channelId: channel.id,
        category: channel.category,
        publishedAt:
          options.isPublished === false ? new Date(0) : new Date(),
      },
      include: {
        channel: { select: { id: true, slug: true, name: true } },
      },
    });

    await this.auditLogger.log({
      userId,
      action: 'STUDIO_LIBRARY_ADD_FROM_CATALOG',
      entityType: 'Recording',
      entityId: recording.id,
      newValues: {
        catalogId: catalogEntry.id,
        channelId: channel.id,
        channelSlug: channel.slug,
        source: catalogEntry.source,
        format: catalogEntry.format,
        license: gate.normalized.license,
        sourceType: gate.normalized.sourceType,
        videoUrl: recording.videoUrl,
        probeOk: probe.ok,
        probeStatus: probe.status,
        bypassed: probe.bypassed ?? false,
        isPublished: recording.isPublished,
      },
    });

    return {
      recording,
      message: `Đã thêm "${recording.title}" (${catalogEntry.source}) vào kho nội dung kênh ${channel.name}.`,
    };
  }

  /**
   * Classify a video URL into an `ExternalPlatform` enum value.
   * Falls back to `CUSTOM_MP4` for unknown extensions — the
   * player's content-sniffer will still try to play it.
   */
  private sniffPlatform(url: string): ExternalPlatform {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      return ExternalPlatform.EMBED_IFRAME;
    }
    if (lower.includes('twitch.tv')) return ExternalPlatform.EMBED_IFRAME;
    if (lower.includes('vimeo.com')) return ExternalPlatform.EMBED_IFRAME;
    if (lower.includes('facebook.com') || lower.includes('fb.watch')) {
      return ExternalPlatform.EMBED_IFRAME;
    }
    if (lower.includes('tiktok.com')) return ExternalPlatform.EMBED_IFRAME;
    if (lower.includes('dailymotion.com')) return ExternalPlatform.EMBED_IFRAME;
    if (
      lower.includes('.m3u8') ||
      lower.includes('/hls/') ||
      lower.includes('/manifest/') ||
      lower.includes('.mpd')
    ) {
      return ExternalPlatform.CUSTOM_HLS;
    }
    if (
      lower.includes('.mp4') ||
      lower.includes('.mov') ||
      lower.includes('.webm') ||
      lower.includes('.mkv')
    ) {
      return ExternalPlatform.CUSTOM_MP4;
    }
    return ExternalPlatform.CUSTOM_MP4;
  }

  /**
   * Cheap reachability probe. Uses HEAD with a 6s timeout so a
   * slow CDN doesn't block the Studio picker. Some servers reply
   * `405 Method Not Allowed` (or `403 Forbidden`) to HEAD on
   * otherwise-valid GET resources — we retry with GET on those
   * cases because the player will fetch the same URL with GET.
   *
   * Trusted CDNs (Mux, Cloudinary, Archive, ...) skip the probe
   * entirely — we've already vetted them at compile time. The
   * probe is most useful for *unknown* origins where the user
   * has pasted a hand-typed URL.
   */
  private async probeUrl(
    url: string,
  ): Promise<{ ok: boolean; status?: number; contentLength?: number; bypassed?: boolean }> {
    // Fast path: trusted CDN + valid video extension → accept
    // without any network round-trip.
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (TRUSTED_CDN_DOMAINS.has(host) && VIDEO_EXTENSIONS.test(url)) {
        return { ok: true, bypassed: true };
      }
    } catch {
      /* malformed URL falls through to network probe */
    }

    const tryFetch = async (method: 'HEAD' | 'GET') => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      try {
        return await fetch(url, {
          method,
          signal: controller.signal,
          redirect: 'follow',
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    try {
      let res = await tryFetch('HEAD');
      // Some CDNs (GCS, Bunny) gate HEAD behind auth and reply
      // 403/405 even when GET would work. Fall back to a GET.
      if (res.status === 403 || res.status === 405) {
        res = await tryFetch('GET');
      }
      const status = res.status;
      const lenHeader = res.headers.get('content-length');
      const contentLength = lenHeader ? Number(lenHeader) : undefined;
      // 2xx / 3xx → ok. 4xx/5xx → dead link.
      if (status >= 200 && status < 400) {
        return { ok: true, status, contentLength };
      }
      return { ok: false, status };
    } catch (err) {
      this.logger.warn(
        `probeUrl(${url}) failed: ${(err as Error).message}`,
      );
      return { ok: false };
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Reject any recording sourced from a blacklisted platform. Only
   * UPLOADED / GENERATED content or self-hosted CUSTOM_* URLs are
   * accepted.
   */
  private assertBroadcastAllowed(
    contentSource: ContentSource | null | undefined,
    externalPlatform: ExternalPlatform | null | undefined,
    recordingId?: string,
  ): void {
    if (!this.isBroadcastAllowed(contentSource, externalPlatform)) {
      throw new ForbiddenException(
        `Recording ${recordingId ?? ''} cannot be broadcast as live. ` +
          `External platform "${externalPlatform ?? 'null'}" is blocked ` +
          `for re-distribution. Only UPLOADED / GENERATED content or ` +
          `self-hosted CUSTOM_* URLs are allowed.`,
      );
    }
  }

  private isBroadcastAllowed(
    contentSource: ContentSource | null | undefined,
    externalPlatform: ExternalPlatform | null | undefined,
  ): boolean {
    // No source metadata → treat as opaque and let other guards decide.
    if (!contentSource) return false;
    if (contentSource === ContentSource.UPLOADED) {
      // Uploaded content is fine regardless of platform field, but
      // we still reject blacklisted platforms to defend against mis-tag.
      if (externalPlatform && BLOCKED_EXTERNAL_PLATFORMS.has(externalPlatform)) {
        return false;
      }
      return true;
    }
    if (contentSource === ContentSource.GENERATED) {
      return true;
    }
    // EXTERNAL — only allow self-hosted custom URLs
    if (externalPlatform && ALLOWED_CUSTOM_PLATFORMS.has(externalPlatform)) {
      return true;
    }
    return false;
  }

  private async findChannel(identifier: string) {
    const where: Prisma.LiveChannelWhereInput = this.isUuid(identifier)
      ? { id: identifier }
      : { slug: identifier };

    return this.prisma.liveChannel.findFirst({
      where: { ...where, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        category: true,
      },
    });
  }

  private isUuid(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      s,
    );
  }
}
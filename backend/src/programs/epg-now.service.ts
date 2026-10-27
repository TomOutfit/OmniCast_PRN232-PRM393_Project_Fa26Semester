// ============================================================
// OmniCast - EPG Now Service
// ============================================================
//
// Resolves the *currently playing* program for a single channel and
// returns a payload shaped for the mobile/web player.
//
// The flow:
//   1. Fetch today's 24h EPG grid for the channel (re-using the same
//      filler/rotation logic as `findEpgByDay`).
//   2. Walk the programs and find the one whose [startTime, endTime)
//      interval contains `now()`.
//   3. If we find a real `LiveEvent`, prefer its `streamUrl` /
//      `externalUrl` (set by the AI Curator / Studio team).
//   4. If we land on a filler slot (a `Recording` replay), surface
//      the recording's `videoUrl` — Bunny Stream HLS playlist URL.
//   5. If nothing is scheduled, return a sequential fallback so the
//      player always has a stream.
//
// The same `findEpgByDay` cache (60s) makes this cheap: only the
// caller-side walk is new.
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgramsService } from './programs.service';
import type { FillerExpandedProgram } from './epg-filler.service';

export interface NowPlayingDto {
  channelId: string;
  channelSlug: string;
  channelName: string;
  channelLogoUrl: string | null;
  channelCategory: string;
  isPremium: boolean;

  /** Program currently airing (live or scheduled for the current slot). */
  program: {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    /** ISO timestamp. */
    startTime: string;
    /** ISO timestamp. */
    endTime: string;
    /** Elapsed seconds since startTime. */
    currentOffsetSeconds: number;
    /** Total seconds the program will run for. */
    durationSeconds: number;
    /** Whether this slot corresponds to a real LiveEvent or a
     *  Recording-replay / branded filler. */
    isFiller: boolean;
    /** True when the program is `status=LIVE` in the DB. */
    isLive: boolean;
    status: EventStatus | 'FILLER';
    tags: string[];
  } | null;

  /** The next program in the schedule, or null if none. */
  next: NowPlayingDto['program'];

  /** Resolved HLS playlist URL for the player. Never null. */
  streamUrl: string;

  /** Fallback URL used when the primary fails (Bunny embed / CDN root). */
  fallbackStreamUrl: string;

  /** Free-form source description ("bunny-stream", "recording-replay", ...). */
  source: string;

  /** ISO timestamp the server generated the snapshot. */
  generatedAt: string;

  /** True when now() is within [startTime, endTime]. */
  isOnAir: boolean;
}

/**
 * Default fallback URL. Bunny Stream `embed` endpoint always returns a
 * working iframe page even when the underlying video isn't live, which
 * makes it a safe safety net while we're migrating to the AI-driven
 * playlists.
 */
/**
 * Demo fallback. Big Buck Bunny — Creative Commons MP4 hosted on
 * verified CDN mirror. Renders directly in `video_player`, no API key,
 * no service billing. Safe for the demo when no recording matches.
 */
const SAMPLE_MP4_FALLBACK =
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4';

export interface EpgTimelineEntryDto {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  /** ISO timestamp. */
  startTime: string;
  /** ISO timestamp. */
  endTime: string;
  /** Seconds since startTime. Only meaningful when the program is the
   *  currently airing one; always 0 for upcoming programs. */
  currentOffsetSeconds: number;
  durationSeconds: number;
  isFiller: boolean;
  isLive: boolean;
  status: EventStatus | 'FILLER';
  tags: string[];
}

export interface EpgTimelineResponseDto {
  channelId: string;
  channelSlug: string;
  channelName: string;
  channelLogoUrl: string | null;
  channelCategory: string;
  isPremium: boolean;

  /** Same shape as `getNowPlaying.program`. Null during gap. */
  onAir: NowPlayingDto['program'];

  /** Sorted by startTime ascending; first entry is `onAir` (when present). */
  timeline: EpgTimelineEntryDto[];

  /** Number of programs in `timeline` (capped at `limit`). */
  totalEntries: number;

  /** Total upcoming programs remaining for the day (excluding `onAir`). */
  upcomingCount: number;

  /** ISO timestamp the snapshot was generated. */
  generatedAt: string;
}

/**
 * Cache entry shape for `EpgNowService.studioLiveCache`. Defined
 * at the top level so the Map's type parameter can refer to it
 * without causing TS7022 (implicit any in own initializer).
 */
export type EpgNowStudioLiveCacheEntry = {
  value: Awaited<
    ReturnType<EpgNowService['rawQueryActiveLive']>
  >;
  expiresAt: number;
};

@Injectable()
export class EpgNowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programsService: ProgramsService,
  ) {}

  /**
   * Resolve the now-playing payload for a single channel.
   *
   * Accepts either the channel UUID or the slug. Slugs are preferred by
   * mobile clients because they are stable across environments.
   */
  async getNowPlaying(identifier: string): Promise<NowPlayingDto> {
    const channel = await this.findChannel(identifier);
    if (!channel) {
      throw new NotFoundException(`Channel not found: ${identifier}`);
    }

    const now = new Date();
    const nowMs = now.getTime();

    // --------------------------------------------------------------
    // STUDIO PRIORITY: a curated live event from the Studio is the
    // most authoritative source. We check for any `LIVE` event on the
    // channel whose `[scheduledAt, scheduledAt + duration]` window
    // contains `now` and use it directly — bypassing the day-grid
    // cache. This guarantees that a Studio "go live" takes effect on
    // the very next `/epg/now` poll (≈1s), even if the day grid was
    // computed minutes ago.
    // --------------------------------------------------------------
    const curatedLive = await this.findActiveLiveEvent(channel.id, now);
    if (curatedLive) {
      return this.buildCuratedLivePayload(
        channel,
        curatedLive,
        now,
        nowMs,
      );
    }

    // Today's EPG grid (re-uses the 60s cache from ProgramsService)
    const day = await this.programsService.findEpgByDay({
      dateStr: this.formatYmd(new Date()),
      date: new Date(),
      channelIds: [channel.id],
    });

    const channelRow = day.channels.find((c) => c.channelId === channel.id);
    const programs = (channelRow?.programs ?? []) as unknown as Array<
      FillerExpandedProgram & { status?: EventStatus }
    >;

    let onAir: (typeof programs)[number] | null = null;
    let next: (typeof programs)[number] | null = null;

    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];
      const startMs = new Date(p.startTime).getTime();
      const endMs = new Date(p.endTime).getTime();
      if (startMs <= nowMs && nowMs < endMs) {
        onAir = p;
        // The "next" program is the one immediately after this slot
        next = programs[i + 1] ?? null;
        break;
      }
      if (startMs > nowMs && !next) {
        next = p;
      }
    }

    const streamUrl =
      (onAir?.streamUrl as string | undefined | null) ??
      (next?.streamUrl as string | undefined | null) ??
      SAMPLE_MP4_FALLBACK;

    // If we found a real LiveEvent, look up its richer fields
    let richProgram: NowPlayingDto['program'] = null;
    if (onAir) {
      const startMs = new Date(onAir.startTime).getTime();
      const endMs = new Date(onAir.endTime).getTime();
      const offsetSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      const durSec = Math.max(1, Math.floor((endMs - startMs) / 1000));

      let description: string | null = null;
      let isLive = false;
      let status: EventStatus | 'FILLER' = onAir.status ?? 'SCHEDULED';

      if (!onAir.isFiller && this.isUuid(onAir.id)) {
        const ev = await this.prisma.liveEvent.findUnique({
          where: { id: onAir.id },
          select: {
            description: true,
            status: true,
            scheduledAt: true,
            endedAt: true,
          },
        });
        if (ev) {
          description = ev.description;
          // `ev.status` is `EventStatus | null` in the Prisma schema
          // (column is nullable). Treat null as SCHEDULED — the row
          // exists so it must be at least scheduled to show up here.
          status = ev.status ?? EventStatus.SCHEDULED;
          isLive = status === EventStatus.LIVE;
        }
      } else {
        status = 'FILLER';
      }

      richProgram = {
        id: onAir.id,
        title: onAir.title,
        description,
        thumbnailUrl: onAir.thumbnailUrl ?? null,
        startTime: onAir.startTime,
        endTime: onAir.endTime,
        currentOffsetSeconds: offsetSec,
        durationSeconds: durSec,
        isFiller: !!onAir.isFiller,
        isLive,
        status,
        tags: onAir.tags ?? [],
      };
    }

    const richNext = next
      ? {
          id: next.id,
          title: next.title,
          description: null,
          thumbnailUrl: next.thumbnailUrl ?? null,
          startTime: next.startTime,
          endTime: next.endTime,
          currentOffsetSeconds: 0,
          durationSeconds: Math.max(
            1,
              Math.floor(
                (new Date(next.endTime).getTime() -
                  new Date(next.startTime).getTime()) /
                  1000,
              ),
            ),
          isFiller: !!next.isFiller,
          isLive: false,
          status: (next.status ?? 'SCHEDULED') as EventStatus | 'FILLER',
          tags: next.tags ?? [],
        }
      : null;

    return {
      channelId: channel.id,
      channelSlug: channel.slug,
      channelName: channel.name,
      channelLogoUrl: channel.logoUrl ?? null,
      channelCategory: String(channel.category),
      isPremium: this.isPremium(channel.slug),
      program: richProgram,
      next: richNext,
      streamUrl,
      fallbackStreamUrl: SAMPLE_MP4_FALLBACK,
      source: richProgram
        ? richProgram.isFiller
          ? 'recording-replay'
          : 'live-event'
        : 'fallback',
      generatedAt: new Date().toISOString(),
      isOnAir: richProgram !== null,
    };
  }

  /**
   * In-memory channel cache. Channel metadata (name / slug / logo /
   * category) changes rarely (admin edits only) and is read on
   * every `/epg/now` and `/epg/timeline` poll. A 60s TTL collapses
   * the per-channel SELECT into a Map.get for the dashboard burst
   * case.
   */
  private static readonly CHANNEL_CACHE_TTL_MS = 60_000;
  private channelCache = new Map<
    string,
    { value: Awaited<ReturnType<EpgNowService['rawFindChannel']>>; expiresAt: number }
  >();

  /**
   * Look up a channel by UUID or slug.
   */
  private async findChannel(identifier: string) {
    const cached = this.channelCache.get(identifier);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    const value = await this.rawFindChannel(identifier);
    this.channelCache.set(identifier, {
      value,
      expiresAt: Date.now() + EpgNowService.CHANNEL_CACHE_TTL_MS,
    });
    if (this.channelCache.size > 64) {
      const firstKey = this.channelCache.keys().next().value;
      if (firstKey) this.channelCache.delete(firstKey);
    }
    return value;
  }

  private async rawFindChannel(identifier: string) {
    const where: Prisma.LiveChannelWhereInput = this.isUuid(identifier)
      ? { id: identifier }
      : { slug: identifier };

    return this.prisma.liveChannel.findFirst({
      where: { ...where, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        category: true,
      },
    });
  }

  /**
   * Cache for `findActiveLiveEvent` lookups. Keys are
   * `${channelId}:${nowMs10s}` (a 10s window) so the value flips
   * automatically every 10s without us having to track expiration.
   * The Studio live lifecycle is measured in minutes, so 10s is
   * safely below the worst-case perception of "go live" lag while
   * collapsing the 99% of polls that come from a dashboard burst
   * into a single DB roundtrip.
   */
  private static readonly STUDIO_LIVE_CACHE_TTL_MS = 10_000;
  private studioLiveCache = new Map<string, EpgNowStudioLiveCacheEntry>();

  /**
   * Find a Studio-curated live event that is currently broadcasting
   * on a channel. An event is considered "active" when:
   *   • `status = LIVE`
   *   • `scheduledAt <= now < scheduledAt + duration`
   *
   * Returns the event enriched with channel metadata so we can build
   * a NowPlaying payload without an extra query. Null when nothing
   * matches — the caller then falls back to the day-grid walk.
   */
  private async findActiveLiveEvent(
    channelId: string,
    now: Date,
  ) {
    const bucketMs =
      Math.floor(now.getTime() / EpgNowService.STUDIO_LIVE_CACHE_TTL_MS) *
      EpgNowService.STUDIO_LIVE_CACHE_TTL_MS;
    const cacheKey = `${channelId}:${bucketMs}`;
    const cached = this.studioLiveCache.get(cacheKey);
    if (cached && cached.expiresAt > now.getTime()) {
      return cached.value;
    }

    const ev = await this.rawQueryActiveLive(channelId, now);
    this.studioLiveCache.set(cacheKey, {
      value: ev,
      expiresAt: now.getTime() + EpgNowService.STUDIO_LIVE_CACHE_TTL_MS,
    });
    // Defensive: avoid unbounded growth if polls come from many channels.
    if (this.studioLiveCache.size > 64) {
      const firstKey = this.studioLiveCache.keys().next().value;
      if (firstKey) this.studioLiveCache.delete(firstKey);
    }
    return ev;
  }

  /**
   * Single Prisma query for the currently-broadcasting live event on
   * a channel. Pulled out of `findActiveLiveEvent` so the cache type
   * inference has a concrete return type to anchor on.
   *
   * `duration` semantics:
   *   • `> 0`  → the event ends at `scheduledAt + duration`.
   *   • `<= 0` → OPEN-ENDED. This is what a webcam live uses
   *              (`duration: 0` = "runs until the broadcaster
   *              stops it"). Treating 0 as "already ended" made
   *              every webcam broadcast invisible in `/epg/now`.
   */
  private async rawQueryActiveLive(channelId: string, now: Date) {
    const ev = await this.prisma.liveEvent.findFirst({
      where: {
        channelId,
        status: EventStatus.LIVE,
        scheduledAt: { lte: now },
        // We use a runtime filter below to bound by duration since
        // Prisma can't compare to `scheduledAt + duration`.
      },
      orderBy: { scheduledAt: 'desc' },
    });
    if (!ev) return null;

    const durationSec = ev.duration ?? 0;
    if (durationSec > 0) {
      const endsAt = new Date(
        ev.scheduledAt.getTime() + durationSec * 1000,
      );
      if (endsAt.getTime() <= now.getTime()) return null;
    }
    // duration <= 0 → open-ended: still on air until it is stopped.
    return ev;
  }

  /**
   * Public hook for write paths (curate / stop / self-record) to
   * invalidate the in-memory Studio live cache for a given channel.
   * Without this, a "go live" click would only take effect after
   * the 10s cache window expires — visible lag during a demo.
   */
  invalidateStudioLiveCache(channelId: string): void {
    const prefix = `${channelId}:`;
    for (const key of this.studioLiveCache.keys()) {
      if (key.startsWith(prefix)) {
        this.studioLiveCache.delete(key);
      }
    }
  }

  /**
   * Build a NowPlaying payload directly from a curated live event.
   * Bypasses the day-grid entirely so Studio "go live" takes effect
   * on the next poll (≈1s) without waiting for the 60s grid cache.
   */
  private buildCuratedLivePayload(
    channel: {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      category: unknown;
    },
    event: {
      id: string;
      title: string;
      description: string | null;
      thumbnailUrl: string | null;
      streamUrl: string | null;
      externalUrl: string | null;
      // `status` is `EventStatus?` in the Prisma schema; we default to
      // `SCHEDULED` here so the function signature stays tight (the
      // caller in `getNowPlaying` only invokes us when the event is
      // actively broadcasting, but the type system doesn't know that).
      status: EventStatus | null;
      scheduledAt: Date;
      duration: number | null;
      tags: string[];
    },
    now: Date,
    nowMs: number,
  ): NowPlayingDto {
    const startMs = event.scheduledAt.getTime();
    const durationSec = event.duration ?? 0;
    const endMs = startMs + durationSec * 1000;
    const offsetSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    const resolvedStatus: EventStatus = event.status ?? EventStatus.SCHEDULED;

    const program = {
      id: event.id,
      title: event.title,
      description: event.description,
      thumbnailUrl: event.thumbnailUrl ?? null,
      startTime: event.scheduledAt.toISOString(),
      endTime: new Date(endMs).toISOString(),
      currentOffsetSeconds: offsetSec,
      durationSeconds: Math.max(1, Math.floor((endMs - startMs) / 1000)),
      isFiller: false,
      isLive: resolvedStatus === EventStatus.LIVE,
      status: resolvedStatus,
      tags: event.tags ?? [],
    };

    const streamUrl =
      event.streamUrl ?? event.externalUrl ?? SAMPLE_MP4_FALLBACK;

    return {
      channelId: channel.id,
      channelSlug: channel.slug,
      channelName: channel.name,
      channelLogoUrl: channel.logoUrl ?? null,
      channelCategory: String(channel.category),
      isPremium: this.isPremium(channel.slug),
      program,
      // Curated live has no next program by design — Staff decides
      // when to stop or pick the next recording.
      next: null,
      streamUrl,
      fallbackStreamUrl: SAMPLE_MP4_FALLBACK,
      source: 'studio-curated-live',
      generatedAt: now.toISOString(),
      isOnAir: true,
    };
  }

  /**
   * Mirrors `ChannelTiers.isPremium` on the mobile client. Keep the
   * free-channel list in sync — duplicate of `channel_tiers.dart`.
   */
  private isPremium(slug: string): boolean {
    const FREE = new Set([
      'sport-1',
      'sport-2',
      'show',
      'entertain',
      'cine',
    ]);
    const normalized = slug.toLowerCase().replace(/^omni-/, '');
    return !FREE.has(normalized);
  }

  /**
   * Resolve a "Coming up next…" timeline for a single channel:
   * the currently airing program (or the next one if nothing is on
   * air) plus up to `limit` upcoming programs. Re-uses the same
   * 60s `findEpgByDay` cache so the cost is one DB call per minute
   * per channel.
   *
   * Default `limit` is 6 (one Now + five Next). Hard-capped at 20
   * to keep payloads mobile-friendly.
   */
  async getChannelTimeline(
    identifier: string,
    limit: number = 6,
  ): Promise<EpgTimelineResponseDto> {
    const cap = Math.min(Math.max(limit, 1), 20);

    const channel = await this.findChannel(identifier);
    if (!channel) {
      throw new NotFoundException(`Channel not found: ${identifier}`);
    }

    const day = await this.programsService.findEpgByDay({
      dateStr: this.formatYmd(new Date()),
      date: new Date(),
      channelIds: [channel.id],
    });

    const channelRow = day.channels.find((c) => c.channelId === channel.id);
    const programs = (channelRow?.programs ?? []) as unknown as Array<
      FillerExpandedProgram & { status?: EventStatus }
    >;

    const now = new Date();
    const nowMs = now.getTime();

    let onAirIndex = -1;
    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];
      const startMs = new Date(p.startTime).getTime();
      const endMs = new Date(p.endTime).getTime();
      if (startMs <= nowMs && nowMs < endMs) {
        onAirIndex = i;
        break;
      }
    }

    // Build `onAir` from the actual on-air program slot — *not* from the
    // timeline's first entry. Earlier I aliased `entries[0]` here which
    // silently overwrote the real on-air program with the next one when
    // the caller excluded the current program from the timeline.
    const onAirProgram = onAirIndex >= 0 ? programs[onAirIndex] : null;

    // Nothing on air → grab the next upcoming (or null when the day's
    // schedule is empty / entirely in the past).
    const upcomingStart =
      onAirIndex >= 0
        ? onAirIndex + 1
        : programs.findIndex(
            (p) => new Date(p.startTime).getTime() >= nowMs,
          );

    const window =
      upcomingStart >= 0 ? programs.slice(upcomingStart) : [];

    const entries: EpgTimelineEntryDto[] = window.slice(0, cap).map((p, idx) => {
      const startMs = new Date(p.startTime).getTime();
      const endMs = new Date(p.endTime).getTime();
      const offset =
        idx === 0 && onAirIndex >= 0
          ? Math.max(0, Math.floor((nowMs - startMs) / 1000))
          : 0;
      return {
        id: p.id,
        title: p.title,
        thumbnailUrl: p.thumbnailUrl ?? null,
        startTime: p.startTime,
        endTime: p.endTime,
        currentOffsetSeconds: offset,
        durationSeconds: Math.max(
          1,
          Math.floor((endMs - startMs) / 1000),
        ),
        isFiller: !!p.isFiller,
        isLive: idx === 0 && onAirIndex >= 0 && p.status === 'LIVE',
        status: (p.status ?? 'SCHEDULED') as EventStatus | 'FILLER',
        tags: p.tags ?? [],
      };
    });

    const onAir = onAirProgram
      ? {
          id: onAirProgram.id,
          title: onAirProgram.title,
          description: null,
          thumbnailUrl: onAirProgram.thumbnailUrl ?? null,
          startTime: onAirProgram.startTime,
          endTime: onAirProgram.endTime,
          currentOffsetSeconds: Math.max(
            0,
            Math.floor(
              (nowMs -
                new Date(onAirProgram.startTime).getTime()) /
                1000,
            ),
          ),
          durationSeconds: Math.max(
            1,
            Math.floor(
              (new Date(onAirProgram.endTime).getTime() -
                new Date(onAirProgram.startTime).getTime()) /
                1000,
            ),
          ),
          isFiller: !!onAirProgram.isFiller,
          isLive: onAirProgram.status === 'LIVE',
          status: (onAirProgram.status ?? 'SCHEDULED') as EventStatus | 'FILLER',
          tags: onAirProgram.tags ?? [],
        }
      : null;

    return {
      channelId: channel.id,
      channelSlug: channel.slug,
      channelName: channel.name,
      channelLogoUrl: channel.logoUrl ?? null,
      channelCategory: String(channel.category),
      isPremium: this.isPremium(channel.slug),
      onAir,
      timeline: entries,
      totalEntries: entries.length,
      // Total programs remaining today, *before* the `limit` cap. Useful
      // for the UI to show "+N more" on the ribbon.
      upcomingCount: window.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private formatYmd(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
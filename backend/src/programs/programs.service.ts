// ============================================================
// OmniCast - Programs Service
// ============================================================

import { Prisma } from '@prisma/client';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../audit-logger/audit-logger.service';
import { TmdbEnrichmentService } from './ingest/tmdb-enrichment.service';
import {
  EpScheduleFillerService,
  FillerExpandedProgram,
} from './epg-filler.service';
import {
  CreateLiveEventDto,
  UpdateLiveEventDto,
  CreateRecordingDto,
  UpdateRecordingDto,
} from './dto/program.dto';
import { EventStatus } from '@prisma/client';

@Injectable()
export class ProgramsService {
  /**
   * Default slot length (in minutes) used when an event is created without
   * an explicit `duration`. Must stay in sync with the implicit assumption in
   * `checkScheduleConflict`.
   */
  private static readonly DEFAULT_DURATION_MINUTES = 120;
  private readonly defaultDurationMinutes = ProgramsService.DEFAULT_DURATION_MINUTES;

  /**
   * The `LiveEvent.duration` column is populated by the ingest layer in
   * **seconds** (see `NormalizedLiveEvent.duration` in
   * `base-source.interface.ts`). Internal EPG / conflict / snapshot logic
   * works in **minutes**, so this helper normalises the stored value.
   *
   * It is defensive: if a future ingest pipeline ever writes minutes
   * directly, values ≤ 24h worth of minutes (1440) are passed through
   * unchanged. Anything above the 24h threshold is treated as seconds and
   * converted to minutes.
   */
  private normalizeDurationMinutes(
    rawSecondsOrMinutes: number | null | undefined,
  ): number {
    if (rawSecondsOrMinutes == null) {
      return ProgramsService.DEFAULT_DURATION_MINUTES;
    }
    // Anything greater than 24h expressed in minutes (1440) is almost
    // certainly stored as seconds — the longest sane broadcast slot is
    // a few hours, never days.
    if (rawSecondsOrMinutes > 1440) {
      return Math.max(1, Math.round(rawSecondsOrMinutes / 60));
    }
    return rawSecondsOrMinutes;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
    private readonly tmdbEnrichment: TmdbEnrichmentService,
    private readonly configService: ConfigService,
    private readonly epgFiller: EpScheduleFillerService,
  ) {}

  // ============================================================
  // LIVE EVENTS
  // ============================================================

  async createLiveEvent(
    createLiveEventDto: CreateLiveEventDto,
    userId: string,
  ) {
    // Check for scheduling conflicts
    await this.checkScheduleConflict(
      createLiveEventDto.channelId,
      new Date(createLiveEventDto.scheduledAt),
      createLiveEventDto.duration ?? this.defaultDurationMinutes,
    );

    const event = await this.prisma.liveEvent.create({
      data: createLiveEventDto,
      include: {
        channel: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Audit log
    await this.auditLogger.log({
      userId,
      action: 'CREATE_LIVE_EVENT',
      entityType: 'LiveEvent',
      entityId: event.id,
      newValues: event,
    });

    // Fire-and-forget TMDB enrichment (skipped automatically when no API key)
    this.maybeEnrichTmdbEvent(event.id);

    return event;
  }

  async findAllLiveEvents(options?: {
    page?: number;
    limit?: number;
    channelId?: string;
    status?: EventStatus;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const {
      channelId,
      status,
      fromDate,
      toDate,
    } = options || {};

    const where: any = {};

    if (channelId) where.channelId = channelId;
    if (status) where.status = status;
    if (fromDate || toDate) {
      where.scheduledAt = {};
      if (fromDate) where.scheduledAt.gte = fromDate;
      if (toDate) where.scheduledAt.lte = toDate;
    }

    const [events, total] = await Promise.all([
      this.prisma.liveEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          channel: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      }),
      this.prisma.liveEvent.count({ where }),
    ]);

    return {
      data: events,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findLiveEventById(id: string) {
    const event = await this.prisma.liveEvent.findUnique({
      where: { id },
      include: {
        channel: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Live event not found');
    }

    return event;
  }

  async updateLiveEvent(
    id: string,
    updateDto: UpdateLiveEventDto,
    userId: string,
  ) {
    const event = await this.prisma.liveEvent.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Live event not found');
    }

    // Check for conflicts if time is being updated
    if (updateDto.scheduledAt || updateDto.duration) {
      const newStart = updateDto.scheduledAt
        ? new Date(updateDto.scheduledAt)
        : event.scheduledAt;
      const newDuration = updateDto.duration ?? this.defaultDurationMinutes;

      await this.checkScheduleConflict(
        updateDto.channelId || event.channelId,
        newStart,
        newDuration,
        id,
      );
    }

    const updated = await this.prisma.liveEvent.update({
      where: { id },
      data: updateDto,
      include: {
        channel: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    await this.auditLogger.log({
      userId,
      action: 'UPDATE_LIVE_EVENT',
      entityType: 'LiveEvent',
      entityId: id,
      oldValues: event,
      newValues: updated,
    });

    return updated;
  }

  async deleteLiveEvent(id: string, userId: string) {
    const event = await this.prisma.liveEvent.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Live event not found');
    }

    await this.prisma.liveEvent.delete({ where: { id } });

    await this.auditLogger.log({
      userId,
      action: 'DELETE_LIVE_EVENT',
      entityType: 'LiveEvent',
      entityId: id,
      oldValues: event,
    });

    return { message: 'Live event deleted successfully' };
  }

  // ============================================================
  // EPG (Electronic Program Guide) — read-only views
  // ============================================================

  /**
   * Cache entries for EPG responses.
   * Keyed by `${scope}:${key}`. Each entry expires after `TTL_MS`.
   */
  private static readonly EPG_CACHE_TTL_MS = 60_000;
  private readonly epgCache = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();

  /**
   * EPG for a single day, grouped by channel.
   * Results are cached in-memory for 60s to absorb bursty dashboard loads.
   */
  async findEpgByDay(opts: {
    date: Date;
    channelIds?: string[];
  }): Promise<{
    date: string;
    generatedAt: string;
    totalChannels: number;
    totalPrograms: number;
    channels: Array<{
      channelId: string;
      channelName: string;
      channelLogoUrl: string | null;
      channelCategory: string;
      programs: Array<{
        id: string;
        title: string;
        startTime: string;
        endTime: string;
        status: EventStatus;
        thumbnailUrl: string | null;
        durationMinutes: number;
        tags: string[];
        category: string;
      }>;
    }>;
  }> {
    const dateKey = this.formatYmd(opts.date);
    const channelKey = opts.channelIds && opts.channelIds.length
      ? [...opts.channelIds].sort().join(',')
      : '*';
    const cacheKey = `day:${dateKey}:${channelKey}`;

    const cached = this.epgCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as any;
    }

    const dayStart = new Date(opts.date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const channelWhere: any = { isActive: true };
    if (opts.channelIds && opts.channelIds.length) {
      channelWhere.id = { in: opts.channelIds };
    }

    const channels = await this.prisma.liveChannel.findMany({
      where: channelWhere,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        category: true,
      },
      orderBy: { name: 'asc' },
    });

    if (channels.length === 0) {
      const empty = {
        date: dateKey,
        generatedAt: new Date().toISOString(),
        totalChannels: 0,
        totalPrograms: 0,
        channels: [],
      };
      this.epgCache.set(cacheKey, { value: empty, expiresAt: Date.now() + ProgramsService.EPG_CACHE_TTL_MS });
      return empty;
    }

    const channelIds = channels.map((c) => c.id);
    const events = await this.prisma.liveEvent.findMany({
      where: {
        channelId: { in: channelIds },
        status: { in: ['SCHEDULED', 'LIVE', 'ENDED', 'ON_DEMAND'] },
        // Event scheduled to start on this day OR already LIVE / OVERLAPPING
        AND: [
          { scheduledAt: { gte: dayStart } },
          { scheduledAt: { lt: dayEnd } },
        ],
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        duration: true,
        status: true,
        thumbnailUrl: true,
        tags: true,
        channelId: true,
        channel: {
          select: { category: true },
        },
      },
    });

    // Pre-fetch up to 30 of the channel's recordings per channel so the
    // gap-filler has something to rotate through. The rotation is
    // deterministic per (date, channel) so the same day always shows the
    // same schedule, but different days surface different content.
    const recordingsByChannel = new Map<
      string,
      Array<{
        id: string;
        title: string;
        thumbnailUrl: string | null;
        duration: number | null;
        tags: string[];
      }>
    >();
    const recordings = await this.prisma.recording.findMany({
      where: {
        channelId: { in: channelIds },
        isPublished: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: channelIds.length * 30,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        duration: true,
        tags: true,
        channelId: true,
      },
    });
    for (const r of recordings) {
      const list = recordingsByChannel.get(r.channelId) ?? [];
      list.push(r);
      recordingsByChannel.set(r.channelId, list);
    }

    const channelsWithPrograms = channels.map((channel) => {
      const channelEvents = events.filter((e) => e.channelId === channel.id);
      const realPrograms: FillerExpandedProgram[] = channelEvents.map((e) => {
        const start = e.scheduledAt;
        const durationMinutes = this.normalizeDurationMinutes(e.duration);
        const end = new Date(start.getTime() + durationMinutes * 60_000);
        return {
          id: e.id,
          title: e.title,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status: e.status,
          thumbnailUrl: e.thumbnailUrl ?? null,
          durationMinutes,
          tags: e.tags ?? [],
          category: String(e.channel.category),
          isFiller: false,
          fillerKind: null,
          sourceRecordingId: null,
          sourceRecordingOrigin: null,
        };
      });
      const programs = this.expandChannelSchedule({
        channel,
        date: opts.date,
        realPrograms,
        recordings: recordingsByChannel.get(channel.id) ?? [],
      });
      return {
        channelId: channel.id,
        channelName: channel.name,
        channelLogoUrl: channel.logoUrl ?? null,
        channelCategory: String(channel.category),
        programs,
      };
    });

    const result = {
      date: dateKey,
      generatedAt: new Date().toISOString(),
      totalChannels: channelsWithPrograms.length,
      totalPrograms: channelsWithPrograms.reduce(
        (acc, c) => acc + c.programs.length,
        0,
      ),
      channels: channelsWithPrograms,
    };

    this.epgCache.set(cacheKey, { value: result, expiresAt: Date.now() + ProgramsService.EPG_CACHE_TTL_MS });
    return result;
  }

  /**
   * Expand a channel's daily schedule so the grid is never empty.
   *
   * The DB only has a handful of `LiveEvent` rows per channel per day,
   * so without fillers most channels would show a blank row for 22+
   * hours. We delegate the gap-filling to {@link EpScheduleFillerService}
   * which owns the policy: genre-aware random selection, episode
   * splitting for long programmes, and a per-day replay cap so the
   * viewer never sees the same episode loop endlessly.
   *
   * Returns the merged list of real + filler programs sorted by
   * `startTime`.
   */
  private expandChannelSchedule(opts: {
    channel: {
      id: string;
      name: string;
      logoUrl?: string | null;
      category: string;
    };
    date: Date;
    realPrograms: FillerExpandedProgram[];
    recordings: Array<{
      id: string;
      title: string;
      thumbnailUrl: string | null;
      duration: number | null;
      tags: string[];
      category?: any;
    }>;
  }): FillerExpandedProgram[] {
    return this.epgFiller.expandChannelSchedule({
      channel: {
        id: opts.channel.id,
        name: opts.channel.name,
        category: opts.channel.category,
      },
      date: opts.date,
      realPrograms: opts.realPrograms,
      recordings: opts.recordings.map((r) => ({
        id: r.id,
        title: r.title,
        thumbnailUrl: r.thumbnailUrl,
        duration: r.duration ?? 0,
        tags: r.tags ?? [],
        category: r.category ?? null,
      })),
    });
  }

  /**
   * Rotate `arr` left by `offset` positions. Pure, no mutation.
   * Kept for backwards-compatibility with internal callers; new code
   * should use {@link EpScheduleFillerService.shuffleDeterministic}.
   */
  private rotateArray<T>(arr: T[], offset: number): T[] {
    if (arr.length === 0) return arr;
    const o = ((offset % arr.length) + arr.length) % arr.length;
    return arr.slice(o).concat(arr.slice(0, o));
  }

  /**
   * Now + Next snapshot for every active channel.
   * Cached for 60s so the home screen can poll frequently.
   */
  async getChannelSnapshots(): Promise<{
    generatedAt: string;
    cacheTtlSeconds: number;
    channels: Array<{
      channelId: string;
      channelName: string;
      channelLogoUrl: string | null;
      channelCategory: string;
      now: {
        id: string;
        title: string;
        startTime: string;
        endTime: string;
        elapsedPercent: number;
      } | null;
      next: {
        id: string;
        title: string;
        startTime: string;
        endTime: string;
        elapsedPercent: number;
      } | null;
    }>;
  }> {
    const cacheKey = 'snapshot:*';
    const cached = this.epgCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as any;
    }

    const now = new Date();
    const channels = await this.prisma.liveChannel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        category: true,
      },
      orderBy: { name: 'asc' },
    });

    if (channels.length === 0) {
      const empty = {
        generatedAt: now.toISOString(),
        cacheTtlSeconds: 60,
        channels: [],
      };
      this.epgCache.set(cacheKey, { value: empty, expiresAt: Date.now() + ProgramsService.EPG_CACHE_TTL_MS });
      return empty;
    }

    const channelIds = channels.map((c) => c.id);
    // Fetch every live event for these channels (LIVE + next scheduled)
    const events = await this.prisma.liveEvent.findMany({
      where: {
        channelId: { in: channelIds },
        OR: [
          { status: 'LIVE' },
          { scheduledAt: { gte: now } },
        ],
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        duration: true,
        status: true,
        startedAt: true,
        channelId: true,
      },
    });

    const durationFor = (e: { duration: number | null }) =>
      this.normalizeDurationMinutes(e.duration);

    const result = {
      generatedAt: now.toISOString(),
      cacheTtlSeconds: 60,
      channels: channels.map((channel) => {
        const channelEvents = events.filter((e) => e.channelId === channel.id);

        const liveNow = channelEvents.find((e) => e.status === 'LIVE');
        const upcoming = channelEvents
          .filter((e) => e.status !== 'LIVE' && e.scheduledAt >= now)
          .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

        const now2 = now;
        const buildEntry = (
          e: (typeof channelEvents)[number],
        ): {
          id: string;
          title: string;
          startTime: string;
          endTime: string;
          elapsedPercent: number;
        } => {
          const start = e.startedAt ?? e.scheduledAt;
          const end = new Date(start.getTime() + durationFor(e) * 60_000);
          const totalMs = end.getTime() - start.getTime();
          const elapsedMs = Math.max(0, now2.getTime() - start.getTime());
          const elapsedPercent =
            totalMs > 0
              ? Math.min(100, Math.round((elapsedMs / totalMs) * 100))
              : 0;
          return {
            id: e.id,
            title: e.title,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            elapsedPercent,
          };
        };

        return {
          channelId: channel.id,
          channelName: channel.name,
          channelLogoUrl: channel.logoUrl ?? null,
          channelCategory: String(channel.category),
          now: liveNow ? buildEntry(liveNow) : null,
          next: upcoming[0] ? buildEntry(upcoming[0]) : null,
        };
      }),
    };

    this.epgCache.set(cacheKey, { value: result, expiresAt: Date.now() + ProgramsService.EPG_CACHE_TTL_MS });
    return result;
  }

  private formatYmd(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async getLiveNow() {
    return this.prisma.liveEvent.findMany({
      where: { status: 'LIVE' },
      include: {
        channel: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
      orderBy: { viewerCount: 'desc' },
    });
  }

  // ============================================================
  // RECORDINGS / VOD
  // ============================================================

  async createRecording(
    createRecordingDto: CreateRecordingDto,
    userId: string,
  ) {
    const recording = await this.prisma.recording.create({
      data: createRecordingDto,
      include: {
        channel: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Update channel total videos count
    await this.prisma.liveChannel.update({
      where: { id: createRecordingDto.channelId },
      data: { totalVideos: { increment: 1 } },
    });

    await this.auditLogger.log({
      userId,
      action: 'CREATE_RECORDING',
      entityType: 'Recording',
      entityId: recording.id,
      newValues: recording,
    });

    // Fire-and-forget TMDB enrichment (skipped automatically when no API key)
    this.maybeEnrichTmdbRecording(recording.id);

    return recording;
  }

  async findAllRecordings(options?: {
    page?: number;
    limit?: number;
    channelId?: string;
    category?: string;
    isFeatured?: boolean;
    search?: string;
  }) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 20);
    const {
      channelId,
      category,
      isFeatured,
      search,
    } = options || {};

    const where: any = { isPublished: true };

    if (channelId) where.channelId = channelId;
    if (category) where.category = category as any;
    if (isFeatured !== undefined) {
      where.isFeatured = typeof isFeatured === 'string' ? String(isFeatured) === 'true' : Boolean(isFeatured);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [recordings, total] = await Promise.all([
      this.prisma.recording.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          channel: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      }),
      this.prisma.recording.count({ where }),
    ]);

    return {
      data: recordings,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findRecordingById(id: string) {
    const recording = await this.prisma.recording.findUnique({
      where: { id },
      include: {
        channel: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        comments: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    return recording;
  }

  async incrementViewCount(recordingId: string) {
    return this.prisma.recording.update({
      where: { id: recordingId },
      data: { viewCount: { increment: 1 } },
    });
  }

  /** Increment + return new share count for a recording. */
  async incrementRecordingShare(recordingId: string) {
    try {
      const updated = await this.prisma.recording.update({
        where: { id: recordingId },
        data: { shareCount: { increment: 1 } },
        select: { id: true, shareCount: true },
      });
      return { id: updated.id, shareCount: updated.shareCount };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        return { id: recordingId, shareCount: null };
      }
      throw err;
    }
  }

  /** Increment + return new share count for a live event. */
  async incrementLiveEventShare(liveEventId: string) {
    try {
      const updated = await this.prisma.liveEvent.update({
        where: { id: liveEventId },
        data: { shareCount: { increment: 1 } },
        select: { id: true, shareCount: true },
      });
      return { id: updated.id, shareCount: updated.shareCount };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        return { id: liveEventId, shareCount: null };
      }
      throw err;
    }
  }

  /** Increment + return new viewer count for a live event. */
  async incrementLiveEventView(liveEventId: string) {
    try {
      const updated = await this.prisma.liveEvent.update({
        where: { id: liveEventId },
        data: { viewerCount: { increment: 1 } },
        select: { id: true, viewerCount: true },
      });
      return { id: updated.id, viewerCount: updated.viewerCount };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        return { id: liveEventId, viewerCount: null };
      }
      throw err;
    }
  }

  /**
   * Public, idempotent view-counter increment for the player UI.
   * Wraps `incrementViewCount` so the controller can stay free of
   * Prisma-specific exceptions.
   */
  async incrementRecordingView(recordingId: string) {
    try {
      const updated = await this.incrementViewCount(recordingId);
      return {
        recordingId: updated.id,
        viewCount: updated.viewCount,
      };
    } catch (err) {
      // Recording not found — return null instead of bubbling 404 so the
      // player UI can ignore the call without crashing.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        return { recordingId, viewCount: null };
      }
      throw err;
    }
  }

  /**
   * Return up to `limit` recordings related to the supplied one.
   *
   * For now we use **same channel + same category** as the strongest
   * relevance signal, then fill with other popular recordings on the
   * same channel. Cross-channel recommendation can be layered on later
   * (TMDB similarity, tag overlap, …) without breaking the contract.
   */
  async findSimilarRecordings(recordingId: string, limit: number) {
    const seed = await this.prisma.recording.findUnique({
      where: { id: recordingId },
      select: { id: true, channelId: true, category: true },
    });

    if (!seed) {
      return [];
    }

    // 1) Same channel + same category, excluding seed.
    const sameChannelCategory = await this.prisma.recording.findMany({
      where: {
        channelId: seed.channelId,
        category: seed.category,
        id: { not: seed.id },
        isPublished: true,
      },
      orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
      include: {
        channel: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });

    if (sameChannelCategory.length >= limit) {
      return sameChannelCategory;
    }

    // 2) Fill with same-channel recordings of any category.
    const remaining = limit - sameChannelCategory.length;
    const fill = await this.prisma.recording.findMany({
      where: {
        channelId: seed.channelId,
        id: {
          not: seed.id,
          notIn: sameChannelCategory.map((r) => r.id),
        },
        isPublished: true,
      },
      orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
      take: remaining,
      include: {
        channel: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });

    return [...sameChannelCategory, ...fill];
  }

  async updateRecording(
    id: string,
    updateDto: UpdateRecordingDto,
    userId: string,
  ) {
    const recording = await this.prisma.recording.findUnique({ where: { id } });
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    const updated = await this.prisma.recording.update({
      where: { id },
      data: updateDto,
      include: {
        channel: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    await this.auditLogger.log({
      userId,
      action: 'UPDATE_RECORDING',
      entityType: 'Recording',
      entityId: id,
      oldValues: recording,
      newValues: updated,
    });

    return updated;
  }

  async deleteRecording(id: string, userId: string) {
    const recording = await this.prisma.recording.findUnique({
      where: { id },
      include: { channel: true },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    await this.prisma.recording.delete({ where: { id } });

    // Decrement channel total videos count
    await this.prisma.liveChannel.update({
      where: { id: recording.channelId },
      data: { totalVideos: { decrement: 1 } },
    });

    await this.auditLogger.log({
      userId,
      action: 'DELETE_RECORDING',
      entityType: 'Recording',
      entityId: id,
      oldValues: recording,
    });

    return { message: 'Recording deleted successfully' };
  }

  // ============================================================
  // SCHEDULE CONFLICT DETECTION ALGORITHM
  // ============================================================

  /**
   * Same logic as the throwing `checkScheduleConflict`, but reports
   * conflicts instead of throwing — used by the dry-run preflight endpoint
   * so Staff can preview before committing.
   */
  async findConflicts(
    channelId: string,
    startTime: Date,
    durationMinutes: number,
    excludeEventId?: string,
  ): Promise<
    Array<{
      id: string;
      title: string;
      scheduledAt: Date;
      duration: number | null;
    }>
  > {
    const endTime = new Date(
      startTime.getTime() + durationMinutes * 60 * 1000,
    );

    const conflictRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        scheduled_at: Date;
        duration: number | null;
      }>
    >(Prisma.sql`
      SELECT id, title, "scheduledAt" AS scheduled_at, "duration"
      FROM "LiveEvent"
      WHERE "channelId" = ${channelId}::uuid
        AND status IN ('SCHEDULED', 'LIVE')
        AND "scheduledAt" < ${endTime}
        AND (
          COALESCE(
            "endedAt",
            "scheduledAt" + (
              CASE
                WHEN "duration" IS NULL THEN (${this.defaultDurationMinutes} || ' minutes')::interval
                WHEN "duration" > 1440   THEN ("duration" || ' seconds')::interval
                ELSE ("duration" || ' minutes')::interval
              END
            )
          )
          > ${startTime}
        )
        ${excludeEventId ? Prisma.sql`AND id <> ${excludeEventId}::uuid` : Prisma.empty}
    `);

    return conflictRows.map((row) => ({
      id: row.id,
      title: row.title,
      scheduledAt: row.scheduled_at,
      duration: row.duration,
    }));
  }

  /**
   * Bulk schedule preflight. Returns conflicts grouped by the supplied
   * client reference (so the UI can highlight which rows will fail).
   */
  async preflightEvents(
    events: Array<{
      clientRef?: string;
      channelId: string;
      scheduledAt: Date;
      duration?: number;
    }>,
  ): Promise<
    Array<{
      clientRef: string | null;
      channelId: string;
      channelName: string;
      conflictingEventId: string;
      conflictingEventTitle: string;
      conflictingScheduledAt: string;
      overlapMinutes: number;
    }>
  > {
    const result: Array<{
      clientRef: string | null;
      channelId: string;
      channelName: string;
      conflictingEventId: string;
      conflictingEventTitle: string;
      conflictingScheduledAt: string;
      overlapMinutes: number;
    }> = [];

    // Pre-fetch channel names once
    const channelIds = Array.from(new Set(events.map((e) => e.channelId)));
    const channels = channelIds.length
      ? await this.prisma.liveChannel.findMany({
          where: { id: { in: channelIds } },
          select: { id: true, name: true },
        })
      : [];
    const channelNameMap = new Map(channels.map((c) => [c.id, c.name]));
    const channelOk = new Set(channelNameMap.keys());

    // First, intra-input conflicts (events in the same request overlapping)
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        if (a.channelId !== b.channelId) continue;
        const aDur = a.duration ?? this.defaultDurationMinutes;
        const bDur = b.duration ?? this.defaultDurationMinutes;
        const aStart = a.scheduledAt.getTime();
        const aEnd = aStart + aDur * 60_000;
        const bStart = b.scheduledAt.getTime();
        const bEnd = bStart + bDur * 60_000;
        const overlapStart = Math.max(aStart, bStart);
        const overlapEnd = Math.min(aEnd, bEnd);
        if (overlapEnd > overlapStart) {
          const overlapMinutes = Math.round(
            (overlapEnd - overlapStart) / 60_000,
          );
          result.push({
            clientRef: b.clientRef ?? null,
            channelId: b.channelId,
            channelName: channelNameMap.get(b.channelId) ?? 'Unknown',
            conflictingEventId: `input:${a.clientRef ?? i}`,
            conflictingEventTitle: a.clientRef
              ? `Input event ${a.clientRef}`
              : `Input event #${i + 1}`,
            conflictingScheduledAt: a.scheduledAt.toISOString(),
            overlapMinutes,
          });
        }
      }
    }

    // Then DB conflicts for each input event
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!channelOk.has(e.channelId)) continue;
      const duration = e.duration ?? this.defaultDurationMinutes;
      const conflicts = await this.findConflicts(
        e.channelId,
        e.scheduledAt,
        duration,
      );
      for (const c of conflicts) {
        // Compute overlap. The conflicting event's stored `duration` is
        // in seconds (see `normalizeDurationMinutes` for details), so
        // convert it to minutes before computing the end time.
        const cStart = c.scheduledAt.getTime();
        const cDurationMinutes = this.normalizeDurationMinutes(c.duration);
        const cEnd = cStart + cDurationMinutes * 60_000;
        const inputStart = e.scheduledAt.getTime();
        const inputEnd = inputStart + duration * 60_000;
        const overlapStart = Math.max(inputStart, cStart);
        const overlapEnd = Math.min(inputEnd, cEnd);
        const overlapMinutes =
          overlapEnd > overlapStart
            ? Math.round((overlapEnd - overlapStart) / 60_000)
            : 0;
        result.push({
          clientRef: e.clientRef ?? null,
          channelId: e.channelId,
          channelName: channelNameMap.get(e.channelId) ?? 'Unknown',
          conflictingEventId: c.id,
          conflictingEventTitle: c.title,
          conflictingScheduledAt: c.scheduledAt.toISOString(),
          overlapMinutes,
        });
      }
    }

    return result;
  }

  private async checkScheduleConflict(
    channelId: string,
    startTime: Date,
    durationMinutes: number,
    excludeEventId?: string,
  ) {
    const endTime = new Date(
      startTime.getTime() + durationMinutes * 60 * 1000,
    );

    // Use raw SQL so we can compute the *effective* end time of an existing
    // event as max("endedAt", "scheduledAt" + duration). The naive Prisma
    // `where` would skip events whose `endedAt` is still NULL (i.e. SCHEDULED
    // events that have not actually finished), causing false negatives.
    const conflictRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        scheduled_at: Date;
        duration: number | null;
      }>
    >(Prisma.sql`
      SELECT id, title, "scheduledAt" AS scheduled_at, "duration"
      FROM "LiveEvent"
      WHERE "channelId" = ${channelId}::uuid
        AND status IN ('SCHEDULED', 'LIVE')
        AND "scheduledAt" < ${endTime}
        AND (
          COALESCE(
            "endedAt",
            "scheduledAt" + (
              CASE
                WHEN "duration" IS NULL THEN (${this.defaultDurationMinutes} || ' minutes')::interval
                WHEN "duration" > 1440   THEN ("duration" || ' seconds')::interval
                ELSE ("duration" || ' minutes')::interval
              END
            )
          )
          > ${startTime}
        )
        ${excludeEventId ? Prisma.sql`AND id <> ${excludeEventId}::uuid` : Prisma.empty}
    `);

    if (conflictRows.length > 0) {
      const conflicts = conflictRows.map((row) => ({
        id: row.id,
        title: row.title,
        scheduledAt: row.scheduled_at,
      }));
      throw new ConflictException({
        message: 'Schedule conflict detected',
        conflicts,
      });
    }
  }

  // ============================================================
  // TMDB ENRICHMENT (fire-and-forget, gated by INGEST_TMDB_AUTO_ENRICH)
  // ============================================================

  private maybeEnrichTmdbEvent(eventId: string): void {
    if (!this.isTmdbAutoEnrichEnabled()) return;
    // Detached promise — never awaited, never throws to caller.
    void this.tmdbEnrichment.enrichLiveEvent(eventId).catch(() => undefined);
  }

  private maybeEnrichTmdbRecording(recordingId: string): void {
    if (!this.isTmdbAutoEnrichEnabled()) return;
    void this.tmdbEnrichment
      .enrichRecording(recordingId)
      .catch(() => undefined);
  }

  private isTmdbAutoEnrichEnabled(): boolean {
    const raw = this.configService.get<string>('INGEST_TMDB_AUTO_ENRICH');
    return raw === undefined ? true : raw.toLowerCase() === 'true';
  }
}

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
    private readonly tmdbEnrichment: TmdbEnrichmentService,
    private readonly configService: ConfigService,
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
      Array<{ id: string; title: string; scheduled_at: Date }>
    >(Prisma.sql`
      SELECT id, title, "scheduledAt" AS scheduled_at
      FROM "LiveEvent"
      WHERE "channelId" = ${channelId}
        AND status IN ('SCHEDULED', 'LIVE')
        AND "scheduledAt" < ${endTime}
        AND (
          COALESCE("endedAt", "scheduledAt" + (COALESCE("duration", ${this.defaultDurationMinutes}) || ' minutes')::interval)
          > ${startTime}
        )
        ${excludeEventId ? Prisma.sql`AND id <> ${excludeEventId}` : Prisma.empty}
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

// ============================================================
// OmniCast - Programs Service
// ============================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../audit-logger/audit-logger.service';
import {
  CreateLiveEventDto,
  UpdateLiveEventDto,
  CreateRecordingDto,
  UpdateRecordingDto,
} from './dto/program.dto';
import { EventStatus } from '@prisma/client';

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
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
      createLiveEventDto.duration || 120,
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
    const {
      page = 1,
      limit = 20,
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
      const newDuration = updateDto.duration || 120;

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
    const {
      page = 1,
      limit = 20,
      channelId,
      category,
      isFeatured,
      search,
    } = options || {};

    const where: any = { isPublished: true };

    if (channelId) where.channelId = channelId;
    if (category) where.category = category as any;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
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

    const where: any = {
      channelId,
      status: { in: ['SCHEDULED', 'LIVE'] },
      OR: [
        // New event starts during existing event
        {
          scheduledAt: { lte: startTime },
          endedAt: { gt: startTime },
        },
        // New event ends during existing event
        {
          scheduledAt: { lt: endTime },
          endedAt: { gte: endTime },
        },
        // New event completely contains existing event
        {
          scheduledAt: { gte: startTime },
          endedAt: { lte: endTime },
        },
      ],
    };

    if (excludeEventId) {
      where.NOT = { id: excludeEventId };
    }

    const conflicts = await this.prisma.liveEvent.findMany({
      where,
      select: { id: true, title: true, scheduledAt: true },
    });

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Schedule conflict detected',
        conflicts,
      });
    }
  }
}

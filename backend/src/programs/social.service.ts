// ============================================================
// OmniCast - Social Service (Comments & Reactions)
// ============================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../audit-logger/audit-logger.service';
import { CreateCommentDto } from './dto/social.dto';
import { ReactionType } from '@prisma/client';

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  private isUuid(val?: string): boolean {
    return !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  }

  // ============================================================
  // COMMENTS
  // ============================================================

  async listCommentsByRecording(
    recordingId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    if (!this.isUuid(recordingId)) {
      throw new NotFoundException('Recording not found');
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const recording = await this.prisma.recording.findUnique({
      where: { id: recordingId },
      select: { id: true },
    });
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { recordingId, parentId: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true, role: true },
          },
          replies: {
            take: 3,
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                  role: true,
                },
              },
            },
          },
          _count: { select: { replies: true, likes: true } },
        },
      }),
      this.prisma.comment.count({
        where: { recordingId, parentId: null },
      }),
    ]);

    return {
      data: comments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createComment(
    recordingId: string,
    userId: string,
    dto: CreateCommentDto,
  ) {
    if (!this.isUuid(recordingId)) {
      throw new NotFoundException('Recording not found');
    }

    const recording = await this.prisma.recording.findUnique({
      where: { id: recordingId },
      select: { id: true, channelId: true, channel: { select: { allowComments: true } } },
    });
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }
    if (recording.channel && recording.channel.allowComments === false) {
      throw new ForbiddenException('Comments are disabled for this channel');
    }

    if (dto.parentId) {
      if (!this.isUuid(dto.parentId)) {
        throw new NotFoundException('Parent comment not found in this recording');
      }
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, recordingId: true },
      });
      if (!parent || parent.recordingId !== recordingId) {
        throw new NotFoundException('Parent comment not found in this recording');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        userId,
        recordingId,
        parentId: dto.parentId,
      },
      include: {
        user: {
          select: { id: true, fullName: true, avatarUrl: true, role: true },
        },
      },
    });

    // Increment comment counter on recording
    await this.prisma.recording.update({
      where: { id: recordingId },
      data: { commentCount: { increment: 1 } },
    });

    await this.auditLogger.log({
      userId,
      action: 'CREATE_COMMENT',
      entityType: 'Comment',
      entityId: comment.id,
      newValues: { recordingId, content: dto.content },
    });

    return comment;
  }

  async deleteComment(commentId: string, userId: string, role: string) {
    if (!this.isUuid(commentId)) {
      throw new NotFoundException('Comment not found');
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException('You cannot delete this comment');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });

    await this.prisma.recording.update({
      where: { id: comment.recordingId },
      data: { commentCount: { decrement: 1 } },
    });

    await this.auditLogger.log({
      userId,
      action: 'DELETE_COMMENT',
      entityType: 'Comment',
      entityId: commentId,
      oldValues: comment,
    });

    return { message: 'Comment deleted', id: commentId };
  }

  async listCommentsByLiveEvent(
    liveEventId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    if (!this.isUuid(liveEventId)) {
      throw new NotFoundException('Live event not found');
    }
    const event = await this.prisma.liveEvent.findUnique({
      where: { id: liveEventId },
      select: { id: true, channelId: true },
    });
    if (!event) {
      throw new NotFoundException('Live event not found');
    }

    const recording = await this.prisma.recording.findFirst({
      where: {
        OR: [
          { generatedFromEventId: liveEventId },
          { channelId: event.channelId },
        ],
      },
      select: { id: true },
    });
    if (!recording) {
      return {
        data: [],
        meta: {
          page: options.page || 1,
          limit: options.limit || 20,
          total: 0,
          totalPages: 0,
        },
      };
    }
    return this.listCommentsByRecording(recording.id, options);
  }

  async createCommentOnLiveEvent(
    liveEventId: string,
    userId: string,
    dto: CreateCommentDto,
  ) {
    if (!this.isUuid(liveEventId)) {
      throw new NotFoundException('Live event not found');
    }
    const event = await this.prisma.liveEvent.findUnique({
      where: { id: liveEventId },
      select: { id: true, channelId: true, title: true },
    });
    if (!event) {
      throw new NotFoundException('Live event not found');
    }

    let recording = await this.prisma.recording.findFirst({
      where: {
        OR: [
          { generatedFromEventId: liveEventId },
          { channelId: event.channelId },
        ],
      },
      select: { id: true },
    });

    if (!recording) {
      recording = await this.prisma.recording.create({
        data: {
          title: `Stream Archive: ${event.title}`,
          channelId: event.channelId,
          generatedFromEventId: liveEventId,
          duration: 3600,
          videoUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
        },
        select: { id: true },
      });
    }

    return this.createComment(recording.id, userId, dto);
  }

  // ============================================================
  // REACTIONS
  // ============================================================

  /**
   * Internal helper: resolve "live event OR recording" via the union
   * type on the `Reaction` table. We accept either `recordingId` OR
   * `liveEventId`, never both.
   */
  private async resolveReactionTarget(opts: {
    recordingId?: string;
    liveEventId?: string;
  }): Promise<
    | { kind: 'recording'; id: string }
    | { kind: 'liveEvent'; id: string }
    | null
  > {
    if (opts.recordingId) {
      if (!this.isUuid(opts.recordingId)) return null;
      const r = await this.prisma.recording.findUnique({
        where: { id: opts.recordingId },
        select: { id: true },
      });
      return r ? { kind: 'recording', id: opts.recordingId } : null;
    }
    if (opts.liveEventId) {
      if (!this.isUuid(opts.liveEventId)) return null;
      const e = await this.prisma.liveEvent.findUnique({
        where: { id: opts.liveEventId },
        select: { id: true },
      });
      return e ? { kind: 'liveEvent', id: opts.liveEventId } : null;
    }
    return null;
  }

  async listReactionsByRecording(recordingId: string) {
    return this.listReactions({ recordingId });
  }

  async listReactionsByLiveEvent(liveEventId: string) {
    return this.listReactions({ liveEventId });
  }

  async listReactions(opts: {
    recordingId?: string;
    liveEventId?: string;
  }): Promise<{ data: Record<string, number>; total: number }> {
    const target = await this.resolveReactionTarget(opts);
    if (!target) {
      throw new NotFoundException(
        opts.recordingId
          ? 'Recording not found'
          : 'Live event not found',
      );
    }

    const where =
      target.kind === 'recording'
        ? { recordingId: target.id }
        : { liveEventId: target.id };

    const reactions = await this.prisma.reaction.groupBy({
      by: ['type'],
      where,
      _count: { type: true },
    });

    const result: Record<string, number> = {};
    let total = 0;
    for (const r of reactions) {
      result[r.type] = r._count.type;
      total += r._count.type;
    }

    return { data: result, total };
  }

  async toggleReactionByRecording(
    recordingId: string,
    userId: string,
    type: ReactionType,
  ) {
    return this.toggleReaction({ recordingId }, userId, type);
  }

  async toggleReactionByLiveEvent(
    liveEventId: string,
    userId: string,
    type: ReactionType,
  ) {
    return this.toggleReaction({ liveEventId }, userId, type);
  }

  /**
   * Toggle a reaction on either a recording or a live event. The
   * `Reaction` table is polymorphic via nullable `recordingId` /
   * `liveEventId` columns (see migration 003).
   */
  async toggleReaction(
    target: { recordingId?: string; liveEventId?: string },
    userId: string,
    type: ReactionType,
  ): Promise<{ toggled: boolean; type: ReactionType; target: string }> {
    const resolved = await this.resolveReactionTarget(target);
    if (!resolved) {
      throw new NotFoundException(
        target.recordingId
          ? 'Recording not found'
          : 'Live event not found',
      );
    }

    const where =
      resolved.kind === 'recording'
        ? { userId, recordingId: resolved.id, type }
        : { userId, liveEventId: resolved.id, type };

    const existing = await this.prisma.reaction.findFirst({ where });

    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
      if (resolved.kind === 'recording') {
        await this.prisma.recording.update({
          where: { id: resolved.id },
          data: { likeCount: { decrement: 1 } },
        });
      } else {
        await this.prisma.liveEvent.update({
          where: { id: resolved.id },
          data: { likeCount: { decrement: 1 } },
        });
      }
      return { toggled: false, type, target: resolved.kind };
    }

    // Prisma's union CreateInput expects either recordingId OR liveEventId
    // to be present (the other omitted). Use a cast so the discriminator
    // narrows correctly without TypeScript bailing on the implicit-undefined.
    const createData =
      resolved.kind === 'recording'
        ? { userId, recordingId: resolved.id, type }
        : { userId, liveEventId: resolved.id, type };

    await this.prisma.reaction.create({ data: createData as any });
    if (resolved.kind === 'recording') {
      await this.prisma.recording.update({
        where: { id: resolved.id },
        data: { likeCount: { increment: 1 } },
      });
    } else {
      await this.prisma.liveEvent.update({
        where: { id: resolved.id },
        data: { likeCount: { increment: 1 } },
      });
    }

    return { toggled: true, type, target: resolved.kind };
  }
}

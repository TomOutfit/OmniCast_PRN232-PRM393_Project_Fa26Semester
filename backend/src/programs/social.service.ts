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

  // ============================================================
  // COMMENTS
  // ============================================================

  async listCommentsByRecording(
    recordingId: string,
    options: { page?: number; limit?: number } = {},
  ) {
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

  // ============================================================
  // REACTIONS
  // ============================================================

  async listReactionsByRecording(recordingId: string) {
    const recording = await this.prisma.recording.findUnique({
      where: { id: recordingId },
      select: { id: true },
    });
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    const reactions = await this.prisma.reaction.groupBy({
      by: ['type'],
      where: { recordingId },
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

  async toggleReaction(
    recordingId: string,
    userId: string,
    type: ReactionType,
  ) {
    const recording = await this.prisma.recording.findUnique({
      where: { id: recordingId },
      select: { id: true },
    });
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    const existing = await this.prisma.reaction.findUnique({
      where: {
        userId_recordingId_type: {
          userId,
          recordingId,
          type,
        },
      },
    });

    if (existing) {
      await this.prisma.reaction.delete({
        where: { id: existing.id },
      });
      await this.prisma.recording.update({
        where: { id: recordingId },
        data: { likeCount: { decrement: 1 } },
      });
      return { toggled: false, type };
    }

    await this.prisma.reaction.create({
      data: { userId, recordingId, type },
    });
    await this.prisma.recording.update({
      where: { id: recordingId },
      data: { likeCount: { increment: 1 } },
    });

    return { toggled: true, type };
  }
}

// ============================================================
// OmniCast - Notifications Service
// ------------------------------------------------------------
// CRUD operations for the Notification model. The model is fed
// by background jobs (new follower, live start, etc.) — this
// service only handles READ / MARK-READ for the end user.
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationItemDto,
  NotificationListResponseDto,
  UnreadCountResponseDto,
  MarkReadResponseDto,
} from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List the user's notifications, paginated, with optional
   * read/unread filter. The actor is joined so the UI can
   * show the "from" user (avatar + name) without a second call.
   */
  async list(
    userId: string,
    options: { limit?: number; offset?: number; filter?: 'all' | 'unread' | 'read' } = {},
  ): Promise<NotificationListResponseDto> {
    if (!userId) {
      return { total: 0, unreadCount: 0, items: [] };
    }
    try {
      const { limit = 20, offset = 0, filter = 'all' } = options;

      const where: any = { userId };
      if (filter === 'unread') where.isRead = false;
      if (filter === 'read') where.isRead = true;

      const [rows, total, unreadCount] = await Promise.all([
        this.prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
          include: {
            actor: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        }),
        this.prisma.notification.count({ where }),
        this.prisma.notification.count({
          where: { userId, isRead: false },
        }),
      ]);

      return {
        total,
        unreadCount,
        items: rows.map((row) => this.toItemDto(row)),
      };
    } catch (err) {
      console.error('[NotificationsService.list] Failed to fetch notifications:', err);
      return { total: 0, unreadCount: 0, items: [] };
    }
  }

  async unreadCount(userId: string): Promise<UnreadCountResponseDto> {
    if (!userId) {
      return { unreadCount: 0 };
    }
    try {
      const unreadCount = await this.prisma.notification.count({
        where: { userId, isRead: false },
      });
      return { unreadCount };
    } catch (err) {
      console.error('[NotificationsService.unreadCount] Failed to count unread notifications:', err);
      return { unreadCount: 0 };
    }
  }

  async markOneRead(
    userId: string,
    notificationId: string,
  ): Promise<MarkReadResponseDto> {
    if (!userId || !notificationId) {
      return { success: true, updated: 0 };
    }
    try {
      // Make sure the notification belongs to this user before mutating.
      const exists = await this.prisma.notification.findFirst({
        where: { id: notificationId, userId },
        select: { id: true },
      });
      if (!exists) {
        return { success: true, updated: 0 };
      }
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      });
      return { success: true, updated: 1 };
    } catch (err) {
      console.error('[NotificationsService.markOneRead] Failed to mark notification read:', err);
      return { success: true, updated: 0 };
    }
  }

  async markAllRead(userId: string): Promise<MarkReadResponseDto> {
    if (!userId) {
      return { success: true, updated: 0 };
    }
    try {
      const result = await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return { success: true, updated: result.count };
    } catch (err) {
      console.error('[NotificationsService.markAllRead] Failed to mark all notifications read:', err);
      return { success: true, updated: 0 };
    }
  }

  async removeOne(userId: string, notificationId: string): Promise<{ success: true }> {
    if (!userId || !notificationId) {
      return { success: true };
    }
    try {
      await this.prisma.notification.deleteMany({
        where: { id: notificationId, userId },
      });
    } catch (err) {
      console.error('[NotificationsService.removeOne] Failed to delete notification:', err);
    }
    return { success: true };
  }

  /**
   * Internal helper used by background jobs to create a notification
   * (e.g. a new follower). Exposed here so the rest of the codebase
   * has a single entry point.
   */
  async create(data: {
    userId: string;
    type: 'NEW_FOLLOWER' | 'NEW_VIDEO' | 'LIVE_START' | 'LIVE_ENDED' | 'COMMENT_REPLY' | 'COMMENT_MENTION' | 'REACTION' | 'SYSTEM_ANNOUNCEMENT';
    title: string;
    message?: string;
    actionUrl?: string;
    actorId?: string;
    eventId?: string;
    recordingId?: string;
    channelId?: string;
  }): Promise<NotificationItemDto> {
    const row = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        actorId: data.actorId,
        eventId: data.eventId,
        recordingId: data.recordingId,
        channelId: data.channelId,
      },
      include: {
        actor: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });
    return this.toItemDto(row);
  }

  private toItemDto(row: any): NotificationItemDto {
    return {
      id: row.id,
      type: String(row.type),
      title: row.title,
      message: row.message ?? null,
      actionUrl: row.actionUrl ?? null,
      actorId: row.actorId ?? null,
      actorName: row.actor?.fullName ?? null,
      actorAvatarUrl: row.actor?.avatarUrl ?? null,
      eventId: row.eventId ?? null,
      recordingId: row.recordingId ?? null,
      channelId: row.channelId ?? null,
      isRead: Boolean(row.isRead),
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

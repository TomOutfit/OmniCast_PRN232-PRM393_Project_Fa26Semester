// ============================================================
// OmniCast - Admin Service (Platform Overview & Operations)
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../audit-logger/audit-logger.service';

export interface AdminAnalyticsOverview {
  users: {
    total: number;
    active: number;
    deactivated: number;
    roles: {
      viewer: number;
      staff: number;
      admin: number;
      guest: number;
    };
    newLast7Days: number;
  };
  channels: {
    total: number;
    active: number;
    featured: number;
  };
  broadcasts: {
    recordingsCount: number;
    liveEventsCount: number;
    activeLiveCount: number;
  };
  security: {
    totalAuditLogs: number;
    auditLogsLast24h: number;
    topActions: { action: string; count: number }[];
  };
  system: {
    status: string;
    uptimeSeconds: number;
    memoryUsageMb: number;
    nodeVersion: string;
    timestamp: string;
  };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) { }

  /**
   * Get high-level system analytics across users, channels, broadcasts, and security.
   */
  async getOverview(): Promise<AdminAnalyticsOverview> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      deactivatedUsers,
      viewersCount,
      staffCount,
      adminCount,
      newUsers7d,
      totalChannels,
      activeChannels,
      featuredChannels,
      recordingsCount,
      liveEventsCount,
      activeLiveCount,
      totalAuditLogs,
      auditLogs24h,
      recentActionsRaw,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.count({ where: { role: 'VIEWER' } }),
      this.prisma.user.count({ where: { role: 'STAFF' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),

      this.prisma.liveChannel.count(),
      this.prisma.liveChannel.count({ where: { isActive: true } }),
      this.prisma.liveChannel.count({ where: { isFeatured: true } }),

      this.prisma.recording.count(),
      this.prisma.liveEvent.count(),
      this.prisma.liveEvent.count({ where: { status: 'LIVE' } }),

      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),

      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 6,
      }),
    ]);

    const memUsage = process.memoryUsage();
    const memoryUsageMb = Math.round(memUsage.heapUsed / 1024 / 1024);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        deactivated: deactivatedUsers,
        roles: {
          viewer: viewersCount,
          staff: staffCount,
          admin: adminCount,
          guest: Math.max(0, totalUsers - (viewersCount + staffCount + adminCount)),
        },
        newLast7Days: newUsers7d,
      },
      channels: {
        total: totalChannels,
        active: activeChannels,
        featured: featuredChannels,
      },
      broadcasts: {
        recordingsCount,
        liveEventsCount,
        activeLiveCount,
      },
      security: {
        totalAuditLogs,
        auditLogsLast24h: auditLogs24h,
        topActions: recentActionsRaw.map((r) => ({
          action: r.action,
          count: r._count.action,
        })),
      },
      system: {
        status: 'OPERATIONAL',
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb,
        nodeVersion: process.version,
        timestamp: now.toISOString(),
      },
    };
  }

  /**
   * Broadcast a system announcement notification to users.
   */
  async broadcastAnnouncement(
    adminUserId: string,
    title: string,
    message: string,
    actionUrl?: string,
  ) {
    // Fetch all active users
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    if (users.length > 0) {
      await this.prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          actorId: adminUserId,
          type: 'SYSTEM_ANNOUNCEMENT' as any,
          title,
          message,
          actionUrl,
        })),
      });
    }

    // Log this critical action in audit logs
    await this.auditLogger.log({
      userId: adminUserId,
      action: 'SYSTEM_ANNOUNCEMENT_BROADCAST',
      entityType: 'NOTIFICATION',
      newValues: {
        title,
        message,
        recipientsCount: users.length,
      },
    });

    this.logger.log(`Admin ${adminUserId} broadcasted announcement: "${title}" to ${users.length} users`);

    return {
      success: true,
      recipientsCount: users.length,
      timestamp: new Date().toISOString(),
    };
  }
}

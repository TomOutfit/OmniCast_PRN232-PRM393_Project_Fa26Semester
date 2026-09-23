// ============================================================
// OmniCast - Audit Logger Service
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';

export interface AuditLogData {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLoggerService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: AuditLogData & { request?: Request }) {
    const { request, ...logData } = data;

    return this.prisma.auditLog.create({
      data: {
        userId: logData.userId,
        userEmail: await this.getUserEmail(logData.userId),
        action: logData.action,
        entityType: logData.entityType,
        entityId: logData.entityId,
        oldValues: logData.oldValues ? JSON.parse(JSON.stringify(logData.oldValues)) : undefined,
        newValues: logData.newValues ? JSON.parse(JSON.stringify(logData.newValues)) : undefined,
        ipAddress: request?.ip || logData.ipAddress,
        userAgent: request?.headers['user-agent'] || logData.userAgent,
      },
    });
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entityType,
      fromDate,
      toDate,
    } = options || {};

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string, options?: { page?: number; limit?: number }) {
    const { page = 1, limit = 50 } = options || {};

    return this.prisma.auditLog.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecentActivity(limit: number = 10) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActionStats(fromDate?: Date, toDate?: Date) {
    const where: any = {};
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    return this.prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      where,
    });
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || null;
    } catch {
      return null;
    }
  }
}

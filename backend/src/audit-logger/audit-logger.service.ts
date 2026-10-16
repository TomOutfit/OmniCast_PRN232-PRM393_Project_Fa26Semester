// ============================================================
// OmniCast - Audit Logger Service (facade)
// ============================================================
//
// Two paths, transparently chosen at runtime:
//   1. **In-process Prisma** (default). Every `log()` call hits
//      Postgres directly — synchronous, zero-network, single-row
//      write. This is the canonical path.
//   2. **gRPC outbox** (opt-in). When `AUDIT_LOGGER_GRPC_URL` env
//      is set and non-empty, the service opens a fire-and-forget
//      gRPC stream to the standalone `audit-logger` microservice.
//      The in-process Prisma write is still issued as the source of
//      truth — gRPC is purely additive (idempotency is enforced by
//      the microservice using the client-generated `entry.id`).
//
// The HTTP API behaviour is identical either way; observability
// consumers (Admin dashboard "Live Stream" tab) call into the
// gRPC microservice directly via SSE proxy at
// `/api/v1/audit-logs/stream`.
// ============================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

interface GrpcForwardPayload {
  entry: {
    id: string;
    user_id?: string;
    user_email?: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    old_values_json?: string;
    new_values_json?: string;
    ip_address?: string;
    user_agent?: string;
  };
}

@Injectable()
export class AuditLoggerService implements OnModuleInit {
  private readonly logger = new Logger(AuditLoggerService.name);
  private grpcClient: any | null = null;
  private readonly grpcUrl: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.grpcUrl =
      this.configService.get<string>('AUDIT_LOGGER_GRPC_URL')?.trim() ||
      null;
  }

  async onModuleInit() {
    if (!this.grpcUrl) {
      this.logger.log(
        'AuditLoggerService: using in-process Prisma only (no gRPC outbox)',
      );
      return;
    }

    // Lazy-import so the package isn't a hard dep in single-process
    // deployments. If anything fails (missing dep, bad URL) we log
    // a warning and fall back to in-process only — never crash.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const grpc = await import('@grpc/grpc-js').catch(() => null);
      const protoLoader = await import('@grpc/proto-loader').catch(
        () => null,
      );
      if (!grpc || !protoLoader) {
        this.logger.warn(
          `gRPC outbox requested but @grpc/grpc-js / @grpc/proto-loader not installed; using in-process only`,
        );
        return;
      }
      const path = await import('node:path');
      const PROTO_PATH = path.join(
        process.cwd(),
        'protos',
        'audit_logger.proto',
      );
      const packageDef = (protoLoader as any).loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      const proto = (grpc as any).loadPackageDefinition(packageDef);
      const AuditLogger = proto.omnicast.audit.v1.AuditLogger;
      this.grpcClient = new AuditLogger(
        this.grpcUrl,
        (grpc as any).credentials.createInsecure(),
      );
      this.logger.log(`AuditLoggerService: gRPC outbox enabled → ${this.grpcUrl}`);
    } catch (err) {
      this.logger.warn(
        `Failed to initialise gRPC outbox; falling back to in-process only: ${err}`,
      );
      this.grpcClient = null;
    }
  }

  async log(data: AuditLogData & { request?: Request }) {
    const { request, ...logData } = data;

    const record = await this.prisma.auditLog.create({
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

    // Fire-and-forget gRPC outbox (best-effort — Prisma write is
    // already durable; the microservice is just an extra fan-out
    // hook for live dashboards).
    if (this.grpcClient) {
      this.forwardToGrpc(record, logData, request).catch((err) =>
        this.logger.warn(`gRPC outbox failed: ${err}`),
      );
    }

    return record;
  }

  /**
   * Best-effort write through the gRPC microservice. Errors are
   * logged but never re-thrown — the audit trail is always in
   * Postgres regardless.
   */
  private async forwardToGrpc(
    record: any,
    logData: AuditLogData,
    request?: Request,
  ): Promise<void> {
    if (!this.grpcClient) return;
    const payload: GrpcForwardPayload = {
      entry: {
        id: record.id,
        user_id: logData.userId,
        user_email: record.userEmail ?? undefined,
        action: logData.action,
        entity_type: logData.entityType,
        entity_id: logData.entityId,
        old_values_json: logData.oldValues
          ? JSON.stringify(logData.oldValues)
          : undefined,
        new_values_json: logData.newValues
          ? JSON.stringify(logData.newValues)
          : undefined,
        ip_address: request?.ip || logData.ipAddress,
        user_agent: request?.headers['user-agent'] || logData.userAgent,
      },
    };

    await new Promise<void>((resolve, reject) => {
      this.grpcClient.Write(payload, (err: any) => {
        if (err) return reject(err);
        resolve();
      });
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
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 50);
    const {
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

  /**
   * Sibling of `findByEntity`, but filters ONLY by `entityType` (no
   * `entityId`). Useful for listing every audit event for a logical
   * table — e.g. "show me all `AiCuratorReport` activity in the last
   * 24 hours".
   *
   * Supported options:
   *   - `skip` / `take`: standard Prisma pagination
   *   - `action`: filter by action name (e.g. `AI_CURATION_COMPLETE`)
   *   - `userId`: filter by the user who caused the event
   *   - `from` / `to`: date range against `createdAt`
   */
  async findByEntityType(
    entityType: string,
    options: {
      skip?: number;
      take?: number;
      action?: string;
      userId?: string;
      from?: Date;
      to?: Date;
    } = {},
  ) {
    const where: any = { entityType };

    if (options.action) where.action = options.action;
    if (options.userId) where.userId = options.userId;
    if (options.from || options.to) {
      where.createdAt = {};
      if (options.from) where.createdAt.gte = options.from;
      if (options.to) where.createdAt.lte = options.to;
    }

    return this.prisma.auditLog.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string, options?: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Number(options?.limit) || 50);

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

  async exportLogs(options?: {
    action?: string;
    entityType?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }) {
    const limit = Math.min(5000, Math.max(1, Number(options?.limit) || 1000));
    const where: any = {};
    if (options?.action) where.action = options.action;
    if (options?.entityType) where.entityType = options.entityType;
    if (options?.fromDate || options?.toDate) {
      where.createdAt = {};
      if (options.fromDate) where.createdAt.gte = options.fromDate;
      if (options.toDate) where.createdAt.lte = options.toDate;
    }

    return this.prisma.auditLog.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    // userId can be a UUID or a non-UUID system identifier like "system-ingest".
    // Only attempt the lookup if it looks like a valid UUID.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return null;
    }
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

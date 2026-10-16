// ============================================================
// OmniCast - Audit Logger gRPC Microservice: AuditService
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Subject } from 'rxjs';

export interface AuditEntryPayload {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValuesJson?: string;
  newValuesJson?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  /** Subject fanning out to all active server-streaming subscribers. */
  private readonly stream$ = new Subject<AuditEntryPayload>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist an audit entry. Idempotency is keyed by `entry.id`: a
   * duplicate write returns `{ deduplicated: true }` instead of failing.
   */
  async write(entry: AuditEntryPayload): Promise<{ id: string; deduplicated: boolean }> {
    try {
      const created = await this.prisma.auditLog.create({
        data: {
          id: entry.id,
          userId: entry.userId || null,
          userEmail: entry.userEmail || null,
          action: entry.action,
          entityType: entry.entityType || null,
          entityId: entry.entityId || null,
          oldValues: this.parseJson(entry.oldValuesJson),
          newValues: this.parseJson(entry.newValuesJson),
          ipAddress: entry.ipAddress || null,
          userAgent: entry.userAgent || null,
          createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
        },
      });

      // Broadcast to any active subscribers.
      this.stream$.next(entry);
      return { id: created.id, deduplicated: false };
    } catch (err: any) {
      // P2002 → unique violation on `id` → entry already exists.
      if (err?.code === 'P2002') {
        return { id: entry.id, deduplicated: true };
      }
      this.logger.error(`Failed to write audit entry ${entry.id}`, err);
      throw err;
    }
  }

  /**
   * Return an Observable filtered by the supplied request. We don't
   * strictly filter on the server — every subscriber gets every entry,
   * and the client filters in-process. This keeps the server stateless
   * and avoids re-emitting old entries on connect.
   */
  stream() {
    return this.stream$.asObservable();
  }

  private parseJson(raw?: string): any {
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch (err) {
      this.logger.warn(`Malformed JSON in audit payload: ${raw.slice(0, 80)}`);
      return undefined;
    }
  }
}

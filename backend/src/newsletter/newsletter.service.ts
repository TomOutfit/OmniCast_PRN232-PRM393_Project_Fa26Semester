// ============================================================
// OmniCast - Newsletter Service
// ------------------------------------------------------------
// Persists email subscriptions for the EPG weekly digest. Uses
// soft-unsubscribe (sets `unsubscribedAt`) so we can keep a
// historical record of signups and recover from accidental
// unsubscribes.
// ============================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../audit-logger/audit-logger.service';
import { randomBytes } from 'crypto';
import {
  SubscribeNewsletterDto,
  SubscribeNewsletterResponseDto,
  UnsubscribeResponseDto,
} from './dto/newsletter.dto';

const DEFAULT_TOPICS = ['weekly_schedule'];

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  /**
   * Idempotent subscribe — calling twice with the same email
   * does NOT throw; it just confirms the existing record and
   * updates topics/locale.
   */
  async subscribe(
    dto: SubscribeNewsletterDto,
    meta: { userId?: string; ip?: string; userAgent?: string } = {},
  ): Promise<SubscribeNewsletterResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const topics = dto.topics && dto.topics.length > 0 ? dto.topics : DEFAULT_TOPICS;
    const locale = dto.locale ?? 'vi';

    // Look up existing record (including soft-unsubscribed)
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing && !existing.unsubscribedAt) {
      // Update topics/locale if they've changed
      const updated = await this.prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { topics, locale, source: dto.source ?? existing.source },
      });
      return {
        success: true,
        alreadySubscribed: true,
        email: updated.email,
        locale: updated.locale ?? 'vi',
        topics: updated.topics,
      };
    }

    // Either brand-new or previously unsubscribed
    const unsubscribeToken = randomBytes(32).toString('hex');
    const record = existing
      ? await this.prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: {
            topics,
            locale,
            source: dto.source ?? existing.source,
            isConfirmed: true,
            confirmedAt: new Date(),
            unsubscribedAt: null,
            unsubscribeToken,
            userId: meta.userId,
            ipAddress: meta.ip,
            userAgent: meta.userAgent,
          },
        })
      : await this.prisma.newsletterSubscriber.create({
          data: {
            email,
            topics,
            locale,
            source: dto.source ?? 'unknown',
            isConfirmed: true,            // double opt-in could be added later
            confirmedAt: new Date(),
            unsubscribeToken,
            userId: meta.userId,
            ipAddress: meta.ip,
            userAgent: meta.userAgent,
          },
        });

    // Audit the signup (using "system" as the actor when no user)
    await this.auditLogger.log({
      userId: meta.userId ?? '00000000-0000-0000-0000-000000000000',
      action: existing ? 'NEWSLETTER_RESUBSCRIBE' : 'NEWSLETTER_SUBSCRIBE',
      entityType: 'NewsletterSubscriber',
      entityId: record.id,
      newValues: { email: record.email, topics, locale },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      success: true,
      alreadySubscribed: false,
      email: record.email,
      locale: record.locale ?? 'vi',
      topics: record.topics,
    };
  }

  /**
   * Soft-unsubscribe by token. If the token doesn't exist, throw 404.
   * If the user is already unsubscribed, the operation is idempotent.
   */
  async unsubscribe(token: string): Promise<UnsubscribeResponseDto> {
    const record = await this.prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true, email: true, unsubscribedAt: true },
    });
    if (!record) {
      throw new NotFoundException('Invalid unsubscribe token');
    }
    if (!record.unsubscribedAt) {
      await this.prisma.newsletterSubscriber.update({
        where: { id: record.id },
        data: { unsubscribedAt: new Date() },
      });
      await this.auditLogger.log({
        userId: '00000000-0000-0000-0000-000000000000',
        action: 'NEWSLETTER_UNSUBSCRIBE',
        entityType: 'NewsletterSubscriber',
        entityId: record.id,
        oldValues: { email: record.email, unsubscribedAt: null },
      });
    }
    return { success: true, email: record.email };
  }

  /**
   * Admin: list subscribers — paginated, with soft-unsubscribed
   * records optional via `includeUnsubscribed` flag.
   */
  async listSubscribers(
    options: { page?: number; limit?: number; includeUnsubscribed?: boolean } = {},
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(options.limit) || 50));
    const where: any = {};
    if (!options.includeUnsubscribed) {
      where.unsubscribedAt = null;
    }
    const [rows, total, activeCount] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          topics: true,
          locale: true,
          isConfirmed: true,
          unsubscribedAt: true,
          source: true,
          createdAt: true,
        },
      }),
      this.prisma.newsletterSubscriber.count({ where }),
      this.prisma.newsletterSubscriber.count({
        where: { unsubscribedAt: null },
      }),
    ]);
    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        activeCount,
      },
    };
  }
}

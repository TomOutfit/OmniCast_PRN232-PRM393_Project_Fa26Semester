// ============================================================
// OmniCast - Watchlist Service (Cloud Primary)
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../audit-logger/audit-logger.service';
import {
  AddWatchlistItemDto,
  WatchlistItemResponseDto,
  SyncWatchlistResponseDto,
} from './dto/watchlist.dto';

type UpcomingBucket = 'upcoming' | 'live' | 'past';

@Injectable()
export class WatchlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  /**
   * Returns the user's watchlist. If `upcomingOnly` is true, only events
   * still in the future (or LIVE) are returned, sorted by scheduledAt ASC.
   */
  async list(
    userId: string,
    options: { upcomingOnly?: boolean } = {},
  ): Promise<{ total: number; items: WatchlistItemResponseDto[] }> {
    const rows = await this.prisma.watchlist.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            status: true,
            scheduledAt: true,
            duration: true,
            channel: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    const now = Date.now();
    let items = rows.map((row) => this.toItemDto(row));

    if (options.upcomingOnly) {
      items = items
        .filter((item) => {
          const scheduledMs = new Date(item.program.scheduledAt).getTime();
          const endMs =
            scheduledMs + (item.program.duration ?? 120) * 60_000;
          return (
            item.program.status === 'LIVE' ||
            scheduledMs >= now ||
            (scheduledMs < now && endMs > now)
          );
        })
        .sort((a, b) =>
          a.program.scheduledAt.localeCompare(b.program.scheduledAt),
        );
    }

    return { total: items.length, items };
  }

  /**
   * Group watchlist by upcoming / live / past — used by the UI 3-tab view.
   */
  async listGrouped(userId: string): Promise<{
    upcoming: WatchlistItemResponseDto[];
    live: WatchlistItemResponseDto[];
    past: WatchlistItemResponseDto[];
  }> {
    const result = await this.list(userId);
    const buckets: Record<
      UpcomingBucket,
      WatchlistItemResponseDto[]
    > = { upcoming: [], live: [], past: [] };

    const now = Date.now();
    for (const item of result.items) {
      const scheduledMs = new Date(item.program.scheduledAt).getTime();
      const endMs =
        scheduledMs +
        (item.program.duration ?? 120) * 60_000;
      if (item.program.status === 'LIVE' || (scheduledMs <= now && endMs > now)) {
        buckets.live.push(item);
      } else if (scheduledMs >= now) {
        buckets.upcoming.push(item);
      } else {
        buckets.past.push(item);
      }
    }
    return buckets;
  }

  async add(userId: string, dto: AddWatchlistItemDto) {
    // Ensure the program exists
    const program = await this.prisma.liveEvent.findUnique({
      where: { id: dto.programId },
      select: { id: true, channelId: true },
    });
    if (!program) {
      throw new BadRequestException('Program not found');
    }

    const item = await this.prisma.watchlist.upsert({
      where: {
        userId_programId: {
          userId,
          programId: dto.programId,
        },
      },
      create: {
        userId,
        programId: dto.programId,
        channelId: dto.channelId ?? program.channelId,
        note: dto.note,
      },
      update: {
        note: dto.note ?? undefined,
        channelId: dto.channelId ?? undefined,
      },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            status: true,
            scheduledAt: true,
            duration: true,
            channel: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    await this.auditLogger.log({
      userId,
      action: 'WATCHLIST_ADD',
      entityType: 'Watchlist',
      entityId: item.id,
      newValues: { programId: dto.programId },
    });

    return this.toItemDto(item);
  }

  async remove(userId: string, itemId: string) {
    const item = await this.prisma.watchlist.findFirst({
      where: { id: itemId, userId },
    });
    if (!item) throw new NotFoundException('Watchlist item not found');

    await this.prisma.watchlist.delete({ where: { id: item.id } });

    await this.auditLogger.log({
      userId,
      action: 'WATCHLIST_REMOVE',
      entityType: 'Watchlist',
      entityId: item.id,
      oldValues: item,
    });

    return { message: 'Removed from watchlist' };
  }

  /**
   * Mobile calls this when it had pending offline mutations.
   * Items are upserted (add) and any items removed server-side after
   * `lastSyncedAt` are returned so client can drop them too.
   */
  async sync(
    userId: string,
    dto: {
      lastSyncedAt?: string;
      items: AddWatchlistItemDto[];
    },
  ): Promise<SyncWatchlistResponseDto> {
    const upserted: WatchlistItemResponseDto[] = [];
    for (const item of dto.items) {
      if (!item?.programId) continue;
      const saved = await this.add(userId, item);
      upserted.push(saved);
    }

    let removedIds: string[] = [];
    if (dto.lastSyncedAt) {
      const since = new Date(dto.lastSyncedAt);
      const stale = await this.prisma.watchlist.findMany({
        where: {
          userId,
          addedAt: { gt: since },
        },
        select: { id: true, programId: true },
      });
      const localIds = new Set(dto.items.map((i) => i.programId));
      removedIds = stale
        .filter((s) => !localIds.has(s.programId))
        .map((s) => s.id);
    }

    return {
      serverTime: new Date().toISOString(),
      upserted,
      removedIds,
    };
  }

  private toItemDto(row: any): WatchlistItemResponseDto {
    return {
      id: row.id,
      programId: row.programId,
      channelId: row.channelId ?? null,
      note: row.note ?? null,
      addedAt: row.addedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      program: {
        id: row.program.id,
        title: row.program.title,
        thumbnailUrl: row.program.thumbnailUrl ?? null,
        status: String(row.program.status),
        scheduledAt: row.program.scheduledAt.toISOString(),
        duration: row.program.duration ?? null,
        channel: {
          id: row.program.channel.id,
          name: row.program.channel.name,
          slug: row.program.channel.slug,
          logoUrl: row.program.channel.logoUrl ?? null,
        },
      },
    };
  }
}

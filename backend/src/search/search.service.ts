// ============================================================
// OmniCast - Search Service
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface SearchOptions {
  query: string;
  type?: 'all' | 'channels' | 'programs' | 'recordings';
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'recent' | 'popular';
}

export interface SearchResult {
  channels: any[];
  liveEvents: any[];
  recordings: any[];
  totalResults: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(options: SearchOptions): Promise<SearchResult> {
    const {
      query,
      type = 'all',
      category,
      page = 1,
      limit = 20,
      sortBy = 'relevance',
    } = options;

    const result: SearchResult = {
      channels: [],
      liveEvents: [],
      recordings: [],
      totalResults: 0,
    };

    const offset = (page - 1) * limit;

    // Build search condition
    const searchCondition = this.buildSearchCondition(query);

    // Search Channels
    if (type === 'all' || type === 'channels') {
      const channelWhere: Prisma.LiveChannelWhereInput = {
        ...searchCondition,
        isActive: true,
      };

      if (category) {
        channelWhere.category = category as any;
      }

      const channels = await this.prisma.liveChannel.findMany({
        where: channelWhere,
        take: limit,
        skip: type === 'channels' ? offset : 0,
        orderBy:
          sortBy === 'popular'
            ? { followerCount: 'desc' }
            : sortBy === 'recent'
              ? { createdAt: 'desc' }
              : undefined,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          category: true,
          followerCount: true,
          _count: { select: { followers: true, recordings: true } },
        },
      });

      result.channels = channels;
    }

    // Search Live Events
    if (type === 'all' || type === 'programs') {
      const eventWhere: Prisma.LiveEventWhereInput = {
        ...searchCondition,
        status: { in: ['SCHEDULED', 'LIVE'] },
      };

      const liveEvents = await this.prisma.liveEvent.findMany({
        where: eventWhere,
        take: type === 'programs' ? limit : 3,
        skip: type === 'programs' ? offset : 0,
        orderBy:
          sortBy === 'popular'
            ? { viewerCount: 'desc' }
            : { scheduledAt: 'asc' },
        include: {
          channel: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      });

      result.liveEvents = liveEvents;
    }

    // Search Recordings
    if (type === 'all' || type === 'recordings') {
      const recordingWhere: Prisma.RecordingWhereInput = {
        ...searchCondition,
        isPublished: true,
      };

      if (category) {
        recordingWhere.category = category as any;
      }

      const recordings = await this.prisma.recording.findMany({
        where: recordingWhere,
        take: limit,
        skip: type === 'recordings' ? offset : 0,
        orderBy:
          sortBy === 'popular'
            ? { viewCount: 'desc' }
            : sortBy === 'recent'
              ? { publishedAt: 'desc' }
              : undefined,
        include: {
          channel: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      });

      result.recordings = recordings;
    }

    // Calculate total
    result.totalResults =
      result.channels.length +
      result.liveEvents.length +
      result.recordings.length;

    return result;
  }

  async searchChannels(query: string, options?: { limit?: number }) {
    return this.prisma.liveChannel.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tagline: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: options?.limit || 10,
      orderBy: { followerCount: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        category: true,
        followerCount: true,
      },
    });
  }

  async searchPrograms(
    query: string,
    options?: {
      limit?: number;
      fromDate?: Date;
      toDate?: Date;
      category?: string;
    },
  ) {
    const where: Prisma.LiveEventWhereInput = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
      status: { in: ['SCHEDULED', 'LIVE'] },
    };

    if (options?.fromDate || options?.toDate) {
      where.scheduledAt = {};
      if (options.fromDate) where.scheduledAt.gte = options.fromDate;
      if (options.toDate) where.scheduledAt.lte = options.toDate;
    }

    return this.prisma.liveEvent.findMany({
      where,
      take: options?.limit || 10,
      orderBy: { scheduledAt: 'asc' },
      include: {
        channel: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });
  }

  async getSuggestions(query: string) {
    const [channels, programs] = await Promise.all([
      this.prisma.liveChannel.findMany({
        where: {
          isActive: true,
          name: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, name: true, slug: true, category: true },
      }),
      this.prisma.liveEvent.findMany({
        where: {
          title: { contains: query, mode: 'insensitive' },
          status: { in: ['SCHEDULED', 'LIVE'] },
        },
        take: 5,
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          status: true,
        },
      }),
    ]);

    return {
      channels,
      programs,
    };
  }

  private buildSearchCondition(
    query: string,
  ): Prisma.LiveChannelWhereInput['OR'] {
    return [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { tagline: { contains: query, mode: 'insensitive' } },
    ];
  }
}

// ============================================================
// OmniCast - RAWG Games Source (GAMING category)
// Fetches upcoming + popular game releases from the RAWG video
// games database. API key required (RAWG_API_KEY) — free tier
// is 20K requests/month.
//
// Docs: https://api.rawg.io/docs/
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentSource, ExternalPlatform, LiveCategory, StreamQuality } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { HttpHelper } from './http.helper';
import {
  BaseExternalSource,
  NormalizedLiveEvent,
  NormalizedRecording,
  SourceChannelContext,
  SourceRunResult,
} from './base-source.interface';

interface RawgGame {
  id: number;
  slug: string;
  name: string;
  released?: string;
  background_image?: string;
  description?: string;
  rating?: number;
  ratings_count?: number;
  platforms?: Array<{ platform: { name: string } }>;
  genres?: Array<{ name: string }>;
  metacritic?: number;
}

interface RawgListResponse<T> {
  count: number;
  results: T[];
}

@Injectable()
export class GamingSource extends BaseExternalSource {
  readonly sourceName = 'RAWG';
  readonly category = LiveCategory.GAMING;
  readonly requiredEnvVars = ['RAWG_API_KEY'];
  private readonly logger = new Logger(GamingSource.name);
  private readonly http: HttpHelper;
  private readonly apiKey: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
    this.apiKey = this.config.get<string>('RAWG_API_KEY') || null;
    this.http = new HttpHelper({
      baseURL: 'https://api.rawg.io/api',
      timeoutMs: 15_000,
    });
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async fetchEvents(channel: SourceChannelContext): Promise<NormalizedLiveEvent[]> {
    if (!this.apiKey) return [];
    try {
      const upcoming = await this.http.get<RawgListResponse<RawgGame>>('/games', {
        params: {
          key: this.apiKey,
          dates: `${this.minusDays(7)},${this.plusDays(60)}`,
          ordering: 'added',
          page_size: 20,
        },
      });
      return (upcoming.results ?? []).map((g) => ({
        externalId: `rawg-game-${g.id}`,
        externalPlatform: ExternalPlatform.CUSTOM_HLS,
        title: `Sắp ra mắt: ${g.name}`,
        description:
          g.description?.replace(/<[^>]+>/g, '').slice(0, 3000) ||
          `${g.name} — game ${g.genres?.map((x) => x.name).join(', ') || 'sắp phát hành'}.`,
        thumbnailUrl: g.background_image,
        scheduledAt: g.released ? new Date(g.released) : new Date(),
        status: 'SCHEDULED',
        duration: 3600,
        tags: ['RAWG', 'Gaming', ...(g.genres?.slice(0, 3).map((x) => x.name) || [])],
        language: 'vi',
        metadata: { source: 'rawg', gameId: g.id, slug: g.slug },
      }));
    } catch (err) {
      this.logger.warn(`[GamingSource] fetchEvents failed: ${(err as Error).message}`);
      return [];
    }
  }

  async fetchRecordings(channel: SourceChannelContext): Promise<NormalizedRecording[]> {
    if (!this.apiKey) return [];
    try {
      const popular = await this.http.get<RawgListResponse<RawgGame>>('/games', {
        params: {
          key: this.apiKey,
          ordering: '-rating',
          page_size: 20,
        },
      });
      return (popular.results ?? []).map((g) => ({
        externalId: `rawg-rec-${g.id}`,
        externalPlatform: ExternalPlatform.CUSTOM_HLS,
        title: `Top Rated: ${g.name}`,
        description:
          g.description?.replace(/<[^>]+>/g, '').slice(0, 3000) ||
          `${g.name} — game nổi bật trên ${channel.channelName}.`,
        thumbnailUrl: g.background_image,
        duration: 1800,
        publishedAt: g.released ? new Date(g.released) : new Date(),
        viewCount: g.ratings_count ?? 0,
        likeCount: Math.floor((g.ratings_count ?? 0) * 0.7),
        quality: 'FULL_HD_1080P',
        tags: ['RAWG', 'Gaming', ...(g.genres?.slice(0, 3).map((x) => x.name) || [])],
        metadata: { source: 'rawg', gameId: g.id, slug: g.slug },
      }));
    } catch (err) {
      this.logger.warn(`[GamingSource] fetchRecordings failed: ${(err as Error).message}`);
      return [];
    }
  }

  private minusDays(n: number): string {
    return new Date(Date.now() - n * 86400 * 1000).toISOString().slice(0, 10);
  }
  private plusDays(n: number): string {
    return new Date(Date.now() + n * 86400 * 1000).toISOString().slice(0, 10);
  }

  private deterministicId(channelId: string, extId: string, kind: 'event' | 'rec'): string {
    const seed = `${channelId}-${kind}-${extId}`;
    const h = createHash('md5').update(seed).digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  }

  async runForChannel(channel: SourceChannelContext): Promise<SourceRunResult> {
    const t0 = Date.now();
    if (!this.isConfigured()) {
      return {
        source: this.sourceName,
        category: this.category,
        fetched: 0,
        upserted: 0,
        skipped: 0,
        errors: 0,
        durationMs: 0,
        errorMessages: ['RAWG_API_KEY not set — skipped'],
      };
    }
    try {
      const events = await this.fetchEvents(channel);
      const recordings = await this.fetchRecordings(channel);
      let upserted = 0;
      for (const ev of events) {
        await this.prisma.liveEvent.upsert({
          where: {
            channel_platform_external_unique: {
              channelId: channel.channelId,
              externalPlatform: ev.externalPlatform as any,
              externalId: ev.externalId,
            },
          },
          update: {
            title: ev.title.slice(0, 255),
            description: ev.description,
            thumbnailUrl: ev.thumbnailUrl,
            scheduledAt: ev.scheduledAt,
          },
          create: {
            id: this.deterministicId(channel.channelId, ev.externalId, 'event'),
            channelId: channel.channelId,
            title: ev.title.slice(0, 255),
            description: ev.description ?? null,
            thumbnailUrl: ev.thumbnailUrl ?? null,
            streamSource: ContentSource.EXTERNAL,
            externalPlatform: ev.externalPlatform as any,
            externalId: ev.externalId,
            status: 'SCHEDULED' as any,
            scheduledAt: ev.scheduledAt,
            quality: StreamQuality.FULL_HD_1080P,
            language: 'vi',
            tags: ev.tags?.slice(0, 5) ?? [],
            autoRecord: true,
            chatEnabled: true,
          },
        });
        upserted += 1;
      }
      for (const r of recordings) {
        await this.prisma.recording.upsert({
          where: { id: this.deterministicId(channel.channelId, r.externalId, 'rec') },
          update: {
            title: r.title.slice(0, 255),
            description: r.description,
            thumbnailUrl: r.thumbnailUrl,
          },
          create: {
            id: this.deterministicId(channel.channelId, r.externalId, 'rec'),
            channelId: channel.channelId,
            title: r.title.slice(0, 255),
            description: r.description ?? null,
            thumbnailUrl: r.thumbnailUrl ?? null,
            contentSource: ContentSource.EXTERNAL,
            externalPlatform: r.externalPlatform as any,
            externalId: r.externalId,
            duration: r.duration,
            quality: 'FULL_HD_1080P' as any,
            contentType: 'VIDEO' as any,
            language: 'vi',
            viewCount: BigInt(r.viewCount ?? 0),
            likeCount: r.likeCount ?? 0,
            commentCount: 0,
            shareCount: 0,
            downloadCount: 0,
            tags: r.tags?.slice(0, 5) ?? [],
            category: LiveCategory.GAMING,
            isPublished: true,
            isFeatured: false,
            publishedAt: r.publishedAt,
          },
        });
        upserted += 1;
      }
      return {
        source: this.sourceName,
        category: this.category,
        fetched: events.length + recordings.length,
        upserted,
        skipped: 0,
        errors: 0,
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      return {
        source: this.sourceName,
        category: this.category,
        fetched: 0,
        upserted: 0,
        skipped: 0,
        errors: 1,
        durationMs: Date.now() - t0,
        errorMessages: [(err as Error).message],
      };
    }
  }
}

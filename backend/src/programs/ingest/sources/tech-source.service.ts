// ============================================================
// OmniCast - HackerNews + DEV.to Source (TECH category)
// Aggregates top tech stories from HackerNews Algolia search
// (no API key) and DEV.to community posts (no API key) into
// the Omni Tech channel as VOD explainers.
//
// Docs: https://hn.algolia.com/api, https://developers.forem.com/api/v1
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
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

interface HnHit {
  objectID: string;
  title: string;
  story_text?: string;
  story_title?: string;
  url?: string;
  author: string;
  points?: number;
  num_comments?: number;
  created_at_i: number;
  _tags?: string[];
}

interface HnSearchResponse {
  hits: HnHit[];
  nbHits: number;
  page: number;
}

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url?: string;
  canonical_url?: string;
  cover_image?: string;
  tag_list: string[];
  published_at: string;
  reading_time_minutes?: number;
  positive_reactions_count?: number;
  comments_count?: number;
  user?: { name: string; username: string; profile_image?: string };
}

interface DevToListResponse {
  articles: DevToArticle[];
}

@Injectable()
export class TechSource extends BaseExternalSource {
  readonly sourceName = 'HackerNews+DEV.to';
  readonly category = LiveCategory.TECH;
  readonly requiredEnvVars = [];
  private readonly logger = new Logger(TechSource.name);
  private readonly hnHttp: HttpHelper;
  private readonly devHttp: HttpHelper;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.hnHttp = new HttpHelper({
      baseURL: 'https://hn.algolia.com/api/v1',
      timeoutMs: 10_000,
    });
    this.devHttp = new HttpHelper({
      baseURL: 'https://dev.to/api',
      timeoutMs: 10_000,
    });
  }

  isConfigured(): boolean {
    return true;
  }

  async fetchEvents(_channel: SourceChannelContext): Promise<NormalizedLiveEvent[]> {
    return [];
  }

  async fetchRecordings(_channel: SourceChannelContext): Promise<NormalizedRecording[]> {
    const out: NormalizedRecording[] = [];

    // HackerNews top tech stories
    try {
      const hn = await this.hnHttp.get<HnSearchResponse>('/search', {
        params: {
          tags: 'front_page',
          numericFilters: 'points>100',
          hitsPerPage: 12,
        },
      });
      for (const hit of hn.hits ?? []) {
        const title = hit.title || hit.story_title || 'Untitled';
        if (!title || title.length < 8) continue;
        out.push({
          externalId: `hn-${hit.objectID}`,
          externalPlatform: ExternalPlatform.EMBED_IFRAME,
          title: `[HN] ${title}`,
          description:
            hit.story_text?.replace(/<[^>]+>/g, '').slice(0, 1500) ||
            `${hit.points ?? 0} điểm • ${hit.num_comments ?? 0} bình luận • bởi ${hit.author}`,
          thumbnailUrl: undefined,
          duration: 480 + Math.floor(Math.random() * 1200),
          publishedAt: new Date(hit.created_at_i * 1000),
          viewCount: (hit.points ?? 0) * 100,
          likeCount: hit.points ?? 0,
          contentType: 'VIDEO',
          quality: 'HD_720P',
          tags: ['HackerNews', 'Tech', ...(hit._tags?.filter((t) => !t.startsWith('author_')) ?? [])]
            .slice(0, 5),
          sourceUrl: hit.url,
          metadata: { source: 'hackernews', objectID: hit.objectID },
        });
      }
    } catch (err) {
      this.logger.warn(`[TechSource] HN fetch failed: ${(err as Error).message}`);
    }

    // DEV.to top tech articles
    try {
      const articles = await this.devHttp.get<DevToArticle[]>('/articles', {
        params: { top: 7, per_page: 12 },
      });
      for (const art of articles ?? []) {
        if (!art.title || art.title.length < 8) continue;
        out.push({
          externalId: `devto-${art.id}`,
          externalPlatform: ExternalPlatform.EMBED_IFRAME,
          title: `[DEV] ${art.title}`,
          description:
            art.description?.slice(0, 1500) ||
            `Bởi ${art.user?.name ?? 'unknown'} • ${art.reading_time_minutes ?? 5} phút đọc`,
          thumbnailUrl: art.cover_image || art.user?.profile_image,
          duration: (art.reading_time_minutes ?? 5) * 60 + 60,
          publishedAt: new Date(art.published_at),
          viewCount: (art.positive_reactions_count ?? 0) * 80,
          likeCount: art.positive_reactions_count ?? 0,
          contentType: 'VIDEO',
          quality: 'HD_720P',
          tags: ['DEV.to', 'Tech', ...art.tag_list.slice(0, 3)].slice(0, 5),
          sourceUrl: art.url || art.canonical_url,
          metadata: { source: 'devto', id: art.id },
        });
      }
    } catch (err) {
      this.logger.warn(`[TechSource] DEV.to fetch failed: ${(err as Error).message}`);
    }
    return out;
  }

  private deterministicId(channelId: string, extId: string, kind: 'event' | 'rec'): string {
    const seed = `${channelId}-${kind}-${extId}`;
    const h = createHash('md5').update(seed).digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  }

  async runForChannel(channel: SourceChannelContext): Promise<SourceRunResult> {
    const t0 = Date.now();
    try {
      const recordings = await this.fetchRecordings(channel);
      let upserted = 0;
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
            quality: 'HD_720P' as any,
            contentType: 'VIDEO' as any,
            language: 'vi',
            viewCount: BigInt(r.viewCount ?? 0),
            likeCount: r.likeCount ?? 0,
            commentCount: 0,
            shareCount: 0,
            downloadCount: 0,
            tags: r.tags?.slice(0, 5) ?? [],
            category: LiveCategory.TECH,
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
        fetched: recordings.length,
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

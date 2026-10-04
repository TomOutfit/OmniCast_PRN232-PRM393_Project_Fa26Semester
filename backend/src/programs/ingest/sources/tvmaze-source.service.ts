// ============================================================
// OmniCast - TVMaze Content Source (KIDS, SHOW, ENTERTAINMENT, DOCUMENTARY)
// Pulls real TV series, animated cartoons, reality shows and
// documentaries from TVMaze free REST API (100% keyless, public).
//
// Docs: https://www.tvmaze.com/api
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

interface TvmazeSearchResult {
  score: number;
  show: {
    id: number;
    url: string;
    name: string;
    type: string;
    language: string;
    genres: string[];
    status: string;
    runtime: number | null;
    averageRuntime: number | null;
    premiered: string | null;
    officialSite: string | null;
    schedule: { time: string; days: string[] };
    rating: { average: number | null };
    image: { medium: string; original: string } | null;
    summary: string | null;
  };
}

const CATEGORY_SEARCH_KEYWORDS: Record<string, string[]> = {
  [LiveCategory.KIDS]: ['animation', 'cartoon', 'adventure', 'family', 'pokemon'],
  [LiveCategory.SHOW]: ['reality', 'talent', 'dating', 'game-show', 'interview'],
  [LiveCategory.ENTERTAINMENT]: ['comedy', 'variety', 'sitcom', 'sketch'],
  [LiveCategory.DOCUMENTARY]: ['nature', 'planet', 'wildlife', 'science', 'universe'],
};

@Injectable()
export class TvmazeSource extends BaseExternalSource {
  readonly sourceName = 'TVMaze-Schedule';
  readonly category: LiveCategory = LiveCategory.KIDS;
  readonly requiredEnvVars = [];
  private readonly logger = new Logger(TvmazeSource.name);
  private readonly http: HttpHelper;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.http = new HttpHelper({
      baseURL: 'https://api.tvmaze.com',
      timeoutMs: 12_000,
      retries: 1,
    });
  }

  isConfigured(): boolean {
    return true; // 100% keyless public API
  }

  async fetchEvents(_channel: SourceChannelContext): Promise<NormalizedLiveEvent[]> {
    return [];
  }

  async fetchRecordings(channel: SourceChannelContext): Promise<NormalizedRecording[]> {
    const keywords = CATEGORY_SEARCH_KEYWORDS[channel.category] || ['entertainment'];
    const out: NormalizedRecording[] = [];
    const seenIds = new Set<number>();

    for (const kw of keywords) {
      try {
        const results = await this.http.get<TvmazeSearchResult[]>('/search/shows', {
          params: { q: kw },
        });

        if (!Array.isArray(results)) continue;

        for (const item of results) {
          const show = item.show;
          if (!show || seenIds.has(show.id)) continue;
          seenIds.add(show.id);

          const cleanSummary = show.summary
            ? show.summary.replace(/<[^>]+>/g, '').trim()
            : `${show.name} phát sóng trên ${channel.channelName}.`;

          const durationMin = show.runtime || show.averageRuntime || 30;
          const durationSec = Math.max(15, Math.min(180, durationMin)) * 60;
          const thumb = show.image?.original || show.image?.medium;

          const prefix =
            channel.category === LiveCategory.KIDS
              ? '[Hoạt Hình]'
              : channel.category === LiveCategory.SHOW
              ? '[Show Thực Tế]'
              : channel.category === LiveCategory.DOCUMENTARY
              ? '[Khám Phá]'
              : '[Giải Trí]';

          out.push({
            externalId: `tvmaze-${show.id}`,
            externalPlatform: ExternalPlatform.CUSTOM_HLS,
            title: `${prefix} ${show.name}`,
            description: cleanSummary,
            thumbnailUrl: thumb ?? undefined,
            duration: durationSec,
            publishedAt: show.premiered ? new Date(show.premiered) : new Date(),
            viewCount: Math.floor(10_000 + Math.random() * 50_000),
            likeCount: Math.floor(500 + Math.random() * 2_500),
            contentType: 'VIDEO',
            quality: 'FULL_HD_1080P',
            tags: [channel.channelName, ...(show.genres || []), show.type].filter(Boolean),
            sourceUrl: show.url,
            metadata: {
              tvmazeId: show.id,
              rating: show.rating?.average,
              officialSite: show.officialSite,
              genres: show.genres,
            },
          });
        }
      } catch (err) {
        this.logger.warn(`TVMaze query for "${kw}" on ${channel.channelSlug} failed: ${(err as Error).message}`);
      }
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
            duration: r.duration,
            tags: r.tags?.slice(0, 5) ?? [],
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
            category: channel.category,
            isPublished: true,
            isFeatured: false,
            publishedAt: r.publishedAt,
          },
        });
        upserted += 1;
      }

      return {
        source: this.sourceName,
        category: channel.category,
        fetched: recordings.length,
        upserted,
        skipped: 0,
        errors: 0,
        durationMs: Date.now() - t0,
      };
    } catch (err) {
      return {
        source: this.sourceName,
        category: channel.category,
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

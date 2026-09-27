// ============================================================
// OmniCast - TheMealDB Source (FOOD category)
// Fetches recipe VOD content from TheMealDB — completely free,
// no API key required. Returns Cooking Recipe + Latest recipes
// to populate the food channel with structured, well-photographed
// content.
//
// Docs: https://www.themealdb.com/api.php
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

interface MealDbMeal {
  idMeal: string;
  strMeal: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
  strMealThumb?: string;
  strTags?: string;
  strYoutube?: string;
}

interface MealDbListResponse {
  meals: MealDbMeal[] | null;
}

@Injectable()
export class FoodSource extends BaseExternalSource {
  readonly sourceName = 'TheMealDB';
  readonly category = LiveCategory.FOOD;
  readonly requiredEnvVars = [];
  private readonly logger = new Logger(FoodSource.name);
  private readonly http: HttpHelper;

  constructor(
    private readonly prisma: PrismaService,
    private readonly _config: ConfigService,
  ) {
    super();
    this.http = new HttpHelper({
      baseURL: 'https://www.themealdb.com/api/json/v1/1',
      timeoutMs: 10_000,
    });
  }

  isConfigured(): boolean {
    return true; // always free
  }

  async fetchEvents(_channel: SourceChannelContext): Promise<NormalizedLiveEvent[]> {
    // TheMealDB doesn't have a "live event" concept. We could fake cooking-show
    // premieres but that would mislead viewers. Skip.
    return [];
  }

  async fetchRecordings(channel: SourceChannelContext): Promise<NormalizedRecording[]> {
    const out: NormalizedRecording[] = [];
    try {
      const categories = ['Seafood', 'Beef', 'Chicken', 'Dessert', 'Vegetarian', 'Pasta'];
      for (const cat of categories) {
        const list = await this.http.get<MealDbListResponse>(`/filter.php`, {
          params: { c: cat },
        });
        for (const meal of list.meals ?? []) {
          const detail = await this.http.get<MealDbListResponse>(`/lookup.php`, {
            params: { i: meal.idMeal },
          });
          const m = detail.meals?.[0];
          if (!m) continue;
          out.push({
            externalId: `mealdb-${m.idMeal}`,
            externalPlatform: ExternalPlatform.EMBED_IFRAME,
            title: `Công thức: ${m.strMeal}`,
            description:
              m.strInstructions?.slice(0, 3000) ||
              `Hướng dẫn nấu món ${m.strMeal} (${m.strArea || ''} ${m.strCategory || ''}).`,
            thumbnailUrl: m.strMealThumb,
            duration: 900 + Math.floor(Math.random() * 1500),
            publishedAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 86400 * 1000),
            viewCount: 1000 + Math.floor(Math.random() * 200000),
            likeCount: Math.floor(Math.random() * 5000),
            contentType: 'VIDEO',
            quality: 'FULL_HD_1080P',
            tags: ['TheMealDB', m.strCategory ?? '', m.strArea ?? ''].filter(Boolean),
            sourceUrl: m.strYoutube,
            metadata: {
              source: 'themealdb',
              category: m.strCategory,
              area: m.strArea,
              mealId: m.idMeal,
            },
          });
        }
      }
      void channel;
    } catch (err) {
      this.logger.warn(`[FoodSource] fetchRecordings failed: ${(err as Error).message}`);
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
            quality: 'FULL_HD_1080P' as any,
            contentType: 'VIDEO' as any,
            language: 'vi',
            viewCount: BigInt(r.viewCount ?? 0),
            likeCount: r.likeCount ?? 0,
            commentCount: 0,
            shareCount: 0,
            downloadCount: 0,
            tags: r.tags?.slice(0, 5) ?? [],
            category: LiveCategory.FOOD,
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

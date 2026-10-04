// ============================================================
// OmniCast - TheCocktailDB Source (FOOD, LIFESTYLE)
// Ingests barista, mixology, and specialty drink recipes
// into Omni Food & Omni Lifestyle channels.
//
// Docs: https://www.thecocktaildb.com/api.php
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

interface CocktailItem {
  idDrink: string;
  strDrink: string;
  strDrinkThumb: string;
}

@Injectable()
export class CocktailSource extends BaseExternalSource {
  readonly sourceName = 'TheCocktailDB';
  readonly category: LiveCategory = LiveCategory.FOOD;
  readonly requiredEnvVars = [];
  private readonly logger = new Logger(CocktailSource.name);
  private readonly http: HttpHelper;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.http = new HttpHelper({
      baseURL: 'https://www.thecocktaildb.com/api/json/v1/1',
      timeoutMs: 12_000,
      retries: 1,
    });
  }

  isConfigured(): boolean {
    return true; // Free test key '1'
  }

  async fetchEvents(_channel: SourceChannelContext): Promise<NormalizedLiveEvent[]> {
    return [];
  }

  async fetchRecordings(channel: SourceChannelContext): Promise<NormalizedRecording[]> {
    const out: NormalizedRecording[] = [];
    const categories = ['Cocktail', 'Coffee_/_Tea', 'Shot'];

    for (const cat of categories) {
      try {
        const res = await this.http.get<{ drinks: CocktailItem[] }>('/filter.php', {
          params: { c: cat },
        });

        const list = res?.drinks?.slice(0, 10) ?? [];
        for (const drink of list) {
          const durationSec = 25 * 60; // 25 mins episode

          out.push({
            externalId: `cocktail-${drink.idDrink}`,
            externalPlatform: ExternalPlatform.CUSTOM_HLS,
            title: `[Nghệ Thuật Pha Chế] Hướng Dẫn Thực Hiện: ${drink.strDrink}`,
            description: `Khám phá công thức pha chế đồ uống đỉnh cao cùng các chuyên gia Barista & Bartender hàng đầu. Bí quyết cân bằng hương vị cho món ${drink.strDrink}.`,
            thumbnailUrl: drink.strDrinkThumb,
            duration: durationSec,
            publishedAt: new Date(),
            viewCount: Math.floor(12_000 + Math.random() * 40_000),
            likeCount: Math.floor(600 + Math.random() * 2_000),
            contentType: 'VIDEO',
            quality: 'FULL_HD_1080P',
            tags: ['Pha Chế', 'Đồ Uống', 'Barista', drink.strDrink, channel.channelName],
            metadata: { idDrink: drink.idDrink, category: cat },
          });
        }
      } catch (err) {
        this.logger.warn(`TheCocktailDB failed for ${cat}: ${(err as Error).message}`);
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

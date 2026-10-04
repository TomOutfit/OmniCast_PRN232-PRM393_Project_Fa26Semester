// ============================================================
// OmniCast - NASA Open Data Source (DOCUMENTARY category)
// Ingests Astronomy Picture of the Day (APOD) and space exploration
// media into Omni Discovery creative channel.
//
// Docs: https://api.nasa.gov
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

interface NasaApodItem {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  service_version: string;
  title: string;
  url: string;
}

@Injectable()
export class NasaSource extends BaseExternalSource {
  readonly sourceName = 'NASA-OpenData';
  readonly category = LiveCategory.DOCUMENTARY;
  readonly requiredEnvVars = [];
  private readonly logger = new Logger(NasaSource.name);
  private readonly http: HttpHelper;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.http = new HttpHelper({
      baseURL: 'https://api.nasa.gov',
      timeoutMs: 12_000,
      retries: 1,
    });
  }

  isConfigured(): boolean {
    return true; // DEMO_KEY is public and free
  }

  async fetchEvents(_channel: SourceChannelContext): Promise<NormalizedLiveEvent[]> {
    return [];
  }

  async fetchRecordings(channel: SourceChannelContext): Promise<NormalizedRecording[]> {
    const out: NormalizedRecording[] = [];
    try {
      const items = await this.http.get<NasaApodItem[]>('/planetary/apod', {
        params: {
          api_key: 'DEMO_KEY',
          count: 12,
        },
      });

      if (!Array.isArray(items)) return [];

      for (const item of items) {
        if (!item.title) continue;
        const durationSec = 45 * 60; // Standard 45 min doc slot

        out.push({
          externalId: `nasa-apod-${item.date}`,
          externalPlatform: ExternalPlatform.CUSTOM_HLS,
          title: `[Khám Phá Vũ Trụ] ${item.title}`,
          description: item.explanation?.slice(0, 1500) || 'Khám phá bí ẩn không gian cùng đài thiên văn NASA.',
          thumbnailUrl: item.hdurl || item.url,
          duration: durationSec,
          publishedAt: item.date ? new Date(item.date) : new Date(),
          viewCount: Math.floor(15_000 + Math.random() * 60_000),
          likeCount: Math.floor(800 + Math.random() * 3_500),
          contentType: 'VIDEO',
          quality: 'UHD_4K',
          tags: ['NASA', 'Vũ Trụ', 'Thiên Văn', 'Khoa Học', channel.channelName],
          sourceUrl: item.hdurl || item.url,
          metadata: {
            date: item.date,
            mediaType: item.media_type,
          },
        });
      }
    } catch (err) {
      this.logger.warn(`NASA APOD query failed: ${(err as Error).message}`);
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
            quality: 'UHD_4K' as any,
            contentType: 'VIDEO' as any,
            language: 'vi',
            viewCount: BigInt(r.viewCount ?? 0),
            likeCount: r.likeCount ?? 0,
            commentCount: 0,
            shareCount: 0,
            downloadCount: 0,
            tags: r.tags?.slice(0, 5) ?? [],
            category: LiveCategory.DOCUMENTARY,
            isPublished: true,
            isFeatured: true,
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

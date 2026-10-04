// ============================================================
// OmniCast - Market & Weather Source (NEWS, BUSINESS, TRAVEL)
// Ingests real-time Open-Meteo weather forecasts and CoinGecko
// market updates into OmniCast news and business channels.
//
// Docs: https://open-meteo.com/ & https://www.coingecko.com/
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

const VIETNAM_CITIES = [
  { name: 'Hà Nội', lat: 21.0285, lon: 105.8542 },
  { name: 'TP. Hồ Chí Minh', lat: 10.8231, lon: 106.6297 },
  { name: 'Đà Nẵng', lat: 16.0544, lon: 108.2022 },
  { name: 'Cần Thơ', lat: 10.0452, lon: 105.7469 },
  { name: 'Nha Trang', lat: 12.2388, lon: 109.1967 },
];

interface CoinGeckoItem {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number;
  image: string;
}

@Injectable()
export class MarketWeatherSource extends BaseExternalSource {
  readonly sourceName = 'Market-Weather';
  readonly category: LiveCategory = LiveCategory.NEWS;
  readonly requiredEnvVars = [];
  private readonly logger = new Logger(MarketWeatherSource.name);
  private readonly meteoHttp: HttpHelper;
  private readonly geckoHttp: HttpHelper;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.meteoHttp = new HttpHelper({
      baseURL: 'https://api.open-meteo.com/v1',
      timeoutMs: 10_000,
    });
    this.geckoHttp = new HttpHelper({
      baseURL: 'https://api.coingecko.com/api/v3',
      timeoutMs: 10_000,
    });
  }

  isConfigured(): boolean {
    return true; // 100% keyless
  }

  async fetchEvents(_channel: SourceChannelContext): Promise<NormalizedLiveEvent[]> {
    return [];
  }

  async fetchRecordings(channel: SourceChannelContext): Promise<NormalizedRecording[]> {
    const out: NormalizedRecording[] = [];

    // 1. Weather broadcasts (for NEWS and TRAVEL)
    if (channel.category === LiveCategory.NEWS || channel.category === LiveCategory.TRAVEL) {
      for (const city of VIETNAM_CITIES) {
        try {
          const res = await this.meteoHttp.get<any>('/forecast', {
            params: {
              latitude: city.lat,
              longitude: city.lon,
              current: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
            },
          });
          const cur = res?.current;
          if (cur) {
            const dateStr = new Date().toISOString().slice(0, 10);
            out.push({
              externalId: `weather-${city.name}-${dateStr}`,
              externalPlatform: ExternalPlatform.CUSTOM_HLS,
              title: `[Thời Tiết 3 Miền] Điểm Tin Khí Tượng: ${city.name} (${cur.temperature_2m}°C)`,
              description: `Bản tin dự báo thời tiết tại ${city.name}: Nhiệt độ hiện tại ${cur.temperature_2m}°C, độ ẩm ${cur.relative_humidity_2m}%, sức gió ${cur.wind_speed_10m} km/h. Cập nhật trực tiếp từ đài khí tượng OmniCast.`,
              thumbnailUrl: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
              duration: 15 * 60, // 15 mins bulletin
              publishedAt: new Date(),
              viewCount: 18_000,
              likeCount: 920,
              contentType: 'VIDEO',
              quality: 'FULL_HD_1080P',
              tags: ['Thời Tiết', city.name, 'Dự Báo', channel.channelName],
              metadata: { city: city.name, current: cur },
            });
          }
        } catch (err) {
          this.logger.warn(`Open-Meteo failed for ${city.name}: ${(err as Error).message}`);
        }
      }
    }

    // 2. Financial Market Updates (for NEWS and BUSINESS)
    if (channel.category === LiveCategory.NEWS || channel.category === LiveCategory.BUSINESS) {
      try {
        const coins = await this.geckoHttp.get<CoinGeckoItem[]>('/coins/markets', {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 5,
            page: 1,
          },
        });

        if (Array.isArray(coins)) {
          const summaryStr = coins
            .map((c) => `${c.name}: $${c.current_price?.toLocaleString()} (${c.price_change_percentage_24h > 0 ? '+' : ''}${c.price_change_percentage_24h?.toFixed(2)}%)`)
            .join(' | ');

          out.push({
            externalId: `market-crypto-${new Date().toISOString().slice(0, 10)}`,
            externalPlatform: ExternalPlatform.CUSTOM_HLS,
            title: `[Tài Chính & Thị Trường] Toàn Cảnh Chuyển Động Tài Sản Số & Dòng Tiền`,
            description: `Bản tin tài chính cập nhật liên tục: ${summaryStr}. Phân tích xu hướng dòng vốn và chỉ số thị trường tài chính quốc tế.`,
            thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
            duration: 20 * 60,
            publishedAt: new Date(),
            viewCount: 25_000,
            likeCount: 1_400,
            contentType: 'VIDEO',
            quality: 'FULL_HD_1080P',
            tags: ['Tài Chính', 'Crypto', 'Thị Trường', channel.channelName],
            metadata: { summary: summaryStr },
          });
        }
      } catch (err) {
        this.logger.warn(`CoinGecko market query failed: ${(err as Error).message}`);
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

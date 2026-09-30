// ============================================================
// OmniCast - TMDB Content Source (CINE / DRAMA / SHOW /
// ENTERTAINMENT / DOCUMENTARY)
//
// Pulls now-playing movies + popular TV + documentaries from
// TMDB and surfaces them as Recordings for the relevant category.
// TMDB_API_KEY required (free tier, request at themoviedb.org).
//
// Docs: https://developer.themoviedb.org/reference/intro/getting-started
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

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  runtime?: number;
  episode_run_time?: number[];
  media_type?: 'movie' | 'tv' | 'person';
}

interface TmdbListResponse {
  page: number;
  results: TmdbItem[];
  total_pages: number;
}

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

@Injectable()
export class TmdbContentSource extends BaseExternalSource {
  readonly sourceName = 'TMDB-Content';
  // Category is set at DI registration based on channel.
  readonly category: LiveCategory;
  readonly requiredEnvVars = ['TMDB_API_KEY'];
  private readonly logger = new Logger(TmdbContentSource.name);
  private readonly http: HttpHelper;
  private readonly apiKey: string | null;
  private readonly genre: 'movie' | 'tv';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
    this.apiKey = this.config.get<string>('TMDB_API_KEY') || null;
    this.http = new HttpHelper({
      baseURL: 'https://api.themoviedb.org/3',
      timeoutMs: 10_000,
    });
    this.category = LiveCategory.CINE; // overridden in module factory
    this.genre = 'movie';
  }

  init(category: LiveCategory, genre: 'movie' | 'tv') {
    (this as any).category = category;
    (this as any).genre = genre;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async fetchEvents(_channel: SourceChannelContext): Promise<NormalizedLiveEvent[]> {
    return [];
  }

  async fetchRecordings(channel: SourceChannelContext): Promise<NormalizedRecording[]> {
    if (!this.apiKey) return [];
    try {
      const endpoint = this.genre === 'tv' ? '/tv/popular' : '/movie/now_playing';
      const res = await this.http.get<TmdbListResponse>(endpoint, {
        params: {
          api_key: this.apiKey,
          language: 'vi-VN',
          page: 1,
          region: 'VN',
        },
      });
      return (res.results ?? []).slice(0, 15).map((it) => this.toRecording(it, channel));
    } catch (err) {
      this.logger.warn(`[TmdbContentSource] fetch failed: ${(err as Error).message}`);
      return [];
    }
  }

  private toRecording(it: TmdbItem, channel: SourceChannelContext): NormalizedRecording {
    const title = it.title || it.name || it.original_title || it.original_name || 'Untitled';
    const dateStr = it.release_date || it.first_air_date;
    return {
      externalId: `tmdb-${this.genre}-${it.id}`,
      externalPlatform: ExternalPlatform.EMBED_IFRAME,
      title: `${channel.channelName}: ${title}`,
      description: it.overview?.slice(0, 3000) || `${title} — curated for ${channel.channelName}.`,
      thumbnailUrl: it.poster_path ? `${POSTER_BASE}${it.poster_path}` : undefined,
      duration: (this.genre === 'tv' ? it.episode_run_time?.[0] : it.runtime) || 5400,
      publishedAt: dateStr ? new Date(dateStr) : new Date(),
      viewCount: (it.vote_count ?? 0) * 100,
      likeCount: Math.round((it.vote_average ?? 0) * 200),
      contentType: 'VIDEO',
      quality: 'FULL_HD_1080P',
      tags: ['TMDB', this.genre === 'tv' ? 'TV' : 'Movie'],
      metadata: { source: 'tmdb', tmdbId: it.id, mediaType: this.genre },
    };
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
        errorMessages: ['TMDB_API_KEY not set — skipped'],
      };
    }
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
            category: this.category,
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

// ============================================================
// OmniCast - TMDB Enrichment Service
// On-demand enrichment of LiveEvent / Recording metadata from
// The Movie Database. Uses free public TMDB API v3.
// https://developer.themoviedb.org/reference/intro/getting-started
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLoggerService } from '../../audit-logger/audit-logger.service';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const SYSTEM_USER_ID = 'system-ingest';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p';

interface TmdbSearchMovie {
  id: number;
  title: string;
  overview: string;
  release_date?: string;
  poster_path?: string | null;
}

interface TmdbSearchTv {
  id: number;
  name: string;
  overview: string;
  first_air_date?: string;
  poster_path?: string | null;
}

interface TmdbSearchResponse<T> {
  results: T[];
}

@Injectable()
export class TmdbEnrichmentService {
  private readonly logger = new Logger(TmdbEnrichmentService.name);
  private readonly http: AxiosInstance;
  private readonly apiKey: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogger: AuditLoggerService,
  ) {
    this.apiKey = this.configService.get<string>('TMDB_API_KEY') || null;
    this.http = axios.create({
      baseURL: TMDB_API_BASE,
      timeout: 10000,
      headers: { Accept: 'application/json' },
    });
  }

  /**
   * Attempts to enrich a single LiveEvent with TMDB metadata.
   * No-op (returns false) if no API key, title doesn't look like a movie/series,
   * or TMDB returns no match.
   */
  async enrichLiveEvent(eventId: string): Promise<boolean> {
    if (!this.apiKey) return false;
    const event = await this.prisma.liveEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) return false;

    const candidate = this.extractTitle(event.title);
    if (!candidate) return false;

    try {
      const enrichment = await this.search(candidate.title, candidate.year);
      if (!enrichment) return false;

      const enriched = await this.prisma.liveEvent.update({
        where: { id: event.id },
        data: {
          description: enrichment.overview
            ? enrichment.overview.slice(0, 3000)
            : event.description,
          thumbnailUrl: enrichment.posterUrl || event.thumbnailUrl,
        },
      });
      await this.auditLogger.log({
        userId: SYSTEM_USER_ID,
        action: 'TMDB_ENRICH_LIVE_EVENT',
        entityType: 'LiveEvent',
        entityId: event.id,
        newValues: {
          tmdbId: enrichment.tmdbId,
          kind: enrichment.kind,
        },
      });
      return true;
    } catch (err) {
      this.logger.warn(
        `TMDB enrich failed for event ${event.id}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Same as enrichLiveEvent but for VOD recordings.
   */
  async enrichRecording(recordingId: string): Promise<boolean> {
    if (!this.apiKey) return false;
    const rec = await this.prisma.recording.findUnique({
      where: { id: recordingId },
    });
    if (!rec) return false;
    const candidate = this.extractTitle(rec.title);
    if (!candidate) return false;

    try {
      const enrichment = await this.search(candidate.title, candidate.year);
      if (!enrichment) return false;

      await this.prisma.recording.update({
        where: { id: rec.id },
        data: {
          description: enrichment.overview
            ? enrichment.overview.slice(0, 3000)
            : rec.description,
          thumbnailUrl: enrichment.posterUrl || rec.thumbnailUrl,
        },
      });
      await this.auditLogger.log({
        userId: SYSTEM_USER_ID,
        action: 'TMDB_ENRICH_RECORDING',
        entityType: 'Recording',
        entityId: rec.id,
        newValues: {
          tmdbId: enrichment.tmdbId,
          kind: enrichment.kind,
        },
      });
      return true;
    } catch (err) {
      this.logger.warn(
        `TMDB enrich failed for recording ${rec.id}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Extracts a candidate (title + optional year) from a string like
   "Top 10 Pha Cứu Thua (2026)" or "Bí Ẩn Tầng 13 - Tập 1".
   Returns null if the title does not look like media metadata.
   */
  private extractTitle(rawTitle: string): {
    title: string;
    year?: number;
  } | null {
    const yearMatch = rawTitle.match(/\((\d{4})\)/);
    const year = yearMatch ? Number(yearMatch[1]) : undefined;

    // Heuristic: skip titles with listicle numbers / Vietnamese narration
    if (/Top\s*\d+|Tổng\s*Hợp|Best|Trực\s*Tiếp/i.test(rawTitle)) {
      return null;
    }
    const cleaned = rawTitle
      .replace(/\(\d{4}\)/g, '')
      .replace(/-\s*Tập\s*\d+/i, '')
      .replace(/Series\s*Premiere:?\s*/i, '')
      .trim();

    if (cleaned.length < 3) return null;
    return { title: cleaned, year };
  }

  /**
   * Tries TMDB movie search first, then TV search.
   */
  private async search(
    title: string,
    year?: number,
  ): Promise<
    | {
        tmdbId: number;
        kind: 'movie' | 'tv';
        overview: string;
        posterUrl: string | null;
      }
    | null
  > {
    if (!this.apiKey) return null;

    // Try movie first
    const movie = await this.searchMovie(title, year);
    if (movie) {
      return {
        tmdbId: movie.id,
        kind: 'movie',
        overview: movie.overview,
        posterUrl: movie.poster_path
          ? `${POSTER_BASE_URL}/w500${movie.poster_path}`
          : null,
      };
    }
    // Fall back to TV
    const tv = await this.searchTv(title, year);
    if (tv) {
      return {
        tmdbId: tv.id,
        kind: 'tv',
        overview: tv.overview,
        posterUrl: tv.poster_path
          ? `${POSTER_BASE_URL}/w500${tv.poster_path}`
          : null,
      };
    }
    return null;
  }

  private async searchMovie(
    title: string,
    year?: number,
  ): Promise<TmdbSearchMovie | null> {
    try {
      const res = await this.http.get<TmdbSearchResponse<TmdbSearchMovie>>(
        '/search/movie',
        {
          params: {
            api_key: this.apiKey,
            query: title,
            year,
            language: 'vi-VN',
          },
        },
      );
      return res.data.results?.[0] ?? null;
    } catch (err) {
      this.logger.warn(`TMDB movie search failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async searchTv(
    title: string,
    year?: number,
  ): Promise<TmdbSearchTv | null> {
    try {
      const res = await this.http.get<TmdbSearchResponse<TmdbSearchTv>>(
        '/search/tv',
        {
          params: {
            api_key: this.apiKey,
            query: title,
            first_air_date_year: year,
            language: 'vi-VN',
          },
        },
      );
      return res.data.results?.[0] ?? null;
    } catch (err) {
      this.logger.warn(`TMDB tv search failed: ${(err as Error).message}`);
      return null;
    }
  }
}

// ============================================================
// OmniCast - YouTube Ingest Service
// Fetches liveStreamingDetails for YouTube-backed LiveEvents
// and upserts them in the database on a cron schedule.
// Idempotency key: (channelId, externalPlatform, externalId)
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { EventStatus, ExternalPlatform, ContentSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLoggerService } from '../../audit-logger/audit-logger.service';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const SYSTEM_USER_ID = 'system-ingest';
const MAX_VIDEOS_PER_RUN = 50;

interface YouTubeLiveStreamingDetails {
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  concurrentViewers?: string;
}

interface YouTubeVideoSnippet {
  title: string;
  description: string;
  thumbnails?: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
    maxres?: { url: string };
  };
  liveBroadcastContent?: string;
}

interface YouTubeVideoItem {
  id: string;
  snippet: YouTubeVideoSnippet;
  liveStreamingDetails?: YouTubeLiveStreamingDetails;
}

@Injectable()
export class YoutubeIngestService {
  private readonly logger = new Logger(YoutubeIngestService.name);
  private readonly http: AxiosInstance;
  private readonly apiKey: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogger: AuditLoggerService,
  ) {
    this.apiKey = this.configService.get<string>('YOUTUBE_API_KEY') || null;
    this.http = axios.create({
      baseURL: YOUTUBE_API_BASE,
      timeout: 15000,
    });
  }

  /**
   * Run every 15 minutes (default cron from plan).
   * Override via INGEST_YOUTUBE_CRON env var if you wire ScheduleModule.dynamic.
   */
  @Cron('0 */15 * * * *', { name: 'youtube-ingest' })
  async handleCron() {
    if (!this.apiKey) {
      this.logger.warn(
        'YOUTUBE_API_KEY not set — skipping cron run. Set the key in backend/.env to enable.',
      );
      await this.auditLogger.log({
        userId: SYSTEM_USER_ID,
        action: 'INGEST_YOUTUBE_SKIPPED',
        entityType: 'Ingest',
        newValues: { reason: 'YOUTUBE_API_KEY missing' },
      });
      return;
    }
    try {
      const result = await this.runOnce();
      this.logger.log(
        `YouTube ingest complete: processed=${result.processed} upserted=${result.upserted} skipped=${result.skipped}`,
      );
    } catch (err) {
      this.logger.error('YouTube ingest cron failed', err as Error);
      await this.auditLogger.log({
        userId: SYSTEM_USER_ID,
        action: 'INGEST_YOUTUBE_FAILED',
        entityType: 'Ingest',
        newValues: { error: (err as Error).message },
      });
    }
  }

  /**
   * Manually triggerable one-shot ingestion (admin endpoint).
   * Returns a summary of what was processed.
   */
  async runOnce(): Promise<{
    processed: number;
    upserted: number;
    skipped: number;
  }> {
    if (!this.apiKey) {
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    // Find all channels that have at least one YouTube-backed event
    const candidates = await this.prisma.liveEvent.findMany({
      where: {
        externalPlatform: ExternalPlatform.YOUTUBE,
        externalId: { not: null },
      },
      select: {
        id: true,
        channelId: true,
        externalId: true,
        title: true,
      },
      take: MAX_VIDEOS_PER_RUN,
      orderBy: { updatedAt: 'asc' },
    });

    if (candidates.length === 0) {
      return { processed: 0, upserted: 0, skipped: 0 };
    }

    const videoIds = Array.from(
      new Set(
        candidates
          .map((c) => c.externalId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const items = await this.fetchVideos(videoIds);
    const byId = new Map(items.map((it) => [it.id, it]));

    let upserted = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      const item = candidate.externalId ? byId.get(candidate.externalId) : null;
      if (!item) {
        skipped += 1;
        continue;
      }
      await this.upsertFromVideo(candidate.channelId, item);
      upserted += 1;
    }

    await this.auditLogger.log({
      userId: SYSTEM_USER_ID,
      action: 'INGEST_YOUTUBE_RUN',
      entityType: 'Ingest',
      newValues: {
        processed: candidates.length,
        upserted,
        skipped,
        videoIdsCount: videoIds.length,
      },
    });

    return { processed: candidates.length, upserted, skipped };
  }

  /**
   * Calls YouTube videos.list with liveStreamingDetails.
   * https://developers.google.com/youtube/v3/docs/videos/list
   */
  private async fetchVideos(videoIds: string[]): Promise<YouTubeVideoItem[]> {
    const response = await this.http.get('/videos', {
      params: {
        key: this.apiKey,
        part: 'snippet,liveStreamingDetails',
        id: videoIds.join(','),
        maxResults: MAX_VIDEOS_PER_RUN,
      },
    });
    return response.data?.items ?? [];
  }

  /**
   * Maps a YouTube video item to our LiveEvent shape and upserts.
   */
  private async upsertFromVideo(channelId: string, item: YouTubeVideoItem) {
    const liveDetails = item.liveStreamingDetails;
    const snippet = item.snippet;
    const thumbnail =
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      null;

    let status: EventStatus = EventStatus.SCHEDULED;
    if (liveDetails?.actualStartTime && !liveDetails.actualEndTime) {
      status = EventStatus.LIVE;
    } else if (liveDetails?.actualEndTime) {
      status = EventStatus.ENDED;
    } else if (snippet.liveBroadcastContent === 'upcoming') {
      status = EventStatus.SCHEDULED;
    } else if (snippet.liveBroadcastContent === 'none') {
      status = EventStatus.ENDED;
    }

    const scheduledAt =
      liveDetails?.scheduledStartTime ||
      liveDetails?.actualStartTime ||
      new Date().toISOString();

    const endedAt = liveDetails?.actualEndTime
      ? new Date(liveDetails.actualEndTime)
      : undefined;

    const viewerCount = liveDetails?.concurrentViewers
      ? Number(liveDetails.concurrentViewers)
      : undefined;

    await this.prisma.liveEvent.upsert({
      where: {
        channel_platform_external_unique: {
          channelId,
          externalPlatform: ExternalPlatform.YOUTUBE,
          externalId: item.id,
        },
      },
      update: {
        title: snippet.title,
        description: snippet.description?.slice(0, 3000) || undefined,
        thumbnailUrl: thumbnail || undefined,
        status,
        startedAt: liveDetails?.actualStartTime
          ? new Date(liveDetails.actualStartTime)
          : undefined,
        endedAt,
        viewerCount,
      },
      create: {
        channelId,
        title: snippet.title,
        description: snippet.description?.slice(0, 3000) || null,
        thumbnailUrl: thumbnail,
        streamSource: ContentSource.EXTERNAL,
        externalPlatform: ExternalPlatform.YOUTUBE,
        externalId: item.id,
        status,
        scheduledAt: new Date(scheduledAt),
        startedAt: liveDetails?.actualStartTime
          ? new Date(liveDetails.actualStartTime)
          : null,
        endedAt: endedAt ?? null,
        viewerCount: viewerCount ?? 0,
        language: 'vi',
      },
    });
  }
}

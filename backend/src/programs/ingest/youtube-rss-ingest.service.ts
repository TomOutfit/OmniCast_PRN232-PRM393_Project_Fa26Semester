// ============================================================
// OmniCast - YouTube RSS Ingest Service
// Pulls the latest uploads + live broadcasts from a channel's
// PUBLIC RSS feed: https://www.youtube.com/feeds/videos.xml?channel_id=XXX
// No API key required. Idempotent via (channelId, YOUTUBE, externalId).
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { createHash } from 'crypto';
import { ContentSource, EventStatus, ExternalPlatform } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLoggerService } from '../../audit-logger/audit-logger.service';

const YOUTUBE_RSS_BASE = 'https://www.youtube.com/feeds/videos.xml';
const SYSTEM_USER_ID = 'system-ingest-rss';
const MAX_CHANNELS_PER_RUN = 20;

interface YtRssEntry {
  id: string;            // yt:videoId
  title: string;         // media:title or atom:title
  description?: string;  // media:description
  thumbnailUrl?: string; // media:thumbnail
  views?: number;        // media:statistics
  published: string;     // atom:published (ISO)
  updated: string;
  link?: string;
  author?: string;
}

interface YtRssFeed {
  channelId: string;
  channelTitle: string;
  entries: YtRssEntry[];
}

@Injectable()
export class YoutubeRssIngestService {
  private readonly logger = new Logger(YoutubeRssIngestService.name);
  private readonly http: AxiosInstance;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {
    this.http = axios.create({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/atom+xml, application/xml, text/xml, */*',
      },
    });
  }

  private deterministicId(channelId: string, extId: string, kind: 'event' | 'rec'): string {
    const raw = `${channelId}:${extId}:${kind}`;
    const md5 = createHash('md5').update(raw).digest('hex');
    return `${md5.slice(0, 8)}-${md5.slice(8, 12)}-4${md5.slice(13, 16)}-a${md5.slice(17, 20)}-${md5.slice(20, 32)}`;
  }

  /**
   * Default: every 30 minutes. Cheap because RSS feed is one HTTP call per channel.
   */
  @Cron('0 */30 * * * *', { name: 'youtube-rss-ingest' })
  async handleCron() {
    try {
      const result = await this.runOnce();
      this.logger.log(
        `YouTube RSS ingest complete: channels=${result.channels} upserted=${result.upserted} skipped=${result.skipped}`,
      );
    } catch (err) {
      this.logger.error('YouTube RSS ingest cron failed', err as Error);
      await this.auditLogger.log({
        userId: SYSTEM_USER_ID,
        action: 'INGEST_YT_RSS_FAILED',
        entityType: 'Ingest',
        newValues: { error: (err as Error).message },
      });
    }
  }

  /**
   * Manually triggerable one-shot ingestion. Skips channels with no youtubeChannelId.
   */
  async runOnce(): Promise<{
    channels: number;
    upserted: number;
    skipped: number;
  }> {
    const channels = await this.prisma.liveChannel.findMany({
      where: { youtubeChannelId: { not: null }, isActive: true },
      select: { id: true, youtubeChannelId: true, name: true },
      take: MAX_CHANNELS_PER_RUN,
    });

    if (channels.length === 0) {
      await this.auditLogger.log({
        userId: SYSTEM_USER_ID,
        action: 'INGEST_YT_RSS_NO_CHANNELS',
        entityType: 'Ingest',
        newValues: { reason: 'No LiveChannel has youtubeChannelId set' },
      });
      return { channels: 0, upserted: 0, skipped: 0 };
    }

    let totalUpserted = 0;
    let totalSkipped = 0;

    for (const ch of channels) {
      try {
        if (!ch.youtubeChannelId) continue;
        const result = await this.ingestChannel(ch.id, ch.youtubeChannelId);
        totalUpserted += result.upserted;
        totalSkipped += result.skipped;
      } catch (err: any) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 500)) {
          this.logger.debug(
            `YouTube RSS channel ${ch.youtubeChannelId} (${ch.name}) unaccessible (HTTP ${err.response.status}), skipping.`,
          );
        } else {
          this.logger.debug(
            `YouTube RSS ingest skipped for channel ${ch.youtubeChannelId}: ${err.message}`,
          );
        }
        totalSkipped += 1;
      }
    }

    await this.auditLogger.log({
      userId: SYSTEM_USER_ID,
      action: 'INGEST_YT_RSS_RUN',
      entityType: 'Ingest',
      newValues: {
        channels: channels.length,
        upserted: totalUpserted,
        skipped: totalSkipped,
      },
    });

    return { channels: channels.length, upserted: totalUpserted, skipped: totalSkipped };
  }

  private async ingestChannel(
    channelId: string,
    ytChannelId: string,
  ): Promise<{ upserted: number; skipped: number }> {
    const response = await this.http.get<string>(YOUTUBE_RSS_BASE, {
      params: { channel_id: ytChannelId },
      responseType: 'text',
      headers: { Accept: 'application/atom+xml, application/xml, text/xml' },
    });

    const feed = this.parseAtom(response.data);
    let upserted = 0;
    let skipped = 0;

    for (const entry of feed.entries) {
      // We accept both regular videos and live broadcasts. Skip upcoming premieres that
      // have no scheduled time yet — but treat the published date as scheduledAt fallback.
      const publishedAt = new Date(entry.published);
      if (Number.isNaN(publishedAt.getTime())) {
        skipped += 1;
        continue;
      }

      const streamUrl = `https://www.youtube.com/watch?v=${entry.id}`;
      const thumbnailUrl = entry.thumbnailUrl || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`;
      const description = entry.description || null;

      // 1. Upsert LiveEvent
      await this.prisma.liveEvent.upsert({
        where: {
          channelId_externalPlatform_externalId: {
            channelId,
            externalPlatform: ExternalPlatform.YOUTUBE,
            externalId: entry.id,
          },
        },
        update: {
          title: entry.title.slice(0, 255),
          description: description ? description.slice(0, 3000) : undefined,
          thumbnailUrl,
          streamUrl,
          externalUrl: entry.link || streamUrl,
          scheduledAt: publishedAt,
        },
        create: {
          channelId,
          title: entry.title.slice(0, 255),
          description: description ? description.slice(0, 3000) : null,
          thumbnailUrl,
          streamUrl,
          externalUrl: entry.link || streamUrl,
          streamSource: ContentSource.EXTERNAL,
          externalPlatform: ExternalPlatform.YOUTUBE,
          externalId: entry.id,
          status: EventStatus.SCHEDULED,
          scheduledAt: publishedAt,
          language: 'vi',
          tags: ['YouTube', 'RSS', feed.channelTitle].slice(0, 5),
          chatEnabled: true,
          autoRecord: true,
        },
      });

      // 2. Upsert into Recording (Program library "kho chương trình" used by EPG Schedule Filler)
      const recId = this.deterministicId(channelId, entry.id, 'rec');
      try {
        await this.prisma.recording.upsert({
          where: { id: recId },
          update: {
            title: entry.title.slice(0, 255),
            description: description ? description.slice(0, 3000) : undefined,
            thumbnailUrl,
            videoUrl: streamUrl,
            externalUrl: entry.link || streamUrl,
            tags: ['YouTube', 'RSS', feed.channelTitle].slice(0, 5),
            isActive: true,
            isPublished: true,
          },
          create: {
            id: recId,
            channelId,
            title: entry.title.slice(0, 255),
            description: description ? description.slice(0, 3000) : null,
            thumbnailUrl,
            videoUrl: streamUrl,
            externalUrl: entry.link || streamUrl,
            contentSource: ContentSource.EXTERNAL,
            externalPlatform: ExternalPlatform.YOUTUBE,
            externalId: entry.id,
            duration: 3600,
            quality: 'FULL_HD_1080P',
            contentType: 'VIDEO',
            language: 'vi',
            viewCount: BigInt(entry.views ?? 0),
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            downloadCount: 0,
            tags: ['YouTube', 'RSS', feed.channelTitle].slice(0, 5),
            isPublished: true,
            isFeatured: false,
            isActive: true,
            publishedAt,
          },
        });
      } catch (err: any) {
        this.logger.debug(`Recording upsert skipped for ${entry.id}: ${err.message}`);
      }

      upserted += 1;
    }

    return { upserted, skipped };
  }

  /**
   * Minimal Atom XML parser — extracts the fields we need without pulling in a
   * full XML library. Handles the YouTube videos.xml namespace prefixes (yt:, media:).
   */
  private parseAtom(xml: string): YtRssFeed {
    const get = (re: RegExp): string => {
      const m = xml.match(re);
      return m ? m[1].trim() : '';
    };

    const channelId = get(/<yt:channelId>([^<]+)<\/yt:channelId>/);
    const channelTitle = get(/<feed>[\s\S]*?<title>([^<]+)<\/title>/);

    const entryBlocks = xml.split('<entry>').slice(1);
    const entries: YtRssEntry[] = entryBlocks.map((block) => {
      const closeIdx = block.indexOf('</entry>');
      const e = closeIdx >= 0 ? block.slice(0, closeIdx) : block;
      const descRaw = getFromBlock(e, /<media:description>([\s\S]*?)<\/media:description>/);
      const thumbUrl = getFromBlock(e, /<media:thumbnail[^>]*url="([^"]+)"/);
      const viewsStr = getFromBlock(e, /<media:statistics[^>]*views="(\d+)"/);
      return {
        id: getFromBlock(e, /<yt:videoId>([^<]+)<\/yt:videoId>/),
        title: decodeEntities(
          getFromBlock(e, /<media:title>([^<]+)<\/media:title>/) ||
            getFromBlock(e, /<title>([^<]+)<\/title>/),
        ),
        description: descRaw ? decodeEntities(descRaw).trim() : undefined,
        thumbnailUrl: thumbUrl || undefined,
        views: viewsStr ? parseInt(viewsStr, 10) : undefined,
        published: getFromBlock(e, /<published>([^<]+)<\/published>/),
        updated: getFromBlock(e, /<updated>([^<]+)<\/updated>/),
        link: getFromBlock(e, /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/),
        author: getFromBlock(e, /<name>([^<]+)<\/name>/),
      };
    }).filter((e) => e.id && e.published);

    return { channelId, channelTitle, entries };
  }
}

function getFromBlock(block: string, re: RegExp): string {
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

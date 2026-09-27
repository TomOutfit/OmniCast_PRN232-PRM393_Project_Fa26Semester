// ============================================================
// OmniCast - Twitch Ingest Service
// Pulls channel stream schedule segments via Twitch Helix API.
// Idempotency key: (channelId, externalPlatform, externalId)
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { EventStatus, ExternalPlatform, ContentSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLoggerService } from '../../audit-logger/audit-logger.service';

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const TWITCH_API_BASE = 'https://api.twitch.tv/helix';
const SYSTEM_USER_ID = 'system-ingest';

interface TwitchAppToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TwitchScheduleSegment {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  canceled_until?: string | null;
  is_recurring: boolean;
  category?: { id: string; name: string } | null;
}

interface TwitchScheduleResponse {
  data: {
    segments: TwitchScheduleSegment[];
    broadcaster_id: string;
    broadcaster_name: string;
    broadcaster_login: string;
  };
}

@Injectable()
export class TwitchIngestService {
  private readonly logger = new Logger(TwitchIngestService.name);
  private readonly http: AxiosInstance;
  private readonly clientId: string | null;
  private readonly clientSecret: string | null;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogger: AuditLoggerService,
  ) {
    this.clientId = this.configService.get<string>('TWITCH_CLIENT_ID') || null;
    this.clientSecret =
      this.configService.get<string>('TWITCH_CLIENT_SECRET') || null;
    this.http = axios.create({ baseURL: TWITCH_API_BASE, timeout: 15000 });
  }

  /**
   * Run every 30 minutes (default from plan).
   */
  @Cron('0 */30 * * * *', { name: 'twitch-ingest' })
  async handleCron() {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        'TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET not set — skipping cron run.',
      );
      await this.auditLogger.log({
        userId: SYSTEM_USER_ID,
        action: 'INGEST_TWITCH_SKIPPED',
        entityType: 'Ingest',
        newValues: {
          reason: 'TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET missing',
        },
      });
      return;
    }
    try {
      const result = await this.runOnce();
      this.logger.log(
        `Twitch ingest complete: channels=${result.channels} segments=${result.segments} upserted=${result.upserted}`,
      );
    } catch (err) {
      this.logger.error('Twitch ingest cron failed', err as Error);
      await this.auditLogger.log({
        userId: SYSTEM_USER_ID,
        action: 'INGEST_TWITCH_FAILED',
        entityType: 'Ingest',
        newValues: { error: (err as Error).message },
      });
    }
  }

  /**
   * Manually triggerable one-shot ingestion.
   */
  async runOnce(): Promise<{
    channels: number;
    segments: number;
    upserted: number;
  }> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('TWITCH_CLIENT_ID/SECRET not configured');
    }

    const token = await this.getAppToken();
    const channels = await this.prisma.liveChannel.findMany({
      where: {
        twitchBroadcasterId: { not: null },
        isActive: true,
      },
      select: { id: true, twitchBroadcasterId: true, name: true },
    });

    if (channels.length === 0) {
      return { channels: 0, segments: 0, upserted: 0 };
    }

    let totalSegments = 0;
    let totalUpserted = 0;

    for (const channel of channels) {
      if (!channel.twitchBroadcasterId) continue;
      try {
        const result = await this.ingestChannel(
          channel.id,
          channel.twitchBroadcasterId,
          token,
        );
        totalSegments += result.segmentCount;
        totalUpserted += result.upserted;
      } catch (err) {
        this.logger.warn(
          `Twitch ingest failed for broadcaster ${channel.twitchBroadcasterId}: ${(err as Error).message}`,
        );
      }
    }

    await this.auditLogger.log({
      userId: SYSTEM_USER_ID,
      action: 'INGEST_TWITCH_RUN',
      entityType: 'Ingest',
      newValues: {
        channels: channels.length,
        segments: totalSegments,
        upserted: totalUpserted,
      },
    });

    return {
      channels: channels.length,
      segments: totalSegments,
      upserted: totalUpserted,
    };
  }

  private async ingestChannel(
    channelId: string,
    broadcasterId: string,
    token: string,
  ): Promise<{ segmentCount: number; upserted: number }> {
    const response = await this.http.get<TwitchScheduleResponse>(
      '/schedule',
      {
        params: {
          broadcaster_id: broadcasterId,
          start_time: new Date().toISOString().split('T')[0] + 'T00:00:00Z',
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Client-Id': this.clientId!,
        },
      },
    );
    const segments = response.data?.data?.segments ?? [];
    let upserted = 0;
    for (const seg of segments) {
      await this.upsertSegment(channelId, seg);
      upserted += 1;
    }
    return { segmentCount: segments.length, upserted };
  }

  private async upsertSegment(
    channelId: string,
    seg: TwitchScheduleSegment,
  ): Promise<void> {
    const isCancelled = Boolean(seg.canceled_until);
    const status: EventStatus = isCancelled
      ? EventStatus.CANCELLED
      : new Date(seg.start_time) <= new Date() &&
          new Date(seg.end_time) >= new Date()
        ? EventStatus.LIVE
        : EventStatus.SCHEDULED;

    const duration = Math.max(
      1,
      Math.round(
        (new Date(seg.end_time).getTime() -
          new Date(seg.start_time).getTime()) /
          60000,
      ),
    );

    const tags = seg.category?.name ? [seg.category.name] : [];

    await this.prisma.liveEvent.upsert({
      where: {
        channel_platform_external_unique: {
          channelId,
          externalPlatform: ExternalPlatform.TWITCH,
          externalId: seg.id,
        },
      },
      update: {
        title: seg.title || 'Twitch stream',
        status,
        duration,
        tags,
        startedAt:
          status === EventStatus.LIVE ? new Date(seg.start_time) : null,
      },
      create: {
        channelId,
        title: seg.title || 'Twitch stream',
        streamSource: ContentSource.EXTERNAL,
        externalPlatform: ExternalPlatform.TWITCH,
        externalId: seg.id,
        status,
        scheduledAt: new Date(seg.start_time),
        duration,
        language: 'en',
        tags,
        chatEnabled: true,
        autoRecord: true,
      },
    });
  }

  /**
   * OAuth client_credentials grant.
   * Caches the token until ~5 minutes before expiry.
   * https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow
   */
  private async getAppToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 300_000) {
      return this.cachedToken.token;
    }
    const response = await axios.post<TwitchAppToken>(
      TWITCH_TOKEN_URL,
      null,
      {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        },
        timeout: 15000,
      },
    );
    const { access_token, expires_in } = response.data;
    this.cachedToken = {
      token: access_token,
      expiresAt: Date.now() + expires_in * 1000,
    };
    return access_token;
  }
}

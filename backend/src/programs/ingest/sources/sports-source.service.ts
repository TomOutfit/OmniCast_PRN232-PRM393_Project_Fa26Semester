// ============================================================
// OmniCast - TheSportsDB Source (SPORTS category)
// Pulls upcoming events + recent matches for the next 14 days
// from TheSportsDB free API. No API key required for the v1
// public test endpoint; with a key (THESPORTSDB_API_KEY) it
// unlocks the full Premier League, NBA, F1 etc. schedule.
//
// Docs: https://www.thesportsdb.com/api.php
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentSource, EventStatus, ExternalPlatform, LiveCategory, StreamQuality } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { HttpHelper } from './http.helper';
import {
  BaseExternalSource,
  NormalizedLiveEvent,
  NormalizedRecording,
  SourceChannelContext,
  SourceRunResult,
} from './base-source.interface';

interface TheSportsDbEvent {
  idEvent: string;
  strEvent: string;
  strLeague: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore?: string | null;
  intAwayScore?: string | null;
  dateEvent: string;        // YYYY-MM-DD
  strTime?: string;         // HH:mm:ss
  strTimestamp?: string;    // ISO 8601
  strVenue?: string;
  strThumb?: string;
  strDescriptionEN?: string;
  strStatus?: string;       // "Not Started" | "Live" | "Match Finished"
}

interface TheSportsDbListResponse<T> {
  events?: T[];
}

const SPORT_KEYWORDS_BY_SLUG: Record<string, string> = {
  'sport-1': 'Soccer',
  'sport-2': 'Motorsport',
};

@Injectable()
export class SportsSource extends BaseExternalSource {
  readonly sourceName = 'TheSportsDB';
  readonly category = LiveCategory.SPORTS;
  readonly requiredEnvVars = ['THESPORTSDB_API_KEY'];
  private readonly logger = new Logger(SportsSource.name);
  private readonly http: HttpHelper;
  private readonly apiKey: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
    this.apiKey = this.config.get<string>('THESPORTSDB_API_KEY') || null;
    this.http = new HttpHelper({
      baseURL: 'https://www.thesportsdb.com/api/v1/json',
      timeoutMs: 12_000,
      retries: 1,
    });
  }

  isConfigured(): boolean {
    // Free endpoint works without key for limited leagues; treat as always configured.
    return true;
  }

  async fetchEvents(channel: SourceChannelContext): Promise<NormalizedLiveEvent[]> {
    const league = SPORT_KEYWORDS_BY_SLUG[channel.channelSlug] || 'Soccer';
    const seg = this.apiKey ? this.apiKey : '3'; // '3' = free test key documented on TheSportsDB
    const out: NormalizedLiveEvent[] = [];
    try {
      const next = await this.http.get<TheSportsDbListResponse<TheSportsDbEvent>>(
        `/${seg}/eventsnext.php`,
        { params: { id: this.lookupLeagueId(league) } },
      );
      const past = await this.http.get<TheSportsDbListResponse<TheSportsDbEvent>>(
        `/${seg}/eventslast.php`,
        { params: { id: this.lookupLeagueId(league) } },
      );
      const all = [...(next.events ?? []), ...(past.events ?? [])];
      for (const ev of all) {
        const when = this.parseEventTime(ev);
        if (!when) continue;
        out.push({
          externalId: ev.idEvent,
          externalPlatform: ExternalPlatform.CUSTOM_HLS,
          title: ev.strEvent,
          description:
            ev.strDescriptionEN?.slice(0, 3000) ||
            `${ev.strLeague} — ${ev.strHomeTeam} vs ${ev.strAwayTeam}` +
              (ev.strVenue ? ` tại ${ev.strVenue}` : ''),
          thumbnailUrl: ev.strThumb,
          scheduledAt: when,
          status: this.mapStatus(ev.strStatus),
          duration: 7200,
          tags: [league, ev.strLeague, ev.strHomeTeam, ev.strAwayTeam].filter(Boolean),
          language: 'en',
          metadata: { source: 'thesportsdb', league, eventId: ev.idEvent },
        });
      }
    } catch (err) {
      this.logger.warn(
        `[SportsSource] fetchEvents failed for ${channel.channelSlug}: ${(err as Error).message}`,
      );
    }
    return out;
  }

  async fetchRecordings(_channel: SourceChannelContext): Promise<NormalizedRecording[]> {
    // TheSportsDB has highlights thumbnails but no direct VOD stream URLs.
    // We expose zero recordings rather than fabricate dead links.
    return [];
  }

  private parseEventTime(ev: TheSportsDbEvent): Date | null {
    if (ev.strTimestamp) {
      const d = new Date(ev.strTimestamp);
      if (!Number.isNaN(d.getTime())) return d;
    }
    if (ev.dateEvent && ev.strTime) {
      const iso = `${ev.dateEvent}T${ev.strTime}Z`;
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  }

  private mapStatus(raw?: string): 'SCHEDULED' | 'LIVE' | 'ENDED' {
    if (!raw) return EventStatus.SCHEDULED;
    const lower = raw.toLowerCase();
    if (lower.includes('live') || lower.includes('playing') || lower.includes('in progress')) {
      return EventStatus.LIVE;
    }
    if (lower.includes('finished') || lower.includes('ended') || lower.includes('final')) {
      return EventStatus.ENDED;
    }
    return EventStatus.SCHEDULED;
  }

  /**
   * TheSportsDB numeric league IDs for the public test key.
   * Full list: https://www.thesportsdb.com/api/v1/json/3/all_leagues.php
   */
  private lookupLeagueId(league: string): string {
    const map: Record<string, string> = {
      Soccer: '4328',         // English Premier League
      Motorsport: '4370',     // Formula 1
      Basketball: '4387',     // NBA
      AmericanFootball: '4391',
      Tennis: '4464',
    };
    return map[league] || '4328';
  }

  /**
   * Persist a batch of normalized events to the DB. Used by aggregator.
   */
  async upsertEvents(channelId: string, events: NormalizedLiveEvent[]): Promise<number> {
    let count = 0;
    for (const ev of events) {
      try {
        await this.prisma.liveEvent.upsert({
          where: {
            channel_platform_external_unique: {
              channelId,
              externalPlatform: ExternalPlatform.CUSTOM_HLS,
              externalId: ev.externalId,
            },
          },
          update: {
            title: ev.title.slice(0, 255),
            description: ev.description,
            thumbnailUrl: ev.thumbnailUrl,
            scheduledAt: ev.scheduledAt,
            status: ev.status ?? EventStatus.SCHEDULED,
            startedAt: ev.startedAt ?? null,
            endedAt: ev.endedAt ?? null,
          },
          create: {
            channelId,
            title: ev.title.slice(0, 255),
            description: ev.description ?? null,
            thumbnailUrl: ev.thumbnailUrl ?? null,
            streamSource: ContentSource.EXTERNAL,
            externalPlatform: ExternalPlatform.CUSTOM_HLS,
            externalId: ev.externalId,
            status: ev.status ?? EventStatus.SCHEDULED,
            scheduledAt: ev.scheduledAt,
            startedAt: ev.startedAt ?? null,
            endedAt: ev.endedAt ?? null,
            quality: StreamQuality.FULL_HD_1080P,
            language: ev.language ?? 'en',
            tags: (ev.tags ?? []).slice(0, 5),
            chatEnabled: true,
            autoRecord: true,
          },
        });
        count += 1;
      } catch (err) {
        this.logger.warn(
          `[SportsSource] upsert failed for event ${ev.externalId}: ${(err as Error).message}`,
        );
      }
    }
    return count;
  }

  async runForChannel(channel: SourceChannelContext): Promise<SourceRunResult> {
    const t0 = Date.now();
    try {
      const events = await this.fetchEvents(channel);
      const upserted = await this.upsertEvents(channel.channelId, events);
      return {
        source: this.sourceName,
        category: this.category,
        fetched: events.length,
        upserted,
        skipped: events.length - upserted,
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

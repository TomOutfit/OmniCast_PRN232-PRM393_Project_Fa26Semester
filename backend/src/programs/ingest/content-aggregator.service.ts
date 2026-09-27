// ============================================================
// OmniCast - Content Aggregator Service
// Coordinates all per-category external source services to ingest
// and enrich LiveEvents and Recordings across all OmniCast channels.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LiveCategory } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLoggerService } from '../../audit-logger/audit-logger.service';
import {
  BaseExternalSource,
  SourceChannelContext,
  SourceRunResult,
} from './sources/base-source.interface';

import { SportsSource } from './sources/sports-source.service';
import { NewsSource } from './sources/news-source.service';
import { TmdbContentSource } from './sources/tmdb-content-source.service';
import { ItunesSource } from './sources/itunes-source.service';
import { GamingSource } from './sources/gaming-source.service';
import { TechSource } from './sources/tech-source.service';
import { EducationSource } from './sources/education-source.service';
import { FoodSource } from './sources/food-source.service';
import { HealthSource } from './sources/health-source.service';
import { TravelSource } from './sources/travel-source.service';
import { ArtSource } from './sources/art-source.service';
import { LifestyleSource } from './sources/lifestyle-source.service';

export interface AggregatorSummaryResult {
  totalChannels: number;
  totalFetched: number;
  totalUpserted: number;
  totalErrors: number;
  durationMs: number;
  results: SourceRunResult[];
}

export interface SourceStatusItem {
  sourceName: string;
  category: LiveCategory | string;
  isConfigured: boolean;
  requiredEnvVars: readonly string[];
}

@Injectable()
export class ContentAggregatorService {
  private readonly logger = new Logger(ContentAggregatorService.name);
  private readonly sourceMap = new Map<LiveCategory, BaseExternalSource[]>();
  private readonly allSources: BaseExternalSource[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
    private readonly sportsSource: SportsSource,
    private readonly newsSource: NewsSource,
    private readonly tmdbContentSource: TmdbContentSource,
    private readonly itunesSource: ItunesSource,
    private readonly gamingSource: GamingSource,
    private readonly techSource: TechSource,
    private readonly educationSource: EducationSource,
    private readonly foodSource: FoodSource,
    private readonly healthSource: HealthSource,
    private readonly travelSource: TravelSource,
    private readonly artSource: ArtSource,
    private readonly lifestyleSource: LifestyleSource,
  ) {
    this.allSources = [
      this.sportsSource,
      this.newsSource,
      this.tmdbContentSource,
      this.itunesSource,
      this.gamingSource,
      this.techSource,
      this.educationSource,
      this.foodSource,
      this.healthSource,
      this.travelSource,
      this.artSource,
      this.lifestyleSource,
    ];

    this.registerSource(LiveCategory.SPORTS, this.sportsSource);
    this.registerSource(LiveCategory.NEWS, this.newsSource);
    this.registerSource(LiveCategory.BUSINESS, this.newsSource);
    this.registerSource(LiveCategory.CINE, this.tmdbContentSource);
    this.registerSource(LiveCategory.DRAMA, this.tmdbContentSource);
    this.registerSource(LiveCategory.PODCAST, this.itunesSource);
    this.registerSource(LiveCategory.MUSIC, this.itunesSource);
    this.registerSource(LiveCategory.GAMING, this.gamingSource);
    this.registerSource(LiveCategory.TECH, this.techSource);
    this.registerSource(LiveCategory.EDUCATION, this.educationSource);
    this.registerSource(LiveCategory.FOOD, this.foodSource);
    this.registerSource(LiveCategory.HEALTH, this.healthSource);
    this.registerSource(LiveCategory.TRAVEL, this.travelSource);
    this.registerSource(LiveCategory.ART, this.artSource);
    this.registerSource(LiveCategory.LIFESTYLE, this.lifestyleSource);
    this.registerSource(LiveCategory.SHOW, this.lifestyleSource);
    this.registerSource(LiveCategory.ENTERTAINMENT, this.lifestyleSource);
    this.registerSource(LiveCategory.KIDS, this.lifestyleSource);
    this.registerSource(LiveCategory.DOCUMENTARY, this.lifestyleSource);
  }

  private registerSource(category: LiveCategory, source: BaseExternalSource) {
    const list = this.sourceMap.get(category) ?? [];
    list.push(source);
    this.sourceMap.set(category, list);
  }

  /**
   * Run automated ingest every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleScheduledIngest() {
    this.logger.log('Starting automated 6-hour content ingest cron...');
    try {
      const summary = await this.runAll('CRON_SYSTEM');
      this.logger.log(
        `Automated ingest completed: ${summary.totalUpserted} upserted across ${summary.totalChannels} channels in ${summary.durationMs}ms`,
      );
    } catch (err) {
      this.logger.error('Scheduled content ingest error:', err);
    }
  }

  /**
   * Run all sources across all active channels
   */
  async runAll(triggeredBy = 'ADMIN'): Promise<AggregatorSummaryResult> {
    const t0 = Date.now();
    const channels = await this.prisma.liveChannel.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    const results: SourceRunResult[] = [];
    let totalFetched = 0;
    let totalUpserted = 0;
    let totalErrors = 0;

    for (const ch of channels) {
      const sources = this.sourceMap.get(ch.category) ?? [this.lifestyleSource];
      const ctx = this.buildContext(ch);

      for (const source of sources) {
        try {
          const res = await (source as any).runForChannel(ctx);
          results.push(res);
          totalFetched += res.fetched;
          totalUpserted += res.upserted;
          totalErrors += res.errors;
        } catch (err) {
          totalErrors += 1;
          results.push({
            source: source.sourceName,
            category: ch.category,
            fetched: 0,
            upserted: 0,
            skipped: 0,
            errors: 1,
            durationMs: 0,
            errorMessages: [(err as Error).message],
          });
        }
      }
    }

    const durationMs = Date.now() - t0;
    const summary: AggregatorSummaryResult = {
      totalChannels: channels.length,
      totalFetched,
      totalUpserted,
      totalErrors,
      durationMs,
      results,
    };

    try {
      await this.auditLogger.log({
        action: 'CONTENT_AGGREGATOR_RUN_ALL',
        entityType: 'LiveChannel',
        entityId: 'ALL',
        userId: triggeredBy,
        newValues: {
          totalChannels: channels.length,
          totalUpserted,
          totalErrors,
          durationMs,
        },
      });
    } catch {
      // Audit log non-blocking
    }

    return summary;
  }

  /**
   * Run sources for a specific category
   */
  async runForCategory(
    category: LiveCategory,
    triggeredBy = 'ADMIN',
  ): Promise<AggregatorSummaryResult> {
    const t0 = Date.now();
    const channels = await this.prisma.liveChannel.findMany({
      where: { isActive: true, category },
      orderBy: { createdAt: 'asc' },
    });

    const sources = this.sourceMap.get(category) ?? [];
    const results: SourceRunResult[] = [];
    let totalFetched = 0;
    let totalUpserted = 0;
    let totalErrors = 0;

    for (const ch of channels) {
      const ctx = this.buildContext(ch);
      for (const source of sources) {
        try {
          const res = await (source as any).runForChannel(ctx);
          results.push(res);
          totalFetched += res.fetched;
          totalUpserted += res.upserted;
          totalErrors += res.errors;
        } catch (err) {
          totalErrors += 1;
          results.push({
            source: source.sourceName,
            category: ch.category,
            fetched: 0,
            upserted: 0,
            skipped: 0,
            errors: 1,
            durationMs: 0,
            errorMessages: [(err as Error).message],
          });
        }
      }
    }

    const durationMs = Date.now() - t0;
    return {
      totalChannels: channels.length,
      totalFetched,
      totalUpserted,
      totalErrors,
      durationMs,
      results,
    };
  }

  /**
   * Run sources for a specific channel (by ID or slug)
   */
  async runForChannel(
    channelIdOrSlug: string,
    triggeredBy = 'ADMIN',
  ): Promise<AggregatorSummaryResult> {
    const t0 = Date.now();
    const channel = await this.prisma.liveChannel.findFirst({
      where: {
        OR: [{ id: channelIdOrSlug }, { slug: channelIdOrSlug }],
      },
    });

    if (!channel) {
      throw new Error(`Channel not found: ${channelIdOrSlug}`);
    }

    const sources = this.sourceMap.get(channel.category) ?? [this.lifestyleSource];
    const ctx = this.buildContext(channel);
    const results: SourceRunResult[] = [];
    let totalFetched = 0;
    let totalUpserted = 0;
    let totalErrors = 0;

    for (const source of sources) {
      try {
        const res = await (source as any).runForChannel(ctx);
        results.push(res);
        totalFetched += res.fetched;
        totalUpserted += res.upserted;
        totalErrors += res.errors;
      } catch (err) {
        totalErrors += 1;
        results.push({
          source: source.sourceName,
          category: channel.category,
          fetched: 0,
          upserted: 0,
          skipped: 0,
          errors: 1,
          durationMs: 0,
          errorMessages: [(err as Error).message],
        });
      }
    }

    const durationMs = Date.now() - t0;
    return {
      totalChannels: 1,
      totalFetched,
      totalUpserted,
      totalErrors,
      durationMs,
      results,
    };
  }

  /**
   * Get health and configuration status of all external sources
   */
  async getStatus(): Promise<{
    sources: SourceStatusItem[];
    totalActiveChannels: number;
    categoryMappings: Record<string, string[]>;
  }> {
    const totalActiveChannels = await this.prisma.liveChannel.count({
      where: { isActive: true },
    });

    const sources: SourceStatusItem[] = this.allSources.map((s) => ({
      sourceName: s.sourceName,
      category: s.category,
      isConfigured: s.isConfigured(),
      requiredEnvVars: s.requiredEnvVars,
    }));

    const categoryMappings: Record<string, string[]> = {};
    for (const [cat, srcList] of this.sourceMap.entries()) {
      categoryMappings[cat] = srcList.map((s) => s.sourceName);
    }

    return {
      sources,
      totalActiveChannels,
      categoryMappings,
    };
  }

  private buildContext(channel: any): SourceChannelContext {
    const keywords = [
      channel.name,
      channel.tagline,
      channel.category,
      channel.description,
    ]
      .filter(Boolean)
      .join(' ')
      .split(/\s+/)
      .filter((w: string) => w.length > 2);

    return {
      channelId: channel.id,
      channelSlug: channel.slug,
      channelName: channel.name,
      category: channel.category,
      language: channel.language || 'vi',
      keywords,
      externalChannelId: channel.youtubeChannelId || channel.twitchBroadcasterId || null,
    };
  }
}

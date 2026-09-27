// ============================================================
// OmniCast - External Ingest Module
// Provides YouTube, Twitch, TMDB, and per-category Content Aggregator
// ============================================================

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { AuditLoggerModule } from '../../audit-logger/audit-logger.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { YoutubeIngestService } from './youtube-ingest.service';
import { YoutubeRssIngestService } from './youtube-rss-ingest.service';
import { TwitchIngestService } from './twitch-ingest.service';
import { TmdbEnrichmentService } from './tmdb-enrichment.service';
import { ContentAggregatorService } from './content-aggregator.service';
import { IngestController } from './ingest.controller';

// 12 Per-Category Source Services
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

const SOURCE_PROVIDERS = [
  SportsSource,
  NewsSource,
  TmdbContentSource,
  ItunesSource,
  GamingSource,
  TechSource,
  EducationSource,
  FoodSource,
  HealthSource,
  TravelSource,
  ArtSource,
  LifestyleSource,
];

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    PrismaModule,
    AuditLoggerModule,
  ],
  controllers: [IngestController],
  providers: [
    YoutubeIngestService,
    YoutubeRssIngestService,
    TwitchIngestService,
    TmdbEnrichmentService,
    ContentAggregatorService,
    ...SOURCE_PROVIDERS,
  ],
  exports: [
    YoutubeIngestService,
    YoutubeRssIngestService,
    TwitchIngestService,
    TmdbEnrichmentService,
    ContentAggregatorService,
    ...SOURCE_PROVIDERS,
  ],
})
export class IngestModule {}

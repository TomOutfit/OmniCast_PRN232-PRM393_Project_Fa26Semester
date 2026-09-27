// ============================================================
// OmniCast - External Ingest Module
// Provides YouTube, Twitch, and TMDB ingest workers
// ============================================================

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditLoggerModule } from '../../audit-logger/audit-logger.module';
import { YoutubeIngestService } from './youtube-ingest.service';
import { YoutubeRssIngestService } from './youtube-rss-ingest.service';
import { TwitchIngestService } from './twitch-ingest.service';
import { TmdbEnrichmentService } from './tmdb-enrichment.service';
import { IngestController } from './ingest.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuditLoggerModule,
  ],
  controllers: [IngestController],
  providers: [
    YoutubeIngestService,
    YoutubeRssIngestService,
    TwitchIngestService,
    TmdbEnrichmentService,
  ],
  exports: [
    YoutubeIngestService,
    YoutubeRssIngestService,
    TwitchIngestService,
    TmdbEnrichmentService,
  ],
})
export class IngestModule {}

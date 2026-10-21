// ============================================================
// OmniCast - Programs Module
// ============================================================

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { EpgNowService } from './epg-now.service';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { EpScheduleFillerService } from './epg-filler.service';
import { LiveStudioController } from './live-studio.controller';
import { LiveStudioService } from './live-studio.service';
import { StudioCatalogController } from './studio-catalog.controller';
import { StudioCatalogService } from './studio-catalog.service';
import { StorageService } from './storage.service';
import { AuditLoggerModule } from '../audit-logger/audit-logger.module';
import { IngestModule } from './ingest/ingest.module';
import { StreamHealthCheckService } from './stream-health-check.service';
import { StreamHealthCheckCron } from './stream-health-check.cron';
import { StreamHealthController } from './stream-health.controller';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // for @Cron decorators
    AuditLoggerModule,
    IngestModule,
    NotificationsModule,
  ],
  controllers: [
    ProgramsController,
    SocialController,
    LiveStudioController,
    StudioCatalogController,
    StreamHealthController,
  ],
  providers: [
    ProgramsService,
    SocialService,
    EpScheduleFillerService,
    EpgNowService,
    LiveStudioService,
    StudioCatalogService,
    StorageService,
    StreamHealthCheckService,
    StreamHealthCheckCron,
  ],
  exports: [
    ProgramsService,
    SocialService,
    EpScheduleFillerService,
    EpgNowService,
    LiveStudioService,
    StudioCatalogService,
    StorageService,
    StreamHealthCheckService,
  ],
})
export class ProgramsModule {}

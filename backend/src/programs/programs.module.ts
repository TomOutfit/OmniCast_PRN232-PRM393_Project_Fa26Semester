// ============================================================
// OmniCast - Programs Module
// ============================================================

import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { AuditLoggerModule } from '../audit-logger/audit-logger.module';
import { IngestModule } from './ingest/ingest.module';

@Module({
  imports: [AuditLoggerModule, IngestModule],
  controllers: [ProgramsController, SocialController],
  providers: [ProgramsService, SocialService],
  exports: [ProgramsService, SocialService],
})
export class ProgramsModule {}

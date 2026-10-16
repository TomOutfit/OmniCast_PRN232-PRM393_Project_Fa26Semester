// ============================================================
// OmniCast - AI Curator Module
// ============================================================

import { Module } from '@nestjs/common';
import { AiCuratorController } from './ai-curator.controller';
import { AiCuratorService } from './ai-curator.service';
import { AiCuratorStatsService } from './ai-curator-stats.service';
import { AuditLoggerModule } from '../audit-logger/audit-logger.module';

@Module({
  imports: [AuditLoggerModule],
  controllers: [AiCuratorController],
  providers: [AiCuratorService, AiCuratorStatsService],
  exports: [AiCuratorService, AiCuratorStatsService],
})
export class AiCuratorModule {}
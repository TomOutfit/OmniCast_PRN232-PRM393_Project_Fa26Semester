// ============================================================
// OmniCast - Programs Module
// ============================================================

import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { AuditLoggerModule } from '../audit-logger/audit-logger.module';

@Module({
  imports: [AuditLoggerModule],
  controllers: [ProgramsController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}

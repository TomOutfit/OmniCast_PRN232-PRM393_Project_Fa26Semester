// ============================================================
// OmniCast - Audit Logger Module
// ============================================================

import { Module, Global } from '@nestjs/common';
import { AuditLoggerService } from './audit-logger.service';
import { AuditLoggerController } from './audit-logger.controller';

@Global()
@Module({
  controllers: [AuditLoggerController],
  providers: [AuditLoggerService],
  exports: [AuditLoggerService],
})
export class AuditLoggerModule {}

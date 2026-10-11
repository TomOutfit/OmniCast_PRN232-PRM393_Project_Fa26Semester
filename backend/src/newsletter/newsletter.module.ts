// ============================================================
// OmniCast - Newsletter Module
// ============================================================

import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { AuditLoggerModule } from '../audit-logger/audit-logger.module';

@Module({
  imports: [AuditLoggerModule],
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}

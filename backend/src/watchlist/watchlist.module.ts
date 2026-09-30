// ============================================================
// OmniCast - Watchlist Module
// ============================================================

import { Module } from '@nestjs/common';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';
import { AuditLoggerModule } from '../audit-logger/audit-logger.module';

@Module({
  imports: [AuditLoggerModule],
  controllers: [WatchlistController],
  providers: [WatchlistService],
  exports: [WatchlistService],
})
export class WatchlistModule {}

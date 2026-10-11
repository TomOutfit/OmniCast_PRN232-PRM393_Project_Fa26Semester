// ============================================================
// OmniCast - Stream Health-Check Cron
// ============================================================
//
// Wires `@nestjs/schedule` cron jobs to the
// `StreamHealthCheckService`. Each job calls `sweep()` with a
// tuned batch size and writes a one-line summary to the Nest
// logger so SRE can see the last run on the dashboard.
//
// Cadence
// -------
//  • every 15 minutes   — round-robin 50 records (warm cache)
//  • every  6 hours     — full sweep of every active record
//  • daily at 04:00 UTC — license/sourceType summary log
//
// Why split? The round-robin keeps the cache hot so the Studio
// dashboard never sees stale `isActive` flags. The full sweep is
// a safety net that catches anything the round-robin missed
// (e.g. brand-new records that just landed in DB).
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StreamHealthCheckService } from './stream-health-check.service';

@Injectable()
export class StreamHealthCheckCron {
  private readonly logger = new Logger(StreamHealthCheckCron.name);

  constructor(private readonly health: StreamHealthCheckService) {}

  /** Round-robin sweep — keeps the most recent 30 min cache warm. */
  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'stream-health-round-robin' })
  async roundRobin() {
    const t0 = Date.now();
    try {
      const result = await this.health.sweep({ batch: 50 });
      this.logger.log(
        `[round-robin] probed=${result.probed} active=${result.active} inactive=${result.inactive} errors=${result.errors} (${Date.now() - t0}ms)`,
      );
    } catch (err) {
      this.logger.error(`[round-robin] ${(err as Error).message}`);
    }
  }

  /** Full sweep — safety net every 6 hours. */
  @Cron(CronExpression.EVERY_6_HOURS, { name: 'stream-health-full-sweep' })
  async fullSweep() {
    const t0 = Date.now();
    try {
      const result = await this.health.sweep({ batch: 5000, includeInactive: true });
      this.logger.log(
        `[full-sweep] probed=${result.probed} active=${result.active} inactive=${result.inactive} errors=${result.errors} (${Date.now() - t0}ms)`,
      );
    } catch (err) {
      this.logger.error(`[full-sweep] ${(err as Error).message}`);
    }
  }

  /** Daily summary at 04:00 UTC (11:00 ICT). */
  @Cron('0 4 * * *', { name: 'stream-health-daily-summary' })
  async dailySummary() {
    try {
      const stats = await this.health.getStats();
      this.logger.log(
        `[daily-summary] total=${stats.totals.total} active=${stats.totals.active} inactive=${stats.totals.inactive} neverChecked=${stats.totals.neverChecked}`,
      );
    } catch (err) {
      this.logger.error(`[daily-summary] ${(err as Error).message}`);
    }
  }
}

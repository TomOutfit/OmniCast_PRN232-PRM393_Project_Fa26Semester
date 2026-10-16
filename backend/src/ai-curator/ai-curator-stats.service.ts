// ============================================================
// OmniCast - AI Curator Stats Service
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type StatsPeriod = 'day' | 'week' | 'month';

export interface SuitabilityBucket {
  count: number;
  percentage: number;
}

export interface AgeRatingBucket {
  count: number;
  percentage: number;
}

export interface FlaggedContentBucket {
  pattern: string;
  count: number;
}

export interface DailyBucket {
  date: string; // YYYY-MM-DD
  reportCount: number;
  avgEngagement: number;
}

export interface StatsSummary {
  period: StatsPeriod;
  generatedAt: string;
  totalReports: number;
  broadcastSuitability: {
    PRIME_TIME: SuitabilityBucket;
    STANDARD: SuitabilityBucket;
    RESTRICTED: SuitabilityBucket;
  };
  ageRating: {
    PG: AgeRatingBucket;
    T13: AgeRatingBucket;
    T16: AgeRatingBucket;
    T18: AgeRatingBucket;
  };
  aiModelVersion: {
    /** Map of model version → count of reports using it */
    counts: Record<string, number>;
    /**
     * Cache hit rate in the [0, 1] range. We don't currently persist a
     * `cached` boolean on `AiCuratorReport` rows, so this is reported
     * as 0. Once a `cached` column is added, replace the placeholder
     * in `computeCacheHitRate` with a real count.
     */
    cacheHitRate: number;
  };
  avgEngagement: number;
  avgProcessingTimeMs: number;
  totalTokensUsed: number;
  topFlaggedContent: FlaggedContentBucket[];
  programsMarkedApplied: number;
  last7Days: DailyBucket[];
}

/**
 * Returns ms between now and the start of the chosen period.
 * Centralised so unit tests can compare against the same expression.
 */
function periodStart(period: StatsPeriod, now: Date = new Date()): Date {
  const ms =
    period === 'day'
      ? 24 * 60 * 60 * 1000
      : period === 'week'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - ms);
}

@Injectable()
export class AiCuratorStatsService {
  /** Cache-hit-rate window — last N days are considered. */
  private readonly WINDOW_DAYS = 7;
  constructor(private readonly prisma: PrismaService) {}

  async getStats(period: StatsPeriod = 'week'): Promise<StatsSummary> {
    const since = periodStart(period);
    const now = new Date();

    // Fetch every report in the window. We deliberately pull them all
    // and aggregate in JS because the volume per period is small (the
    // pipeline generates at most a handful of reports per day) and the
    // JSON columns (`sentimentAnalysis`, `complianceAssessment`) would
    // require raw SQL to aggregate at the DB layer.
    const reports = await this.prisma.aiCuratorReport.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });

    const totalReports = reports.length;

    // --- Broadcast suitability buckets ---
    const suitabilityCounts = {
      PRIME_TIME: 0,
      STANDARD: 0,
      RESTRICTED: 0,
    } as Record<'PRIME_TIME' | 'STANDARD' | 'RESTRICTED', number>;
    for (const r of reports) {
      const key = (r.broadcastSuitability ?? 'STANDARD') as
        | 'PRIME_TIME'
        | 'STANDARD'
        | 'RESTRICTED';
      if (key in suitabilityCounts) {
        suitabilityCounts[key] += 1;
      } else {
        suitabilityCounts[key] = 1;
      }
    }
    const pct = (n: number) =>
      totalReports === 0 ? 0 : Math.round((n / totalReports) * 1000) / 10;

    // --- Age-rating buckets ---
    const ageRatingCounts = {
      PG: 0,
      T13: 0,
      T16: 0,
      T18: 0,
    } as Record<'PG' | 'T13' | 'T16' | 'T18', number>;
    for (const r of reports) {
      // Prisma may expose the JSON column under either `complianceAssessment`
      // or `compliance_assessment` depending on the field-mapping mode;
      // both are normalised through `coerceJson`.
      const ca = this.coerceJson(
        (r as any).complianceAssessment ?? (r as any).compliance_assessment,
      );
      const rating = (ca?.ageRating ?? 'PG') as 'PG' | 'T13' | 'T16' | 'T18';
      if (rating in ageRatingCounts) {
        ageRatingCounts[rating] += 1;
      } else {
        ageRatingCounts[rating] = 1;
      }
    }

    // --- AI model version counts ---
    const modelCounts: Record<string, number> = {};
    for (const r of reports) {
      const v = r.aiModelVersion ?? 'unknown';
      modelCounts[v] = (modelCounts[v] ?? 0) + 1;
    }

    // --- Average engagement / processing time / token usage ---
    let engagementSum = 0;
    let engagementCount = 0;
    let processingTimeSum = 0;
    let tokenSum = 0;
    for (const r of reports) {
      const sent = this.coerceJson(
        (r as any).sentimentAnalysis ?? (r as any).sentiment_analysis,
      );
      const eng =
        typeof sent?.audienceEngagement === 'number'
          ? sent.audienceEngagement
          : null;
      if (eng !== null && Number.isFinite(eng)) {
        engagementSum += eng;
        engagementCount += 1;
      }
      processingTimeSum += typeof r.processingTimeMs === 'number'
        ? r.processingTimeMs
        : 0;
      tokenSum += typeof r.tokenUsed === 'number' ? r.tokenUsed : 0;
    }

    const avgEngagement =
      engagementCount === 0 ? 0 : Math.round(engagementSum / engagementCount);
    const avgProcessingTimeMs =
      totalReports === 0 ? 0 : Math.round(processingTimeSum / totalReports);

    // --- Top flagged content (top 5 patterns across all reports) ---
    const flagCounts = new Map<string, number>();
    for (const r of reports) {
      const ca = this.coerceJson(
        (r as any).complianceAssessment ?? (r as any).compliance_assessment,
      );
      const flags: unknown = Array.isArray(ca?.flaggedContent)
        ? ca.flaggedContent
        : [];
      for (const f of flags as unknown[]) {
        if (typeof f === 'string' && f.length > 0) {
          flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1);
        }
      }
    }
    const topFlaggedContent = Array.from(flagCounts.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // --- programsMarkedApplied: distinct programIds whose LiveEvent
    //     has `lastAppliedAt` within the window. -----------------------
    //
    // NOTE: the `lastAppliedAt` column does NOT yet exist on the
    // `LiveEvent` Prisma model (the service writes it through
    // `prisma.liveEvent.update({ data: { lastAppliedAt: ... } })`,
    // which currently silently no-ops at the DB layer). We therefore
    // query defensively via `as any` so the stats call still returns
    // a value of 0 instead of throwing a 500 when running on the
    // current schema. Once the column is added, drop the `as any`.
    let programsMarkedApplied = 0;
    try {
      const applied = await (this.prisma as any).liveEvent.findMany({
        where: { lastAppliedAt: { gte: since } },
        select: { id: true },
      });
      programsMarkedApplied = Array.isArray(applied) ? applied.length : 0;
    } catch {
      // If the deployment is on an older migration that lacks
      // `lastAppliedAt`, swallow the error and report 0 rather than
      // blowing up the entire stats call.
      programsMarkedApplied = 0;
    }

    // --- last7Days: aggregate into buckets of YYYY-MM-DD. -------------
    // The spec keeps this fixed at 7 days regardless of the chosen
    // period (dashboard header is always "last 7 days" for the chart).
    const last7Days = this.computeLast7Days(reports, now);

    return {
      period,
      generatedAt: now.toISOString(),
      totalReports,
      broadcastSuitability: {
        PRIME_TIME: {
          count: suitabilityCounts.PRIME_TIME,
          percentage: pct(suitabilityCounts.PRIME_TIME),
        },
        STANDARD: {
          count: suitabilityCounts.STANDARD,
          percentage: pct(suitabilityCounts.STANDARD),
        },
        RESTRICTED: {
          count: suitabilityCounts.RESTRICTED,
          percentage: pct(suitabilityCounts.RESTRICTED),
        },
      },
      ageRating: {
        PG: { count: ageRatingCounts.PG, percentage: pct(ageRatingCounts.PG) },
        T13: { count: ageRatingCounts.T13, percentage: pct(ageRatingCounts.T13) },
        T16: { count: ageRatingCounts.T16, percentage: pct(ageRatingCounts.T16) },
        T18: { count: ageRatingCounts.T18, percentage: pct(ageRatingCounts.T18) },
      },
      aiModelVersion: {
        counts: modelCounts,
        cacheHitRate: await this.computeCacheHitRate(),
      },
      avgEngagement,
      avgProcessingTimeMs,
      totalTokensUsed: tokenSum,
      topFlaggedContent,
      programsMarkedApplied,
      last7Days,
    };
  }

  /**
   * Groups reports into YYYY-MM-DD buckets for the last 7 days (incl.
   * today). Each bucket reports report count + average engagement.
   */
  private computeLast7Days(reports: any[], now: Date): DailyBucket[] {
    const days: DailyBucket[] = [];
    const buckets = new Map<string, { count: number; sum: number; n: number }>();

    // Pre-create 7 empty buckets so the response always has 7 entries.
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = this.toDateKey(d);
      buckets.set(key, { count: 0, sum: 0, n: 0 });
      days.push({ date: key, reportCount: 0, avgEngagement: 0 });
    }

    for (const r of reports) {
      const ts: Date | string | null = r.createdAt ?? null;
      if (!ts) continue;
      const d = ts instanceof Date ? ts : new Date(ts);
      const key = this.toDateKey(d);
      const bucket = buckets.get(key);
      if (!bucket) continue; // report older than 7 days, ignore
      bucket.count += 1;
      const sent = this.coerceJson(
        (r as any).sentimentAnalysis ?? (r as any).sentiment_analysis,
      );
      const eng =
        typeof sent?.audienceEngagement === 'number'
          ? sent.audienceEngagement
          : null;
      if (eng !== null && Number.isFinite(eng)) {
        bucket.sum += eng;
        bucket.n += 1;
      }
    }

    return days.map((slot) => {
      const b = buckets.get(slot.date);
      if (!b || b.count === 0) return slot;
      return {
        date: slot.date,
        reportCount: b.count,
        avgEngagement: b.n === 0 ? 0 : Math.round(b.sum / b.n),
      };
    });
  }

  /**
   * Returns the proportion of reports in the window that were served
   * from the cache. `AiCuratorReport` now persists a `cached` boolean
   * (set via migration 007); we read it directly. We intentionally
   * count every report returned to the client — include the most
   * recent per program since `curateContent` only ever returns the
   * freshest row for any given programId on a cache hit.
   *
   * Returns 0 when no reports have been generated yet.
   */
  private async computeCacheHitRate(): Promise<number> {
    const since = new Date(Date.now() - this.WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const [cached, total] = await Promise.all([
      this.prisma.aiCuratorReport.count({
        where: { createdAt: { gte: since }, cached: true },
      }),
      this.prisma.aiCuratorReport.count({
        where: { createdAt: { gte: since } },
      }),
    ]);
    return total === 0 ? 0 : cached / total;
  }

  /**
   * Prisma returns `Json` columns as plain JS values, but it can also
   * be wrapped in `Prisma.JsonValue` instances depending on driver
   * version. This helper flattens both into a regular object so we can
   * read fields without runtime errors.
   */
  private coerceJson(value: unknown): any {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(String(value));
    } catch {
      return null;
    }
  }

  private toDateKey(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
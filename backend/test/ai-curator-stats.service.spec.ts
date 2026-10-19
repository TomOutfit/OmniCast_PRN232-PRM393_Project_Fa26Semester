/**
 * OmniCast - AI Curator Stats Service Unit Tests
 *
 * Verifies the dashboard stats aggregation:
 *   1. Empty DB → all counts are 0, percentages are 0
 *   2. Single report → counts reflect the row
 *   3. Group by `broadcastSuitability` produces correct buckets
 *   4. Average engagement computed correctly
 *   5. Cache hit rate is 0 (placeholder for `cached` column)
 *   6. Period filter `day` only counts reports from the last 24h
 *
 * Run via: `npm run test`
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  AiCuratorStatsService,
  StatsPeriod,
} from '../src/ai-curator/ai-curator-stats.service';

interface StoredReport {
  id: string;
  programId: string;
  broadcastSuitability: string;
  suggestedTimeSlot: string;
  targetAudienceVibe: string;
  riskWarnings: string;
  sentimentAnalysis: any;
  complianceAssessment: any;
  aiModelVersion: string;
  tokenUsed: number | null;
  processingTimeMs: number;
  createdBy: string | null;
  createdAt: Date;
}

interface LiveEventRow {
  id: string;
  lastAppliedAt?: Date;
}

class FakePrisma {
  public reports: StoredReport[] = [];
  public liveEvents: LiveEventRow[] = [];

  aiCuratorReport = {
    findMany: async (args: any) => {
      const where = args?.where ?? {};
      const filtered = this.reports.filter((r) => {
        if (where.createdAt?.gte && r.createdAt < where.createdAt.gte) {
          return false;
        }
        if (where.createdAt?.lte && r.createdAt > where.createdAt.lte) {
          return false;
        }
        return true;
      });
      return filtered.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    },
    count: async (args: any) => {
      const where = args?.where ?? {};
      return this.reports.filter((r) => {
        if (where.createdAt?.gte && r.createdAt < where.createdAt.gte) {
          return false;
        }
        if (where.cached === true && !(r as any).cached) {
          return false;
        }
        return true;
      }).length;
    },
  };

  liveEvent = {
    findMany: async (args: any) => {
      const where = args?.where ?? {};
      const filtered = this.liveEvents.filter((e) => {
        if (where.lastAppliedAt?.gte && !e.lastAppliedAt) return false;
        if (
          where.lastAppliedAt?.gte &&
          e.lastAppliedAt &&
          e.lastAppliedAt < where.lastAppliedAt.gte
        ) {
          return false;
        }
        return true;
      });
      return filtered;
    },
  };
}

function makeService() {
  const prisma = new FakePrisma();
  const service = new AiCuratorStatsService(prisma as any);
  return { service, prisma };
}

function seedReport(
  prisma: FakePrisma,
  overrides: Partial<StoredReport> & {
    createdAt?: Date;
  } = {},
): StoredReport {
  const row: StoredReport = {
    id: overrides.id ?? `rep-${prisma.reports.length + 1}`,
    programId: overrides.programId ?? 'program-1',
    broadcastSuitability: overrides.broadcastSuitability ?? 'STANDARD',
    suggestedTimeSlot: overrides.suggestedTimeSlot ?? '20:00 - 22:00',
    targetAudienceVibe: overrides.targetAudienceVibe ?? 'audience',
    riskWarnings: overrides.riskWarnings ?? 'ok',
    sentimentAnalysis: overrides.sentimentAnalysis ?? {
      overallSentiment: 'neutral',
      hypeLevel: 'medium',
      audienceEngagement: 50,
    },
    complianceAssessment: overrides.complianceAssessment ?? {
      isAgeRestricted: false,
      ageRating: 'PG',
      flaggedContent: [],
      recommendedBroadcastWindow: 'EVENING',
    },
    aiModelVersion: overrides.aiModelVersion ?? 'gpt-4o-omnicast-v3',
    tokenUsed: overrides.tokenUsed ?? 100,
    processingTimeMs: overrides.processingTimeMs ?? 250,
    createdBy: overrides.createdBy ?? 'user-1',
    createdAt: overrides.createdAt ?? new Date(),
  };
  prisma.reports.push(row);
  return row;
}

// ---------------------------------------------------------------
// 1. Empty DB → all zeros
// ---------------------------------------------------------------

test('getStats returns zero counts when there are no reports', async () => {
  const { service } = makeService();
  const stats = await service.getStats('week');
  assert.equal(stats.totalReports, 0);
  assert.equal(stats.broadcastSuitability.PRIME_TIME.count, 0);
  assert.equal(stats.broadcastSuitability.STANDARD.count, 0);
  assert.equal(stats.broadcastSuitability.RESTRICTED.count, 0);
  assert.equal(stats.ageRating.PG.count, 0);
  assert.equal(stats.ageRating.T13.count, 0);
  assert.equal(stats.ageRating.T16.count, 0);
  assert.equal(stats.ageRating.T18.count, 0);
  assert.equal(stats.avgEngagement, 0);
  assert.equal(stats.avgProcessingTimeMs, 0);
  assert.equal(stats.totalTokensUsed, 0);
  assert.equal(stats.programsMarkedApplied, 0);
  assert.equal(stats.topFlaggedContent.length, 0);
  // 7 daily buckets should always exist
  assert.equal(stats.last7Days.length, 7);
  for (const bucket of stats.last7Days) {
    assert.equal(bucket.reportCount, 0);
    assert.equal(bucket.avgEngagement, 0);
  }
});

// ---------------------------------------------------------------
// 2. Single report → counts correctly
// ---------------------------------------------------------------

test('getStats counts a single report correctly', async () => {
  const { service, prisma } = makeService();
  seedReport(prisma, {
    broadcastSuitability: 'PRIME_TIME',
    aiModelVersion: 'heuristic-fallback-v1',
    sentimentAnalysis: { audienceEngagement: 80 },
    complianceAssessment: {
      isAgeRestricted: false,
      ageRating: 'T16',
      flaggedContent: [],
      recommendedBroadcastWindow: 'EVENING',
    },
    processingTimeMs: 200,
    tokenUsed: 50,
  });

  const stats = await service.getStats('week');
  assert.equal(stats.totalReports, 1);
  assert.equal(stats.broadcastSuitability.PRIME_TIME.count, 1);
  assert.equal(stats.ageRating.T16.count, 1);
  assert.equal(stats.aiModelVersion.counts['heuristic-fallback-v1'], 1);
  assert.equal(stats.avgEngagement, 80);
  assert.equal(stats.avgProcessingTimeMs, 200);
  assert.equal(stats.totalTokensUsed, 50);
});

// ---------------------------------------------------------------
// 3. Group by broadcastSuitability correct
// ---------------------------------------------------------------

test('getStats groups by broadcastSuitability', async () => {
  const { service, prisma } = makeService();
  seedReport(prisma, { broadcastSuitability: 'PRIME_TIME' });
  seedReport(prisma, { broadcastSuitability: 'PRIME_TIME' });
  seedReport(prisma, { broadcastSuitability: 'STANDARD' });
  seedReport(prisma, { broadcastSuitability: 'STANDARD' });
  seedReport(prisma, { broadcastSuitability: 'STANDARD' });
  seedReport(prisma, { broadcastSuitability: 'RESTRICTED' });

  const stats = await service.getStats('week');
  assert.equal(stats.totalReports, 6);
  assert.equal(stats.broadcastSuitability.PRIME_TIME.count, 2);
  assert.equal(stats.broadcastSuitability.STANDARD.count, 3);
  assert.equal(stats.broadcastSuitability.RESTRICTED.count, 1);

  // Percentages should sum to ~100% (or 0 if total === 0)
  const totalPct =
    stats.broadcastSuitability.PRIME_TIME.percentage +
    stats.broadcastSuitability.STANDARD.percentage +
    stats.broadcastSuitability.RESTRICTED.percentage;
  assert.ok(Math.round(totalPct) === 100, `sum = ${totalPct}`);
});

// ---------------------------------------------------------------
// 4. Average engagement correct
// ---------------------------------------------------------------

test('getStats computes the average audience engagement', async () => {
  const { service, prisma } = makeService();
  seedReport(prisma, {
    sentimentAnalysis: { audienceEngagement: 60 },
  });
  seedReport(prisma, {
    sentimentAnalysis: { audienceEngagement: 80 },
  });
  seedReport(prisma, {
    sentimentAnalysis: { audienceEngagement: 100 },
  });

  const stats = await service.getStats('week');
  // (60 + 80 + 100) / 3 = 80
  assert.equal(stats.avgEngagement, 80);
});

// ---------------------------------------------------------------
// 5. Cache hit rate = 0 placeholder
// ---------------------------------------------------------------

test('getStats returns cacheHitRate of 0 (placeholder until `cached` column lands)', async () => {
  const { service, prisma } = makeService();
  seedReport(prisma, {});
  seedReport(prisma, {});
  seedReport(prisma, {});

  const stats = await service.getStats('week');
  assert.equal(stats.aiModelVersion.cacheHitRate, 0);
});

// ---------------------------------------------------------------
// 6. Period filter `day` only counts reports in the last 24h
// ---------------------------------------------------------------

test('getStats with period=day only counts reports from the last 24h', async () => {
  const { service, prisma } = makeService();
  const now = Date.now();
  seedReport(prisma, {
    createdAt: new Date(now - 30 * 60 * 1000), // 30 min ago
  });
  seedReport(prisma, {
    createdAt: new Date(now - 5 * 60 * 60 * 1000), // 5 hours ago
  });
  seedReport(prisma, {
    createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000), // 2 days ago — EXCLUDED
  });
  seedReport(prisma, {
    createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000), // 6 days ago — INCLUDED in week
  });

  const dayStats = await service.getStats('day');
  assert.equal(dayStats.totalReports, 2);
  assert.equal(dayStats.period, 'day');

  const weekStats = await service.getStats('week');
  assert.equal(weekStats.totalReports, 4);
});

// ---------------------------------------------------------------
// Bonus: top flagged content aggregation
// ---------------------------------------------------------------

test('getStats aggregates top flagged content patterns', async () => {
  const { service, prisma } = makeService();
  seedReport(prisma, {
    complianceAssessment: {
      isAgeRestricted: true,
      ageRating: 'T16',
      flaggedContent: ['violence', 'language'],
      recommendedBroadcastWindow: 'LATE_NIGHT',
    },
  });
  seedReport(prisma, {
    complianceAssessment: {
      isAgeRestricted: true,
      ageRating: 'T16',
      flaggedContent: ['violence'],
      recommendedBroadcastWindow: 'LATE_NIGHT',
    },
  });
  seedReport(prisma, {
    complianceAssessment: {
      isAgeRestricted: false,
      ageRating: 'PG',
      flaggedContent: [],
      recommendedBroadcastWindow: 'EVENING',
    },
  });

  const stats = await service.getStats('week');
  // violence should be top pattern with count 2
  assert.equal(stats.topFlaggedContent[0].pattern, 'violence');
  assert.equal(stats.topFlaggedContent[0].count, 2);
  // language count 1
  const lang = stats.topFlaggedContent.find((f) => f.pattern === 'language');
  assert.equal(lang?.count, 1);
});

// ---------------------------------------------------------------
// Bonus: AI model version aggregation
// ---------------------------------------------------------------

test('getStats groups AI model versions', async () => {
  const { service, prisma } = makeService();
  seedReport(prisma, { aiModelVersion: 'gpt-4o-omnicast-v3' });
  seedReport(prisma, { aiModelVersion: 'gpt-4o-omnicast-v3' });
  seedReport(prisma, { aiModelVersion: 'heuristic-fallback-v1' });

  const stats = await service.getStats('week');
  assert.equal(stats.aiModelVersion.counts['gpt-4o-omnicast-v3'], 2);
  assert.equal(stats.aiModelVersion.counts['heuristic-fallback-v1'], 1);
});

// ---------------------------------------------------------------
// Bonus: programsMarkedApplied
// ---------------------------------------------------------------

test('getStats counts programsMarkedApplied from liveEvent.lastAppliedAt', async () => {
  const { service, prisma } = makeService();
  const now = new Date();
  prisma.liveEvents.push(
    { id: 'p-1', lastAppliedAt: now },
    { id: 'p-2', lastAppliedAt: now },
    { id: 'p-3', lastAppliedAt: undefined },
  );
  const stats = await service.getStats('week');
  assert.equal(stats.programsMarkedApplied, 2);
});

// ---------------------------------------------------------------
// Bonus: last7Days always returns 7 entries
// ---------------------------------------------------------------

test('getStats last7Days is always exactly 7 entries', async () => {
  const { service } = makeService();
  const stats = await service.getStats('month');
  assert.equal(stats.last7Days.length, 7);
  // Each entry should have a YYYY-MM-DD date string
  for (const d of stats.last7Days) {
    assert.match(d.date, /^\d{4}-\d{2}-\d{2}$/);
  }
});
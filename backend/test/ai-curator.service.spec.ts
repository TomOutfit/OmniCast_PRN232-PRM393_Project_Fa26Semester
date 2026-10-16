/**
 * OmniCast - AI Curator service unit tests
 *
 * Exercises the curator pipeline end-to-end with a fake PrismaService
 * and a stubbed OpenAI client. The point of these tests is to lock in
 * the business rules:
 *
 *   - curateContent() requires the program to exist (NotFoundException
 *     otherwise).
 *   - curateContent() returns the most recent report (with cached: true)
 *     unless `forceRefresh` is true.
 *   - curateContent() persists a brand new row + writes an audit entry
 *     when no cached one exists.
 *   - analyzePreview() never touches the DB but does write an audit log.
 *   - analyzePreview() enforces the minimum title length defensively.
 *   - applyCuration() rejects payloads where no field is set
 *     (BadRequestException) and only writes the fields the curator
 *     explicitly opted into.
 *   - getCurationHistory() returns up to 10 reports, newest first.
 *
 * We deliberately avoid hitting the real OpenAI service — the
 * constructor checks `OPENAI_API_KEY`, and our FakeConfig returns no
 * key, which forces the heuristic fallback path. The structural
 * contracts (returned fields, DB writes, audit logs) are still
 * verified.
 *
 * Run via: `npm run test`
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { AiCuratorService } from '../src/ai-curator/ai-curator.service';

// ---------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------

interface AiCuratorRow {
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

class FakePrisma {
  public reports: AiCuratorRow[] = [];
  public liveEvents = new Map<string, any>();
  public lastCreateArgs: any = null;

  liveEvent = {
    findUnique: async (args: any) => this.liveEvents.get(args.where.id) ?? null,
    update: async (args: any) => {
      const existing = this.liveEvents.get(args.where.id);
      if (!existing) throw new Error('not found');
      Object.assign(existing, args.data);
      existing.updatedAt = new Date();
      return existing;
    },
  };

  aiCuratorReport = {
    findFirst: async (args: any) => {
      const matching = this.reports
        .filter((r) => r.programId === args.where.programId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return matching[0] ?? null;
    },
    findMany: async (args: any) => {
      const filtered = this.reports.filter(
        (r) => r.programId === args.where.programId,
      );
      return filtered
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, args.take ?? filtered.length);
    },
    create: async (args: any) => {
      this.lastCreateArgs = args;
      const row: AiCuratorRow = {
        id: `report-${this.reports.length + 1}`,
        ...args.data,
        createdAt: new Date(),
      };
      this.reports.push(row);
      return row;
    },
  };
}

class FakeAuditLogger {
  public calls: any[] = [];
  async log(data: any) {
    this.calls.push(data);
    return data;
  }
}

class FakeConfig {
  private readonly values = new Map<string, any>();
  get<T = string>(key: string): T | undefined {
    return this.values.get(key) as T | undefined;
  }
}

function makeService(prisma?: FakePrisma, audit?: FakeAuditLogger) {
  const _prisma = prisma ?? new FakePrisma();
  const _audit = audit ?? new FakeAuditLogger();
  const _config = new FakeConfig();
  const service = new AiCuratorService(
    _prisma as any,
    _config as any,
    _audit as any,
  );
  return { service, prisma: _prisma, audit: _audit };
}

function seedProgram(prisma: FakePrisma, overrides: Partial<any> = {}) {
  const program = {
    id: overrides.id ?? 'program-1',
    title: overrides.title ?? 'Champions League Final',
    description: overrides.description ?? 'Trận chung kết giải vô địch châu Âu',
    scheduledAt: overrides.scheduledAt ?? new Date('2026-10-01T20:00:00Z'),
    language: overrides.language ?? 'vi',
    tags: overrides.tags ?? ['thể thao', 'bóng đá'],
    status: overrides.status ?? 'SCHEDULED',
    channel: overrides.channel ?? {
      id: 'channel-1',
      name: 'VTV3 HD',
      category: 'SPORTS',
    },
  };
  prisma.liveEvents.set(program.id, program);
  return program;
}

// ---------------------------------------------------------------
// curateContent()
// ---------------------------------------------------------------

test('curateContent throws NotFoundException when the program does not exist', async () => {
  const { service } = makeService();
  await assert.rejects(
    () => service.curateContent({ programId: 'missing-id' }, 'user-1'),
    NotFoundException,
  );
});

test('curateContent returns the latest cached report when one is available', async () => {
  const { service, prisma } = makeService();
  seedProgram(prisma);
  // Pretend an earlier report exists
  prisma.reports.push({
    id: 'r-old',
    programId: 'program-1',
    broadcastSuitability: 'PRIME_TIME',
    suggestedTimeSlot: '21:00 - 23:00',
    targetAudienceVibe: 'Khán giả đại chúng',
    riskWarnings: 'Phù hợp',
    sentimentAnalysis: { overallSentiment: 'positive', hypeLevel: 'high', audienceEngagement: 90 },
    complianceAssessment: { isAgeRestricted: false, ageRating: 'PG', flaggedContent: [], recommendedBroadcastWindow: 'EVENING' },
    aiModelVersion: 'heuristic-fallback-v1',
    tokenUsed: 0,
    processingTimeMs: 12,
    createdBy: 'user-0',
    createdAt: new Date('2026-09-30T12:00:00Z'),
  });

  const out = await service.curateContent({ programId: 'program-1' }, 'user-1');
  assert.equal(out.cached, true);
  assert.equal(out.id, 'r-old');
  // No new report persisted
  assert.equal(prisma.reports.length, 1);
});

test('curateContent ignores cache when forceRefresh is true', async () => {
  const { service, prisma } = makeService();
  seedProgram(prisma);
  prisma.reports.push({
    id: 'r-old',
    programId: 'program-1',
    broadcastSuitability: 'STANDARD',
    suggestedTimeSlot: '20:00 - 22:00',
    targetAudienceVibe: 'Khán giả phổ thông',
    riskWarnings: 'Phù hợp',
    sentimentAnalysis: { overallSentiment: 'neutral', hypeLevel: 'medium', audienceEngagement: 55 },
    complianceAssessment: { isAgeRestricted: false, ageRating: 'PG', flaggedContent: [], recommendedBroadcastWindow: 'EVENING' },
    aiModelVersion: 'heuristic-fallback-v1',
    tokenUsed: 0,
    processingTimeMs: 8,
    createdBy: 'user-0',
    createdAt: new Date('2026-09-30T12:00:00Z'),
  });

  const out = await service.curateContent(
    { programId: 'program-1', forceRefresh: true },
    'user-1',
  );
  assert.equal(out.cached, false);
  assert.notEqual(out.id, 'r-old');
  // A new row should be persisted (so total == 2)
  assert.equal(prisma.reports.length, 2);
});

test('curateContent persists a fresh report + writes audit log when none cached', async () => {
  const { service, prisma, audit } = makeService();
  seedProgram(prisma, {
    title: 'Bản tin thời sự 19h',
    description: 'Cập nhật tin tức trong ngày',
    tags: ['tin tức', 'thời sự'],
    channel: { id: 'channel-2', name: 'VTV1', category: 'NEWS' },
  });

  const out = await service.curateContent({ programId: 'program-1' }, 'user-1');
  assert.equal(out.cached, false);
  assert.equal(out.programId, 'program-1');
  assert.ok(['PRIME_TIME', 'STANDARD', 'RESTRICTED'].includes(out.broadcastSuitability));
  // Audit log written
  assert.equal(audit.calls.length, 1);
  assert.equal(audit.calls[0].action, 'AI_CURATION_COMPLETE');
  assert.equal(audit.calls[0].userId, 'user-1');
});

// ---------------------------------------------------------------
// analyzePreview()
// ---------------------------------------------------------------

test('analyzePreview does not persist a report', async () => {
  const { service, prisma, audit } = makeService();
  const report = await service.analyzePreview(
    {
      title: 'Trực tiếp bóng đá V-League 2026',
      description: 'Vòng đấu bảng A giải V-League 2026',
      channelName: 'VTV6 HD',
      category: 'SPORTS',
      tags: ['thể thao'],
      scheduledAt: '2026-10-15T19:00:00Z',
      language: 'vi',
    },
    'user-1',
  );

  assert.equal(report.preview, true);
  assert.equal(report.cached, false);
  // No DB write
  assert.equal(prisma.reports.length, 0);
  // Audit log written (preview type)
  assert.equal(audit.calls.length, 1);
  assert.equal(audit.calls[0].action, 'AI_CURATION_PREVIEW');
  assert.equal(audit.calls[0].userId, 'user-1');
});

test('analyzePreview rejects titles that are too short', async () => {
  const { service } = makeService();
  await assert.rejects(
    () =>
      service.analyzePreview(
        {
          title: 'ab', // < 3 chars
        },
        'user-1',
      ),
    BadRequestException,
  );
});

test('analyzePreview returns a fallback compliance verdict for age-restricted content', async () => {
  const { service } = makeService();
  const report = await service.analyzePreview(
    {
      title: 'Phim chiếu tranh tài liệu về chiến tranh và bạo lực',
      description: 'Tài liệu về các cuộc chiến tranh thế giới',
      channelName: 'VTV3',
      category: 'DOCUMENTARY',
    },
    'user-1',
  );

  // Heuristic must flag violence and mark T16+
  assert.equal(report.complianceAssessment.isAgeRestricted, true);
  assert.ok(
    report.complianceAssessment.flaggedContent.includes('violence'),
    `expected violence flag, got ${JSON.stringify(report.complianceAssessment.flaggedContent)}`,
  );
  assert.ok(['T13', 'T16', 'T18'].includes(report.complianceAssessment.ageRating));
});

// ---------------------------------------------------------------
// applyCuration()
// ---------------------------------------------------------------

test('applyCuration throws NotFoundException when the program does not exist', async () => {
  const { service } = makeService();
  await assert.rejects(
    () =>
      service.applyCuration('missing-id', { scheduledAt: '2026-10-02T20:00:00Z' }, 'user-1'),
    NotFoundException,
  );
});

test('applyCuration rejects empty payloads with BadRequestException', async () => {
  const { service, prisma } = makeService();
  seedProgram(prisma);
  await assert.rejects(
    () => service.applyCuration('program-1', {}, 'user-1'),
    (err: unknown) => {
      assert.ok(err instanceof BadRequestException);
      return true;
    },
  );
});

test('applyCuration only writes the fields the curator passed in', async () => {
  const { service, prisma, audit } = makeService();
  seedProgram(prisma, {
    description: 'Mô tả gốc',
  });
  const originalScheduledAt = prisma.liveEvents.get('program-1').scheduledAt;
  const originalStatus = prisma.liveEvents.get('program-1').status;

  const out = await service.applyCuration(
    'program-1',
    {
      scheduledAt: '2026-10-01T21:00:00Z',
    },
    'user-1',
  );

  const after = prisma.liveEvents.get('program-1');
  // scheduledAt must have been updated
  assert.notDeepEqual(after.scheduledAt, originalScheduledAt);
  // status + description were not touched
  assert.equal(after.status, originalStatus);
  assert.equal(after.description, 'Mô tả gốc');
  // appliedFields reports the correct subset
  assert.deepEqual(out.appliedFields, ['scheduledAt']);
  // Audit log written with action AI_CURATION_APPLIED
  assert.equal(audit.calls[0].action, 'AI_CURATION_APPLIED');
  assert.deepEqual(audit.calls[0].oldValues.scheduledAt, originalScheduledAt);
});

// ---------------------------------------------------------------
// getCurationHistory()
// ---------------------------------------------------------------

test('getCurationHistory returns up to 10 reports, newest first', async () => {
  const { service, prisma } = makeService();
  seedProgram(prisma);
  // Seed 12 reports
  for (let i = 0; i < 12; i++) {
    prisma.reports.push({
      id: `r-${i}`,
      programId: 'program-1',
      broadcastSuitability: 'STANDARD',
      suggestedTimeSlot: '20:00 - 22:00',
      targetAudienceVibe: '',
      riskWarnings: '',
      sentimentAnalysis: {},
      complianceAssessment: {},
      aiModelVersion: 'v1',
      tokenUsed: 0,
      processingTimeMs: 0,
      createdBy: 'user-1',
      createdAt: new Date(Date.now() - i * 60_000),
    });
  }

  const out = await service.getCurationHistory('program-1');
  assert.equal(out.length, 10, 'history is capped at 10');
  // Newest first
  assert.equal(out[0].id, 'r-0');
  assert.equal(out[9].id, 'r-9');
});

// ---------------------------------------------------------------
// Pipeline output shape (heuristic fallback path)
// ---------------------------------------------------------------

test('curateContent returns all expected fields from the heuristic pipeline', async () => {
  const { service, prisma } = makeService();
  seedProgram(prisma, {
    title: 'Chung kết World Cup 2026',
    description: 'Trận chung kết giải bóng đá lớn nhất hành tinh, trực tiếp từ sân vận động',
    tags: ['thể thao', 'world cup'],
    channel: { id: 'channel-x', name: 'VTV3 HD', category: 'SPORTS' },
  });

  const out: any = await service.curateContent({ programId: 'program-1' }, 'user-1');

  // All top-level fields present
  for (const k of [
    'broadcastSuitability',
    'suggestedTimeSlot',
    'targetAudienceVibe',
    'riskWarnings',
    'sentimentAnalysis',
    'complianceAssessment',
    'aiModelVersion',
    'processingTimeMs',
  ]) {
    assert.ok(k in out, `missing field: ${k}`);
  }
  // Sentiment shape
  for (const k of ['overallSentiment', 'hypeLevel', 'audienceEngagement']) {
    assert.ok(k in out.sentimentAnalysis, `missing sentimentAnalysis.${k}`);
  }
  // Compliance shape
  for (const k of [
    'isAgeRestricted',
    'ageRating',
    'flaggedContent',
    'recommendedBroadcastWindow',
  ]) {
    assert.ok(k in out.complianceAssessment, `missing complianceAssessment.${k}`);
  }
  // engagement clamped to 0-100
  assert.ok(
    out.sentimentAnalysis.audienceEngagement >= 0 &&
      out.sentimentAnalysis.audienceEngagement <= 100,
  );
  // model version reflects fallback
  assert.equal(out.modelVersion ?? out.aiModelVersion, 'heuristic-fallback-v1');
});

// ---------------------------------------------------------------
// applyCuration() — markApplied flag
// ---------------------------------------------------------------

test('applyCuration with markApplied=true sets lastAppliedAt on program', async () => {
  const { service, prisma, audit } = makeService();
  seedProgram(prisma);
  const before = new Date();

  await service.applyCuration(
    'program-1',
    { scheduledAt: '2026-10-01T21:00:00Z', markApplied: true },
    'user-1',
  );

  const after = prisma.liveEvents.get('program-1');
  assert.ok(after.lastAppliedAt instanceof Date);
  assert.ok(after.lastAppliedAt.getTime() >= before.getTime());
  assert.equal(audit.calls[0].newValues.markApplied, true);
});

test('applyCuration with markApplied=false does not set lastAppliedAt', async () => {
  const { service, prisma } = makeService();
  seedProgram(prisma);

  await service.applyCuration(
    'program-1',
    { scheduledAt: '2026-10-01T21:00:00Z', markApplied: false },
    'user-1',
  );

  const after = prisma.liveEvents.get('program-1');
  assert.equal(after.lastAppliedAt, undefined);
});

// ---------------------------------------------------------------
// Pipeline output shape — agentTimings
// ---------------------------------------------------------------

test('runPipelineForInput returns agentTimings with all three keys', async () => {
  const { service } = makeService();
  const report: any = await service.analyzePreview(
    { title: 'Bản tin thời sự buổi tối hôm nay' },
    'user-1',
  );
  assert.ok(report.agentTimings);
  assert.ok(typeof report.agentTimings.sentimentMs === 'number');
  assert.ok(typeof report.agentTimings.complianceMs === 'number');
  assert.ok(typeof report.agentTimings.editorialMs === 'number');
  assert.ok(report.agentTimings.sentimentMs >= 0);
  assert.ok(report.agentTimings.complianceMs >= 0);
  assert.ok(report.agentTimings.editorialMs >= 0);
});

// ---------------------------------------------------------------
// Confidence score (Group A deliverable)
// ---------------------------------------------------------------

test('curateContent returns confidence in range 0-100', async () => {
  const { service, prisma } = makeService();
  seedProgram(prisma, {
    title: 'Chung kết World Cup 2026',
    description: 'Trận chung kết giải bóng đá lớn nhất hành tinh',
    tags: ['thể thao', 'champion'],
    channel: { id: 'channel-x', name: 'VTV3 HD', category: 'SPORTS' },
  });

  const out: any = await service.curateContent(
    { programId: 'program-1' },
    'user-1',
  );

  assert.ok(
    typeof out.confidence === 'number',
    'confidence must be a number',
  );
  assert.ok(
    out.confidence >= 0 && out.confidence <= 100,
    `confidence out of range: ${out.confidence}`,
  );
  // Heuristic path uses Math.round, so the value must be an integer.
  assert.equal(Number.isInteger(out.confidence), true);
});

test('analyzePreview returns confidence in range 0-100', async () => {
  const { service } = makeService();
  const report: any = await service.analyzePreview(
    { title: 'Phim tài liệu về chiến tranh và bạo lực' },
    'user-1',
  );

  assert.ok(typeof report.confidence === 'number');
  assert.ok(report.confidence >= 0 && report.confidence <= 100);
  assert.equal(Number.isInteger(report.confidence), true);
});

test('confidence for clean positive sports content is in the upper half', async () => {
  // The heuristic scoring starts at 50 and bumps positive +15, high
  // hype +10, no flags +10 → at least 80.
  const { service } = makeService();
  const report: any = await service.analyzePreview(
    {
      title: 'Chung kết World Cup 2026',
      description: 'Trận chung kết hay nhất thế giới, đặc sắc và tuyệt vời',
      channelName: 'VTV3 HD',
      category: 'SPORTS',
      tags: ['thể thao', 'champion'],
    },
    'user-1',
  );
  assert.ok(
    report.confidence >= 70,
    `expected high confidence on a clean sports hit, got ${report.confidence}`,
  );
});

test('confidence for age-restricted content is in the lower half', async () => {
  // Heuristic: start at 50, +0 (sentiment likely negative/neutral),
  // -15 for age restricted, -10 per flag (1) → 25, clamped to 30.
  const { service } = makeService();
  const report: any = await service.analyzePreview(
    {
      title: 'Phim tài liệu về chiến tranh bạo lực',
      description: 'Tài liệu về các cuộc chiến tranh thế giới',
      channelName: 'VTV3',
      category: 'DOCUMENTARY',
    },
    'user-1',
  );
  assert.ok(
    report.confidence <= 50,
    `expected low confidence on age-restricted doc, got ${report.confidence}`,
  );
});
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
    update: async (args: any) => {
      const row = this.reports.find((r) => r.id === args.where.id);
      if (row) {
        Object.assign(row, args.data);
      }
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
  // Verifies standard report fields: content, format, and diverse scores
  assert.ok(report.contentAssessment?.summary);
  assert.ok(Array.isArray(report.contentAssessment?.highlights));
  assert.ok(report.formatAssessment?.productionFormat);
  assert.ok(typeof report.scoringBreakdown?.overallScore === 'number');
  assert.ok(['S', 'A', 'B', 'C', 'D'].includes(report.scoringBreakdown?.grade ?? ''));
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
// Pipeline output shape — pipelineMs / openaiCallMs (post-2026-10-19)
//
// Pre-2026-10-19 this section asserted on `agentTimings` with three
// keys (sentimentMs / complianceMs / editorialMs) because the
// pipeline ran three OpenAI calls. We now run ONE consolidated call
// and the per-agent timing is no longer meaningful. The new fields:
//
//   - pipelineMs: total wall-clock time for the pipeline
//   - openaiCallMs: time spent inside the single OpenAI call
//                    (undefined in the heuristic path)
//   - promptVersion: stamped from the prompt file (curator-prompt-v4.0.0)
//   - aiModelVersion: same string as before
// ---------------------------------------------------------------

test('runPipelineForInput returns pipelineMs, openaiCallMs, and promptVersion (heuristic path)', async () => {
  const { service } = makeService();
  const report: any = await service.analyzePreview(
    { title: 'Bản tin thời sự buổi tối hôm nay' },
    'user-1',
  );
  // pipelineMs is always present, non-negative
  assert.ok(typeof report.pipelineMs === 'number');
  assert.ok(report.pipelineMs >= 0);
  // Heuristic path: openaiCallMs is undefined
  assert.equal(report.openaiCallMs, undefined);
  // promptVersion is stamped
  assert.equal(typeof report.promptVersion, 'string');
  assert.match(report.promptVersion, /^curator-prompt-v\d+\.\d+\.\d+$/);
  // aiModelVersion is the heuristic fallback string
  assert.equal(report.aiModelVersion, 'heuristic-fallback-v1');
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
// ---------------------------------------------------------------
// Grounding (prompt v5 — 2026-10-31)
//
// The grounding block records WHERE each claim came from, which
// information was MISSING, and how closely the report tracks the
// source text. The score is always recomputed server-side; the
// model-reported number is never trusted.
// ---------------------------------------------------------------

test('grounding block is present on every report (heuristic path)', async () => {
  const { service } = makeService();
  const report: any = await service.analyzePreview(
    {
      title: 'Chung kết World Cup 2026',
      description:
        'Trận chung kết giải bóng đá lớn nhất hành tinh, trực tiếp từ sân vận động với bình luận viên chuyên sâu.',
      channelName: 'VTV3 HD',
      category: 'SPORTS',
      tags: ['the thao'],
    },
    'user-1',
  );

  assert.ok(report.grounding, 'grounding must be present');
  assert.ok(Array.isArray(report.grounding.sourceExcerpts));
  assert.ok(Array.isArray(report.grounding.infoGaps));
  assert.ok(typeof report.grounding.groundingScore === 'number');
  assert.ok(report.grounding.groundingScore >= 0);
  assert.ok(report.grounding.groundingScore <= 100);
});

test('grounding sourceExcerpts are verbatim excerpts of the description', async () => {
  const { service } = makeService();
  const description =
    'Cập nhật tin nóng về cứu hộ 8 người bị lũ quét ở Nghệ An và phát biểu của Bộ trưởng Bộ TT&TT.';
  const report: any = await service.analyzePreview(
    {
      title: 'Bản tin thời sự 19h',
      description,
      channelName: 'VTV1',
      category: 'NEWS',
    },
    'user-1',
  );

  const excerpts = report.grounding.sourceExcerpts as string[];
  assert.ok(excerpts.length > 0, 'expected at least one excerpt');
  for (const excerpt of excerpts) {
    assert.ok(
      description.includes(excerpt),
      `excerpt is not a verbatim slice of the description: "${excerpt}"`,
    );
  }
});

test('a thin description produces NO invented bullets', async () => {
  const { service } = makeService();
  const report: any = await service.analyzePreview(
    {
      title: 'Chương trình âm nhạc số 7',
      description: 'Chương trình âm nhạc.',
      channelName: 'VTV6',
      category: 'MUSIC',
    },
    'user-1',
  );

  // The old implementation always returned 3 generic highlights and
  // 2 strengths regardless of the source. The new one must not pad.
  assert.deepEqual(report.contentAssessment.highlights, []);
  assert.deepEqual(report.contentAssessment.strengths, []);
  // The weakness points at the missing description instead.
  assert.ok(report.contentAssessment.weaknesses.length > 0);
  // And the missing info is declared in infoGaps.
  assert.ok(report.grounding.infoGaps.length > 0);
  // A report about a one-line description cannot be well grounded.
  assert.ok(
    report.grounding.groundingScore <= 50,
    `expected a low grounding score for a thin description, got ${report.grounding.groundingScore}`,
  );
});

test('the content assessment is derived from the real description', async () => {
  const { service } = makeService();
  const report: any = await service.analyzePreview(
    {
      title: 'Chuyện đời người thợ mộc',
      description:
        'Phim tài liệu ngắn về nghề mộc truyền thống ở vùng Tây Bắc, qua lời kể của ba thế hệ thợ mộc.',
      channelName: 'VTV4',
      category: 'DOCUMENTARY',
    },
    'user-1',
  );

  const summary: string = report.contentAssessment.summary;
  assert.ok(
    summary.includes('mộc') || summary.includes('tây bắc'),
    `summary should quote the description, got: "${summary}"`,
  );
  // The highlights must mention something from the source, not the
  // old generic sports/news templates.
  const highlights: string[] = report.contentAssessment.highlights;
  assert.ok(highlights.length > 0);
  const joined = highlights.join(' ').toLowerCase();
  assert.ok(
    joined.includes('mộc') || joined.includes('thợ'),
    `highlights should be grounded in the description, got: "${joined}"`,
  );
  assert.ok(
    !joined.includes('tường thuật trực tiếp diễn biến kịch tính'),
    'must not fall back to the old SPORTS template',
  );
});

test('grounding score is LOWER when the model fabricates its citations', async () => {
  const { service } = makeService();
  const description = 'Trận chung kết giải bóng đá lớn nhất hành tinh.';
  const programInput = {
    title: 'Chung kết World Cup 2026',
    description,
    channel: { name: 'VTV3', category: 'SPORTS' },
  };
  const contentAssessment = {
    summary: 'Trận chung kết giải bóng đá lớn nhất hành tinh.',
    highlights: ['Trận chung kết giải bóng đá lớn nhất hành tinh'],
    strengths: [] as string[],
    weaknesses: [] as string[],
  };

  // Reach into the private scoring helper — the model-facing API
  // can't fabricate excerpts without an OpenAI key, but the scoring
  // rule itself must be verifiable.
  const svc = service as any;
  const honest = svc.computeGroundingScore(programInput, {
    contentAssessment,
    sourceExcerpts: ['Trận chung kết giải bóng đá lớn nhất hành tinh'],
  });
  const fabricated = svc.computeGroundingScore(programInput, {
    contentAssessment,
    sourceExcerpts: [
      'Bình luận viên nổi tiếng John Smith trực tiếp từ Madrid',
    ],
  });

  assert.ok(
    fabricated.score < honest.score,
    `a fabricated citation must lower the score (honest=${honest.score}, fabricated=${fabricated.score})`,
  );
  assert.equal(honest.fabricatedExcerpts, 0);
  assert.equal(fabricated.fabricatedExcerpts, 1);
  // A fabricated quote is capped hard.
  assert.ok(fabricated.score <= 45);
});

test('the backend OVERWRITES the model-reported grounding score', async () => {
  const { service } = makeService();
  const svc = service as any;

  const report = svc.reportFromConsolidated(
    {
      title: 'Chương trình âm nhạc',
      description: 'Chương trình âm nhạc.',
      channel: { name: 'VTV6', category: 'MUSIC' },
    },
    {
      sentiment: {
        overallSentiment: 'neutral',
        hypeLevel: 'low',
        audienceEngagement: 40,
      },
      compliance: {
        isAgeRestricted: false,
        ageRating: 'PG',
        flaggedContent: [],
        recommendedBroadcastWindow: 'EVENING',
      },
      editorial: {
        broadcastSuitability: 'STANDARD',
        suggestedTimeSlot: '20:00 - 21:00',
        targetAudienceVibe: 'Khán giả nghe nhạc.',
        riskWarnings: 'Phù hợp mọi đối tượng.',
        contentAssessment: {
          summary: 'Chương trình âm nhạc.',
          highlights: [],
          strengths: [],
          weaknesses: [],
          narrativeFlow: 'Chưa đủ thông tin.',
          targetAudienceDetails: 'Chưa đủ thông tin.',
        },
        formatAssessment: {
          productionFormat: 'Chương trình âm nhạc',
          pacing: 'MODERATE',
          visualAudioRequirements: ['Âm thanh stereo'],
          interactivityLevel: 'MEDIUM',
          technicalRecommendations: 'Cần mô tả thêm.',
        },
        scoringBreakdown: {
          contentQuality: 45,
          productionValue: 55,
          audienceAppeal: 40,
          complianceSafety: 96,
          commercialPotential: 55,
          overallScore: 57,
          grade: 'C',
        },
        // The model claims a perfect grounding score — the backend
        // must not believe it.
        grounding: {
          sourceExcerpts: ['một trích dẫn hoàn toàn bịa đặt'],
          infoGaps: [],
          groundingScore: 100,
        },
      },
    },
  );

  assert.ok(report.grounding);
  assert.notEqual(report.grounding.groundingScore, 100);
  assert.ok(report.grounding.groundingScore <= 45);
});

test('duration is accepted by the preview DTO and forwarded', async () => {
  const { service } = makeService();
  const report: any = await service.analyzePreview(
    {
      title: 'Bản tin thời sự 19h',
      description: 'Cập nhật tin tức trong ngày tại Việt Nam.',
      channelName: 'VTV1',
      category: 'NEWS',
      duration: 1800,
    },
    'user-1',
  );
  // The report itself doesn't expose the duration, but the pipeline
  // must not have thrown and must still produce a valid report.
  assert.ok(report.grounding);
  assert.ok(report.contentAssessment.summary);
});

test('grounding is persisted alongside the report and read back', async () => {
  const { service, prisma } = makeService();
  seedProgram(prisma, {
    title: 'Chuyện đời người thợ mộc',
    description:
      'Phim tài liệu ngắn về nghề mộc truyền thống ở vùng Tây Bắc, qua lời kể của ba thế hệ thợ mộc.',
    channel: { id: 'channel-3', name: 'VTV4', category: 'DOCUMENTARY' },
  });

  const out: any = await service.curateContent(
    { programId: 'program-1' },
    'user-1',
  );
  assert.ok(out.grounding, 'the returned report exposes grounding');
  assert.ok(typeof out.grounding.groundingScore === 'number');

  // Persisted inside the sentimentAnalysis JSON blob.
  const persisted = prisma.lastCreateArgs.data.sentimentAnalysis;
  assert.ok(persisted.grounding, 'grounding is persisted in the JSON blob');
  assert.ok(Array.isArray(persisted.grounding.sourceExcerpts));
  assert.ok(typeof persisted.grounding.groundingScore === 'number');
});

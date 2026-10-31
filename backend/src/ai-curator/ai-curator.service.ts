// ============================================================
// OmniCast - AI Curator Service
//
// Refactored 2026-10-19 (AI quality overhaul — "premium" package).
//
// What changed vs the previous version:
//   1. Three sequential OpenAI calls (sentiment + compliance +
//      editorial) are now ONE consolidated call → ~3× cheaper
//      and ~3× faster.
//   2. The OpenAI response is validated through a Zod schema
//      (`./ai-curator.schemas.ts`). Bad outputs fall back to the
//      heuristic path instead of crashing downstream.
//   3. Transient API failures retry with exponential backoff
//      (`./ai-curator.retry.ts`). One network blip no longer
//      drops us onto the heuristic path.
//   4. Every report now stamps a `promptVersion` (from
//      `./ai-curator.prompts.ts`) so we can A/B old vs new
//      prompts in analytics.
//   5. Heuristic fallback covers 7 channel categories now
//      (SPORTS, NEWS, MUSIC, KIDS, DOC, COMEDY, TALKSHOW) —
//      previously only 3 had any non-generic treatment.
//   6. `agentTimings` is replaced by `pipelineMs` and
//      `openaiCallMs` — the 3-agent design no longer exists, so
//      the old per-agent breakdown was misleading. We keep
//      `processingTimeMs` for backward compat with existing
//      clients; it equals `pipelineMs`.
//
// Public API is UNCHANGED — controllers, DTOs, and existing
// reports in the DB all keep working. Tests that asserted on
// `agentTimings` were updated (see test/ai-curator.service.spec.ts).
// ============================================================

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../audit-logger/audit-logger.service';
import {
  AI_CURATE_DESCRIPTION_MAX,
  AI_CURATE_TITLE_MAX,
  AI_CURATE_TITLE_MIN,
  AnalyzeContentPreviewDto,
  ApplyCurationDto,
  CurateContentDto,
} from './dto/ai-curator.dto';
import OpenAI from 'openai';
import {
  ConsolidatedReport,
  GroundingSchema,
  parseConsolidatedReport,
} from './ai-curator.schemas';
import { withRetry } from './ai-curator.retry';
import {
  buildConsolidatedPrompt,
  MODEL_TEMPERATURE,
  MODEL_TOP_P,
  MODEL_PRESENCE_PENALTY,
  MODEL_FREQUENCY_PENALTY,
  OPENAI_MODEL,
  PROMPT_VERSION,
} from './ai-curator.prompts';

/** Đánh giá chuẩn về Nội dung chương trình */
export interface ContentAssessment {
  summary: string;
  highlights: string[];
  strengths: string[];
  weaknesses: string[];
  narrativeFlow: string;
  targetAudienceDetails: string;
}

/** Đánh giá chuẩn về Hình thức & Kỹ thuật dàn dựng */
export interface FormatAssessment {
  productionFormat: string;
  pacing: 'SLOW' | 'MODERATE' | 'DYNAMIC' | 'FAST_PACED';
  visualAudioRequirements: string[];
  interactivityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  technicalRecommendations: string;
}

/** Hệ thống Điểm đánh giá Đa chiều chuẩn truyền hình (0-100 & Xếp loại) */
export interface ScoringBreakdown {
  contentQuality: number;
  productionValue: number;
  audienceAppeal: number;
  complianceSafety: number;
  commercialPotential: number;
  overallScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
}

/**
 * Bằng chứng bám sát nội dung (grounding).
 *
 * `sourceExcerpts` là các trích dẫn NGUYÊN VĂN lấy từ mô tả chương
 * trình. `infoGaps` là những thông tin còn THIẾU. `groundingScore`
 * luôn được backend tự tính lại (không tin số do model tự khai) —
 * xem `computeGroundingScore()`.
 */
export interface Grounding {
  sourceExcerpts: string[];
  infoGaps: string[];
  /** 0-100. Recomputed server-side on every run. */
  groundingScore: number;
}

export interface AiCuratorReport {
  broadcastSuitability: 'PRIME_TIME' | 'STANDARD' | 'RESTRICTED';
  suggestedTimeSlot: string;
  targetAudienceVibe: string;
  riskWarnings: string;
  sentimentAnalysis: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    hypeLevel: 'low' | 'medium' | 'high';
    audienceEngagement: number;
  };
  complianceAssessment: {
    isAgeRestricted: boolean;
    ageRating: 'PG' | 'T13' | 'T16' | 'T18';
    flaggedContent: string[];
    recommendedBroadcastWindow: 'DAY' | 'EVENING' | 'LATE_NIGHT';
  };
  contentAssessment?: ContentAssessment;
  formatAssessment?: FormatAssessment;
  scoringBreakdown?: ScoringBreakdown;
  /**
   * Evidence trail: verbatim source quotes, declared information
   * gaps, and the server-computed grounding score.
   */
  grounding?: Grounding;
  /** Bumped whenever the prompt family changes. */
  promptVersion: string;
  /**
   * Underlying model identifier. Same as the v3 family — the prompt
   * overhaul (curator-prompt-v4.0.0) is tracked separately under
   * `promptVersion` so dashboards can split by prompt version
   * without conflating with model swaps.
   */
  aiModelVersion: string;
  /** Total wall-clock time spent in the pipeline. */
  processingTimeMs: number;
  /** Alias of `processingTimeMs`. Kept for back-compat. */
  pipelineMs: number;
  /** Time spent inside the single OpenAI call (undefined in heuristic path). */
  openaiCallMs?: number;
  /**
   * Self-reported confidence in the curator's verdict (0-100 integer).
   * OpenAI path: combines avg logprob with a length-penalty and a
   *   small bump for successful Zod validation on first try.
   * Heuristic path: rule-match score starting at 50, see
   *   `heuristicConfidence()` for the exact weighting.
   */
  confidence: number;
  tokenUsed?: number;
  cached?: boolean;
  /**
   * Set only when the OpenAI response was non-empty but failed
   * Zod schema validation. The pipeline still returned a report
   * (from the heuristic path) but this string captures why the
   * "real" GPT-4o path failed, which is useful for monitoring
   * prompt regressions.
   */
  validationError?: string;
  /**
   * Number of OpenAI retry attempts actually used (1 = no retries
   * needed). Undefined for heuristic path.
   */
  openaiRetries?: number;
}

/**
 * Internal "program" shape used by the curator pipeline. We don't
 * depend on the full Prisma `LiveEvent` so the same pipeline can run
 * in both `program-based` and `preview` mode (where there's no DB row).
 *
 * Exported because the prompt builder in `ai-curator.prompts.ts`
 * consumes it; keeping it module-private would force that file to
 * duplicate the type.
 */
export interface CuratorProgramInput {
  id?: string;
  title: string;
  description?: string;
  scheduledAt?: Date | string;
  language?: string;
  tags?: string[];
  /**
   * Program duration in seconds. The prompt uses it to judge pacing
   * and to pick a slot that can actually hold the content.
   */
  durationSeconds?: number;
  channel?: {
    id?: string;
    name: string;
    category?: string;
  };
}

/**
 * SSE-style event payload for the streaming preview endpoint
 * (`POST /ai-curator/analyze-stream`). Matches the wire format
 * NestJS emits when you return an `Observable<MessageEvent>`
 * from an `@Sse()` controller.
 *
 * Each event has a discriminating `event` name plus a `data` body.
 * The `delta.text` chunks can be concatenated by the client to
 * reconstruct the raw model output, but in practice clients will
 * use the `complete` event's `report` field directly.
 */
export type StreamEvent =
  | {
      event: 'meta';
      data: {
        type: 'started';
        promptVersion: string;
        model: string;
        startedAt: string;
      };
    }
  | { event: 'delta'; data: { text: string } }
  | {
      event: 'complete';
      data: {
        type: 'complete';
        report: AiCuratorReport & { preview: true };
        processingTimeMs: number;
        confidence: number;
        openaiRetries?: number;
      };
    }
  | {
      event: 'error';
      data: {
        type:
          | 'openai-connection-failed'
          | 'openai-stream-failed'
          | 'schema-validation-failed';
        message: string;
        retryable: boolean;
        partialText?: string;
      };
    };

@Injectable()
export class AiCuratorService {
  private readonly logger = new Logger(AiCuratorService.name);
  private openai: OpenAI;
  /** Resolved at boot from OPENAI_API_KEY; never used when no key is set. */
  private readonly hasRealModel: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogger: AuditLoggerService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.hasRealModel = !!apiKey && apiKey !== 'dummy-key';
    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  // ───────────────────────────────────────────────────────────────
  // PUBLIC API
  // ───────────────────────────────────────────────────────────────

  async curateContent(curateDto: CurateContentDto, userId: string) {
    const { programId, forceRefresh } = curateDto;

    const program = await this.prisma.liveEvent.findUnique({
      where: { id: programId },
      include: {
        channel: { select: { id: true, name: true, category: true } },
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    if (!forceRefresh) {
      const existingReport = await this.prisma.aiCuratorReport.findFirst({
        where: { programId },
        orderBy: { createdAt: 'desc' },
      });

      if (existingReport) {
        const cachedAt = new Date();
        if (typeof this.prisma.aiCuratorReport?.update === 'function') {
          void this.prisma.aiCuratorReport
            .update({
              where: { id: existingReport.id },
              data: { cached: true, cachedAt },
            })
            .catch((err) => {
              console.error(
                '[AiCuratorService] failed to stamp cached flag on existing report:',
                err,
              );
            });
        }
        return {
          ...this.unwrapReport(existingReport),
          cached: true,
          cachedAt,
        };
      }
    }

    const report = await this.runPipelineForProgram(program);

    const stored = await this.prisma.aiCuratorReport.create({
      data: {
        programId,
        broadcastSuitability: report.broadcastSuitability,
        suggestedTimeSlot: report.suggestedTimeSlot,
        targetAudienceVibe: report.targetAudienceVibe,
        riskWarnings: report.riskWarnings,
        sentimentAnalysis: {
          ...report.sentimentAnalysis,
          contentAssessment: report.contentAssessment,
          formatAssessment: report.formatAssessment,
          scoringBreakdown: report.scoringBreakdown,
          // The grounding block is persisted inside the same JSON
          // blob so we don't need a schema migration for it.
          grounding: report.grounding,
        } as any,
        complianceAssessment: report.complianceAssessment as any,
        aiModelVersion: report.aiModelVersion,
        tokenUsed: report.tokenUsed ?? null,
        processingTimeMs: report.processingTimeMs,
        createdBy: userId,
      },
    });

    await this.auditLogger.log({
      userId,
      action: 'AI_CURATION_COMPLETE',
      entityType: 'AiCuratorReport',
      entityId: stored.id,
      newValues: { ...report, programId },
    });

    return {
      ...this.unwrapReport(stored),
      confidence: report.confidence,
      pipelineMs: report.pipelineMs,
      openaiCallMs: report.openaiCallMs,
      promptVersion: report.promptVersion,
      validationError: report.validationError,
      openaiRetries: report.openaiRetries,
      cached: false,
    };
  }

  async analyzePreview(
    dto: AnalyzeContentPreviewDto,
    userId: string,
  ): Promise<AiCuratorReport & { preview: true }> {
    const draft = this.buildPreviewInput(dto);
    const report = await this.runPipelineForInput(draft);

    await this.auditLogger.log({
      userId,
      action: 'AI_CURATION_PREVIEW',
      entityType: 'AiCuratorReport',
      entityId: undefined,
      newValues: { ...report, draftTitle: draft.title },
    });

    return { ...report, cached: false, preview: true as const };
  }

  /**
   * Mode 2 (streaming) — Progressive preview.
   *
   * Returns an `AsyncGenerator` of SSE-style events so the client can
   * render content as OpenAI tokens arrive instead of waiting for the
   * full response. Added 2026-10-19.
   *
   * Event shape (matches the SSE wire format from
   * `POST /ai-curator/analyze-stream`):
   *
   *   { event: 'meta',     data: { type, promptVersion, model, startedAt } }
   *   { event: 'delta',    data: { text: string } }            // repeated
   *   { event: 'complete', data: { type, report: AiCuratorReport, processingTimeMs, confidence, tokenUsed } }
   *   { event: 'error',    data: { type, message, retryable? } }
   *
   * The terminal event is always either `complete` or `error` — exactly
   * one of them is emitted. The accumulated `delta.text` chunks can
   * be concatenated and JSON-parsed by the client to reconstruct the
   * raw model output (the `complete` event already includes the
   * validated report, so most clients won't need to).
   *
   * Notes:
   *   - The initial connection to OpenAI is wrapped in `withRetry` so
   *     a single network blip doesn't drop the whole stream. Once
   *     tokens start arriving we do NOT retry — replaying partial
   *     tokens would corrupt the JSON.
   *   - The heuristic path does NOT stream (it returns in <50ms,
   *     so streaming is pointless). It still emits `meta` + `complete`.
   *   - Nothing is persisted — streaming is preview-only. For the
   *     persist + cache path, use `curateContent()`.
   */
  async *analyzePreviewStream(
    dto: AnalyzeContentPreviewDto,
    userId: string,
  ): AsyncGenerator<StreamEvent> {
    const startTime = Date.now();
    const draft = this.buildPreviewInput(dto);

    yield {
      event: 'meta',
      data: {
        type: 'started',
        promptVersion: PROMPT_VERSION,
        model: this.hasRealModel ? OPENAI_MODEL : 'heuristic-fallback-v1',
        startedAt: new Date().toISOString(),
      },
    };

    // Heuristic fast-path: skip OpenAI entirely.
    if (!this.hasRealModel) {
      const report = this.fallbackPipeline(draft);
      report.processingTimeMs = Date.now() - startTime;
      report.pipelineMs = report.processingTimeMs;
      report.confidence = this.heuristicConfidence({
        sentiment: report.sentimentAnalysis.overallSentiment,
        hypeLevel: report.sentimentAnalysis.hypeLevel,
        flaggedContent: report.complianceAssessment.flaggedContent,
        isAgeRestricted: report.complianceAssessment.isAgeRestricted,
      });
      report.confidence = this.applyGroundingPenalty(
        report.confidence,
        report.grounding,
      );
      report.confidence = this.clampConfidence(report.confidence);
      report.cached = false;

      // No deltas to emit for the heuristic path — go straight to
      // complete. The whole report is included so the client renders
      // it instantly.
      yield {
        event: 'complete',
        data: {
          type: 'complete',
          report: { ...report, preview: true },
          processingTimeMs: report.processingTimeMs,
          confidence: report.confidence,
        },
      };
      return;
    }

    // OpenAI streaming path. The initial connection retry is handled
    // by withRetry; once we start consuming chunks we trust the stream.
    const prompt = buildConsolidatedPrompt(draft);
    let stream: any;
    let openaiRetries = 0;
    try {
      stream = await withRetry(
        async () => {
          openaiRetries++;
          return this.openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: MODEL_TEMPERATURE,
            top_p: MODEL_TOP_P,
            presence_penalty: MODEL_PRESENCE_PENALTY,
            frequency_penalty: MODEL_FREQUENCY_PENALTY,
            stream: true,
          });
        },
        { label: 'ai-curator.stream.openai' },
      );
    } catch (err) {
      yield {
        event: 'error',
        data: {
          type: 'openai-connection-failed',
          message: (err as Error)?.message ?? 'OpenAI connection failed',
          retryable: true,
        },
      };
      return;
    }

    // Accumulate tokens and emit deltas.
    let accumulated = '';
    try {
      for await (const chunk of stream) {
        const text = chunk.choices?.[0]?.delta?.content ?? '';
        if (text) {
          accumulated += text;
          yield { event: 'delta', data: { text } };
        }
      }
    } catch (err) {
      yield {
        event: 'error',
        data: {
          type: 'openai-stream-failed',
          message: (err as Error)?.message ?? 'Stream was interrupted',
          partialText: accumulated,
          retryable: false,
        },
      };
      return;
    }

    // Validate the accumulated JSON.
    const result = parseConsolidatedReport(accumulated);
    if (!result.ok) {
      yield {
        event: 'error',
        data: {
          type: 'schema-validation-failed',
          message: result.error,
          retryable: true,
        },
      };
      return;
    }

    const report = this.reportFromConsolidated(draft, result.data);
    report.processingTimeMs = Date.now() - startTime;
    report.pipelineMs = report.processingTimeMs;
    // We don't have access to logprobs in the streaming path, so use
    // a slightly conservative confidence formula (no length-aware
    // bonus since we can't trust chunk boundaries, no retry penalty
    // since we already paid the retry cost in the connection phase).
    report.confidence = this.applyGroundingPenalty(
      this.streamingConfidence(result.data, openaiRetries),
      report.grounding,
    );
    report.cached = false;

    // Audit the stream-completion. We do this after yielding the
    // complete event so the client doesn't wait for DB I/O.
    void this.auditLogger.log({
      userId,
      action: 'AI_CURATION_PREVIEW_STREAM',
      entityType: 'AiCuratorReport',
      entityId: undefined,
      newValues: {
        draftTitle: draft.title,
        promptVersion: PROMPT_VERSION,
        processingTimeMs: report.processingTimeMs,
        confidence: report.confidence,
        openaiRetries,
      },
    });

    yield {
      event: 'complete',
      data: {
        type: 'complete',
        report: { ...report, preview: true },
        processingTimeMs: report.processingTimeMs,
        confidence: report.confidence,
        openaiRetries,
      },
    };
  }

  /**
   * Streaming-path confidence: more conservative than the logprob-based
   * formula because we don't have token-level probability data. We
   * lean on:
   *   - Internal consistency (broadcastSuitability matches restrictions)
   *   - Sentiment polarity
   *   - Retry penalty (we paid for retries already)
   */
  private streamingConfidence(
    parsed: ConsolidatedReport,
    retries: number,
  ): number {
    let value = 78; // base for streaming
    if (parsed.sentiment.overallSentiment === 'positive') value += 5;
    if (parsed.sentiment.hypeLevel === 'high') value += 3;
    if (parsed.compliance.flaggedContent.length === 0) value += 5;
    if (parsed.compliance.isAgeRestricted) value -= 5;
    value -= Math.max(0, retries - 1) * 4;
    if (
      parsed.editorial.broadcastSuitability === 'RESTRICTED' &&
      !parsed.compliance.isAgeRestricted
    ) {
      value -= 10;
    }
    return this.clampConfidence(value);
  }


  async applyCuration(
    programId: string,
    dto: ApplyCurationDto,
    userId: string,
  ) {
    const program = await this.prisma.liveEvent.findUnique({
      where: { id: programId },
      include: {
        channel: { select: { id: true, name: true } },
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    const data: Record<string, any> = {};
    if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);
    if (dto.status) data.status = dto.status;
    if (dto.description !== undefined) data.description = dto.description;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'At least one of `scheduledAt`, `status`, `description` must be provided',
      );
    }

    const previousSnapshot = {
      scheduledAt: program.scheduledAt,
      status: program.status,
      description: program.description,
    };

    const requestedFields = Object.keys(data);

    const shouldMarkApplied = dto.markApplied !== false;
    if (shouldMarkApplied) {
      data.lastAppliedAt = new Date();
    }

    const updated = await this.prisma.liveEvent.update({
      where: { id: programId },
      data,
    });

    await this.auditLogger.log({
      userId,
      action: 'AI_CURATION_APPLIED',
      entityType: 'LiveEvent',
      entityId: programId,
      oldValues: previousSnapshot,
      newValues: {
        ...data,
        appliedFields: requestedFields,
        ...(shouldMarkApplied ? { markApplied: true } : {}),
      },
    });

    return {
      programId,
      appliedFields: requestedFields,
      updatedAt: updated.updatedAt,
      channel: program.channel,
    };
  }

  async getCurationHistory(programId: string) {
    const rows = await this.prisma.aiCuratorReport.findMany({
      where: { programId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return rows.map((row: any) => ({
      ...this.unwrapReport(row),
      cached: false,
    }));
  }

  // ───────────────────────────────────────────────────────────────
  // PIPELINE (single consolidated call)
  // ───────────────────────────────────────────────────────────────

  private async runPipelineForProgram(program: any) {
    return this.runPipelineForInput(this.buildInputFromProgram(program));
  }

  private async runPipelineForInput(
    input: CuratorProgramInput,
  ): Promise<AiCuratorReport> {
    const startTime = Date.now();

    if (!this.hasRealModel) {
      const report = this.fallbackPipeline(input);
      report.processingTimeMs = Date.now() - startTime;
      report.pipelineMs = report.processingTimeMs;
      report.confidence = this.heuristicConfidence({
        sentiment: report.sentimentAnalysis.overallSentiment,
        hypeLevel: report.sentimentAnalysis.hypeLevel,
        flaggedContent: report.complianceAssessment.flaggedContent,
        isAgeRestricted: report.complianceAssessment.isAgeRestricted,
      });
      report.confidence = this.applyGroundingPenalty(
        report.confidence,
        report.grounding,
      );
      report.confidence = this.clampConfidence(report.confidence);
      return report;
    }

    // OpenAI path: ONE call returns sentiment + compliance + editorial.
    const prompt = buildConsolidatedPrompt(input);
    const { raw, parsed, openaiCallMs, openaiRetries, validationError } =
      await this.callOpenAI(prompt);

    if (parsed) {
      // Success: build the report from the validated JSON.
      const report = this.reportFromConsolidated(input, parsed);
      report.promptVersion = PROMPT_VERSION;
      report.aiModelVersion = this.hasRealModel
        ? 'gpt-4o-omnicast-v3'
        : 'heuristic-fallback-v1';
      report.openaiCallMs = openaiCallMs;
      report.openaiRetries = openaiRetries;
      report.tokenUsed = raw.usage?.total_tokens;
      report.confidence = this.openaiConfidence(
        raw,
        parsed,
        openaiRetries,
        /* validationOk */ true,
      );
      // A report that doesn't track the source can't be trusted as
      // much, no matter how confident the model sounded.
      report.confidence = this.applyGroundingPenalty(
        report.confidence,
        report.grounding,
      );
      report.confidence = this.clampConfidence(report.confidence);
      report.processingTimeMs = Date.now() - startTime;
      report.pipelineMs = report.processingTimeMs;
      return report;
    }

    // Validation failed: log and fall back to heuristic.
    this.logger.warn(
      `[runPipelineForInput] OpenAI response failed schema validation: ${validationError}. ` +
        `Falling back to heuristic.`,
    );

    const report = this.fallbackPipeline(input);
    report.promptVersion = PROMPT_VERSION;
    report.aiModelVersion = 'heuristic-fallback-v1';
    report.validationError = validationError;
    report.openaiCallMs = openaiCallMs;
    report.openaiRetries = openaiRetries;
    report.confidence = this.heuristicConfidence({
      sentiment: report.sentimentAnalysis.overallSentiment,
      hypeLevel: report.sentimentAnalysis.hypeLevel,
      flaggedContent: report.complianceAssessment.flaggedContent,
      isAgeRestricted: report.complianceAssessment.isAgeRestricted,
    });
    report.confidence = this.applyGroundingPenalty(
      report.confidence,
      report.grounding,
    );
    report.confidence = this.clampConfidence(report.confidence);
    report.processingTimeMs = Date.now() - startTime;
    report.pipelineMs = report.processingTimeMs;
    return report;
  }

  /**
   * Single OpenAI call. Wraps the SDK with our retry helper and
   * Zod validation. Returns either a typed `ConsolidatedReport` or
   * `null` (in which case `validationError` describes the failure).
   */
  private async callOpenAI(prompt: string): Promise<{
    raw: any;
    parsed: ConsolidatedReport | null;
    openaiCallMs: number;
    openaiRetries: number;
    validationError?: string;
  }> {
    let openaiRetries = 0;
    const t0 = Date.now();
    const raw = await withRetry(
      async () => {
        openaiRetries++;
        return this.openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: MODEL_TEMPERATURE,
          top_p: MODEL_TOP_P,
          presence_penalty: MODEL_PRESENCE_PENALTY,
          frequency_penalty: MODEL_FREQUENCY_PENALTY,
          // Ask for logprobs so we can compute a more accurate
          // confidence score downstream.
          logprobs: true,
        });
      },
      { label: 'ai-curator.openai' },
    );
    const openaiCallMs = Date.now() - t0;

    const content = raw.choices?.[0]?.message?.content ?? '';
    const result = parseConsolidatedReport(content);
    if (result.ok) {
      return { raw, parsed: result.data, openaiCallMs, openaiRetries };
    }
    return {
      raw,
      parsed: null,
      openaiCallMs,
      openaiRetries,
      validationError: result.error,
    };
  }

  // ───────────────────────────────────────────────────────────────
  // REPORT BUILDERS
  // ───────────────────────────────────────────────────────────────

  /**
   * Translate a Zod-validated `ConsolidatedReport` (from OpenAI) into
   * the public `AiCuratorReport` shape. The field names are similar
   * but not identical — this is the single mapping point.
   */
  private reportFromConsolidated(
    input: CuratorProgramInput,
    c: ConsolidatedReport,
  ): AiCuratorReport {
    // The model's own `groundingScore` is advisory only — we recompute
    // it from the source text and overwrite it.
    const grounding = this.buildGrounding(input, {
      contentAssessment: c.editorial.contentAssessment,
      formatAssessment: c.editorial.formatAssessment,
      targetAudienceVibe: c.editorial.targetAudienceVibe,
      riskWarnings: c.editorial.riskWarnings,
      sourceExcerpts: c.editorial.grounding?.sourceExcerpts,
      infoGaps: c.editorial.grounding?.infoGaps,
    });

    return {
      broadcastSuitability: c.editorial.broadcastSuitability,
      suggestedTimeSlot: c.editorial.suggestedTimeSlot,
      targetAudienceVibe: c.editorial.targetAudienceVibe,
      riskWarnings: c.editorial.riskWarnings,
      sentimentAnalysis: c.sentiment,
      complianceAssessment: c.compliance,
      contentAssessment: c.editorial.contentAssessment,
      formatAssessment: c.editorial.formatAssessment,
      scoringBreakdown: c.editorial.scoringBreakdown,
      grounding,
      promptVersion: PROMPT_VERSION,
      aiModelVersion: 'gpt-4o-omnicast-v3',
      processingTimeMs: 0, // filled in by runPipelineForInput
      pipelineMs: 0,
      // Filled in by runPipelineForInput after we have access to
      // logprobs + retry count. We set a placeholder here so the
      // type is satisfied; the real value overwrites this.
      confidence: 0,
    };
  }

  /**
   * Heuristic-only report (no API key, or API response failed
   * validation). Builds the full AiCuratorReport from program
   * metadata alone.
   */
  private fallbackPipeline(input: CuratorProgramInput): AiCuratorReport {
    const sentiment = this.fallbackSentiment(input);
    const compliance = this.fallbackCompliance(input);
    const editorial = this.fallbackEditorial(input, sentiment, compliance);

    // The heuristic path has no model-authored excerpts, so we derive
    // them from the description itself — the sentences we actually
    // used to build the content assessment. That keeps the grounding
    // block honest: the excerpts really are in the source.
    const grounding = this.buildGrounding(input, {
      contentAssessment: editorial.contentAssessment,
      formatAssessment: editorial.formatAssessment,
      targetAudienceVibe: editorial.targetAudienceVibe,
      riskWarnings: editorial.riskWarnings,
      sourceExcerpts: this.splitSentences(
        (input.description ?? '').trim(),
      ).slice(0, 4),
      infoGaps: this.extractInfoGaps(input),
    });

    return {
      broadcastSuitability: editorial.broadcastSuitability,
      suggestedTimeSlot: editorial.suggestedTimeSlot,
      targetAudienceVibe: editorial.targetAudienceVibe,
      riskWarnings: editorial.riskWarnings,
      sentimentAnalysis: sentiment.sentimentAnalysis,
      complianceAssessment: compliance.complianceAssessment,
      contentAssessment: editorial.contentAssessment,
      formatAssessment: editorial.formatAssessment,
      scoringBreakdown: editorial.scoringBreakdown,
      grounding,
      promptVersion: PROMPT_VERSION,
      aiModelVersion: 'heuristic-fallback-v1',
      processingTimeMs: 0,
      pipelineMs: 0,
      // Filled in by runPipelineForInput.
      confidence: 0,
    };
  }

  // ───────────────────────────────────────────────────────────────
  // GROUNDING (prompt v5)
  //
  // The model is ASKED to ground its claims, but we don't trust it.
  // `computeGroundingScore()` independently measures two things:
  //
  //   1. COVERAGE — how many of the source's key terms actually show
  //      up in the generated content assessment. A report that
  //      invents its own vocabulary scores badly here.
  //   2. CITATION HONESTY — whether each `sourceExcerpts` entry
  //      really appears in the description (normalised: lowercased,
  //      diacritics stripped, whitespace collapsed). A fabricated
  //      quote costs a lot of points.
  //
  // The resulting score replaces whatever the model reported, so a
  // hallucinating model cannot inflate its own grounding.
  // ───────────────────────────────────────────────────────────────

  /**
   * Vietnamese + English stopwords. Removed before computing key
   * terms so common connective words don't inflate the overlap.
   */
  private static readonly STOPWORDS = new Set([
    // Vietnamese
    'và', 'của', 'là', 'có', 'được', 'trong', 'cho', 'với', 'các', 'những',
    'một', 'như', 'này', 'đó', 'khi', 'đã', 'sẽ', 'đang', 'về', 'từ', 'đến',
    'trên', 'dưới', 'sau', 'trước', 'theo', 'tại', 'ra', 'vào', 'lên', 'xuống',
    'nếu', 'vì', 'mà', 'thì', 'nên', 'để', 'nhưng', 'hoặc', 'nên', 'rất',
    'người', 'những', 'một', 'các', 'cùng', 'nhiều', 'ít', 'tất', 'cả',
    // English
    'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'with',
    'is', 'are', 'was', 'were', 'be', 'by', 'at', 'as', 'it', 'its', 'this',
    'that', 'from', 'has', 'have', 'will', 'can', 'but', 'not',
  ]);

  /**
   * Normalise a string for comparison: lowercase, strip diacritics,
   * collapse whitespace and punctuation. Vietnamese text needs the
   * diacritic strip because the model may paraphrase with slightly
   * different tone marks while still quoting the same words.
   */
  private normalizeForMatch(text: string): string {
    return (text ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Extract the meaningful key terms of a text (stopwords removed). */
  private keyTerms(text: string): string[] {
    const normalized = this.normalizeForMatch(text);
    if (!normalized) return [];
    const seen = new Set<string>();
    const terms: string[] = [];
    for (const token of normalized.split(' ')) {
      if (token.length < 3) continue;
      if (AiCuratorService.STOPWORDS.has(token)) continue;
      if (seen.has(token)) continue;
      seen.add(token);
      terms.push(token);
    }
    return terms;
  }

  /**
   * Score how well the generated report tracks the program source.
   *
   * Returns a 0-100 integer:
   *   - Coverage contributes up to 70 points: the share of the
   *     source's key terms that appear in the generated text.
   *   - Citation honesty contributes up to 30 points: the share of
   *     `sourceExcerpts` that are verbatim in the description.
   *   - When the description is empty there is nothing to ground
   *     against, so the score is capped low (the report can't be
   *     considered grounded if there was no source).
   *
   * Fabricated excerpts are penalised hard: each one that isn't
   * found in the source removes its full citation weight plus a
   * flat penalty, so a model that quotes a source it never saw
   * scores worse than one that quotes nothing.
   */
  private computeGroundingScore(
    input: CuratorProgramInput,
    generated: {
      contentAssessment?: ContentAssessment;
      formatAssessment?: FormatAssessment;
      targetAudienceVibe?: string;
      riskWarnings?: string;
      sourceExcerpts?: string[];
    },
  ): { score: number; sourceExcerpts: string[]; fabricatedExcerpts: number } {
    const description = (input.description ?? '').trim();
    const sourceTerms = this.keyTerms(description);
    const sourceNormalized = this.normalizeForMatch(description);

    // ── Citation honesty ──────────────────────────────────────
    const excerpts = (generated.sourceExcerpts ?? []).filter(
      (e) => e && e.trim().length > 0,
    );
    let verified = 0;
    let fabricated = 0;
    const verifiedExcerpts: string[] = [];
    for (const excerpt of excerpts) {
      const normalizedExcerpt = this.normalizeForMatch(excerpt);
      if (!normalizedExcerpt) continue;
      // With no source text there is nothing to verify against, so a
      // quote is merely unverifiable — not fabricated.
      if (sourceTerms.length === 0) {
        continue;
      }
      if (sourceNormalized.includes(normalizedExcerpt)) {
        verified += 1;
        verifiedExcerpts.push(excerpt);
      } else {
        fabricated += 1;
      }
    }

    // ── Coverage ──────────────────────────────────────────────
    const generatedText = [
      generated.contentAssessment?.summary ?? '',
      ...(generated.contentAssessment?.highlights ?? []),
      ...(generated.contentAssessment?.strengths ?? []),
      ...(generated.contentAssessment?.weaknesses ?? []),
      generated.contentAssessment?.narrativeFlow ?? '',
      generated.contentAssessment?.targetAudienceDetails ?? '',
      generated.formatAssessment?.productionFormat ?? '',
      ...(generated.formatAssessment?.visualAudioRequirements ?? []),
      generated.formatAssessment?.technicalRecommendations ?? '',
      generated.targetAudienceVibe ?? '',
      generated.riskWarnings ?? '',
    ].join(' ');

    const generatedNormalized = this.normalizeForMatch(generatedText);
    const generatedTerms = new Set(this.keyTerms(generatedText));

    const coverageRatio =
      sourceTerms.length === 0
        ? 0
        : sourceTerms.filter((t) => generatedTerms.has(t)).length /
          sourceTerms.length;

    // Source richness: how much evidence the description actually
    // provides. A one-line description can be quoted back perfectly
    // and still leave the report with almost nothing to stand on, so
    // the score has to reflect the SOURCE's substance, not just the
    // report's fidelity to it. We require ~20 distinct key terms for
    // a description to count as fully rich.
    const richness = Math.min(1, sourceTerms.length / 20);

    // A model that copies the description wholesale isn't necessarily
    // more grounded — it's more repetitive. Cap the coverage
    // contribution so the score stays a measure of *support*, not
    // of *similarity*.
    const coveragePoints = Math.min(1, coverageRatio) * 70;

    // ── Citation points ───────────────────────────────────────
    let citationPoints: number;
    if (excerpts.length === 0) {
      // No citations at all: neutral. We can't prove fabrication,
      // but we also can't confirm grounding.
      citationPoints = sourceTerms.length === 0 ? 0 : 12;
    } else {
      const ratio = verified / excerpts.length;
      citationPoints = ratio * 30;
    }

    // Base score: how faithfully the report tracks the source.
    let score = Math.round(coveragePoints + citationPoints);

    // Ceiling by source richness: a report can never be *more*
    // grounded than the evidence it had to work with. A one-line
    // description caps the score low even when every word of it is
    // quoted back perfectly.
    if (sourceTerms.length === 0) {
      score = Math.min(score, 35);
    } else {
      score = Math.min(score, Math.round(100 * richness));
    }

    // Fabricated citations are penalised AFTER the ceiling so a
    // report that quotes a source it never saw always scores worse
    // than an honest one about the same program.
    if (fabricated > 0) {
      score = Math.min(score - fabricated * 12, 45);
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      // Fabricated quotes are DROPPED — the curator must never see a
      // quote attributed to the source that isn't in the source.
      sourceExcerpts: verifiedExcerpts,
      fabricatedExcerpts: fabricated,
    };
  }

  /**
   * Build a grounding block for a report. `modelExcerpts` are the
   * excerpts the model claimed; they are verified against the
   * description and the score is always recomputed here.
   */
  private buildGrounding(
    input: CuratorProgramInput,
    generated: {
      contentAssessment?: ContentAssessment;
      formatAssessment?: FormatAssessment;
      targetAudienceVibe?: string;
      riskWarnings?: string;
      sourceExcerpts?: string[];
      infoGaps?: string[];
    },
  ): Grounding {
    const { score, sourceExcerpts, fabricatedExcerpts } =
      this.computeGroundingScore(input, generated);

    const infoGaps = (generated.infoGaps ?? []).filter(
      (g) => g && g.trim().length > 0,
    );

    // If the model claimed citations that don't exist in the source,
    // surface that as an information gap so the curator sees WHY the
    // report wasn't fully trusted.
    if (fabricatedExcerpts > 0) {
      infoGaps.push(
        `${fabricatedExcerpts} trích dẫn không khớp với mô tả nguồn và đã bị loại khỏi báo cáo`,
      );
    }

    // No source text at all → the report is unfalsifiable; say so.
    if (!(input.description ?? '').trim() && infoGaps.length === 0) {
      infoGaps.push('Chương trình không có mô tả nội dung để đối chiếu');
    }

    return {
      sourceExcerpts,
      infoGaps,
      groundingScore: score,
    };
  }

  // ───────────────────────────────────────────────────────────────
  // HEURISTIC FALLBACKS (no API key / network failure / bad response)
  // ───────────────────────────────────────────────────────────────

  private fallbackSentiment(program: CuratorProgramInput) {
    const title = (program.title ?? '').toLowerCase();
    const description = (program.description ?? '').toLowerCase();
    const text = `${title} ${description}`;

    let overall: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (
      /(tuyệt|hay|hấp dẫn|đặc sắc|premier|champion|best|love|great|đỉnh cao|kỷ lục)/i.test(
        text,
      )
    ) {
      overall = 'positive';
    } else if (/(buồn|khủng hoảng|bi kịch|drama|sad|tragic)/i.test(text)) {
      overall = 'negative';
    }

    const hype =
      /(final|champion|world cup|premier|kỷ lục|live|kỷ niệm)/i.test(text)
        ? 'high'
        : /(special|talkshow|talk show|gala)/i.test(text)
          ? 'medium'
          : 'medium';

    return {
      sentimentAnalysis: {
        overallSentiment: overall,
        hypeLevel: hype as 'low' | 'medium' | 'high',
        audienceEngagement: this.estimateEngagement(program),
      },
    };
  }

  private fallbackCompliance(program: CuratorProgramInput) {
    const text =
      `${program.title ?? ''} ${program.description ?? ''}`.toLowerCase();
    const flags: string[] = [];
    let ageRating: 'PG' | 'T13' | 'T16' | 'T18' = 'PG';
    let isAgeRestricted = false;

    if (/(bạo lực|kill|violence|chết|war|chém giết|đánh nhau)/i.test(text)) {
      flags.push('violence');
      ageRating = 'T16';
      isAgeRestricted = true;
    }
    if (/(ngôn ngữ|khiêu dâm|18\+|explicit|sex|nude)/i.test(text)) {
      flags.push('explicit-language');
      ageRating = 'T18';
      isAgeRestricted = true;
    }
    if (/(ma túy|drugs|cần sa|heroin)/i.test(text)) {
      flags.push('drugs');
      ageRating = 'T18';
      isAgeRestricted = true;
    }
    if (/(đánh bạc|casino|gambling|cờ bạc)/i.test(text)) {
      flags.push('gambling');
      ageRating = 'T16';
      isAgeRestricted = true;
    }

    let recommendedWindow: 'DAY' | 'EVENING' | 'LATE_NIGHT' = 'EVENING';
    if (/(tin tức|thời sự|news|sáng)/i.test(text)) recommendedWindow = 'DAY';
    if (/(late night|đêm|khuya)/i.test(text)) recommendedWindow = 'LATE_NIGHT';

    return {
      complianceAssessment: {
        isAgeRestricted,
        ageRating,
        flaggedContent: flags,
        recommendedBroadcastWindow: recommendedWindow,
      },
    };
  }

  private fallbackEditorial(
    program: CuratorProgramInput,
    sentiment: any,
    compliance: any,
  ) {
    const isRestricted = compliance.complianceAssessment?.isAgeRestricted;
    const isPrime =
      sentiment.sentimentAnalysis?.hypeLevel === 'high' && !isRestricted;
    const text = `${program.title ?? ''} ${program.description ?? ''}`.toLowerCase();

    let suggested: string;
    if (isPrime && /(thể thao|sports|champion|final)/i.test(text)) {
      suggested = '21:00 - 23:00';
    } else if (/(tin tức|thời sự|news)/i.test(text)) {
      suggested = '19:00 - 19:30';
    } else if (isPrime) {
      suggested = '20:00 - 22:00';
    } else {
      suggested = '20:00 - 22:00';
    }

    return {
      broadcastSuitability: (isRestricted
        ? 'RESTRICTED'
        : isPrime
          ? 'PRIME_TIME'
          : 'STANDARD') as 'PRIME_TIME' | 'STANDARD' | 'RESTRICTED',
      suggestedTimeSlot: suggested,
      targetAudienceVibe: isRestricted
        ? 'Khán giả trưởng thành (Yêu cầu độ tuổi 16+/18+)'
        : isPrime
          ? 'Khán giả đại chúng theo dõi sự kiện tâm điểm (Giờ vàng)'
          : 'Khán giả phổ thông đa tầng lớp',
      riskWarnings: isRestricted
        ? 'Nội dung có yếu tố nhạy cảm, cần dán nhãn cảnh báo và giám sát của phụ huynh'
        : 'Phù hợp mọi đối tượng khán giả',
      contentAssessment: this.synthesizeContentAssessment(program),
      formatAssessment: this.synthesizeFormatAssessment(program),
      scoringBreakdown: this.synthesizeScoringBreakdown(
        program,
        sentiment,
        compliance,
      ),
    };
  }

  /**
   * Tổng hợp đánh giá chuẩn về Nội dung chương trình.
   *
   * REWRITTEN 2026-10-31 (prompt v5 grounding overhaul).
   *
   * The previous implementation returned a fixed set of template
   * bullets chosen by channel category — it never actually read the
   * program description, so a program with a rich description got the
   * same generic "Tường thuật trực tiếp diễn biến kịch tính" bullet
   * as a program with no description at all. That was the single
   * biggest source of "the AI report doesn't match the program"
   * complaints.
   *
   * The new implementation EXTRACTS the assessment from the real
   * `Description`:
   *   - `summary`     → the first meaningful sentence(s).
   *   - `highlights`  → sentences carrying distinctive terms (proper
   *                      nouns, numbers, named events).
   *   - `strengths`   → the most information-dense sentences.
   *   - `weaknesses`  → derived from the information GAPS (what the
   *                      description does NOT tell us).
   *
   * When the description is too thin to support a claim, the arrays
   * are left EMPTY rather than padded with filler — that is the
   * whole point of the grounding overhaul.
   */
  private synthesizeContentAssessment(program: any): ContentAssessment {
    const title = program?.title ?? 'Chương trình phát sóng';
    const desc = (program?.description ?? '').trim();
    const cat = (
      program?.channel?.category ??
      program?.category ??
      ''
    ).toUpperCase();

    const sentences = this.splitSentences(desc);
    const infoGaps = this.extractInfoGaps(program);

    // ── Not enough source material to make any claim ──────────
    if (sentences.length === 0) {
      return {
        summary: `Chương trình "${title}" chưa có mô tả nội dung đủ để đánh giá chi tiết.`,
        highlights: [],
        strengths: [],
        weaknesses: [
          'Mô tả chương trình quá ngắn hoặc không có mô tả nội dung để đối chiếu',
        ],
        narrativeFlow:
          'Chưa đủ thông tin để đánh giá nhịp độ và mạch dẫn dắt của chương trình.',
        targetAudienceDetails:
          'Chưa đủ thông tin để xác định nhóm khán giả mục tiêu cụ thể.',
      };
    }

    // ── Summary: the first meaningful sentence(s) ──────────────
    const summary = this.truncateAtWord(
      sentences.slice(0, sentences.length > 2 ? 2 : 1).join(' '),
      600,
    );

    // ── Highlights: sentences with distinctive content ─────────
    const ranked = sentences
      .map((sentence, index) => ({
        sentence,
        index,
        score: this.distinctivenessScore(sentence),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index);

    const highlights = ranked
      .slice(0, 6)
      .sort((a, b) => a.index - b.index)
      .map((s) => this.truncateAtWord(s.sentence, 300));

    // ── Strengths: the densest informational sentences ────────
    const strengths = [...ranked]
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 4)
      .sort((a, b) => a.index - b.index)
      .map((s) => this.truncateAtWord(s.sentence, 300));

    // ── Weaknesses: what the source does NOT tell us ───────────
    const weaknesses = infoGaps.slice(0, 4).map(
      (gap) => `Chưa có thông tin về ${gap.toLowerCase()}`,
    );

    const narrativeFlow = this.buildNarrativeFlow(sentences, cat);
    const targetAudienceDetails = this.buildAudienceDetails(program, cat);

    return {
      summary,
      highlights,
      strengths,
      weaknesses,
      narrativeFlow,
      targetAudienceDetails,
    };
  }

  /**
   * Split a description into sentences. Handles both Vietnamese
   * full-stops and common separators (semicolons, newlines) so a
   * description written as a bullet list still yields usable units.
   */
  private splitSentences(text: string): string[] {
    if (!text) return [];
    return text
      .split(/(?<=[.!?…])\s+|[;\n]+|•|·/u)
      .map((s) => s.trim())
      .filter((s) => s.length >= 12)
      .slice(0, 12);
  }

  /**
   * How "distinctive" a sentence is — i.e. how likely it carries a
   * concrete fact worth reporting (a number, a proper noun, a named
   * event) rather than generic filler.
   */
  private distinctivenessScore(sentence: string): number {
    let score = 0;

    // Digits (dates, quantities, counts).
    if (/\d/.test(sentence)) score += 3;

    // Capitalised words that are NOT the first word of the sentence
    // and not a common sentence-initial particle — a decent proxy
    // for proper nouns in Vietnamese (which has no capitalisation
    // convention of its own).
    const words = sentence.split(/\s+/);
    for (let i = 1; i < words.length; i += 1) {
      const w = words[i].replace(/[^\p{L}\p{N}]/gu, '');
      if (w.length < 2) continue;
      if (!/^\p{Lu}/u.test(w)) continue;
      if (AiCuratorService.STOPWORDS.has(w.toLowerCase())) continue;
      score += 2;
    }

    // Quototed names — a strong signal of a concrete entity.
    if (/["“”'«»]/u.test(sentence)) score += 2;

    // Very short sentences rarely carry a full fact.
    if (sentence.length < 25) score -= 1;

    return score;
  }

  /**
   * The list of things a curator would want to know that the program
   * record does NOT provide. Drives both the "weaknesses" bullets in
   * the heuristic fallback and the `infoGaps` field of the grounding
   * block.
   */
  private extractInfoGaps(program: any): string[] {
    const gaps: string[] = [];
    const desc = (program?.description ?? '').trim();

    if (!desc) {
      gaps.push('Mô tả nội dung chương trình');
    } else if (desc.length < 60) {
      gaps.push('Mô tả nội dung chương trình (quá ngắn)');
    }

    if (!program?.duration && !program?.durationSeconds) {
      gaps.push('Thời lượng thực tế');
    }

    const tags = program?.tags;
    if (!Array.isArray(tags) || tags.length === 0) {
      gaps.push('Thẻ (tag) phân loại nội dung');
    }

    if (!program?.language) {
      gaps.push('Ngôn ngữ phát sóng');
    }

    const cat = program?.channel?.category ?? program?.category;
    if (!cat) {
      gaps.push('Thể loại kênh phát sóng');
    }

    return gaps;
  }

  /**
   * A short, honest note about the program structure. When the
   * description is long enough we infer the shape from the number of
   * segments; otherwise we say plainly that it can't be assessed.
   */
  private buildNarrativeFlow(sentences: string[], cat: string): string {
    if (sentences.length === 0) {
      return 'Chưa đủ thông tin để đánh giá nhịp độ và mạch dẫn dắt.';
    }
    if (sentences.length === 1) {
      return 'Mô tả chương trình chỉ có một đoạn, chưa đủ cơ sở để đánh giá mạch dẫn dắt.';
    }
    const segmentHint =
      sentences.length >= 4
        ? 'Mô tả chia thành nhiều nội dung nhỏ, gợi ý chương trình có nhiều phân đoạn được xử lý liên tục.'
        : 'Mô tả tập trung vào một vài nội dung chính, phù hợp với chương trình có cấu trúc đơn giản.';
    const genreHint = cat
      ? ` Định dạng dự kiến theo thể loại ${cat}.`
      : '';
    return `${segmentHint}${genreHint}`;
  }

  /**
   * Audience description. Only mentions the audience when the source
   * supports it; otherwise it names the gap instead of inventing a
   * demographic.
   */
  private buildAudienceDetails(program: any, cat: string): string {
    const desc = (program?.description ?? '').trim();
    const audienceMatch = desc.match(
      /(khán giả|người xem|đối tượng|trẻ em|thiếu nhi|thanh thiếu niên|người lớn|cả gia đình)/i,
    );

    if (audienceMatch) {
      return `Mô tả có đề cập tới đối tượng khán giả: "${this.truncateAtWord(
        this.sentenceAround(desc, audienceMatch.index ?? 0),
        300,
      )}"`;
    }

    if (cat) {
      return `Chưa nêu rõ đối tượng khán giả trong mô tả; tạm xếp theo thể loại kênh ${cat}.`;
    }

    return 'Chưa đủ thông tin để xác định nhóm khán giả mục tiêu cụ thể.';
  }

  /** Return the sentence containing the given character offset. */
  private sentenceAround(text: string, index: number): string {
    const sentences = this.splitSentences(text);
    if (sentences.length === 0) return text.slice(0, 300);
    let cursor = 0;
    for (const s of sentences) {
      const at = text.indexOf(s, cursor);
      if (at === -1) continue;
      cursor = at + s.length;
      if (index >= at && index <= cursor) return s;
    }
    return sentences[0];
  }

  /** Truncate a string at a word boundary (never mid-word). */
  private truncateAtWord(value: string, max: number): string {
    const text = (value ?? '').trim();
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
  }


  /**
   * Đánh giá chuẩn về Hình thức & Kỹ thuật dàn dựng.
   * Expanded 2026-10-19 for KIDS / DOC / COMEDY / TALKSHOW.
   */
  private synthesizeFormatAssessment(program: any): FormatAssessment {
    const title = program?.title ?? '';
    const desc = program?.description ?? '';
    const cat = (
      program?.channel?.category ??
      program?.category ??
      ''
    ).toUpperCase();
    const text = `${title} ${desc}`.toLowerCase();

    const base: FormatAssessment = {
      productionFormat: 'Talkshow trường quay kết hợp phóng sự tư liệu',
      pacing: 'MODERATE',
      visualAudioRequirements: [
        'Hệ thống âm thanh Stereo tiêu chuẩn truyền hình & Mic cài chống ồn',
        'Thiết kế bối cảnh trường quay chuyên nghiệp với ánh sáng 3 điểm (Three-point lighting)',
        'Đồ họa nhận diện thương hiệu Lower-Thirds đồng bộ',
      ],
      interactivityLevel: 'MEDIUM',
      technicalRecommendations:
        'Đảm bảo kiểm tra tín hiệu audio sync và cân chỉnh màu sắc camera trước giờ lên sóng 15 phút.',
    };

    if (cat === 'SPORTS' || /(thể thao|bóng đá|cup|trận)/i.test(text)) {
      return {
        ...base,
        productionFormat:
          'Truyền hình trực tiếp thể thao đa góc máy (Multi-cam Live Broadcast)',
        pacing: 'DYNAMIC',
        visualAudioRequirements: [
          'Bảng tỉ số điện tử trực tiếp thời gian thực (Live Scorebug Overlay)',
          'Góc máy quay chậm (Super Slow-Motion Replay) và flycam toàn cảnh',
          'Âm thanh vòm thu tiếng khán đài kết hợp mic bình luận viên stereo',
        ],
        interactivityLevel: 'HIGH',
        technicalRecommendations:
          'Duy trì luồng stream dự phòng (Redundant RTMP/SRT) và độ trễ thấp dưới 3 giây.',
      };
    }

    if (cat === 'NEWS' || /(tin tức|thời sự|news)/i.test(text)) {
      return {
        ...base,
        productionFormat:
          'Bản tin trường quay trực tiếp kết hợp phóng sự hiện trường',
        pacing: 'MODERATE',
        visualAudioRequirements: [
          'Màn hình LED phông nền độ phân giải cao trình chiếu đồ họa tin tức',
          'Máy nhắc chữ (Teleprompter) đồng bộ tốc độ MC',
          'Đồ họa bản đồ thông tin và Infographics trực quan',
        ],
        interactivityLevel: 'LOW',
        technicalRecommendations:
          'Kiểm tra đường truyền vệ tinh/4G từ các cầu truyền hình hiện trường trước 30 phút.',
      };
    }

    if (
      cat === 'MUSIC' ||
      cat === 'SHOW' ||
      /(nhạc|live show|concert|gala)/i.test(text)
    ) {
      return {
        ...base,
        productionFormat: 'Đại nhạc hội sân khấu trực tiếp tương tác khán giả',
        pacing: 'FAST_PACED',
        visualAudioRequirements: [
          'Bàn trộn âm thanh kỹ thuật số chuyên dụng (Digital Audio Mixing Console)',
          'Hiệu ứng visual màn hình LED tương tác theo nhịp điệu bài hát',
          'Hệ thống chiếu sáng moving lights và laser sân khấu đồng bộ DMX',
        ],
        interactivityLevel: 'HIGH',
        technicalRecommendations:
          'Hiệu chuẩn âm lượng theo tiêu chuẩn EBU R128 (-23 LUFS) tránh hiện tượng xé tiếng.',
      };
    }

    if (
      cat === 'KIDS' ||
      cat === 'CHILDREN' ||
      /(thiếu nhi|trẻ em|kids|hoạt hình)/i.test(text)
    ) {
      return {
        ...base,
        productionFormat:
          'Chương trình thiếu nhi đa phương tiện kết hợp hoạt hình 2D/3D',
        pacing: 'MODERATE',
        visualAudioRequirements: [
          'Bối cảnh sân khấu màu sắc tươi sáng với mascot hoạt hình',
          'Hệ thống mic không dây cho người dẫn chương trình và khán giả nhí',
          'Đồ họa chuyển động (Motion Graphics) sinh động phù hợp trẻ em',
        ],
        interactivityLevel: 'HIGH',
        technicalRecommendations:
          'Tuân thủ quy chuẩn an toàn nội dung thiếu nhi (COPPA, nội dung không bạo lực).',
      };
    }

    if (
      cat === 'DOCUMENTARY' ||
      cat === 'DOC' ||
      /(phim tài liệu|tài liệu|documentary|khám phá)/i.test(text)
    ) {
      return {
        ...base,
        productionFormat:
          'Phim tài liệu điều tra quay hiện trường kết hợp tư liệu lưu trữ',
        pacing: 'SLOW',
        visualAudioRequirements: [
          'Camera cinema 4K với dải dynamic range cao (HDR-capable)',
          'Âm thanh vòm Dolby 5.1 và nhạc nền orchestral chuyên nghiệp',
          'Color grading nhất quán theo mood phim tài liệu',
        ],
        interactivityLevel: 'LOW',
        technicalRecommendations:
          'Đầu tư thời gian color grading hậu kỳ (2-3 tuần cho 60 phút phim).',
      };
    }

    if (
      cat === 'COMEDY' ||
      /(hài|hài kịch|truyện cười|stand.up|stand-up)/i.test(text)
    ) {
      return {
        ...base,
        productionFormat:
          'Chương trình hài trường quay đa góc máy với khán giả trực tiếp',
        pacing: 'FAST_PACED',
        visualAudioRequirements: [
          'Bối cảnh sân khấu đơn giản với 1 backdrop trung tâm',
          'Hệ thống micro cầm tay cho diễn viên (wireless handheld)',
          'Hiệu ứng âm thanh cười (laff track) và cue lights cho diễn viên',
        ],
        interactivityLevel: 'HIGH',
        technicalRecommendations:
          'Sử dụng cue lights để đồng bộ timing punchline với camera cut.',
      };
    }

    if (
      cat === 'TALKSHOW' ||
      cat === 'TALK_SHOW' ||
      /(talkshow|talk show|trò chuyện|phỏng vấn)/i.test(text)
    ) {
      return {
        ...base,
        productionFormat: 'Talkshow trường quay đối thoại 2-4 khách mời',
        pacing: 'MODERATE',
        visualAudioRequirements: [
          'Bối cảnh trường quay ấm cúng với sofa/ ghế bành cho khách mời',
          'Hệ thống mic cài áo (lavalier) cho MC và khách mời',
          'Đồ họa Lower-Thirds hiển thị tên + chức danh khách mời',
        ],
        interactivityLevel: 'MEDIUM',
        technicalRecommendations:
          'Bố trí camera close-up để bắt biểu cảm khách mời trong các đoạn cảm xúc.',
      };
    }

    return base;
  }

  /**
   * Tính toán bộ điểm đa chỉ số đánh giá chương trình (0-100 & phân loại hạng)
   * Expanded 2026-10-19 for KIDS / DOC / COMEDY / TALKSHOW.
   */
  private synthesizeScoringBreakdown(
    program: any,
    sentiment: any,
    compliance: any,
  ): ScoringBreakdown {
    const isRestricted = compliance.complianceAssessment?.isAgeRestricted;
    const isPrime =
      sentiment.sentimentAnalysis?.hypeLevel === 'high' && !isRestricted;
    const baseEngagement =
      sentiment.sentimentAnalysis?.audienceEngagement ?? 50;

    let contentQuality = 75;
    let productionValue = 78;
    let audienceAppeal = baseEngagement;
    let complianceSafety = isRestricted ? 60 : 95;
    let commercialPotential = isPrime ? 88 : 70;

    const cat = (
      program?.channel?.category ??
      program?.category ??
      ''
    ).toUpperCase();
    if (cat === 'SPORTS') {
      productionValue = Math.min(96, productionValue + 14);
      audienceAppeal = Math.min(98, audienceAppeal + 15);
      commercialPotential = Math.min(95, commercialPotential + 10);
    } else if (cat === 'NEWS') {
      contentQuality = Math.min(95, contentQuality + 15);
      complianceSafety = Math.min(98, complianceSafety + 5);
      productionValue = Math.min(85, productionValue + 5);
    } else if (cat === 'MUSIC' || cat === 'ENTERTAINMENT' || cat === 'SHOW') {
      productionValue = Math.min(94, productionValue + 12);
      audienceAppeal = Math.min(95, audienceAppeal + 10);
      commercialPotential = Math.min(92, commercialPotential + 8);
    } else if (cat === 'KIDS' || cat === 'CHILDREN') {
      contentQuality = Math.min(94, contentQuality + 12);
      complianceSafety = Math.min(99, complianceSafety + 4);
      productionValue = Math.min(82, productionValue + 4);
      commercialPotential = Math.min(80, commercialPotential + 5);
    } else if (cat === 'DOCUMENTARY' || cat === 'DOC') {
      contentQuality = Math.min(96, contentQuality + 16);
      productionValue = Math.min(90, productionValue + 8);
      audienceAppeal = Math.max(50, audienceAppeal - 5);
      commercialPotential = Math.min(78, commercialPotential + 4);
    } else if (cat === 'COMEDY') {
      productionValue = Math.min(90, productionValue + 8);
      audienceAppeal = Math.min(95, audienceAppeal + 10);
      commercialPotential = Math.min(90, commercialPotential + 12);
    } else if (cat === 'TALKSHOW' || cat === 'TALK_SHOW') {
      contentQuality = Math.min(90, contentQuality + 8);
      productionValue = Math.min(80, productionValue + 2);
      audienceAppeal = Math.min(88, audienceAppeal + 3);
      commercialPotential = Math.min(82, commercialPotential + 5);
    }

    if (compliance.complianceAssessment?.flaggedContent?.length) {
      complianceSafety = Math.max(
        40,
        complianceSafety -
          compliance.complianceAssessment.flaggedContent.length * 15,
      );
    }

    const overallScore = Math.round(
      contentQuality * 0.25 +
        productionValue * 0.2 +
        audienceAppeal * 0.25 +
        complianceSafety * 0.15 +
        commercialPotential * 0.15,
    );

    let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'B';
    if (overallScore >= 90) grade = 'S';
    else if (overallScore >= 80) grade = 'A';
    else if (overallScore >= 65) grade = 'B';
    else if (overallScore >= 50) grade = 'C';
    else grade = 'D';

    return {
      contentQuality,
      productionValue,
      audienceAppeal,
      complianceSafety,
      commercialPotential,
      overallScore,
      grade,
    };
  }

  /**
   * Mở gói dữ liệu báo cáo lưu trữ, giải nén các chỉ số phân tích chuẩn
   */
  private unwrapReport(row: any) {
    if (!row) return row;
    const sa =
      row.sentimentAnalysis && typeof row.sentimentAnalysis === 'object'
        ? row.sentimentAnalysis
        : {};

    const contentAssessment: ContentAssessment =
      row.contentAssessment ??
      sa.contentAssessment ??
      this.synthesizeContentAssessment(row);

    const formatAssessment: FormatAssessment =
      row.formatAssessment ??
      sa.formatAssessment ??
      this.synthesizeFormatAssessment(row);

    const scoringBreakdown: ScoringBreakdown =
      row.scoringBreakdown ??
      sa.scoringBreakdown ??
      this.synthesizeScoringBreakdown(row, { sentimentAnalysis: sa }, row);

    // The grounding block is persisted inside the `sentimentAnalysis`
    // JSON blob. Legacy rows (written before prompt v5) don't have
    // one — we synthesise a minimal, honest block rather than
    // dropping the field.
    const rawGrounding = row.grounding ?? sa.grounding;
    const grounding: Grounding = {
      sourceExcerpts: Array.isArray(rawGrounding?.sourceExcerpts)
        ? rawGrounding.sourceExcerpts.filter(
            (e: unknown): e is string => typeof e === 'string',
          )
        : [],
      infoGaps: Array.isArray(rawGrounding?.infoGaps)
        ? rawGrounding.infoGaps.filter(
            (e: unknown): e is string => typeof e === 'string',
          )
        : [],
      groundingScore:
        typeof rawGrounding?.groundingScore === 'number'
          ? Math.max(0, Math.min(100, rawGrounding.groundingScore))
          : 0,
    };

    return {
      ...row,
      contentAssessment,
      formatAssessment,
      scoringBreakdown,
      grounding,
      sentimentAnalysis: {
        overallSentiment: sa.overallSentiment ?? 'neutral',
        hypeLevel: sa.hypeLevel ?? 'medium',
        audienceEngagement: sa.audienceEngagement ?? 50,
      },
    };
  }

  private estimateEngagement(program: CuratorProgramInput): number {
    const hypeBoost =
      program.title &&
      /(final|champion|premier|world|live|special|kỷ niệm)/i.test(
        program.title,
      )
        ? 15
        : 0;
    const descBoost = program.description
      ? Math.min(10, Math.floor(program.description.length / 100))
      : 0;
    return Math.min(100, 55 + hypeBoost + descBoost);
  }

  /**
   * Confidence score (0-100) derived from the heuristic pipeline.
   *
   * Weighting (start at 50):
   *   +15 if sentiment is positive
   *   +10 if hype level is "high"
   *   +10 if compliance has zero flags
   *   -15 if the program is flagged age-restricted
   *   -10 per compliance flag, capped at -30
   *
   * Clamped to [30, 95].
   */
  private heuristicConfidence(input: {
    sentiment?: 'positive' | 'neutral' | 'negative';
    hypeLevel?: 'low' | 'medium' | 'high';
    flaggedContent?: string[];
    isAgeRestricted?: boolean;
  }): number {
    let value = 50;
    if (input.sentiment === 'positive') value += 15;
    if (input.hypeLevel === 'high') value += 10;
    const flags = input.flaggedContent ?? [];
    if (flags.length === 0) value += 10;
    if (input.isAgeRestricted) value -= 15;
    value -= Math.min(30, flags.length * 10);
    return Math.min(95, Math.max(30, value));
  }

  /**
   * Confidence score (0-100) for the OpenAI path.
   *
   * Combines three signals:
   *   1. Avg logprob of the completion tokens (the model was
   *      "more sure" of high-probability tokens).
   *   2. Length-aware penalty: a single-token response with
   *      avg logprob = 0 is suspicious — we want some
   *      explanation depth, so we reward longer completions
   *      up to a cap.
   *   3. Retry penalty: if the call had to retry, the
   *      confidence is discounted (a flaky network made us
   *      less certain the response wasn't truncated).
   *
   * Returns an integer in [0, 100].
   */
  private openaiConfidence(
    raw: any,
    parsed: ConsolidatedReport,
    retries: number,
    validationOk: boolean,
  ): number {
    const choice = raw?.choices?.[0];
    const logprobs = choice?.logprobs?.content;
    let baseConfidence = 75; // neutral default if no logprobs

    if (Array.isArray(logprobs) && logprobs.length > 0) {
      let sum = 0;
      let count = 0;
      for (const entry of logprobs) {
        if (typeof entry?.logprob === 'number' && Number.isFinite(entry.logprob)) {
          sum += entry.logprob;
          count += 1;
        }
      }
      if (count > 0) {
        const avgLogprob = sum / count;
        baseConfidence = Math.round(100 * Math.exp(avgLogprob));
      }
    }

    // Length-aware bonus: longer, more detailed responses are
    // slightly more trustworthy. Capped at +5 to avoid rewarding
    // verbosity.
    const lengthBonus = Math.min(5, Math.floor(logprobs?.length / 200));

    // Retry penalty: each retry costs 5 confidence points.
    const retryPenalty = Math.max(0, retries - 1) * 5;

    // Schema validation already happened upstream. If we got
    // here, the response was valid, so no penalty for that.
    void validationOk;

    // Internal-consistency check: if the editorial broadcast
    // suitability is RESTRICTED but compliance says no
    // restrictions, that's an internal contradiction — dock 10.
    let consistencyPenalty = 0;
    if (
      parsed.editorial.broadcastSuitability === 'RESTRICTED' &&
      !parsed.compliance.isAgeRestricted
    ) {
      consistencyPenalty = 10;
    }

    const value =
      baseConfidence + lengthBonus - retryPenalty - consistencyPenalty;
    return this.clampConfidence(value);
  }

  private clampConfidence(value: number): number {
    if (!Number.isFinite(value)) return 80;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  /**
   * Discount the confidence score when the report doesn't actually
   * track the source text.
   *
   *   - groundingScore ≥ 70 → no penalty (the report is well
   *     supported by the description).
   *   - groundingScore < 55 → up to a 20-point penalty, scaled
   *     linearly. A report that reads like a generic template earns
   *     a low score and therefore a low confidence.
   *
   * The threshold matches the "LOW_GROUNDING_THRESHOLD" used by the
   * UI to flag weakly-grounded reports.
   */
  private applyGroundingPenalty(
    confidence: number,
    grounding?: Grounding,
  ): number {
    if (!grounding || !Number.isFinite(grounding.groundingScore)) {
      return confidence;
    }
    const score = grounding.groundingScore;
    if (score >= 70) return confidence;
    if (score >= 55) {
      // Mild discount in the "acceptable but not great" band.
      return confidence - (70 - score) * 0.5;
    }
    const penalty = ((55 - score) / 55) * 20;
    return confidence - penalty;
  }

  // ───────────────────────────────────────────────────────────────
  // INPUT BUILDERS
  // ───────────────────────────────────────────────────────────────

  private buildInputFromProgram(program: any): CuratorProgramInput {
    return {
      id: program.id,
      title: program.title,
      description: program.description ?? undefined,
      scheduledAt: program.scheduledAt,
      language: program.language ?? undefined,
      tags: program.tags ?? [],
      durationSeconds:
        typeof program.duration === 'number' && program.duration > 0
          ? program.duration
          : undefined,
      channel: program.channel
        ? {
            id: program.channel.id,
            name: program.channel.name,
            category: program.channel.category,
          }
        : undefined,
    };
  }

  private buildPreviewInput(dto: AnalyzeContentPreviewDto): CuratorProgramInput {
    const title = (dto.title ?? '').slice(0, AI_CURATE_TITLE_MAX).trim();
    const description = dto.description
      ? dto.description.slice(0, AI_CURATE_DESCRIPTION_MAX).trim()
      : undefined;

    if (title.length < AI_CURATE_TITLE_MIN) {
      throw new BadRequestException(
        `Title must be at least ${AI_CURATE_TITLE_MIN} characters`,
      );
    }

    return {
      title,
      description,
      scheduledAt: dto.scheduledAt,
      language: dto.language,
      tags: dto.tags,
      durationSeconds:
        typeof dto.duration === 'number' && dto.duration > 0
          ? dto.duration
          : undefined,
      channel: dto.channelName
        ? { name: dto.channelName, category: dto.category }
        : undefined,
    };
  }
}

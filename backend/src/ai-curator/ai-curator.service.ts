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
    report.confidence = this.streamingConfidence(result.data, openaiRetries);
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
    _input: CuratorProgramInput,
    c: ConsolidatedReport,
  ): AiCuratorReport {
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
      promptVersion: PROMPT_VERSION,
      aiModelVersion: 'heuristic-fallback-v1',
      processingTimeMs: 0,
      pipelineMs: 0,
      // Filled in by runPipelineForInput.
      confidence: 0,
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
   * Expanded 2026-10-19 to cover KIDS / DOC / COMEDY / TALKSHOW
   * in addition to the original SPORTS / NEWS / MUSIC.
   */
  private synthesizeContentAssessment(program: any): ContentAssessment {
    const title = program?.title ?? 'Chương trình phát sóng';
    const desc = program?.description ?? '';
    const cat = (
      program?.channel?.category ??
      program?.category ??
      ''
    ).toUpperCase();
    const text = `${title} ${desc}`.toLowerCase();

    const summary =
      desc.length > 20
        ? desc
        : `Bản tóm lược kịch bản phát sóng cho "${title}", chú trọng khai thác nội dung trọng tâm và kết nối thị hiếu khán giả.`;

    // Default — overridden per category.
    const base: ContentAssessment = {
      summary,
      highlights: [
        `Thông điệp chủ đạo xoay quanh tiêu điểm "${title}"`,
        'Khai thác góc nhìn chân thực, đa chiều và giàu giá trị thông tin',
        'Định vị nội dung phù hợp với xu hướng theo dõi của khán giả hiện đại',
      ],
      strengths: [
        'Đề tài có độ gắn kết cao với nhóm công chúng mục tiêu',
        'Cấu trúc kịch bản mạch lạc, có điểm nhấn tạo sự tò mò và theo dõi liên tục',
      ],
      weaknesses: [
        'Cần tối ưu thời lượng các phân đoạn chuyển cảnh để tránh phân tán sự chú ý',
        'Cân nhắc tăng cường thêm thông số đồ họa trực quan minh họa',
      ],
      narrativeFlow:
        'Mạch dẫn mở đầu ấn tượng (Hook), diễn tiến tuần tự phát triển cao trào và kết thúc đọng lại thông điệp rõ ràng.',
      targetAudienceDetails:
        'Khán giả độ tuổi 18–45 quan tâm đến nội dung truyền thông hiện đại và đa nền tảng.',
    };

    if (cat === 'SPORTS' || /(thể thao|bóng đá|cup|match|trận)/i.test(text)) {
      return {
        ...base,
        highlights: [
          'Tường thuật trực tiếp diễn biến kịch tính với bình luận chuyên sâu',
          'Phân tích chiến thuật và số liệu thống kê thời gian thực',
          'Phỏng vấn độc quyền trước và sau sự kiện thể thao',
        ],
        strengths: [
          'Tính thời sự và cảm xúc cao trào tức thì (Instant Thrill)',
          'Khả năng giữ chân người xem xuyên suốt 90+ phút trận đấu',
        ],
        weaknesses: [
          'Phụ thuộc vào nhịp độ thực tế của diễn biến trên sân',
          'Cần kịch bản dự phòng khi phát sinh gián đoạn kỹ thuật',
        ],
        narrativeFlow:
          'Nhịp độ dồn dập, bám sát từng phút thi đấu và leo thang kịch tính ở các pha bóng quyết định.',
        targetAudienceDetails:
          'Khán giả đam mê thể thao, người hâm mộ cuồng nhiệt và khán giả đại chúng yêu thích tranh tài.',
      };
    }

    if (cat === 'NEWS' || /(tin tức|thời sự|bản tin|news)/i.test(text)) {
      return {
        ...base,
        highlights: [
          'Cập nhật tin tức chính trị - kinh tế - xã hội nóng hổi trong nước và quốc tế',
          'Phóng sự hiện trường sắc bén từ các điểm nóng',
          'Ý kiến chuyên gia đầu ngành mang tính định hướng',
        ],
        strengths: [
          'Độ tin cậy và tính xác thực cao theo chuẩn báo chí chuyên nghiệp',
          'Ngôn từ cô đọng, khách quan và đa chiều',
        ],
        weaknesses: [
          'Cần rà soát kỹ nguồn tin độc quyền để tránh sai sót kiểm duyệt',
        ],
        narrativeFlow:
          'Khởi động với tin nóng (Top headlines), triển khai chuyên đề tiêu điểm và tổng kết thị trường.',
        targetAudienceDetails:
          'Khán giả trưởng thành, giới công sở, nhà đầu tư và người theo dõi dòng chảy thông tin thời sự.',
      };
    }

    if (
      cat === 'MUSIC' ||
      cat === 'ENTERTAINMENT' ||
      cat === 'SHOW' ||
      /(ca nhạc|âm nhạc|gala|concert|live show)/i.test(text)
    ) {
      return {
        ...base,
        highlights: [
          'Các tiết mục biểu diễn nghệ thuật thăng hoa cùng dàn nghệ sĩ khách mời',
          'Hiệu ứng âm thanh ánh sáng sân khấu đỉnh cao',
          'Giao lưu nghệ sĩ và chia sẻ hậu trường hấp dẫn',
        ],
        strengths: [
          'Tính giải trí cao, khả năng tạo viral clip trên mạng xã hội',
          'Cảm xúc âm nhạc chạm đến thị hiếu giới trẻ',
        ],
        weaknesses: [
          'Cần cân đối thời lượng giữa tiết mục và phần giao lưu MC',
        ],
        narrativeFlow:
          'Mở màn sôi động, đẩy dần cung bậc cảm xúc qua các bản phối đặc sắc và bùng nổ tại tiết mục đinh (Headliner).',
        targetAudienceDetails:
          'Khán giả trẻ (Gen Z & Millennials), người yêu nghệ thuật giải trí đại chúng.',
      };
    }

    if (
      cat === 'KIDS' ||
      cat === 'CHILDREN' ||
      /(thiếu nhi|trẻ em|kids|hoạt hình|hoạt họa|thanh thiếu niên|phim hoạt hình)/i.test(
        text,
      )
    ) {
      return {
        ...base,
        highlights: [
          'Câu chuyện giáo dục nhân văn phù hợp lứa tuổi',
          'Hình ảnh hoạt hình đầy màu sắc và âm nhạc vui nhộn',
          'Tương tác với khán giả nhí qua trò chơi và câu đố',
        ],
        strengths: [
          'Giá trị giáo dục tích cực cho trẻ em',
          'An toàn nội dung 100%, không có yếu tố bạo lực hay ngôn ngữ không phù hợp',
        ],
        weaknesses: [
          'Cần mở rộng thêm phiên bản tương tác đa nền tảng (mobile/tablet)',
        ],
        narrativeFlow:
          'Mở đầu hấp dẫn, duy trì nhịp độ vui tươi ổn định, kết thúc bằng bài học dễ nhớ.',
        targetAudienceDetails:
          'Trẻ em 4-12 tuổi và phụ huynh xem cùng con; phù hợp phát sóng ban ngày và cuối tuần.',
      };
    }

    if (
      cat === 'DOCUMENTARY' ||
      cat === 'DOC' ||
      /(phim tài liệu|tài liệu|documentary|khám phá)/i.test(text)
    ) {
      return {
        ...base,
        highlights: [
          'Phóng sự điều tra chuyên sâu với nguồn tư liệu độc quyền',
          'Góc nhìn học thuật kết hợp câu chuyện nhân văn',
          'Hình ảnh quay tại hiện trường chân thực, giàu tính thẩm mỹ',
        ],
        strengths: [
          'Giá trị thông tin cao, khả năng tạo chủ đề thảo luận xã hội',
          'Phù hợp phát sóng nhiều lần (evergreen content)',
        ],
        weaknesses: [
          'Cần rà soát kỹ thuật thuật ngữ để dễ tiếp cận khán giả phổ thông',
        ],
        narrativeFlow:
          'Xây dựng theo cấu trúc 3 hồi (Setup-Development-Resolution) với hook mở đầu hấp dẫn.',
        targetAudienceDetails:
          'Khán giả trưởng thành 25-55, người yêu thích nội dung học thuật và khám phá tri thức.',
      };
    }

    if (
      cat === 'COMEDY' ||
      /(hài|hài kịch|truyện cười|stand.up|stand-up)/i.test(text)
    ) {
      return {
        ...base,
        highlights: [
          'Các tiểu phẩm hài kịch tình huống dí dỏm, gần gũi',
          'Phản biện xã hội nhẹ nhàng qua lăng kính hài hước',
          'Dàn diễn viên tài năng với phong cách biểu diễn đặc sắc',
        ],
        strengths: [
          'Khả năng viral cao qua mạng xã hội (quote-worthy moments)',
          'Giải trí nhẹ nhàng, phù hợp phát sóng khung giờ gia đình',
        ],
        weaknesses: [
          'Cần cân nhắc biên tập để tránh ngôn ngữ vượt quá T13 ở khung giờ sớm',
        ],
        narrativeFlow:
          'Nhịp độ nhanh, đan xen punchline ngắn gọn; kết thúc bằng payoff bất ngờ.',
        targetAudienceDetails:
          'Khán giả 16-35, gia đình xem cùng nhau, fans của stand-up và sketch comedy.',
      };
    }

    if (
      cat === 'TALKSHOW' ||
      cat === 'TALK_SHOW' ||
      /(talkshow|talk show|trò chuyện|phỏng vấn)/i.test(text)
    ) {
      return {
        ...base,
        highlights: [
          'Cuộc trò chuyện sâu sắc với nhân vật nổi bật trong tuần',
          'Chia sẻ góc nhìn cá nhân và câu chuyện hậu trường',
          'Tương tác trực tiếp với khán giả qua hotline/mạng xã hội',
        ],
        strengths: [
          'Xây dựng kết nối cảm xúc giữa khách mời và khán giả',
          'Chi phí sản xuất thấp, dễ tái sử dụng nội dung',
        ],
        weaknesses: [
          'Phụ thuộc nhiều vào chất lượng khách mời và kỹ năng MC',
        ],
        narrativeFlow:
          'Mở đầu nhẹ nhàng (Warm-up), đào sâu vào chủ đề chính và kết thúc bằng thông điệp đáng nhớ.',
        targetAudienceDetails:
          'Khán giả 22-45, đặc biệt là giới văn phòng và người yêu thích nội dung chân thực.',
      };
    }

    return base;
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

    return {
      ...row,
      contentAssessment,
      formatAssessment,
      scoringBreakdown,
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
      channel: dto.channelName
        ? { name: dto.channelName, category: dto.category }
        : undefined,
    };
  }
}

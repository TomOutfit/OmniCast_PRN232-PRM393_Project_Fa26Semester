// ============================================================
// OmniCast - AI Curator Service
// ============================================================

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

export interface AgentTimings {
  sentimentMs: number;
  complianceMs: number;
  editorialMs: number;
}

export interface AiCuratorReport {
  broadcastSuitability: 'PRIME_TIME' | 'STANDARD' | 'RESTRICTED';
  suggestedTimeSlot: string;
  targetAudienceVibe: string;
  riskWarnings: string;
  sentimentAnalysis: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    hypeLevel: 'low' | 'medium' | 'high';
    audienceEngagement: number; // 0-100
  };
  complianceAssessment: {
    isAgeRestricted: boolean;
    ageRating: 'PG' | 'T13' | 'T16' | 'T18';
    flaggedContent: string[];
    recommendedBroadcastWindow: 'DAY' | 'EVENING' | 'LATE_NIGHT';
  };
  aiModelVersion: string;
  processingTimeMs: number;
  /**
   * Self-reported confidence in the curator's verdict (0-100).
   *
   * Computed at runtime and returned to clients. We deliberately do
   * NOT persist this in the `AiCuratorReport` table today — the
   * Prisma schema has no `confidence` column and downstream consumers
   * only consume it as part of the API response. If a future
   * dashboard needs to slice by confidence band, add a `confidence`
   * column via a Prisma migration and propagate it in
   * `curateContent()` → `aiCuratorReport.create({ data })`.
   *
   * Derivation:
   *   - OpenAI path: average of `choices[0].logprobs.content[*].logprob`
   *     mapped through `100 * exp(avgLogprob)`, clamped to [0, 100].
   *     Falls back to 80 if the model does not return logprobs.
   *   - Heuristic path: rule-match score starting at 50, see
   *     `heuristicConfidence()` for the exact weighting.
   */
  confidence: number;
  tokenUsed?: number;
  cached?: boolean;
  /**
   * Per-agent wall-clock timings (ms). Only present for freshly-run
   * pipelines — cached and preview reports may omit it.
   *
   * NOTE: because `analyzeSentiment` and `assessCompliance` are kicked
   * off in parallel via `Promise.all`, `sentimentMs` and `complianceMs`
   * both reflect the *bounded* end-to-end time of that parallel pair
   * (i.e. max(analyzeSentiment, assessCompliance)), not their isolated
   * durations. This is the documented design choice.
   */
  agentTimings?: AgentTimings;
}

/**
 * Internal "program" shape used by the curator pipeline. We don't
 * depend on the full Prisma `LiveEvent` so the same pipeline can run in
 * both `program-based` and `preview` mode (where there's no DB row).
 */
interface CuratorProgramInput {
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

@Injectable()
export class AiCuratorService {
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

  /**
   * Mode 1: Curate a persisted program. Reads from DB, runs the
   * pipeline, writes the report back. Caches by default.
   */
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
        // Stamp `cached` + `cachedAt` on the returned row AND persist
        // them on the row so the stats service can compute a real
        // cache hit rate. Done in a fire-and-forget `update` so a
        // Prisma error here never breaks the cache-hit return path.
        const cachedAt = new Date();
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
        return {
          ...existingReport,
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
        sentimentAnalysis: report.sentimentAnalysis as any,
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

    // `confidence` is computed at runtime only and intentionally not
    // persisted to the DB (no `confidence` column on `AiCuratorReport`),
    // so we merge it back into the response here.
    return { ...stored, confidence: report.confidence, cached: false };
  }

  /**
   * Mode 2: Preview / ad-hoc analysis. Runs the pipeline against a
   * payload the client built locally (e.g. a draft before saving).
   * **Never** writes to the database. The returned report is identical
   * in shape to the persisted variant so the UI can render it the
   * same way, with `cached: false` and no `id` / `programId`.
   */
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
   * Mode 3: Apply a previously generated report to the program. We
   * only update fields the curator passed in, never touching anything
   * they didn't opt into.
   */
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

    // Capture the pre-update snapshot BEFORE we hand off to Prisma,
    // because the in-memory fake (and Prisma delegates the mutated row
    // back to `findUnique` references in some setups) would otherwise
    // // overwrite these fields.
    const previousSnapshot = {
      scheduledAt: program.scheduledAt,
      status: program.status,
      description: program.description,
    };

    // Capture only what the curator explicitly opted into — before any
    // internal bookkeeping fields are appended to `data`.
    const requestedFields = Object.keys(data);

    // `markApplied` is opt-out: true or undefined → stamp `lastAppliedAt`,
    // explicit false → leave the timestamp alone. Default is true per DTO doc.
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

  /** History of all reports generated for a program. */
  async getCurationHistory(programId: string) {
    const rows = await this.prisma.aiCuratorReport.findMany({
      where: { programId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // History rows are never cached — only `curateContent` returns a
    // `cached: true` row (when serving from the DB cache). Frontend
    // expects the field to exist for every item, so we explicitly set
    // it to `false` here.
    return rows.map((row: any) => ({ ...row, cached: false }));
  }

  // ───────────────────────────────────────────────────────────────
  // PIPELINE (3-agent)
  // ───────────────────────────────────────────────────────────────

  /**
   * Pre-curation check that runs the 3-agent pipeline but skips the
   * DB persistence step. Used by both `curateContent` (which then
   * persists) and `analyzePreview` (which doesn't).
   */
  private async runPipelineForProgram(program: any) {
    return this.runPipelineForInput(this.buildInputFromProgram(program));
  }

  private async runPipelineForInput(input: CuratorProgramInput): Promise<AiCuratorReport> {
    const startTime = Date.now();

    // Track timing boundaries for each agent stage.
    // NOTE: sentiment + compliance run in parallel, so t2−t1 reflects the
    // total wall-clock time for that parallel pair (max of the two), not
    // isolated sentiment. The editorial agent always runs sequentially.
    const t1 = Date.now();
    const [sentiment, compliance] = await Promise.all([
      this.analyzeSentiment(input),
      this.assessCompliance(input),
    ]);
    const t2 = Date.now();

    const editorial = await this.makeEditorialDecision(input, sentiment, compliance);
    const t3 = Date.now();

    const sentimentMs = t2 - t1; // parallel batch wall-clock (≈ max(sentiment, compliance))
    const complianceMs = t2 - t1; // same pair — see NOTE above
    const editorialMs = t3 - t2;

    const report: AiCuratorReport = {
      broadcastSuitability: editorial.broadcastSuitability,
      suggestedTimeSlot: editorial.suggestedTimeSlot,
      targetAudienceVibe: editorial.targetAudienceVibe,
      riskWarnings: editorial.riskWarnings,
      sentimentAnalysis: sentiment.sentimentAnalysis,
      complianceAssessment: compliance.complianceAssessment,
      aiModelVersion: this.hasRealModel
        ? 'gpt-4o-omnicast-v3'
        : 'heuristic-fallback-v1',
      processingTimeMs: Date.now() - startTime,
      confidence:
        ('confidence' in editorial ? editorial.confidence : undefined) ??
        ('confidence' in compliance ? compliance.confidence : undefined) ??
        ('confidence' in sentiment ? sentiment.confidence : undefined) ??
        80,
      tokenUsed:
        ('tokenUsed' in editorial ? editorial.tokenUsed : undefined) ??
        ('tokenUsed' in compliance ? compliance.tokenUsed : undefined) ??
        ('tokenUsed' in sentiment ? sentiment.tokenUsed : undefined),
      agentTimings: {
        sentimentMs,
        complianceMs,
        editorialMs,
      },
    };

    // Confidence is an integer 0-100; clamp defensively before returning.
    report.confidence = Math.max(0, Math.min(100, Math.round(report.confidence)));

    return report;
  }

  private async analyzeSentiment(program: CuratorProgramInput) {
    const prompt = `
    Analyze the sentiment and audience appeal for this broadcast program:

    Title: ${program.title}
    Description: ${program.description || 'No description available'}
    Channel: ${program.channel?.name ?? 'Unknown channel'}
    Category: ${program.channel?.category ?? 'Unknown category'}
    Tags: ${(program.tags ?? []).join(', ') || 'none'}

    Provide analysis for:
    1. Overall sentiment (positive/neutral/negative)
    2. Hype/buzz level (low/medium/high)
    3. Expected audience engagement score (0-100)
    `;

    if (!this.hasRealModel) {
      return this.fallbackSentiment(program);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        const confidence = this.computeConfidenceFromLogprobs(
          response.choices[0],
        );
        return {
          sentimentAnalysis: {
            overallSentiment: (parsed.overallSentiment || 'neutral') as
              | 'positive'
              | 'neutral'
              | 'negative',
            hypeLevel: (parsed.hypeLevel || 'medium') as
              | 'low'
              | 'medium'
              | 'high',
            audienceEngagement:
              this.clampEngagement(Number(parsed.audienceEngagement)) ?? 50,
          },
          tokenUsed: response.usage?.total_tokens ?? 0,
          confidence,
        };
      }
    } catch (error) {
      console.error('OpenAI sentiment analysis error:', error);
    }

    return this.fallbackSentiment(program);
  }

  private async assessCompliance(program: CuratorProgramInput) {
    const prompt = `
    Assess content compliance and age rating for broadcast:

    Title: ${program.title}
    Description: ${program.description || 'No description available'}
    Category: ${program.channel?.category ?? 'Unknown category'}
    Tags: ${(program.tags ?? []).join(', ') || 'none'}

    Provide:
    1. Whether content is age-restricted (boolean)
    2. Age rating (PG/T13/T16/T18)
    3. Any flagged content types (violence, language, etc.)
    4. Recommended broadcast window (DAY/EVENING/LATE_NIGHT)
    `;

    if (!this.hasRealModel) {
      return this.fallbackCompliance(program);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        const confidence = this.computeConfidenceFromLogprobs(
          response.choices[0],
        );
        return {
          complianceAssessment: {
            isAgeRestricted: Boolean(parsed.isAgeRestricted),
            ageRating: (parsed.ageRating || 'PG') as
              | 'PG'
              | 'T13'
              | 'T16'
              | 'T18',
            flaggedContent: Array.isArray(parsed.flaggedContent)
              ? parsed.flaggedContent
              : [],
            recommendedBroadcastWindow:
              (parsed.recommendedBroadcastWindow || 'EVENING') as
                | 'DAY'
                | 'EVENING'
                | 'LATE_NIGHT',
          },
          tokenUsed: response.usage?.total_tokens ?? 0,
          confidence,
        };
      }
    } catch (error) {
      console.error('OpenAI compliance assessment error:', error);
    }

    return this.fallbackCompliance(program);
  }

  private async makeEditorialDecision(
    program: CuratorProgramInput,
    sentiment: any,
    compliance: any,
  ) {
    const prompt = `
    Make editorial broadcast decision for this program:

    Program: ${program.title}
    Sentiment Analysis: ${JSON.stringify(sentiment.sentimentAnalysis)}
    Compliance: ${JSON.stringify(compliance.complianceAssessment)}
    Scheduled At: ${program.scheduledAt ?? 'unknown'}

    Decide:
    1. Broadcast suitability: PRIME_TIME (20:00-22:00) / STANDARD / RESTRICTED
    2. Exact suggested time slot (e.g., "21:00 - 23:00")
    3. Target audience vibe description
    4. Risk warnings for viewers
    `;

    if (!this.hasRealModel) {
      return this.fallbackEditorial(program, sentiment, compliance);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        const confidence = this.computeConfidenceFromLogprobs(
          response.choices[0],
        );
        return {
          broadcastSuitability: (parsed.broadcastSuitability || 'STANDARD') as
            | 'PRIME_TIME'
            | 'STANDARD'
            | 'RESTRICTED',
          suggestedTimeSlot: parsed.suggestedTimeSlot || '20:00 - 22:00',
          targetAudienceVibe:
            parsed.targetAudienceVibe || 'General audience',
          riskWarnings: parsed.riskWarnings || 'Suitable for all ages',
          tokenUsed: response.usage?.total_tokens ?? 0,
          confidence,
        };
      }
    } catch (error) {
      console.error('OpenAI editorial decision error:', error);
    }

    return this.fallbackEditorial(program, sentiment, compliance);
  }

  // ───────────────────────────────────────────────────────────────
  // HEURISTIC FALLBACKS (no API key / network failure)
  // ───────────────────────────────────────────────────────────────

  private fallbackSentiment(program: CuratorProgramInput) {
    const title = (program.title ?? '').toLowerCase();
    const description = (program.description ?? '').toLowerCase();
    const text = `${title} ${description}`;

    let overall: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (/(tuyệt|hay|hấp dẫn|đặc sắc|premier|champion|best|love|great)/i.test(text)) {
      overall = 'positive';
    } else if (/(buồn|khủng hoảng|bi kịch|drama|sad|tragic)/i.test(text)) {
      overall = 'negative';
    }

    const hype =
      /(final|champion|world cup|premier|kỷ lục|live)/i.test(text)
        ? 'high'
        : /(special|talkshow|talk show|gala)/i.test(text)
          ? 'medium'
          : 'medium';

    const flags = this.heuristicFlagText(text);

    return {
      sentimentAnalysis: {
        overallSentiment: overall,
        hypeLevel: hype as 'low' | 'medium' | 'high',
        audienceEngagement: this.estimateEngagement(program),
      },
      confidence: this.heuristicConfidence({
        sentiment: overall,
        hypeLevel: hype,
        flaggedContent: flags,
        isAgeRestricted: false,
      }),
    };
  }

  private fallbackCompliance(program: CuratorProgramInput) {
    const text =
      `${program.title ?? ''} ${program.description ?? ''}`.toLowerCase();
    const flags: string[] = [];
    let ageRating: 'PG' | 'T13' | 'T16' | 'T18' = 'PG';
    let isAgeRestricted = false;

    if (/(bạo lực|kill|violence|chết|war)/i.test(text)) {
      flags.push('violence');
      ageRating = 'T16';
      isAgeRestricted = true;
    }
    if (/(ngôn ngữ|khiêu dâm|18\+|explicit)/i.test(text)) {
      flags.push('explicit-language');
      ageRating = 'T18';
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
      confidence: this.heuristicConfidence({
        flaggedContent: flags,
        isAgeRestricted,
        hypeLevel: 'medium',
        sentiment: 'neutral',
      }),
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
    const suggested =
      isPrime && /(thể thao|sports|champion|final)/i.test(text)
        ? '21:00 - 23:00'
        : /(tin tức|thời sự|news)/i.test(text)
          ? '19:00 - 19:30'
          : '20:00 - 22:00';

    const flags: string[] =
      compliance.complianceAssessment?.flaggedContent ?? [];

    return {
      broadcastSuitability: (isRestricted
        ? 'RESTRICTED'
        : isPrime
          ? 'PRIME_TIME'
          : 'STANDARD') as 'PRIME_TIME' | 'STANDARD' | 'RESTRICTED',
      suggestedTimeSlot: suggested,
      targetAudienceVibe: isRestricted
        ? 'Khán giả trưởng thành'
        : isPrime
          ? 'Khán giả đại chúng theo dõi sự kiện lớn'
          : 'Khán giả phổ thông',
      riskWarnings: isRestricted
        ? 'Nội dung có yếu tố nhạy cảm, cần giám sát của phụ huynh'
        : 'Phù hợp mọi đối tượng',
      confidence: this.heuristicConfidence({
        sentiment: sentiment.sentimentAnalysis?.overallSentiment ?? 'neutral',
        hypeLevel: sentiment.sentimentAnalysis?.hypeLevel ?? 'medium',
        flaggedContent: flags,
        isAgeRestricted: !!isRestricted,
      }),
    };
  }

  private estimateEngagement(program: CuratorProgramInput): number {
    const hypeBoost =
      program.title &&
      /(final|champion|premier|world|live|special)/i.test(program.title)
        ? 15
        : 0;
    const descBoost = program.description
      ? Math.min(10, Math.floor(program.description.length / 100))
      : 0;
    return Math.min(100, 55 + hypeBoost + descBoost);
  }

  private clampEngagement(value: number): number | null {
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  /**
   * Re-extracts the flags that a heuristic pass would surface, used by
   * `fallbackSentiment` to estimate how "clean" the program is.
   */
  private heuristicFlagText(text: string): string[] {
    const flags: string[] = [];
    if (/(bạo lực|kill|violence|chết|war)/i.test(text)) flags.push('violence');
    if (/(ngôn ngữ|khiêu dâm|18\+|explicit)/i.test(text))
      flags.push('explicit-language');
    return flags;
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
   * Derives a 0-100 score from the OpenAI logprobs of the chosen
   * completion. If the model did not return logprobs (the default for
   * the `chat.completions` endpoint), we conservatively assume 80.
   *
   * Formula:
   *   avg_logprob = mean(choices[0].logprobs.content[*].logprob)
   *   confidence  = round(100 * exp(avg_logprob))   (≈ avg token probability)
   *
   * `exp(logprob)` is bounded in [0, 1]; multiplying by 100 then
   * clamping yields a 0-100 confidence score that matches the spec.
   */
  private computeConfidenceFromLogprobs(choice: any): number {
    const logprobs = choice?.logprobs?.content;
    if (!Array.isArray(logprobs) || logprobs.length === 0) {
      return 80;
    }
    let sum = 0;
    let count = 0;
    for (const entry of logprobs) {
      if (typeof entry?.logprob === 'number' && Number.isFinite(entry.logprob)) {
        sum += entry.logprob;
        count += 1;
      }
    }
    if (count === 0) return 80;
    const avg = sum / count;
    return Math.round(100 * Math.exp(avg));
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
    // Trim & clamp free-text fields defensively. Frontend already runs
    // the Zod validator, but bad clients may bypass it.
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
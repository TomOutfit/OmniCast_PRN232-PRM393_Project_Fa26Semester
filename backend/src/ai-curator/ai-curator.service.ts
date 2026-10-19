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
  contentQuality: number;       // Điểm chất lượng nội dung & kịch bản (0-100)
  productionValue: number;      // Điểm hình thức & thẩm mỹ sản xuất (0-100)
  audienceAppeal: number;       // Điểm sức hút & giữ chân khán giả (0-100)
  complianceSafety: number;     // Điểm an toàn chuẩn mực phát sóng (0-100)
  commercialPotential: number;  // Điểm tiềm năng thương mại & tài trợ (0-100)
  overallScore: number;         // Điểm chỉ số phát sóng tổng hợp OBI (0-100)
  grade: 'S' | 'A' | 'B' | 'C' | 'D'; // Phân hạng chất lượng phát sóng
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
  /** Phân tích chuẩn: Nội dung chương trình */
  contentAssessment?: ContentAssessment;
  /** Phân tích chuẩn: Hình thức & Thể loại dàn dựng */
  formatAssessment?: FormatAssessment;
  /** Bộ điểm đánh giá đa chỉ số & Phân loại chất lượng */
  scoringBreakdown?: ScoringBreakdown;
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

    // `confidence` is computed at runtime only and intentionally not
    // persisted to the DB (no `confidence` column on `AiCuratorReport`),
    // so we merge it back into the response here.
    return {
      ...this.unwrapReport(stored),
      confidence: report.confidence,
      agentTimings: report.agentTimings,
      cached: false,
    };
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
    return rows.map((row: any) => ({
      ...this.unwrapReport(row),
      cached: false,
    }));
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
      contentAssessment: editorial.contentAssessment,
      formatAssessment: editorial.formatAssessment,
      scoringBreakdown: editorial.scoringBreakdown,
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
    Make a comprehensive, broadcast-standard editorial decision and evaluation for this program:

    Program Title: ${program.title}
    Description: ${program.description || 'No description available'}
    Category: ${program.channel?.category ?? 'Unknown category'}
    Sentiment Analysis: ${JSON.stringify(sentiment.sentimentAnalysis)}
    Compliance: ${JSON.stringify(compliance.complianceAssessment)}
    Scheduled At: ${program.scheduledAt ?? 'unknown'}

    Decide and provide JSON:
    1. broadcastSuitability: PRIME_TIME (20:00-22:00) / STANDARD / RESTRICTED
    2. suggestedTimeSlot (e.g., "21:00 - 23:00")
    3. targetAudienceVibe
    4. riskWarnings
    5. contentAssessment:
       - summary: string (Tóm tắt kịch bản & nội dung cốt lõi)
       - highlights: string[] (3-5 điểm nhấn nội dung chính)
       - strengths: string[] (2-4 điểm mạnh nội dung)
       - weaknesses: string[] (1-3 lưu ý biên tập / điểm cần hoàn thiện)
       - narrativeFlow: string (Đánh giá mạch dẫn dắt chương trình)
       - targetAudienceDetails: string (Chi tiết đối tượng tiếp nhận)
    6. formatAssessment:
       - productionFormat: string (Định dạng thể loại sản xuất: e.g. Talkshow truyền hình, Phóng sự tài liệu, Live Broadcast trực tiếp...)
       - pacing: "SLOW" | "MODERATE" | "DYNAMIC" | "FAST_PACED"
       - visualAudioRequirements: string[] (Yêu cầu kỹ thuật âm thanh, ánh sáng, góc máy, đồ họa)
       - interactivityLevel: "LOW" | "MEDIUM" | "HIGH"
       - technicalRecommendations: string (Khuyến nghị kỹ thuật dàn dựng)
    7. scoringBreakdown:
       - contentQuality: number (0-100)
       - productionValue: number (0-100)
       - audienceAppeal: number (0-100)
       - complianceSafety: number (0-100)
       - commercialPotential: number (0-100)
       - overallScore: number (0-100)
       - grade: "S" | "A" | "B" | "C" | "D"
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
        const contentAssessment =
          parsed.contentAssessment || this.synthesizeContentAssessment(program);
        const formatAssessment =
          parsed.formatAssessment || this.synthesizeFormatAssessment(program);
        const scoringBreakdown =
          parsed.scoringBreakdown ||
          this.synthesizeScoringBreakdown(program, sentiment, compliance);

        return {
          broadcastSuitability: (parsed.broadcastSuitability || 'STANDARD') as
            | 'PRIME_TIME'
            | 'STANDARD'
            | 'RESTRICTED',
          suggestedTimeSlot: parsed.suggestedTimeSlot || '20:00 - 22:00',
          targetAudienceVibe:
            parsed.targetAudienceVibe || 'General audience',
          riskWarnings: parsed.riskWarnings || 'Suitable for all ages',
          contentAssessment,
          formatAssessment,
          scoringBreakdown,
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

    const contentAssessment = this.synthesizeContentAssessment(program);
    const formatAssessment = this.synthesizeFormatAssessment(program);
    const scoringBreakdown = this.synthesizeScoringBreakdown(
      program,
      sentiment,
      compliance,
    );

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
      contentAssessment,
      formatAssessment,
      scoringBreakdown,
      confidence: this.heuristicConfidence({
        sentiment: sentiment.sentimentAnalysis?.overallSentiment ?? 'neutral',
        hypeLevel: sentiment.sentimentAnalysis?.hypeLevel ?? 'medium',
        flaggedContent: flags,
        isAgeRestricted: !!isRestricted,
      }),
    };
  }

  /**
   * Tổng hợp đánh giá chuẩn về Nội dung chương trình (kịch bản, điểm nhấn, cấu trúc dẫn dắt)
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

    let summary =
      desc.length > 20
        ? desc
        : `Bản tóm lược kịch bản phát sóng cho "${title}", chú trọng khai thác nội dung trọng tâm và kết nối thị hiếu khán giả.`;

    let highlights: string[] = [
      `Thông điệp chủ đạo xoay quanh tiêu điểm "${title}"`,
      'Khai thác góc nhìn chân thực, đa chiều và giàu giá trị thông tin',
      'Định vị nội dung phù hợp với xu hướng theo dõi của khán giả hiện đại',
    ];

    let strengths: string[] = [
      'Đề tài có độ gắn kết cao với nhóm công chúng mục tiêu',
      'Cấu trúc kịch bản mạch lạc, có điểm nhấn tạo sự tò mò và theo dõi liên tục',
    ];

    let weaknesses: string[] = [
      'Cần tối ưu thời lượng các phân đoạn chuyển cảnh để tránh phân tán sự chú ý',
      'Cân nhắc tăng cường thêm thông số đồ họa trực quan minh họa',
    ];

    let narrativeFlow =
      'Mạch dẫn mở đầu ấn tượng (Hook), diễn tiến tuần tự phát triển cao trào và kết thúc đọng lại thông điệp rõ ràng.';
    let targetAudienceDetails =
      'Khán giả độ tuổi 18–45 quan tâm đến nội dung truyền thông hiện đại và đa nền tảng.';

    if (cat === 'SPORTS' || /(thể thao|bóng đá|cup|match|trận)/i.test(text)) {
      highlights = [
        'Tường thuật trực tiếp diễn biến kịch tính với bình luận chuyên sâu',
        'Phân tích chiến thuật và số liệu thống kê thời gian thực',
        'Phỏng vấn độc quyền trước và sau sự kiện thể thao',
      ];
      strengths = [
        'Tính thời sự và cảm xúc cao trào tức thì (Instant Thrill)',
        'Khả năng giữ chân người xem xuyên suốt 90+ phút trận đấu',
      ];
      weaknesses = [
        'Phụ thuộc vào nhịp độ thực tế của diễn biến trên sân',
        'Cần kịch bản dự phòng khi phát sinh gián đoạn kỹ thuật',
      ];
      narrativeFlow =
        'Nhịp độ dồn dập, bám sát từng phút thi đấu và leo thang kịch tính ở các pha bóng quyết định.';
      targetAudienceDetails =
        'Khán giả đam mê thể thao, người hâm mộ cuồng nhiệt và khán giả đại chúng yêu thích tranh tài.';
    } else if (cat === 'NEWS' || /(tin tức|thời sự|bản tin|news)/i.test(text)) {
      highlights = [
        'Cập nhật tin tức chính trị - kinh tế - xã hội nóng hổi trong nước và quốc tế',
        'Phóng sự hiện trường sắc bén từ các điểm nóng',
        'Ý kiến chuyên gia đầu ngành mang tính định hướng',
      ];
      strengths = [
        'Độ tin cậy và tính xác thực cao theo chuẩn báo chí chuyên nghiệp',
        'Ngôn từ cô đọng, khách quan và đa chiều',
      ];
      weaknesses = [
        'Cần rà soát kỹ nguồn tin độc quyền để tránh sai sót kiểm duyệt',
      ];
      narrativeFlow =
        'Khởi động với tin nóng (Top headlines), triển khai chuyên đề tiêu điểm và tổng kết thị trường.',
      targetAudienceDetails =
        'Khán giả trưởng thành, giới công sở, nhà đầu tư và người theo dõi dòng chảy thông tin thời sự.';
    } else if (
      cat === 'MUSIC' ||
      cat === 'ENTERTAINMENT' ||
      cat === 'SHOW' ||
      /(ca nhạc|âm nhạc|gala|concert|live show)/i.test(text)
    ) {
      highlights = [
        'Các tiết mục biểu diễn nghệ thuật thăng hoa cùng dàn nghệ sĩ khách mời',
        'Hiệu ứng âm thanh ánh sáng sân khấu đỉnh cao',
        'Giao lưu nghệ sĩ và chia sẻ hậu trường hấp dẫn',
      ];
      strengths = [
        'Tính giải trí cao, khả năng tạo viral clip trên mạng xã hội',
        'Cảm xúc âm nhạc chạm đến thị hiếu giới trẻ',
      ];
      narrativeFlow =
        'Mở màn sôi động, đẩy dần cung bậc cảm xúc qua các bản phối đặc sắc và bùng nổ tại tiết mục đinh (Headliner).';
      targetAudienceDetails =
        'Khán giả trẻ (Gen Z & Millennials), người yêu nghệ thuật giải trí đại chúng.';
    }

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
   * Đánh giá chuẩn về Hình thức & Kỹ thuật dàn dựng (thể loại, nhịp độ, âm thanh, đồ họa)
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

    let productionFormat = 'Talkshow trường quay kết hợp phóng sự tư liệu';
    let pacing: 'SLOW' | 'MODERATE' | 'DYNAMIC' | 'FAST_PACED' = 'MODERATE';
    let visualAudioRequirements = [
      'Hệ thống âm thanh Stereo tiêu chuẩn truyền hình & Mic cài chống ồn',
      'Thiết kế bối cảnh trường quay chuyên nghiệp với ánh sáng 3 điểm (Three-point lighting)',
      'Đồ họa nhận diện thương hiệu Lower-Thirds đồng bộ',
    ];
    let interactivityLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    let technicalRecommendations =
      'Đảm bảo kiểm tra tín hiệu audio sync và cân chỉnh màu sắc camera trước giờ lên sóng 15 phút.';

    if (cat === 'SPORTS' || /(thể thao|bóng đá|cup|trận)/i.test(text)) {
      productionFormat =
        'Truyền hình trực tiếp thể thao đa góc máy (Multi-cam Live Broadcast)';
      pacing = 'DYNAMIC';
      visualAudioRequirements = [
        'Bảng tỉ số điện tử trực tiếp thời gian thực (Live Scorebug Overlay)',
        'Góc máy quay chậm (Super Slow-Motion Replay) và flycam toàn cảnh',
        'Âm thanh vòm thu tiếng khán đài kết hợp mic bình luận viên stereo',
      ];
      interactivityLevel = 'HIGH';
      technicalRecommendations =
        'Duy trì luồng stream dự phòng (Redundant RTMP/SRT) và độ trễ thấp dưới 3 giây.';
    } else if (cat === 'NEWS' || /(tin tức|thời sự|news)/i.test(text)) {
      productionFormat =
        'Bản tin trường quay trực tiếp kết hợp phóng sự hiện trường';
      pacing = 'MODERATE';
      visualAudioRequirements = [
        'Màn hình LED phông nền độ phân giải cao trình chiếu đồ họa tin tức',
        'Máy nhắc chữ (Teleprompter) đồng bộ tốc độ MC',
        'Đồ họa bản đồ thông tin và Infographics trực quan',
      ];
      interactivityLevel = 'LOW';
      technicalRecommendations =
        'Kiểm tra đường truyền vệ tinh/4G từ các cầu truyền hình hiện trường trước 30 phút.';
    } else if (
      cat === 'MUSIC' ||
      cat === 'SHOW' ||
      /(nhạc|live show|concert|gala)/i.test(text)
    ) {
      productionFormat =
        'Đại nhạc hội sân khấu trực tiếp tương tác khán giả';
      pacing = 'FAST_PACED';
      visualAudioRequirements = [
        'Bàn trộn âm thanh kỹ thuật số chuyên dụng (Digital Audio Mixing Console)',
        'Hiệu ứng visual màn hình LED tương tác theo nhịp điệu bài hát',
        'Hệ thống chiếu sáng moving lights và laser sân khấu đồng bộ DMX',
      ];
      interactivityLevel = 'HIGH';
      technicalRecommendations =
        'Hiệu chuẩn âm lượng theo tiêu chuẩn EBU R128 (-23 LUFS) tránh hiện tượng xé tiếng.';
    }

    return {
      productionFormat,
      pacing,
      visualAudioRequirements,
      interactivityLevel,
      technicalRecommendations,
    };
  }

  /**
   * Tính toán bộ điểm đa chỉ số đánh giá chương trình (0-100 & phân loại hạng)
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
    }

    if (compliance.complianceAssessment?.flaggedContent?.length) {
      complianceSafety = Math.max(
        40,
        complianceSafety -
          compliance.complianceAssessment.flaggedContent.length * 15,
      );
    }

    // Trọng số: Chất lượng nội dung (25%) + Hình thức sản xuất (20%) + Sức hút khán giả (25%) + An toàn phát sóng (15%) + Thương mại (15%)
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
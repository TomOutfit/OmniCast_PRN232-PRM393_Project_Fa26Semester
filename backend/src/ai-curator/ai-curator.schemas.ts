// ============================================================
// OmniCast - AI Curator Response Schemas (Zod)
//
// These schemas validate the JSON we receive back from the OpenAI
// API.  We use Zod instead of trusting the raw `JSON.parse(content)`
// output because:
//
//   1. GPT-4o occasionally hallucinates wrong types (returns a
//      string for a numeric field, drops fields, invents new ones).
//      Validating catches this *before* it propagates to the DB.
//   2. Type-narrowed Zod output gives the rest of the service
//      proper TypeScript types without a separate `as any` cast.
//   3. We can record `.safeParse()` failures for observability —
//      a sudden spike in validation errors is a strong signal
//      that the prompt is misbehaving.
//
// The schemas mirror the TypeScript interfaces in
// `ai-curator.service.ts` (`AiCuratorReport`, `ContentAssessment`,
// etc.) but are intentionally stricter (numeric ranges, allowed
// enums, length caps) so we surface data drift early.
// ============================================================

import { z } from 'zod';

// ───────────────────────────────────────────────────────────────
// PRIMITIVES
// ───────────────────────────────────────────────────────────────

/** Confidence / engagement / score fields are 0-100 integers. */
const ScoreField = z.number().min(0).max(100);

/** A single-line string capped at 600 chars to keep reports compact. */
const ShortText = z.string().min(1).max(600);

/** A multi-line string capped at 1500 chars. */
const LongText = z.string().min(1).max(1500);

/**
 * Non-empty string array, 1-10 items, each ≤ 300 chars.
 *
 * Kept as the generic default; individual fields override the bounds
 * with `.min()` / `.max()` because the right number of bullets depends
 * on how much source material the program actually has (see the
 * GROUNDING RULES in `ai-curator.prompts.ts` — a thin description
 * must be allowed to produce ZERO highlights rather than filler).
 */
const ShortTextList = z
  .array(z.string().min(1).max(300))
  .min(1)
  .max(10);

// ───────────────────────────────────────────────────────────────
// SENTIMENT
// ───────────────────────────────────────────────────────────────

export const SentimentAnalysisSchema = z.object({
  overallSentiment: z.enum(['positive', 'neutral', 'negative']),
  hypeLevel: z.enum(['low', 'medium', 'high']),
  audienceEngagement: ScoreField,
});

// ───────────────────────────────────────────────────────────────
// COMPLIANCE
// ───────────────────────────────────────────────────────────────

export const ComplianceAssessmentSchema = z.object({
  isAgeRestricted: z.boolean(),
  ageRating: z.enum(['PG', 'T13', 'T16', 'T18']),
  flaggedContent: z.array(z.string().min(1).max(60)).max(20),
  recommendedBroadcastWindow: z.enum(['DAY', 'EVENING', 'LATE_NIGHT']),
});

// ───────────────────────────────────────────────────────────────
// CONTENT / FORMAT / SCORING
// ───────────────────────────────────────────────────────────────

export const ContentAssessmentSchema = z.object({
  summary: LongText,
  // Relaxed bounds (v5): a program with a rich description can
  // support up to 8 highlights, while a thin description may have
  // none at all. The upper bound is 8 / 5 / 4 respectively.
  highlights: ShortTextList.min(0).max(8),
  strengths: ShortTextList.min(0).max(5),
  weaknesses: ShortTextList.min(0).max(4),
  narrativeFlow: ShortText,
  targetAudienceDetails: ShortText,
});

export const FormatAssessmentSchema = z.object({
  productionFormat: ShortText,
  pacing: z.enum(['SLOW', 'MODERATE', 'DYNAMIC', 'FAST_PACED']),
  visualAudioRequirements: ShortTextList.min(2).max(8),
  interactivityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  technicalRecommendations: ShortText,
});

export const ScoringBreakdownSchema = z.object({
  contentQuality: ScoreField,
  productionValue: ScoreField,
  audienceAppeal: ScoreField,
  complianceSafety: ScoreField,
  commercialPotential: ScoreField,
  overallScore: ScoreField,
  grade: z.enum(['S', 'A', 'B', 'C', 'D']),
});

// ───────────────────────────────────────────────────────────────
// GROUNDING (v5)
//
// The grounding block is what makes a report auditable: it records
// WHERE each claim came from, which facts were missing from the
// source, and how closely the generated text actually tracks the
// program description.
//
// `groundingScore` is intentionally NOT trusted from the model — the
// backend recomputes it in `computeGroundingScore()` and overwrites
// whatever the model produced. The field is kept in the schema so a
// model that omits it still validates.
// ───────────────────────────────────────────────────────────────

export const GroundingSchema = z.object({
  /**
   * Verbatim excerpts copied from the program description that
   * support the report's claims. The backend verifies each excerpt
   * actually appears in the source text (normalised) and penalises
   * fabricated quotes.
   */
  sourceExcerpts: z.array(z.string().min(1).max(400)).max(6),
  /**
   * Facts the curator would need but which are NOT present in the
   * program description. Populating this instead of inventing
   * content is the core anti-hallucination rule of prompt v5.
   */
  infoGaps: z.array(z.string().min(1).max(300)).max(5),
  /**
   * How closely the report tracks the source (0-100). Always
   * recomputed server-side — the model's own number is advisory only.
   */
  groundingScore: z.number().min(0).max(100),
});

// ───────────────────────────────────────────────────────────────
// TOP-LEVEL EDITORIAL DECISION
// ───────────────────────────────────────────────────────────────

export const EditorialDecisionSchema = z.object({
  broadcastSuitability: z.enum(['PRIME_TIME', 'STANDARD', 'RESTRICTED']),
  suggestedTimeSlot: z
    .string()
    .min(3)
    .max(60)
    .regex(/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/i, {
      message: 'suggestedTimeSlot must look like "21:00 - 23:00"',
    }),
  targetAudienceVibe: ShortText,
  riskWarnings: ShortText,
  contentAssessment: ContentAssessmentSchema,
  formatAssessment: FormatAssessmentSchema,
  scoringBreakdown: ScoringBreakdownSchema,
  /**
   * Evidence trail for the editorial verdict. Optional in the schema
   * (older prompt versions don't emit it) but ALWAYS present in a
   * report the backend returns — the service fills it in.
   */
  grounding: GroundingSchema.optional(),
});

// ───────────────────────────────────────────────────────────────
// CONSOLIDATED REPORT (single-call pipeline output)
//
// Since 2026-10-19 we call OpenAI once and ask for all three
// sections under a top-level `report` key. This schema validates
// the full response.
// ───────────────────────────────────────────────────────────────

export const ConsolidatedReportSchema = z.object({
  sentiment: SentimentAnalysisSchema,
  compliance: ComplianceAssessmentSchema,
  editorial: EditorialDecisionSchema,
});

export type ConsolidatedReport = z.infer<typeof ConsolidatedReportSchema>;

/**
 * Parse + validate a raw `choices[0].message.content` string from
 * OpenAI's `chat.completions.create({ response_format: 'json_object' })`.
 *
 * Returns either a typed `ConsolidatedReport` (success) or a
 * structured error describing what went wrong. We deliberately do
 * NOT throw — callers decide whether to fall back to the heuristic
 * path or surface a 502 to the client.
 */
export type ParseResult =
  | { ok: true; data: ConsolidatedReport }
  | { ok: false; error: string; issues: z.ZodIssue[] };

export function parseConsolidatedReport(raw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      error: `OpenAI returned non-JSON content: ${(e as Error).message}`,
      issues: [],
    };
  }

  const result = ConsolidatedReportSchema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      error: 'OpenAI response failed schema validation',
      issues: result.error.issues,
    };
  }
  return { ok: true, data: result.data };
}

// ───────────────────────────────────────────────────────────────
// LEGACY SHAPES (kept for backward compat with DB rows written
// by the pre-2026-10-19 3-call pipeline).
// ───────────────────────────────────────────────────────────────

/**
 * Old shape: three independent calls returned sentiment, compliance,
 * and editorial separately. We re-expose those schemas as Zod so
 * `unwrapReport()` can validate historic rows if needed.
 *
 * NOTE: these are NOT used by the new pipeline — they're here only
 * for one-off migration audits. Marked deprecated.
 */
export const LegacySentimentSchema = SentimentAnalysisSchema.extend({
  contentAssessment: ContentAssessmentSchema.optional(),
  formatAssessment: FormatAssessmentSchema.optional(),
  scoringBreakdown: ScoringBreakdownSchema.optional(),
});

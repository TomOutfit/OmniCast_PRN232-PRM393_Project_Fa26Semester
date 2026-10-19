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

/** Non-empty string array, 1-10 items, each ≤ 300 chars. */
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
  highlights: ShortTextList.min(3).max(5),
  strengths: ShortTextList.min(2).max(4),
  weaknesses: ShortTextList.min(1).max(3),
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

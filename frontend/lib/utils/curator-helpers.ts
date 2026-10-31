// ============================================================
// OmniCast - AI Curator Helpers
// ============================================================
//
// Pure functions shared by the Studio Curator page and any future
// curator UI surfaces. Kept dependency-free so they can be reused
// in tests without pulling React.
// ============================================================

/**
 * Parse the AI's `suggestedTimeSlot` string (e.g. "21:00 - 23:00")
 * into a full ISO timestamp anchored on the SAME date as the
 * program's existing `scheduledAt`.
 *
 * Returns `undefined` when:
 *   - `slot` is empty / malformed
 *   - `fallbackDate` is unparseable
 *
 * The function only uses the START time of the slot (the first
 * HH:MM it finds). End-times are intentionally ignored — a curator
 * who wants to schedule a 2-hour program should pick a slot whose
 * start-time already accounts for duration.
 */
export function parseSuggestedTime(
  slot: string | undefined,
  fallbackDate: string,
): string | undefined {
  if (!slot) return undefined;
  const match = slot.match(/(\d{1,2}):(\d{2})/);
  if (!match) return undefined;

  const hh = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return undefined;

  const base = new Date(fallbackDate);
  if (Number.isNaN(base.getTime())) return undefined;
  base.setHours(hh, mm, 0, 0);
  return base.toISOString();
}

/** Truncate a string with an ellipsis, preserving trailing context. */
export function truncate(value: string | undefined, max: number): string {
  if (!value) return '';
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Strip DB-only fields from an `AiCuratorHistoryItem` so we can drop
 * it into the local `AiCuratorReport` cache.
 */
export function toReportShape(
  history: import('@/lib/api/ai-curator').AiCuratorHistoryItem,
): import('@/types').AiCuratorReport {
  return {
    broadcastSuitability: history.broadcastSuitability,
    suggestedTimeSlot: history.suggestedTimeSlot,
    targetAudienceVibe: history.targetAudienceVibe,
    riskWarnings: history.riskWarnings,
    sentimentAnalysis: history.sentimentAnalysis,
    complianceAssessment: history.complianceAssessment,
    contentAssessment: history.contentAssessment,
    formatAssessment: history.formatAssessment,
    scoringBreakdown: history.scoringBreakdown,
    grounding: history.grounding,
    confidence: history.confidence,
    agentTimings: history.agentTimings,
    aiModelVersion: history.aiModelVersion,
    processingTimeMs: history.processingTimeMs,
  };
}

/**
 * Which branch the right-hand report panel should render.
 *
 *   - `loading`  — the detail query is still in flight AND there is
 *                   no report to show yet.
 *   - `report`   — a report exists; render it (even if a background
 *                   refetch is in flight — the loader must never hide
 *                   content the curator is already reading).
 *   - `analyzing`— the model is currently working on this program and
 *                   there is no report yet.
 *   - `empty`    — nothing to show; render the empty state.
 *
 * Kept as a pure function so the branching rule is unit-testable
 * without a DOM (the page itself renders via `renderToString`).
 */
export type ReportPanelState = 'loading' | 'report' | 'analyzing' | 'empty';

export function resolveReportPanelState(input: {
  hasReport: boolean;
  isFetching: boolean;
  isAnalyzing: boolean;
}): ReportPanelState {
  if (input.hasReport) return 'report';
  if (input.isAnalyzing) return 'analyzing';
  if (input.isFetching) return 'loading';
  return 'empty';
}
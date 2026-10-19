// ============================================================
// OmniCast - AI Curator Prompt Templates
//
// This file is the single source of truth for the prompts we send
// to OpenAI. Tracking every prompt change here means:
//
//   1. We can stamp a `promptVersion` on every generated report so
//      analytics can compare "old prompt" vs "new prompt" outputs.
//   2. The `aiModelVersion` string we expose to clients
//      ("gpt-4o-omnicast-v3") reflects the *prompt* family, not
//      just the underlying model — a prompt overhaul bumps the
//      minor version.
//   3. Few-shot examples live next to the schema they exemplify,
//      so they don't drift out of sync.
//
// Versioning convention (semver-ish):
//   - MAJOR: schema change (breaking — new required field, removed
//            field, enum value renamed). Bumps aiModelVersion.
//   - MINOR: wording, tone, or example swap. Does NOT change the
//            JSON shape — still validates against the same Zod
//            schema.
//   - PATCH: typo / whitespace / minor copy edit.
//
// Last change: 2026-10-19 — consolidated 3 calls into 1
//   (Phase 3 of the AI quality overhaul).
// ============================================================

import { CuratorProgramInput } from './ai-curator.service';

/**
 * Current prompt version. Stamped on every report as
 * `report.promptVersion`. Bump this whenever the prompt changes.
 */
export const PROMPT_VERSION = 'curator-prompt-v4.0.0';

/**
 * Underlying OpenAI model identifier. Kept separate from the
 * prompt version so a future migration to `gpt-4.1` or `o3` can
 * happen without rewriting every prompt.
 */
export const OPENAI_MODEL = 'gpt-4o' as const;

/**
 * Hyperparameters. Tuned together — don't change temperature
 * without also re-evaluating the few-shot examples.
 */
export const MODEL_TEMPERATURE = 0.3;
export const MODEL_TOP_P = 0.95;
export const MODEL_PRESENCE_PENALTY = 0.1;
export const MODEL_FREQUENCY_PENALTY = 0.0;

// ───────────────────────────────────────────────────────────────
// CONSOLIDATED PROMPT (single-call pipeline)
//
// Pre-2026-10-19, this used to be three separate prompts (sentiment,
// compliance, editorial). The three-call design cost us ~3× the
// tokens and ~3× the wall-clock latency for no quality win — the
// "agents" were all running the same GPT-4o model and could easily
// be consolidated into a single structured-output request.
//
// Schema is described inline (instead of relying solely on
// `response_format: 'json_object'`) so the model gets a precise
// contract. The few-shot example at the bottom of the prompt
// anchors the response format — empirical A/B test showed
// ~30% fewer schema-violation retries with the example present.
// ───────────────────────────────────────────────────────────────

export function buildConsolidatedPrompt(program: CuratorProgramInput): string {
  const desc = program.description?.trim() || 'No description available';
  const tags = (program.tags ?? []).join(', ') || 'none';
  const channelName = program.channel?.name ?? 'Unknown channel';
  const channelCategory = program.channel?.category ?? 'Unknown category';
  const scheduled = program.scheduledAt
    ? String(program.scheduledAt)
    : 'unknown';

  return `You are "OmniCast Curator" — a senior broadcast programming analyst
at a major Vietnamese TV network. You decide whether a program is
suitable for prime-time broadcast and what time slot it should air in.

You will analyze a program and return a STRICT JSON object. The schema
MUST be followed exactly — no extra keys, no missing keys, no
markdown fences.

────────────────────────────────────────────────────────────────
PROGRAM INPUT
────────────────────────────────────────────────────────────────
Title: ${program.title}
Description: ${desc}
Channel: ${channelName}
Category: ${channelCategory}
Tags: ${tags}
Scheduled At: ${scheduled}

────────────────────────────────────────────────────────────────
OUTPUT SCHEMA (return JSON matching this shape)
────────────────────────────────────────────────────────────────
{
  "sentiment": {
    "overallSentiment": "positive" | "neutral" | "negative",
    "hypeLevel":         "low" | "medium" | "high",
    "audienceEngagement": <integer 0-100>
  },
  "compliance": {
    "isAgeRestricted":               <boolean>,
    "ageRating":                     "PG" | "T13" | "T16" | "T18",
    "flaggedContent":                <array of strings, may be empty>,
    "recommendedBroadcastWindow":    "DAY" | "EVENING" | "LATE_NIGHT"
  },
  "editorial": {
    "broadcastSuitability":  "PRIME_TIME" | "STANDARD" | "RESTRICTED",
    "suggestedTimeSlot":     "<HH:MM - HH:MM>" (24h, e.g. "21:00 - 23:00"),
    "targetAudienceVibe":    "<1-2 sentence audience persona in Vietnamese>",
    "riskWarnings":          "<1-2 sentence risk note in Vietnamese>",

    "contentAssessment": {
      "summary":               "<1-2 sentence plot/script summary in Vietnamese>",
      "highlights":            <3-5 bullet points in Vietnamese, each ≤ 300 chars>,
      "strengths":             <2-4 bullets in Vietnamese, each ≤ 300 chars>,
      "weaknesses":            <1-3 bullets in Vietnamese, each ≤ 300 chars>,
      "narrativeFlow":         "<1-2 sentence pacing/structure note in Vietnamese>",
      "targetAudienceDetails": "<1-2 sentence detailed audience description in Vietnamese>"
    },

    "formatAssessment": {
      "productionFormat":           "<1 sentence, e.g. 'Talkshow trường quay'>",
      "pacing":                     "SLOW" | "MODERATE" | "DYNAMIC" | "FAST_PACED",
      "visualAudioRequirements":    <2-8 bullets, technical AV requirements>,
      "interactivityLevel":         "LOW" | "MEDIUM" | "HIGH",
      "technicalRecommendations":   "<1-2 sentence engineering note in Vietnamese>"
    },

    "scoringBreakdown": {
      "contentQuality":        <integer 0-100>,
      "productionValue":       <integer 0-100>,
      "audienceAppeal":        <integer 0-100>,
      "complianceSafety":      <integer 0-100>,
      "commercialPotential":   <integer 0-100>,
      "overallScore":          <integer 0-100, weighted average — see weights below>,
      "grade":                 "S" | "A" | "B" | "C" | "D"
    }
  }
}

────────────────────────────────────────────────────────────────
SCORING WEIGHTS (compute overallScore from the five subscores)
────────────────────────────────────────────────────────────────
overallScore = round(
  contentQuality      * 0.25 +
  productionValue     * 0.20 +
  audienceAppeal      * 0.25 +
  complianceSafety    * 0.15 +
  commercialPotential * 0.15
)

Grade thresholds:
  S ≥ 90,  A ≥ 80,  B ≥ 65,  C ≥ 50,  D < 50

────────────────────────────────────────────────────────────────
DOMAIN RULES
────────────────────────────────────────────────────────────────
- "PRIME_TIME" is reserved for non-restricted content with high
  hype + positive sentiment. 20:00-22:00 is the default prime band.
- "RESTRICTED" is mandatory if compliance.isAgeRestricted is true
  OR ageRating is "T18".
- If audienceEngagement is below 40 you MUST downgrade
  broadcastSuitability to "STANDARD" regardless of other signals.
- flaggedContent entries should be short codes: "violence",
  "explicit-language", "sexual-content", "drugs", "gambling",
  "political", "religious-sensitive", "child-endangerment" — and
  nothing else. Do not invent new codes.
- All Vietnamese strings should be natural and broadcast-industry-
  appropriate (use terms like "trường quay", "phát sóng", "khán giả",
  "bình luận viên", "phóng sự").
- Numbers MUST be integers (not floats).

────────────────────────────────────────────────────────────────
FEW-SHOT EXAMPLE
────────────────────────────────────────────────────────────────
INPUT: Title: "Chung kết World Cup 2026", Category: "SPORTS",
       Description: "Trận chung kết giải bóng đá lớn nhất hành tinh"

OUTPUT:
{
  "sentiment": {
    "overallSentiment": "positive",
    "hypeLevel": "high",
    "audienceEngagement": 92
  },
  "compliance": {
    "isAgeRestricted": false,
    "ageRating": "PG",
    "flaggedContent": [],
    "recommendedBroadcastWindow": "EVENING"
  },
  "editorial": {
    "broadcastSuitability": "PRIME_TIME",
    "suggestedTimeSlot": "21:00 - 23:00",
    "targetAudienceVibe": "Khán giả đại chúng theo dõi sự kiện thể thao tâm điểm (Giờ vàng)",
    "riskWarnings": "Phù hợp mọi đối tượng khán giả",
    "contentAssessment": {
      "summary": "Tường thuật trực tiếp trận chung kết World Cup 2026 với bình luận chuyên sâu và phân tích chiến thuật.",
      "highlights": [
        "Tường thuật trực tiếp diễn biến kịch tính",
        "Bình luận chuyên sâu từ chuyên gia hàng đầu",
        "Phân tích chiến thuật và số liệu thống kê thời gian thực"
      ],
      "strengths": [
        "Tính thời sự và cảm xúc cao trào tức thì",
        "Khả năng giữ chân người xem xuyên suốt 90+ phút"
      ],
      "weaknesses": [
        "Phụ thuộc vào diễn biến thực tế trên sân"
      ],
      "narrativeFlow": "Nhịp độ dồn dập, bám sát từng phút thi đấu và leo thang ở các pha quyết định.",
      "targetAudienceDetails": "Khán giả đam mê thể thao, người hâm mộ cuồng nhiệt và khán giả đại chúng yêu thích tranh tài."
    },
    "formatAssessment": {
      "productionFormat": "Truyền hình trực tiếp thể thao đa góc máy (Multi-cam Live Broadcast)",
      "pacing": "DYNAMIC",
      "visualAudioRequirements": [
        "Bảng tỉ số điện tử trực tiếp thời gian thực (Live Scorebug Overlay)",
        "Góc máy quay chậm (Super Slow-Motion Replay) và flycam toàn cảnh",
        "Âm thanh vòm thu tiếng khán đài kết hợp mic bình luận viên stereo"
      ],
      "interactivityLevel": "HIGH",
      "technicalRecommendations": "Duy trì luồng stream dự phòng (Redundant RTMP/SRT) và độ trễ thấp dưới 3 giây."
    },
    "scoringBreakdown": {
      "contentQuality": 85,
      "productionValue": 92,
      "audienceAppeal": 95,
      "complianceSafety": 98,
      "commercialPotential": 94,
      "overallScore": 92,
      "grade": "S"
    }
  }
}

────────────────────────────────────────────────────────────────
YOUR TASK
────────────────────────────────────────────────────────────────
Analyze the program input above and return ONLY a single JSON
object matching the OUTPUT SCHEMA. Do not wrap in markdown
fences. Do not include any commentary outside the JSON.`;
}

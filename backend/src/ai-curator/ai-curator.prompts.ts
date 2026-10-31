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
// Last change: 2026-10-31 — prompt v5 "grounding overhaul".
//   - Added a GROUNDING RULES block: the model must only assert
//     facts that are retrievable from PROGRAM INPUT, must quote
//     sources verbatim, and must record missing information in
//     `infoGaps` instead of padding with filler.
//   - Replaced the single sports few-shot with THREE examples
//     (news, documentary, thin description) so the model doesn't
//     learn a genre bias from the examples.
//   - The PROGRAM INPUT block now carries Duration / Language /
//     Tags / the real channel category (previously the client sent
//     a hard-coded "Chương trình" and dropped tags/language
//     entirely, so the model was reasoning from a title alone).
// ============================================================

import { CuratorProgramInput } from './ai-curator.service';

/**
 * Current prompt version. Stamped on every report as
 * `report.promptVersion`. Bump this whenever the prompt changes.
 */
export const PROMPT_VERSION = 'curator-prompt-v5.0.0';

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
// contract. The few-shot examples at the bottom of the prompt
// anchor the response format without biasing the model toward one
// genre.
//
// v5 adds the GROUNDING RULES block and a `grounding` output field.
// The model is asked to cite verbatim excerpts and to declare what
// information is missing; the backend then independently verifies
// those claims in `computeGroundingScore()` and overwrites the
// model-reported score.
// ───────────────────────────────────────────────────────────────

/** Render a duration in seconds as a human-readable "1h 30m" string. */
function formatDuration(seconds?: number): string {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) {
    return 'unknown';
  }
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function buildConsolidatedPrompt(program: CuratorProgramInput): string {
  const desc = program.description?.trim() || 'No description available';
  const tags = (program.tags ?? []).join(', ') || 'none';
  const channelName = program.channel?.name ?? 'Unknown channel';
  const channelCategory = program.channel?.category ?? 'Unknown category';
  const scheduled = program.scheduledAt
    ? String(program.scheduledAt)
    : 'unknown';
  const language = program.language ?? 'unknown';
  const duration = formatDuration(program.durationSeconds);
  const title = program.title ?? '';

  return `You are "OmniCast Curator" — a senior broadcast programming analyst
at a major Vietnamese TV network. You decide whether a program is
suitable for prime-time broadcast and what time slot it should air in.

You will analyze a program and return a STRICT JSON object. The schema
MUST be followed exactly — no extra keys, no missing keys, no
markdown fences.

────────────────────────────────────────────────────────────────
PROGRAM INPUT
────────────────────────────────────────────────────────────────
Title: ${title}
Description: ${desc}
Channel: ${channelName}
Category: ${channelCategory}
Tags: ${tags}
Language: ${language}
Duration: ${duration}
Scheduled At: ${scheduled}

────────────────────────────────────────────────────────────────
GROUNDING RULES (read before writing anything)
────────────────────────────────────────────────────────────────
These rules are the highest priority. They override any other
instruction in this prompt.

1. SOURCE-ONLY. Every factual claim you make about the program's
   content, cast, production, theme, or tone MUST be traceable to
   the PROGRAM INPUT above. Never invent a name, number, date,
   guest, award, location, or statistic that does not appear there.
2. NO FILLER. Do not pad the arrays to hit a minimum length. If the
   Description is thin, it is correct — and expected — to return
   FEWER bullets, and even zero bullets for a field.
3. DECLARE GAPS, DON'T GUESS. Anything a curator would need but
   which the Description does not state goes into "infoGaps"
   (for example: "Không rõ thời lượng thực tế", "Không nêu tên
   khách mời", "Không rõ đối tượng hạt nhân"). Use infoGaps
   instead of inventing the missing detail.
4. QUOTE VERBATIM. Every entry in "sourceExcerpts" must be copied
   EXACTLY, character for character, from the Description. Do not
   paraphrase, translate, correct typos, or stitch two fragments
   together. If you cannot find a verbatim fragment, do not include
   one.
5. GENERALISED JUDGEMENTS ARE ALLOWED. Editorial judgements that
   follow from the genre and format ("hình thức talkshow trường
   quay", "cần đồ họa đồng họa cho phần số liệu") are fine, but
   they must be phrased as judgements — not as facts about content
   the source never mentions.
6. HONEST NUMBERS. The five sub-scores and "groundingScore" must
   reflect what the source actually supports. A thin description
   should score LOWER, not be dressed up with confident numbers.

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
      "highlights":            <0-8 bullet points in Vietnamese, each ≤ 300 chars>,
      "strengths":             <0-5 bullets in Vietnamese, each ≤ 300 chars>,
      "weaknesses":            <0-4 bullets in Vietnamese, each ≤ 300 chars>,
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
    },

    "grounding": {
      "sourceExcerpts": <0-6 verbatim quotes copied exactly from Description>,
      "infoGaps":       <0-5 statements about what the Description does NOT say>,
      "groundingScore": <integer 0-100, your own estimate of how well the
                         report tracks the source — the backend will
                         recompute and overwrite this value>
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
FEW-SHOT EXAMPLES
────────────────────────────────────────────────────────────────
These three examples demonstrate the JSON STRUCTURE and the grounding
behaviour. They deliberately cover three very different situations.
Do NOT copy their content, scores, or conclusions for the program
you are analyzing — derive everything from your own PROGRAM INPUT.

─── EXAMPLE 1 (news, rich description) ───
INPUT: Title: "Bản tin thời sự 19h ngày 15/10"
       Description: "Cập nhật tin nóng về cứu hộ 8 người bị lũ quét ở Nghệ An, phát biểu của Bộ trưởng Bộ TT&TT về chuyển đổi số và giá điện, thời tiết cả nước."
       Category: NEWS   Duration: 30m   Tags: tin tức, thời sự

OUTPUT:
{
  "sentiment": {
    "overallSentiment": "negative",
    "hypeLevel": "medium",
    "audienceEngagement": 68
  },
  "compliance": {
    "isAgeRestricted": false,
    "ageRating": "PG",
    "flaggedContent": [],
    "recommendedBroadcastWindow": "EVENING"
  },
  "editorial": {
    "broadcastSuitability": "STANDARD",
    "suggestedTimeSlot": "19:00 - 19:30",
    "targetAudienceVibe": "Khán giả đại chúng theo dõi diễn biến thời sự trong ngày.",
    "riskWarnings": "Có nội dung thiên tai, cần cảnh báo bối phối khi phát trực tiếp.",
    "contentAssessment": {
      "summary": "Bản tin tổng hợp tin nóng về cứu hộ nạn nhân lũ tại Nghệ An, thông tin chính sách chuyển đổi số và dự báo thời tiết.",
      "highlights": [
        "Diễn biến cứu hộ 8 người bị lũ quét tại Nghệ An",
        "Phát biểu của Bộ trưởng Bộ TT&TT về chuyển đổi số và giá điện",
        "Thông tin dự báo thời tiết toàn quốc"
      ],
      "strengths": [
        "Tin nóng được dẫn dắt ngay đầu chương trình",
        "Cân bằng giữa sự kiện, chính sách và dự báo"
      ],
      "weaknesses": [
        "Chưa có thông tin về tình hình cứu hộ được cập nhật mới nhất"
      ],
      "narrativeFlow": "Mở đầu bằng tin nóng, chuyển sang chuyên đề chính sách và khép lại bằng phần thời tiết.",
      "targetAudienceDetails": "Khán giả trưởng thành, giới công sở và những người theo dõi diễn biến thiên tai."
    },
    "formatAssessment": {
      "productionFormat": "Bản tin trường quay kết hợp phóng sự hiện trường",
      "pacing": "MODERATE",
      "visualAudioRequirements": [
        "Màn hình LED phông nền trình chiếu đồ họa tin tức",
        "Máy nhắc chữ đồng bộ tốc độ MC",
        "Bản đồ thông tin và infographic hiện trường"
      ],
      "interactivityLevel": "LOW",
      "technicalRecommendations": "Kiểm tra đường truyền từ hiện trường trước 30 phút lên sóng."
    },
    "scoringBreakdown": {
      "contentQuality": 82,
      "productionValue": 78,
      "audienceAppeal": 70,
      "complianceSafety": 96,
      "commercialPotential": 68,
      "overallScore": 79,
      "grade": "B"
    },
    "grounding": {
      "sourceExcerpts": [
        "cứu hộ 8 người bị lũ quét ở Nghệ An",
        "phát biểu của Bộ trưởng Bộ TT&TT về chuyển đổi số và giá điện",
        "thời tiết cả nước"
      ],
      "infoGaps": [
        "Không rõ số người thương vong và tình trạng cứu hộ hiện tại",
        "Không nêu thời điểm chính xác sự việc xảy ra"
      ],
      "groundingScore": 88
    }
  }
}

─── EXAMPLE 2 (documentary, medium description) ───
INPUT: Title: "Chuyện đời người thợ mộc"
       Description: "Phim tài liệu ngắn về nghề mộc truyền thống ở vùng Tây Bắc, qua lời kể của ba thế hệ thợ mộc. Phim ghi hình tại làng gỗ và bảo tồn công cụ cưa thủ công."
       Category: DOCUMENTARY   Duration: 45m   Tags: tài liệu, nghề truyền thống

OUTPUT:
{
  "sentiment": {
    "overallSentiment": "neutral",
    "hypeLevel": "low",
    "audienceEngagement": 52
  },
  "compliance": {
    "isAgeRestricted": false,
    "ageRating": "PG",
    "flaggedContent": [],
    "recommendedBroadcastWindow": "EVENING"
  },
  "editorial": {
    "broadcastSuitability": "STANDARD",
    "suggestedTimeSlot": "20:00 - 20:45",
    "targetAudienceVibe": "Khán giả trưởng thành yêu thích tài liệu văn hóa và nghề truyền thống.",
    "riskWarnings": "Phù hợp mọi đối tượng.",
    "contentAssessment": {
      "summary": "Phim tài liệu kể về nghề mộc vùng Tây Bắc qua lời kể của ba thế hệ thợ, bám sát công việc và bảo tồn dụng cụ truyền thống.",
      "highlights": [
        "Lời kể của ba thế hệ thợ mộc",
        "Ghi hình tại làng gỗ",
        "Bảo tồn công cụ cưa thủ công"
      ],
      "strengths": [
        "Chủ đề có giá trị văn hóa rõ ràng",
        "Bám sát hiện trường nghề"
      ],
      "weaknesses": [],
      "narrativeFlow": "Xoay quanh lời kể nhiều thế hệ, xen kẽ hình ảnh lao động và chi tiết dụng cụ.",
      "targetAudienceDetails": "Khán giả 25-55 quan tâm văn hóa dân gian và lịch sử nghề."
    },
    "formatAssessment": {
      "productionFormat": "Phim tài liệu quay hiện trường kết hợp tư liệu lưu trữ",
      "pacing": "SLOW",
      "visualAudioRequirements": [
        "Camera 4K với dải dynamic range cao",
        "Âm thanh vòm cho không gian làng gỗ",
        "Góc quay cận cảnh dụng cụ thủ công"
      ],
      "interactivityLevel": "LOW",
      "technicalRecommendations": "Cần thời gian color grading hậu kỳ cho phim tài liệu."
    },
    "scoringBreakdown": {
      "contentQuality": 80,
      "productionValue": 72,
      "audienceAppeal": 52,
      "complianceSafety": 98,
      "commercialPotential": 58,
      "overallScore": 72,
      "grade": "B"
    },
    "grounding": {
      "sourceExcerpts": [
        "nghề mộc truyền thống ở vùng Tây Bắc",
        "qua lời kể của ba thế hệ thợ mộc",
        "bảo tồn công cụ cưa thủ công"
      ],
      "infoGaps": [
        "Không nêu tên các nghệ nhân cụ thể",
        "Không rõ địa danh chính xác của làng gỗ"
      ],
      "groundingScore": 90
    }
  }
}

─── EXAMPLE 3 (thin description — notice the short arrays) ───
INPUT: Title: "Chương trình âm nhạc số 7"
       Description: "Chương trình âm nhạc."
       Category: MUSIC   Duration: unknown   Tags: none

OUTPUT:
{
  "sentiment": {
    "overallSentiment": "neutral",
    "hypeLevel": "low",
    "audienceEngagement": 40
  },
  "compliance": {
    "isAgeRestricted": false,
    "ageRating": "PG",
    "flaggedContent": [],
    "recommendedBroadcastWindow": "EVENING"
  },
  "editorial": {
    "broadcastSuitability": "STANDARD",
    "suggestedTimeSlot": "20:00 - 21:00",
    "targetAudienceVibe": "Khán giả đại chúng có thói quen nghe nhạc vào khung giờ tối.",
    "riskWarnings": "Phù hợp mọi đối tượng.",
    "contentAssessment": {
      "summary": "Chương trình âm nhạc; mô tả hiện có chưa cung cấp thông tin về thể loại, diễn viên hay nội dung cụ thể.",
      "highlights": [],
      "strengths": [],
      "weaknesses": [
        "Mô tả chương trình quá ngắn để đánh giá nội dung và hình thức"
      ],
      "narrativeFlow": "Chưa đủ thông tin để đánh giá nhịp độ và mạch dẫn dắt.",
      "targetAudienceDetails": "Chưa đủ thông tin để xác định nhóm khán giả mục tiêu cụ thể."
    },
    "formatAssessment": {
      "productionFormat": "Chương trình âm nhạc",
      "pacing": "MODERATE",
      "visualAudioRequirements": [
        "Hệ thống âm thanh stereo tiêu chuẩn phát sóng",
        "Đồ họa nhận diện chương trình"
      ],
      "interactivityLevel": "MEDIUM",
      "technicalRecommendations": "Cần bổ sung mô tả chương trình trước khi đánh giá kỹ thuật dàn dựng."
    },
    "scoringBreakdown": {
      "contentQuality": 45,
      "productionValue": 55,
      "audienceAppeal": 40,
      "complianceSafety": 96,
      "commercialPotential": 55,
      "overallScore": 57,
      "grade": "C"
    },
    "grounding": {
      "sourceExcerpts": [
        "Chương trình âm nhạc"
      ],
      "infoGaps": [
        "Không rõ thể loại âm nhạc",
        "Không nêu diễn viên hoặc nghệ sĩ tham gia",
        "Không rõ thời lượng chương trình",
        "Không rõ khung giờ phát sóng dự kiến"
      ],
      "groundingScore": 30
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

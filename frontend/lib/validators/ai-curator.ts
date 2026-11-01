// ============================================================
// OmniCast - AI Curator Request Schema
// Used by /studio/curator before calling /ai-curator/analyze.
// ============================================================

import { z } from 'zod';
import { LIMITS } from '@/lib/constants/limits';

export const aiCuratorRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(LIMITS.AI_TITLE_MIN, `Tiêu đề phải có ít nhất ${LIMITS.AI_TITLE_MIN} ký tự`)
    .max(LIMITS.AI_TITLE_MAX, `Tiêu đề tối đa ${LIMITS.AI_TITLE_MAX} ký tự`),

  description: z
    .string()
    .trim()
    .max(LIMITS.AI_DESCRIPTION_MAX, `Mô tả tối đa ${LIMITS.AI_DESCRIPTION_MAX} ký tự`)
    .optional()
    .or(z.literal('')),

  category: z.string().max(60).optional().or(z.literal('')),
  language: z
    .string()
    .trim()
    .min(2, 'Mã ngôn ngữ tối thiểu 2 ký tự')
    .max(10)
    .optional()
    .or(z.literal('')),

  scheduledAt: z
    .string()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Thời gian không hợp lệ')
    .optional()
    .or(z.literal('')),

  tags: z
    .preprocess(
      (val) => {
        if (!Array.isArray(val)) return val;
        return val
          .map((t) => (typeof t === 'string' ? t.trim() : ''))
          .filter((t) => t.length > 0);
      },
      z
        .array(
          z
            .string()
            .trim()
            .min(1, 'Tag không được để trống')
            .max(LIMITS.TAG_MAX_LEN, `Tag tối đa ${LIMITS.TAG_MAX_LEN} ký tự`),
        )
        .max(LIMITS.AI_TAGS_MAX, `Tối đa ${LIMITS.AI_TAGS_MAX} tag`),
    )
    .optional(),

  /**
   * Program duration in seconds. The model uses it to judge pacing
   * and to avoid suggesting a slot that can't hold the content.
   */
  duration: z
    .number()
    .int('Thời lượng phải là số nguyên')
    .min(0, 'Thời lượng không thể âm')
    .max(LIMITS.DURATION_MAX_SEC, `Thời lượng tối đa ${LIMITS.DURATION_MAX_SEC} giây`)
    .optional(),

  channelName: z.string().max(120).optional().or(z.literal('')),
});
export type AiCuratorRequestInput = z.infer<typeof aiCuratorRequestSchema>;

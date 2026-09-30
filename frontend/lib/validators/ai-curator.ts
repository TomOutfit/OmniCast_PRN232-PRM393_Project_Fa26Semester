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
    .min(2, 'Mã ngôn ngữ tối thiểu 2 ký tự')
    .max(10)
    .optional(),

  scheduledAt: z
    .string()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Thời gian không hợp lệ')
    .optional()
    .or(z.literal('')),

  tags: z
    .array(z.string().trim().min(1).max(LIMITS.TAG_MAX_LEN))
    .max(LIMITS.AI_TAGS_MAX, `Tối đa ${LIMITS.AI_TAGS_MAX} tag`)
    .optional(),

  channelName: z.string().max(120).optional().or(z.literal('')),
});
export type AiCuratorRequestInput = z.infer<typeof aiCuratorRequestSchema>;
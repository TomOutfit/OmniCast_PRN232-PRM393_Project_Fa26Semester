// ============================================================
// OmniCast - Program / Live Event Validation Schema
// Includes business rules:
//   - Title min 3, max LIMITS.PROGRAM_TITLE_MAX
//   - Tags must respect count + length limits
//   - duration (if provided) must be in [1m, 24h]
//   - External URLs must be https when contentSource === EXTERNAL
//
// NOTE: The future-scheduledAt rule is enforced by `assertFutureSchedule`
// at the page level (not inside the schema), because Zod 3 superRefine
// has no way to pass a context flag.
// ============================================================

import { z } from 'zod';
import {
  LIMITS,
  URL_REGEX,
  SUPPORTED_LANGUAGE_CODES,
} from '@/lib/constants/limits';
import { channelCategoryValues } from './channel';

const httpsUrl = z
  .string()
  .trim()
  .refine((v) => URL_REGEX.test(v), 'URL không hợp lệ');

const optionalHttpsUrl = httpsUrl.optional().or(z.literal(''));

/**
 * Base shape used for both the full create schema (with refinement)
 * and the PATCH schema (with .partial()).
 */
const programShape = z.object({
  title: z
    .string()
    .trim()
    .min(LIMITS.PROGRAM_TITLE_MIN, `Tiêu đề phải có ít nhất ${LIMITS.PROGRAM_TITLE_MIN} ký tự`)
    .max(LIMITS.PROGRAM_TITLE_MAX, `Tiêu đề tối đa ${LIMITS.PROGRAM_TITLE_MAX} ký tự`),

  description: z
    .string()
    .trim()
    .max(LIMITS.PROGRAM_DESCRIPTION_MAX, `Mô tả tối đa ${LIMITS.PROGRAM_DESCRIPTION_MAX} ký tự`)
    .optional()
    .or(z.literal('')),

  contentSource: z.enum(['EXTERNAL', 'UPLOADED', 'GENERATED'], {
    errorMap: () => ({ message: 'Nguồn nội dung không hợp lệ' }),
  }),

  externalUrl: optionalHttpsUrl,
  embedCode: z.string().max(10_000).optional().or(z.literal('')),
  streamUrl: optionalHttpsUrl,

  channelId: z.string().min(1, 'Vui lòng chọn kênh phát sóng'),

  category: z.enum(channelCategoryValues).optional(),

  scheduledAt: z
    .string()
    .min(1, 'Vui lòng chọn thời gian phát sóng')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Thời gian không hợp lệ'),

  durationSeconds: z
    .number()
    .int('Thời lượng phải là số nguyên')
    .min(LIMITS.DURATION_MIN_SEC, `Thời lượng tối thiểu ${Math.round(LIMITS.DURATION_MIN_SEC / 60)} phút`)
    .max(LIMITS.DURATION_MAX_SEC, 'Thời lượng tối đa 24 giờ')
    .optional(),

  language: z.enum(SUPPORTED_LANGUAGE_CODES).default('vi'),

  quality: z
    .enum(['AUTO', 'SD_480P', 'HD_720P', 'FULL_HD_1080P', 'QHD_1440P', 'UHD_4K'])
    .default('AUTO'),

  tags: z
    .array(
      z
        .string()
        .trim()
        .min(LIMITS.TAG_MIN_LEN)
        .max(LIMITS.TAG_MAX_LEN, `Mỗi tag tối đa ${LIMITS.TAG_MAX_LEN} ký tự`),
    )
    .max(LIMITS.TAGS_MAX, `Tối đa ${LIMITS.TAGS_MAX} tag`)
    .default([]),

  autoRecord: z.boolean().default(false),
  chatEnabled: z.boolean().default(true),
  slowMode: z.boolean().default(false),
});

export const programSchema = programShape.superRefine((data, ctx) => {
  // Business rule: external content requires externalUrl OR embedCode OR streamUrl
  if (data.contentSource !== 'EXTERNAL') return;
  const hasAny = !!data.externalUrl || !!data.embedCode || !!data.streamUrl;
  if (!hasAny) {
    ctx.addIssue({
      path: ['externalUrl'],
      code: z.ZodIssueCode.custom,
      message: 'Nội dung ngoài cần ít nhất 1 trong: externalUrl, embedCode, streamUrl',
    });
  }
});
export type ProgramInput = z.infer<typeof programSchema>;

/** PATCH form — all fields optional. */
export const programPatchSchema = programShape.partial();
export type ProgramPatchInput = z.infer<typeof programPatchSchema>;

/**
 * Standalone validator for the "scheduled time must be in the future" rule.
 * Use in forms to inject the error into the RHF error map under `scheduledAt`.
 */
export function assertFutureSchedule(
  scheduledAt: string,
  now: Date = new Date(),
): string | null {
  const ts = Date.parse(scheduledAt);
  if (Number.isNaN(ts)) return null; // already caught by the schema
  if (ts <= now.getTime()) {
    return 'Thời gian phát sóng phải ở trong tương lai';
  }
  return null;
}
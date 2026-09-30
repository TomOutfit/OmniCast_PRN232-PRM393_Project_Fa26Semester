// ============================================================
// OmniCast - Channel Validation Schema
// Used by the "create channel" / "edit channel" forms.
// Includes business rules:
//   - Slug must match kebab-case
//   - Logo URL must be https
//   - Banner color must be hex (#RGB or #RRGGBB)
//   - Language must be one of SUPPORTED_LANGUAGE_CODES
// ============================================================

import { z } from 'zod';
import { LIMITS, SLUG_REGEX, HEX_COLOR_REGEX } from '@/lib/constants/limits';
import { SUPPORTED_LANGUAGE_CODES } from '@/lib/constants/limits';
import { CATEGORY_LIST } from '@/lib/constants/categories';

export const channelCategoryValues = CATEGORY_LIST.map((c) => c.value) as [
  (typeof CATEGORY_LIST)[number]['value'],
  ...(typeof CATEGORY_LIST)[number]['value'][],
];

const httpsUrl = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https:\/\/[^\s]+$/i.test(v), {
    message: 'URL phải bắt đầu bằng https://',
  })
  .optional()
  .or(z.literal(''));

export const channelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(LIMITS.CHANNEL_NAME_MIN, `Tên kênh phải có ít nhất ${LIMITS.CHANNEL_NAME_MIN} ký tự`)
    .max(LIMITS.CHANNEL_NAME_MAX, `Tên kênh không quá ${LIMITS.CHANNEL_NAME_MAX} ký tự`),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(LIMITS.CHANNEL_SLUG_MIN, `Slug phải có ít nhất ${LIMITS.CHANNEL_SLUG_MIN} ký tự`)
    .max(LIMITS.CHANNEL_SLUG_MAX, `Slug không quá ${LIMITS.CHANNEL_SLUG_MAX} ký tự`)
    .regex(SLUG_REGEX, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang'),

  tagline: z
    .string()
    .trim()
    .max(LIMITS.CHANNEL_TAGLINE_MAX, `Khẩu hiệu tối đa ${LIMITS.CHANNEL_TAGLINE_MAX} ký tự`)
    .optional()
    .or(z.literal('')),

  description: z
    .string()
    .trim()
    .max(LIMITS.CHANNEL_DESCRIPTION_MAX, `Mô tả tối đa ${LIMITS.CHANNEL_DESCRIPTION_MAX} ký tự`)
    .optional()
    .or(z.literal('')),

  category: z.enum(channelCategoryValues, {
    errorMap: () => ({ message: 'Vui lòng chọn thể loại hợp lệ' }),
  }),

  language: z.enum(SUPPORTED_LANGUAGE_CODES, {
    errorMap: () => ({ message: 'Ngôn ngữ không được hỗ trợ' }),
  }),

  region: z
    .string()
    .trim()
    .max(60, 'Tên khu vực tối đa 60 ký tự')
    .optional()
    .or(z.literal('')),

  logoUrl: httpsUrl,
  bannerUrl: httpsUrl,
  badgeUrl: httpsUrl,

  bannerColor: z
    .string()
    .trim()
    .refine((v) => v === '' || HEX_COLOR_REGEX.test(v), {
      message: 'Màu nền phải là hex (ví dụ #1A1F30)',
    })
    .optional()
    .or(z.literal('')),

  isPublic: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  requireSub: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});
export type ChannelInput = z.infer<typeof channelSchema>;

/** Same as channelSchema but every field optional, for PATCH requests */
export const channelPatchSchema = channelSchema.partial();
export type ChannelPatchInput = z.infer<typeof channelPatchSchema>;
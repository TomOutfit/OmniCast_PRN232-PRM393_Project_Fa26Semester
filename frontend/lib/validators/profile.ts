// ============================================================
// OmniCast - Profile Validation Schema
// Used by /profile and any "edit my profile" form.
// ============================================================

import { z } from 'zod';
import { LIMITS } from '@/lib/constants/limits';

const optionalUrl = z
  .string()
  .trim()
  .max(500, 'URL quá dài')
  .refine(
    (v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v),
    'URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)',
  )
  .optional()
  .or(z.literal(''));

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(LIMITS.FULL_NAME_MIN, `Họ tên phải có ít nhất ${LIMITS.FULL_NAME_MIN} ký tự`)
    .max(LIMITS.FULL_NAME_MAX, `Họ tên không quá ${LIMITS.FULL_NAME_MAX} ký tự`),
  bio: z
    .string()
    .trim()
    .max(280, 'Tiểu sử không quá 280 ký tự')
    .optional()
    .or(z.literal('')),
  avatarUrl: optionalUrl,
});
export type ProfileInput = z.infer<typeof profileSchema>;
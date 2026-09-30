// ============================================================
// OmniCast - Auth Validation Schemas
// Login, register, change password, forgot / reset password.
// All schemas are derived from `lib/constants/limits.ts` so
// limits can be changed in one place.
// ============================================================

import { z } from 'zod';
import { LIMITS } from '@/lib/constants/limits';

// ----- Shared primitives -----
const emailSchema = z
  .string()
  .min(1, 'Email không được để trống')
  .email('Email không hợp lệ')
  .max(254, 'Email quá dài')
  .transform((v) => v.trim().toLowerCase());

const passwordSchema = z
  .string()
  .min(LIMITS.PASSWORD_MIN, `Mật khẩu phải có ít nhất ${LIMITS.PASSWORD_MIN} ký tự`)
  .max(LIMITS.PASSWORD_MAX, `Mật khẩu không quá ${LIMITS.PASSWORD_MAX} ký tự`);

const strongPasswordSchema = passwordSchema
  .regex(/[A-Z]/, 'Phải chứa ít nhất 1 chữ hoa')
  .regex(/[a-z]/, 'Phải chứa ít nhất 1 chữ thường')
  .regex(/[0-9]/, 'Phải chứa ít nhất 1 số');

const fullNameSchema = z
  .string()
  .min(LIMITS.FULL_NAME_MIN, `Họ tên phải có ít nhất ${LIMITS.FULL_NAME_MIN} ký tự`)
  .max(LIMITS.FULL_NAME_MAX, `Họ tên không quá ${LIMITS.FULL_NAME_MAX} ký tự`)
  .transform((v) => v.trim());

// ----- Login -----
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ----- Register -----
export const registerSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Bạn phải đồng ý với điều khoản sử dụng' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

/** Live password-strength checklist used by the register page */
export const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: `Ít nhất ${LIMITS.PASSWORD_MIN} ký tự` },
  { id: 'upper', label: 'Ít nhất 1 chữ hoa' },
  { id: 'lower', label: 'Ít nhất 1 chữ thường' },
  { id: 'number', label: 'Ít nhất 1 số' },
] as const;
export type PasswordRequirementId = (typeof PASSWORD_REQUIREMENTS)[number]['id'];

export function checkPasswordRequirements(pw: string): Record<PasswordRequirementId, boolean> {
  return {
    length: pw.length >= LIMITS.PASSWORD_MIN,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
  };
}

// ----- Change password -----
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: strongPasswordSchema,
    confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmNewPassword'],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ----- Forgot password -----
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ----- Reset password -----
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token không được để trống'),
    newPassword: strongPasswordSchema,
    confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmNewPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
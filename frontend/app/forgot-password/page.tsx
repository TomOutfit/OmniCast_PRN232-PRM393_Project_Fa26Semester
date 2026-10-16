'use client';

/**
 * OmniCast · Forgot Password Page
 * ─────────────────────────────────────────────────────────────────────
 * Dark cinematic theme matching the rest of the OmniCast UI. Provides:
 *  1. Email submission step (forgot)
 *  2. Reset-password step (uses token from email link)
 *
 * The page is fully self-contained — it talks directly to the backend
 * `/auth/forgot-password` and `/auth/reset-password` endpoints. No
 * global auth context involvement (a user who forgot their password
 * isn't logged in).
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Loader2,
  Mail,
  Lock,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api';
import { parseApiError, errorMessage } from '@/lib/errors/api-error';
import { cn } from '@/lib/utils';

const emailSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

const resetSchema = z
  .object({
    resetToken: z.string().min(10, 'Token không hợp lệ'),
    newPassword: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(100, 'Mật khẩu quá dài'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type EmailInput = z.infer<typeof emailSchema>;
type ResetInput = z.infer<typeof resetSchema>;

type Step = 'request' | 'success' | 'reset' | 'resetSuccess';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailForm = useForm<EmailInput>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  });

  const resetForm = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { resetToken: '', newPassword: '', confirmPassword: '' },
    mode: 'onSubmit',
  });

  // Detect token in URL on mount so deep links work without extra routes.
  if (typeof window !== 'undefined' && step === 'request') {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      resetForm.setValue('resetToken', token);
      setStep('reset');
    }
  }

  const handleEmailSubmit = async (data: EmailInput) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email });
      setEmail(data.email);
      setStep('success');
      toast.success(
        'Yêu cầu đã được ghi nhận. Kiểm tra email của bạn để nhận liên kết đặt lại.',
      );
    } catch (err) {
      const msg = errorMessage(err);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (data: ResetInput) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', {
        resetToken: data.resetToken,
        newPassword: data.newPassword,
      });
      setStep('resetSuccess');
      toast.success('Đổi mật khẩu thành công! Bạn có thể đăng nhập lại.');
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      const msg = errorMessage(err);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050810] via-[#0a0f1c] to-[#050810] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,242,254,0.04),transparent_70%)]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đăng nhập
          </Link>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 border border-cyan-500/30">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
              Bảo mật
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
          {/* Step: Request */}
          {step === 'request' && (
            <>
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/30">
                  <KeyRound className="h-7 w-7 text-cyan-300" />
                </div>
                <h1 className="text-2xl font-bold text-white">Quên mật khẩu?</h1>
                <p className="mt-2 text-sm text-slate-400 max-w-xs">
                  Nhập email của bạn — chúng tôi sẽ gửi liên kết để đặt lại mật
                  khẩu trong vòng 60 phút.
                </p>
              </div>

              <form
                onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-xs font-semibold text-slate-200"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="email@example.com"
                      className={cn(
                        'pl-10 h-11',
                        emailForm.formState.errors.email &&
                          'border-red-500/60 focus-visible:ring-red-500/30',
                      )}
                      {...emailForm.register('email')}
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-400">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang gửi yêu cầu…
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Gửi liên kết đặt lại
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 border border-emerald-400/40">
                <CheckCircle2 className="h-9 w-9 text-emerald-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Đã gửi liên kết!</h2>
              <p className="mt-2 text-sm text-slate-400 max-w-sm">
                Nếu email <strong className="text-cyan-300">{email}</strong>{' '}
                thuộc về một tài khoản đang hoạt động, chúng tôi đã gửi một
                liên kết đặt lại mật khẩu. Liên kết sẽ hết hạn sau 60 phút.
              </p>
              <div className="mt-6 space-y-2 text-left w-full max-w-xs">
                <ChecklistItem text="Mở email của bạn" />
                <ChecklistItem text="Nhấp vào liên kết đặt lại" />
                <ChecklistItem text="Đặt mật khẩu mới (tối thiểu 8 ký tự)" />
                <ChecklistItem text="Đăng nhập lại" />
              </div>
              <button
                type="button"
                onClick={() => setStep('reset')}
                className="mt-6 text-xs font-semibold text-cyan-300 hover:underline"
              >
                Tôi đã có token — nhập thủ công
              </button>
              <Link
                href="/login"
                className="mt-3 text-xs text-slate-500 hover:text-slate-300"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          )}

          {/* Step: Reset */}
          {step === 'reset' && (
            <>
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/30">
                  <Lock className="h-7 w-7 text-cyan-300" />
                </div>
                <h1 className="text-2xl font-bold text-white">Đặt lại mật khẩu</h1>
                <p className="mt-2 text-sm text-slate-400 max-w-xs">
                  Nhập token từ email và mật khẩu mới của bạn.
                </p>
              </div>

              <form
                onSubmit={resetForm.handleSubmit(handleResetSubmit)}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="resetToken"
                    className="mb-1.5 block text-xs font-semibold text-slate-200"
                  >
                    Reset Token
                  </label>
                  <Input
                    id="resetToken"
                    placeholder="Dán token từ email vào đây"
                    className={cn(
                      'h-11 font-mono text-xs',
                      resetForm.formState.errors.resetToken &&
                        'border-red-500/60 focus-visible:ring-red-500/30',
                    )}
                    {...resetForm.register('resetToken')}
                  />
                  {resetForm.formState.errors.resetToken && (
                    <p className="mt-1 text-xs text-red-400">
                      {resetForm.formState.errors.resetToken.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="mb-1.5 block text-xs font-semibold text-slate-200"
                  >
                    Mật khẩu mới
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
                    className={cn(
                      'h-11',
                      resetForm.formState.errors.newPassword &&
                        'border-red-500/60 focus-visible:ring-red-500/30',
                    )}
                    {...resetForm.register('newPassword')}
                  />
                  {resetForm.formState.errors.newPassword && (
                    <p className="mt-1 text-xs text-red-400">
                      {resetForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-xs font-semibold text-slate-200"
                  >
                    Xác nhận mật khẩu
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
                    className={cn(
                      'h-11',
                      resetForm.formState.errors.confirmPassword &&
                        'border-red-500/60 focus-visible:ring-red-500/30',
                    )}
                    {...resetForm.register('confirmPassword')}
                  />
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-400">
                      {resetForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang cập nhật…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Đặt mật khẩu mới
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step: Success after reset */}
          {step === 'resetSuccess' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 border border-emerald-400/40">
                <CheckCircle2 className="h-9 w-9 text-emerald-300" />
              </div>
              <h2 className="text-xl font-bold text-white">Đổi mật khẩu thành công</h2>
              <p className="mt-2 text-sm text-slate-400 max-w-sm">
                Đang chuyển đến trang đăng nhập…
              </p>
              <Loader2 className="mt-4 h-5 w-5 animate-spin text-cyan-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-2">
      <div className="grid h-5 w-5 place-items-center rounded-full bg-cyan-500/15">
        <Sparkles className="h-3 w-3 text-cyan-300" />
      </div>
      <span className="text-xs text-slate-300">{text}</span>
    </div>
  );
}

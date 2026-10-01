'use client';

/**
 * OmniCast · Register Page
 * ─────────────────────────────────────────────────────────────────────
 * Re-designed against the canonical Stitch "Live TV & EPG" design system
 * (matches the Login page DNA exactly):
 *  • Deep-navy surface  #0F131D  + cyan primary  #00F2FE
 *  • Outfit (display) + Inter (body) + JetBrains Mono (telemetry labels)
 *  • Glass blur · animated ON-AIR pulse · LIVE telemetry card
 *  • Live password-strength checklist (Stitch-style status pills)
 *  • Multi-step progress indicator · Terms agreement · Social placeholders
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Tv,
  Lock,
  Mail,
  User,
  CircleUserRound,
  ShieldCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import {
  registerSchema,
  PASSWORD_REQUIREMENTS,
  checkPasswordRequirements,
  type RegisterInput,
  type PasswordRequirementId,
} from '@/lib/validators/auth';
import { parseApiError } from '@/lib/errors/api-error';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, label: 'Tài khoản', icon: User },
  { id: 2, label: 'Bảo mật', icon: Lock },
  { id: 3, label: 'Hoàn tất', icon: ShieldCheck },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  const password = watch('password', '');
  const reqStatus: Record<PasswordRequirementId, boolean> =
    checkPasswordRequirements(password);

  const [step, setStep] = useState(1);
  const nextStep = async () => {
    let fields: (keyof RegisterInput)[] = [];
    if (step === 1) fields = ['fullName', 'email'];
    if (step === 2) fields = ['password', 'confirmPassword'];
    const ok = await trigger(fields);
    if (ok) setStep((s) => Math.min(3, s + 1));
  };
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      const res = await registerUser({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });
      toast.success('Đăng ký thành công!', {
        description: `Chào mừng ${res.user.fullName || res.user.email} đến với OmniCast!`,
      });
      router.push('/');
      router.refresh();
    } catch (rawError) {
      const api = parseApiError(rawError);
      const description =
        api.fieldError('email') ??
        api.fieldError('fullName') ??
        api.fieldError('password') ??
        api.fieldError('_form') ??
        api.message;
      toast.error('Đăng ký thất bại', { description });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-surface text-on-surface">
      <a href="#register-form" className="skip-link">
        Bỏ qua đến form đăng ký
      </a>

      {/* Decorative backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-stitch-hero" />
        <div className="absolute inset-0 bg-stitch-grid opacity-[0.04] [background-size:32px_32px]" />
        <div className="absolute -top-40 right-1/4 h-[520px] w-[520px] rounded-full bg-primary-cyan-container/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-secondary/15 blur-[140px]" />
        <div className="absolute top-1/2 left-0 h-[360px] w-[360px] rounded-full bg-tertiary-container/10 blur-[140px]" />
      </div>

      <div className="relative grid min-h-[calc(100vh-4rem)] w-full grid-cols-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-2xl animate-slide-up">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <Link href="/" className="mb-6 inline-flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary-cyan-container/40 blur-md" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-cyan-container to-secondary">
                  <Tv className="h-6 w-6 text-primary-cyan-on" strokeWidth={2.4} />
                </div>
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="font-display text-xl font-extrabold tracking-tight text-primary-cyan">
                  OmniCast
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                  New Account · Tier 01
                </span>
              </div>
            </Link>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-cyan-container/30 bg-primary-cyan-container/10 px-3 py-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-live-pulse rounded-full bg-primary-cyan-container" />
              </span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-cyan-container">
                Đăng ký tài khoản // Welcome
              </span>
            </div>

            <h1 className="font-display text-4xl font-extrabold tracking-tight text-primary-cyan">
              Tạo tài khoản mới
            </h1>
            <p className="mt-2 max-w-md text-on-surface-variant">
              Đăng ký để mở khoá 524 kênh trực tiếp, kho VOD 4K HDR và các
              tính năng AI Curator cá nhân hoá.
            </p>
          </div>

          {/* Stepper */}
          <div className="mb-6 flex items-center justify-center">
            <div className="flex w-full max-w-md items-center">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = step === s.id;
                const isDone = step > s.id;
                return (
                  <div key={s.id} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all',
                          isActive
                            ? 'border-primary-cyan-container bg-primary-cyan-container text-primary-cyan-on shadow-glow-cyan'
                            : isDone
                              ? 'border-primary-cyan-container bg-primary-cyan-container/20 text-primary-cyan-container'
                              : 'border-outline-variant bg-surface-container text-outline',
                        )}
                      >
                        {isDone ? (
                          <Check className="h-4 w-4" strokeWidth={3} />
                        ) : (
                          <Icon className="h-4 w-4" strokeWidth={2.2} />
                        )}
                      </div>
                      <span
                        className={cn(
                          'font-mono text-[10px] font-bold uppercase tracking-wider',
                          isActive
                            ? 'text-primary-cyan-container'
                            : isDone
                              ? 'text-primary-cyan'
                              : 'text-outline',
                        )}
                      >
                        {String(s.id).padStart(2, '0')} · {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          'mx-2 h-px flex-1 transition-colors',
                          step > s.id
                            ? 'bg-primary-cyan-container'
                            : 'bg-outline-variant',
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Card */}
          <div
            id="register-form"
            className="glass-card relative overflow-hidden p-7 sm:p-8"
          >
            {/* Top telemetry strip */}
            <div className="mb-6 flex items-center justify-between rounded-lg bg-surface-container-lowest/80 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-live-pulse rounded-full bg-primary-cyan-container" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-cyan-container" />
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary-cyan-container">
                  Secure Channel
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                <CircleUserRound className="-mt-0.5 mr-1 inline h-3 w-3" />
                Registration · Tier 01
              </span>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              {/* Step 1 — Account */}
              {step === 1 && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <label
                      htmlFor="fullName"
                      className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant"
                    >
                      Họ và tên
                    </label>
                    <div className="group relative">
                      <User
                        aria-hidden="true"
                        className={cn(
                          'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                          errors.fullName
                            ? 'text-error'
                            : 'text-outline group-focus-within:text-primary-cyan-container',
                        )}
                      />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Nguyễn Văn A"
                        autoComplete="name"
                        aria-invalid={!!errors.fullName}
                        className={cn(
                          'h-12 rounded-xl border-outline-variant bg-surface-container-lowest pl-11 pr-3 font-sans text-base text-primary-cyan placeholder:text-outline focus:border-primary-cyan-container focus:ring-1 focus:ring-primary-cyan-container/40',
                          errors.fullName &&
                            'border-error focus:border-error focus:ring-error/40',
                        )}
                        {...register('fullName')}
                      />
                    </div>
                    {errors.fullName && (
                      <p
                        role="alert"
                        className="flex items-center gap-1.5 font-mono text-[11px] text-error"
                      >
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="uppercase tracking-wider">
                          {errors.fullName.message}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant"
                    >
                      Email
                    </label>
                    <div className="group relative">
                      <Mail
                        aria-hidden="true"
                        className={cn(
                          'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                          errors.email
                            ? 'text-error'
                            : 'text-outline group-focus-within:text-primary-cyan-container',
                        )}
                      />
                      <Input
                        id="email"
                        type="email"
                        placeholder="nguoixem@omnicast.tv"
                        autoComplete="email"
                        inputMode="email"
                        spellCheck={false}
                        aria-invalid={!!errors.email}
                        className={cn(
                          'h-12 rounded-xl border-outline-variant bg-surface-container-lowest pl-11 pr-3 font-sans text-base text-primary-cyan placeholder:text-outline focus:border-primary-cyan-container focus:ring-1 focus:ring-primary-cyan-container/40',
                          errors.email &&
                            'border-error focus:border-error focus:ring-error/40',
                        )}
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p
                        role="alert"
                        className="flex items-center gap-1.5 font-mono text-[11px] text-error"
                      >
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="uppercase tracking-wider">
                          {errors.email.message}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2 — Security */}
              {step === 2 && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <label
                      htmlFor="password"
                      className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant"
                    >
                      Mật khẩu
                    </label>
                    <div className="group relative">
                      <Lock
                        aria-hidden="true"
                        className={cn(
                          'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                          errors.password
                            ? 'text-error'
                            : 'text-outline group-focus-within:text-primary-cyan-container',
                        )}
                      />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        aria-invalid={!!errors.password}
                        className={cn(
                          'h-12 rounded-xl border-outline-variant bg-surface-container-lowest pl-11 pr-11 font-sans text-base text-primary-cyan placeholder:text-outline focus:border-primary-cyan-container focus:ring-1 focus:ring-primary-cyan-container/40',
                          errors.password &&
                            'border-error focus:border-error focus:ring-error/40',
                        )}
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-outline transition-colors hover:bg-surface-container hover:text-primary-cyan"
                        aria-label={
                          showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                        }
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Live password requirements */}
                    <div className="mt-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest/70 p-3.5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary-cyan-container">
                          Password Checklist
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                          {password.length} ký tự
                        </span>
                      </div>
                      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {PASSWORD_REQUIREMENTS.map((req) => {
                          const met = reqStatus[req.id];
                          return (
                            <li
                              key={req.id}
                              className={cn(
                                'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all',
                                met
                                  ? 'border-primary-cyan-container/40 bg-primary-cyan-container/10'
                                  : 'border-outline-variant/60 bg-surface-container/40',
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-4 w-4 items-center justify-center rounded-full transition-colors',
                                  met
                                    ? 'bg-primary-cyan-container text-primary-cyan-on'
                                    : 'bg-surface-container-high text-outline',
                                )}
                              >
                                {met ? (
                                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                ) : (
                                  <X className="h-2.5 w-2.5" />
                                )}
                              </span>
                              <span
                                className={cn(
                                  'font-mono text-[10px] uppercase tracking-wider',
                                  met
                                    ? 'text-primary-cyan'
                                    : 'text-on-surface-variant',
                                )}
                              >
                                {req.label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {errors.password && (
                      <p
                        role="alert"
                        className="flex items-center gap-1.5 font-mono text-[11px] text-error"
                      >
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="uppercase tracking-wider">
                          {errors.password.message}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="confirmPassword"
                      className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant"
                    >
                      Xác nhận mật khẩu
                    </label>
                    <div className="group relative">
                      <Lock
                        aria-hidden="true"
                        className={cn(
                          'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                          errors.confirmPassword
                            ? 'text-error'
                            : 'text-outline group-focus-within:text-primary-cyan-container',
                        )}
                      />
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        aria-invalid={!!errors.confirmPassword}
                        className={cn(
                          'h-12 rounded-xl border-outline-variant bg-surface-container-lowest pl-11 pr-11 font-sans text-base text-primary-cyan placeholder:text-outline focus:border-primary-cyan-container focus:ring-1 focus:ring-primary-cyan-container/40',
                          errors.confirmPassword &&
                            'border-error focus:border-error focus:ring-error/40',
                        )}
                        {...register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-outline transition-colors hover:bg-surface-container hover:text-primary-cyan"
                        aria-label={
                          showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                        }
                        aria-pressed={showConfirm}
                      >
                        {showConfirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p
                        role="alert"
                        className="flex items-center gap-1.5 font-mono text-[11px] text-error"
                      >
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="uppercase tracking-wider">
                          {errors.confirmPassword.message}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3 — Terms + submit */}
              {step === 3 && (
                <div className="space-y-5 animate-fade-in">
                  {/* Summary card */}
                  <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest/70 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary-cyan-container">
                        Xác nhận thông tin
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                        Bước 03 / 03
                      </span>
                    </div>
                    <SummaryRow
                      label="Họ tên"
                      value={watch('fullName') || '—'}
                    />
                    <SummaryRow
                      label="Email"
                      value={watch('email') || '—'}
                    />
                    <SummaryRow
                      label="Mật khẩu"
                      value="••••••••"
                      mono
                    />
                  </div>

                  {/* Terms */}
                  <div className="flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest/70 p-4">
                    <label
                      htmlFor="terms"
                      className="inline-flex cursor-pointer items-start gap-3 text-sm text-on-surface-variant"
                    >
                      <span className="relative mt-0.5 inline-flex">
                        <input
                          id="terms"
                          type="checkbox"
                          className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-outline-variant bg-surface-container-lowest transition-colors checked:border-primary-cyan-container checked:bg-primary-cyan-container focus:outline-none focus:ring-2 focus:ring-primary-cyan-container/40"
                          {...register('acceptTerms')}
                        />
                        <svg
                          viewBox="0 0 16 16"
                          aria-hidden="true"
                          className="pointer-events-none absolute left-0 top-0 h-4 w-4 scale-0 text-primary-cyan-on transition-transform peer-checked:scale-100"
                        >
                          <path
                            fill="currentColor"
                            d="M13.5 4.5 6 12 2.5 8.5l1-1L6 10l6.5-6.5z"
                          />
                        </svg>
                      </span>
                      <span>
                        Tôi đồng ý với{' '}
                        <Link
                          href="/terms"
                          className="font-medium text-primary-cyan-container hover:text-primary-cyan"
                        >
                          Điều khoản sử dụng
                        </Link>{' '}
                        và{' '}
                        <Link
                          href="/privacy"
                          className="font-medium text-primary-cyan-container hover:text-primary-cyan"
                        >
                          Chính sách bảo mật
                        </Link>{' '}
                        của OmniCast.
                      </span>
                    </label>
                  </div>
                  {errors.acceptTerms && (
                    <p
                      role="alert"
                      className="flex items-center gap-1.5 font-mono text-[11px] text-error"
                    >
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span className="uppercase tracking-wider">
                        {errors.acceptTerms.message}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Nav buttons */}
              <div className="flex items-center gap-3 pt-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-outline-variant bg-transparent px-6 font-display font-bold uppercase tracking-wider text-on-surface transition-all hover:border-outline hover:bg-surface-container"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Quay lại
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className={cn(
                      'group relative ml-auto h-12 flex-1 overflow-hidden rounded-full font-display text-base font-bold tracking-tight text-primary-cyan-on transition-all sm:flex-none sm:px-8',
                      'bg-primary-cyan-container shadow-glow-cyan',
                      'hover:scale-[1.01] hover:shadow-glow-cyan',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                    )}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-primary-cyan-container via-secondary to-primary-cyan-container opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="relative flex items-center justify-center gap-2">
                      <span className="uppercase tracking-wider">Tiếp tục</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      'group relative ml-auto h-12 flex-1 overflow-hidden rounded-full font-display text-base font-bold tracking-tight text-primary-cyan-on transition-all sm:flex-none sm:px-8',
                      'bg-primary-cyan-container shadow-glow-cyan',
                      'hover:scale-[1.01] hover:shadow-glow-cyan',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                      'disabled:cursor-not-allowed disabled:opacity-70',
                    )}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-primary-cyan-container via-secondary to-primary-cyan-container opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="relative flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="uppercase tracking-wider">
                            Đang tạo…
                          </span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          <span className="uppercase tracking-wider">
                            Tạo tài khoản
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Footer CTA */}
          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-display font-bold text-primary-cyan-container transition-colors hover:text-primary-cyan"
            >
              Đăng nhập
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant/40 py-1.5 last:border-b-0">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <span
        className={cn(
          'truncate text-sm text-primary-cyan',
          mono && 'font-mono tracking-wider',
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

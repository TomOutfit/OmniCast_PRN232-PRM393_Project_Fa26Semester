'use client';

/**
 * OmniCast · Login Page
 * ─────────────────────────────────────────────────────────────────────
 * Re-designed against the canonical Stitch "Live TV & EPG" design system.
 *  • Deep-navy surface  #0F131D  + cyan primary  #00F2FE
 *  • Outfit (display) + Inter (body) + JetBrains Mono (telemetry labels)
 *  • Pill CTAs · glass blur · animated ON-AIR pulse · LIVE telemetry card
 *  • Asymmetric split: brand showcase on the left, secure-login form on
 *    the right (collapses to single column on mobile).
 *  • All previous form contracts preserved — validators, remember-me,
 *    Caps-Lock hint, social placeholders, error mapping, …
 */

import { useEffect, useRef, useState } from 'react';
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
  ChevronRight,
  Radio,
  Headphones,
  ShieldCheck,
  Sparkles,
  Tv,
  Lock,
  Mail,
  CircleUserRound,
  Bell,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { loginSchema, type LoginInput } from '@/lib/validators/auth';
import { parseApiError } from '@/lib/errors/api-error';
import { cn } from '@/lib/utils';

const REMEMBER_EMAIL_KEY = 'omnicast.lastEmail';
const REMEMBER_ME_KEY = 'omnicast.rememberMe';

// ─── Brand showcase data ──────────────────────────────────────────────
const FEATURE_HIGHLIGHTS = [
  {
    icon: Radio,
    label: '500+ KÊNH TRỰC TIẾP',
    description: 'Phát sóng 24/7 từ các đài hàng đầu Việt Nam và quốc tế',
  },
  {
    icon: Sparkles,
    label: 'AI CURATOR',
    description: 'Gợi ý cá nhân hoá theo thói quen và lịch xem của bạn',
  },
  {
    icon: Headphones,
    label: 'DOLBY ATMOS 5.1',
    description: 'Âm thanh vòm đa kênh cho trải nghiệm rạp chiếu tại nhà',
  },
  {
    icon: ShieldCheck,
    label: 'BẢO MẬT ĐA LỚP',
    description: 'JWT + refresh-token tự động, hỗ trợ 2FA và sinh trắc học',
  },
] as const;

const CHANNEL_PILLS = [
  { name: 'Omni Sport 1', color: 'bg-primary-cyan-container' },
  { name: 'Cine Premier', color: 'bg-secondary' },
  { name: 'Show Live', color: 'bg-tertiary-container' },
  { name: 'News 24/7', color: 'bg-error' },
  { name: 'Music Hits', color: 'bg-tertiary-fixed-dim' },
] as const;

interface CapsLockState {
  on: boolean;
  visible: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capsLock, setCapsLock] = useState<CapsLockState>({ on: false, visible: false });
  const [rememberMe, setRememberMe] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitted },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  // Hydrate saved email + remember-me preference
  useEffect(() => {
    try {
      const savedRemember = window.localStorage.getItem(REMEMBER_ME_KEY);
      const shouldRemember = savedRemember === '1';
      setRememberMe(shouldRemember);
      if (shouldRemember) {
        const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);
        if (savedEmail) setValue('email', savedEmail);
      }
    } catch {
      /* ignore */
    }
  }, [setValue]);

  // Focus email field on mount
  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  // Focus the first invalid field when validation fails
  useEffect(() => {
    if (isSubmitted && (errors.email || errors.password)) {
      setFocus(errors.email ? 'email' : 'password');
    }
  }, [isSubmitted, errors, setFocus]);

  // Caps-Lock detection on password field
  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const capsOn =
      typeof e.getModifierState === 'function'
        ? e.getModifierState('CapsLock')
        : false;
    setCapsLock({ on: capsOn, visible: capsOn && e.key.length === 1 });
  };
  const handlePasswordBlur = () => {
    setCapsLock((prev) => ({ ...prev, visible: false }));
  };

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const res = await login(data);
      try {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBER_EMAIL_KEY, data.email);
          window.localStorage.setItem(REMEMBER_ME_KEY, '1');
        } else {
          window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
          window.localStorage.setItem(REMEMBER_ME_KEY, '0');
        }
      } catch {
        /* ignore */
      }
      toast.success('Đăng nhập thành công!', {
        description: `Chào mừng ${res.user.fullName || res.user.email} quay trở lại!`,
      });
      router.push('/');
      router.refresh();
    } catch (rawError) {
      const api = parseApiError(rawError);
      const description =
        api.fieldError('password') ??
        api.fieldError('email') ??
        api.fieldError('_form') ??
        api.message;
      toast.error('Đăng nhập thất bại', { description });
    } finally {
      setIsLoading(false);
    }
  };

  const { ref: emailFieldRef, ...emailReg } = register('email');
  const { ref: passwordFieldRef, ...passwordReg } = register('password');

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-surface text-on-surface">
      <a href="#login-form" className="skip-link">
        Bỏ qua đến form đăng nhập
      </a>

      {/* Decorative cyber-grid + cyan radial accent (Stitch DNA) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-stitch-hero" />
        <div className="absolute inset-0 bg-stitch-grid opacity-[0.04] [background-size:32px_32px]" />
        <div className="absolute -top-40 left-1/3 h-[520px] w-[520px] rounded-full bg-primary-cyan-container/15 blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-secondary/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 h-[360px] w-[360px] rounded-full bg-tertiary-container/10 blur-[140px]" />
      </div>

      <div className="relative grid min-h-[calc(100vh-4rem)] w-full grid-cols-1 lg:grid-cols-2">
        {/* ============================================================== */}
        {/* LEFT — Brand broadcast panel (desktop only)                    */}
        {/* ============================================================== */}
        <aside className="relative hidden flex-col justify-between p-8 lg:flex lg:p-12 xl:p-16">
          {/* Logo + LIVE status */}
          <div className="flex items-center justify-between">
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary-cyan-container/40 blur-md" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-cyan-container to-secondary">
                  <Tv className="h-5 w-5 text-primary-cyan-on" strokeWidth={2.4} />
                </div>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-display text-lg font-extrabold tracking-tight text-primary-cyan">
                  OmniCast
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                  Broadcast Intelligence · v3.0
                </span>
              </div>
            </Link>

            <div className="hidden items-center gap-2 rounded-full bg-surface-container-lowest px-3 py-1.5 xl:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-live-ping rounded-full bg-error" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
              </span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-error">
                On-Air
              </span>
              <span className="ml-1 h-3 w-px bg-outline-variant" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                4K UHD
              </span>
            </div>
          </div>

          {/* Hero headline */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-cyan-container/30 bg-primary-cyan-container/10 px-3 py-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-live-pulse rounded-full bg-primary-cyan-container" />
              </span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-cyan-container">
                Secure Login // Đang trực tuyến
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-primary-cyan xl:text-6xl">
                Đăng nhập vào
                <br />
                <span className="gradient-text">không gian phát sóng</span>
                <br />
                OmniCast
              </h1>
              <p className="max-w-md text-balance text-base leading-relaxed text-on-surface-variant">
                Tiếp tục theo dõi các kênh yêu thích, cá nhân hoá lịch EPG và
                đồng bộ tiến trình xem trên mọi thiết bị — từ Smart TV đến di
                động.
              </p>
            </div>

            {/* Live telemetry card */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/70 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 animate-live-pulse rounded-full bg-error" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
                  </span>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-error">
                    Live Feed // Secure Auth
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                  TLS 1.3 · OWASP
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-outline">
                    Sessions
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-primary-cyan">
                    12.4K
                  </p>
                  <p className="font-mono text-[10px] text-on-surface-variant">
                    đang trực tuyến
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-outline">
                    Latency
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-secondary">
                    0.42<span className="text-base">s</span>
                  </p>
                  <p className="font-mono text-[10px] text-on-surface-variant">
                    sign-in p95
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-outline">
                    Channels
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-tertiary-container">
                    524
                  </p>
                  <p className="font-mono text-[10px] text-on-surface-variant">
                    toàn quốc
                  </p>
                </div>
              </div>

              {/* Channel pills */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {CHANNEL_PILLS.map((c) => (
                  <span
                    key={c.name}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1"
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', c.color)} />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface">
                      {c.name}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Feature grid */}
            <ul className="grid grid-cols-2 gap-3">
              {FEATURE_HIGHLIGHTS.map(({ icon: Icon, label, description }) => (
                <li
                  key={label}
                  className="group rounded-xl border border-outline-variant/60 bg-surface-container/60 p-3.5 transition-all hover:border-primary-cyan-container/40 hover:bg-surface-container-high"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-cyan-container/15 text-primary-cyan-container ring-1 ring-primary-cyan-container/30">
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary-cyan">
                      {label}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-on-surface-variant">
                    {description}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-outline">
            <p>© 2026 OmniCast Network</p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-on-surface transition-colors">
                Điều khoản
              </Link>
              <Link href="/privacy" className="hover:text-on-surface transition-colors">
                Bảo mật
              </Link>
            </div>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* RIGHT — Secure login form                                      */}
        {/* ============================================================== */}
        <main className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md animate-slide-up">
            {/* Mobile brand header */}
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <Link href="/" className="mb-6 inline-flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-primary-cyan-container/40 blur-md" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-cyan-container to-secondary">
                    <Tv className="h-6 w-6 text-primary-cyan-on" strokeWidth={2.4} />
                  </div>
                </div>
                <span className="font-display text-xl font-extrabold tracking-tight text-primary-cyan">
                  OmniCast
                </span>
              </Link>
              <h1 className="font-display text-3xl font-bold text-primary-cyan">
                Chào mừng trở lại
              </h1>
              <p className="mt-2 text-sm text-on-surface-variant">
                Đăng nhập để tiếp tục trải nghiệm phát sóng
              </p>
            </div>

            {/* Desktop title */}
            <div className="mb-8 hidden lg:block">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-gradient-to-r from-primary-cyan-container/60 to-transparent" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary-cyan-container">
                  AUTHENTICATION
                </span>
                <span className="h-px w-8 bg-primary-cyan-container/60" />
              </div>
              <h2 className="font-display text-4xl font-extrabold tracking-tight text-primary-cyan">
                Đăng nhập
              </h2>
              <p className="mt-2 text-on-surface-variant">
                Chào mừng bạn quay lại! Vui lòng nhập thông tin để tiếp tục.
              </p>
            </div>

            <div
              id="login-form"
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
                  Credential · JWT
                </span>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                noValidate
                aria-describedby={
                  errors.email || errors.password ? 'form-error' : undefined
                }
              >
                {/* Email Field */}
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
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      className={cn(
                        'h-12 rounded-xl border-outline-variant bg-surface-container-lowest pl-11 pr-3 font-sans text-base text-primary-cyan placeholder:text-outline focus:border-primary-cyan-container focus:ring-1 focus:ring-primary-cyan-container/40',
                        errors.email &&
                          'border-error focus:border-error focus:ring-error/40',
                      )}
                      {...emailReg}
                      ref={(el) => {
                        emailFieldRef(el);
                        emailRef.current = el;
                      }}
                    />
                  </div>
                  {errors.email && (
                    <p
                      id="email-error"
                      role="alert"
                      className="flex items-center gap-1.5 font-mono text-[11px] text-error"
                    >
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span className="uppercase tracking-wider">{errors.email.message}</span>
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant"
                    >
                      Mật khẩu
                    </label>
                    <Link
                      href="/forgot-password"
                      className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary-cyan-container transition-colors hover:text-primary-cyan"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
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
                      placeholder="Nhập mật khẩu của bạn"
                      autoComplete="current-password"
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        errors.password
                          ? 'password-error'
                          : capsLock.visible
                            ? 'caps-warning'
                            : undefined
                      }
                      className={cn(
                        'h-12 rounded-xl border-outline-variant bg-surface-container-lowest pl-11 pr-11 font-sans text-base text-primary-cyan placeholder:text-outline focus:border-primary-cyan-container focus:ring-1 focus:ring-primary-cyan-container/40',
                        errors.password &&
                          'border-error focus:border-error focus:ring-error/40',
                      )}
                      {...passwordReg}
                      ref={passwordFieldRef}
                      onKeyDown={handlePasswordKey}
                      onBlur={handlePasswordBlur}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-outline transition-colors hover:bg-surface-container hover:text-primary-cyan"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      aria-pressed={showPassword}
                      tabIndex={0}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {errors.password && (
                    <p
                      id="password-error"
                      role="alert"
                      className="flex items-center gap-1.5 font-mono text-[11px] text-error"
                    >
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span className="uppercase tracking-wider">{errors.password.message}</span>
                    </p>
                  )}

                  {!errors.password && capsLock.visible && (
                    <p
                      id="caps-warning"
                      role="status"
                      className="flex items-center gap-1.5 font-mono text-[11px] text-warning"
                    >
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span className="uppercase tracking-wider">
                        Phím Caps Lock đang bật
                      </span>
                    </p>
                  )}
                </div>

                {/* Remember me */}
                <div className="flex items-center pt-1">
                  <label
                    htmlFor="remember"
                    className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-on-surface-variant"
                  >
                    <span className="relative inline-flex">
                      <input
                        id="remember"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-outline-variant bg-surface-container-lowest transition-colors checked:border-primary-cyan-container checked:bg-primary-cyan-container focus:outline-none focus:ring-2 focus:ring-primary-cyan-container/40"
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
                    Ghi nhớ email của tôi
                  </label>
                </div>

                {/* Submit — pill button with cyan glow */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    'group relative h-12 w-full overflow-hidden rounded-full font-display text-base font-bold tracking-tight text-primary-cyan-on transition-all',
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
                        <span className="uppercase tracking-wider">Đang xác thực…</span>
                      </>
                    ) : (
                      <>
                        <span className="uppercase tracking-wider">Đăng nhập</span>
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </button>

                {/* Divider */}
                <div className="relative my-1">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center"
                  >
                    <div className="w-full border-t border-outline-variant/60" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-surface-container/80 px-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant backdrop-blur">
                      Hoặc tiếp tục với
                    </span>
                  </div>
                </div>

                {/* Social */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      toast.info('Sắp ra mắt', {
                        description:
                          'Đăng nhập bằng Google sẽ được hỗ trợ sớm.',
                      })
                    }
                    className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-medium text-on-surface transition-all hover:border-outline hover:bg-surface-container"
                  >
                    <GoogleIcon />
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info('Sắp ra mắt', {
                        description:
                          'Đăng nhập bằng GitHub sẽ được hỗ trợ sớm.',
                      })
                    }
                    className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-medium text-on-surface transition-all hover:border-outline hover:bg-surface-container"
                  >
                    <GithubIcon />
                    <span>GitHub</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Sign-up CTA */}
            <p className="mt-6 text-center text-sm text-on-surface-variant">
              Chưa có tài khoản?{' '}
              <Link
                href="/register"
                className="inline-flex items-center gap-1 font-display font-bold text-primary-cyan-container transition-colors hover:text-primary-cyan"
              >
                Đăng ký miễn phí
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </p>

            {/* Footer chips */}
            <div className="mt-6 hidden items-center justify-center gap-2 lg:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                <Lock className="h-3 w-3 text-primary-cyan-container" />
                TLS 1.3
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                <ShieldCheck className="h-3 w-3 text-secondary" />
                OWASP A02
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                <Bell className="h-3 w-3 text-tertiary-container" />
                2FA Ready
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Brand glyphs (inline SVG) ─────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.46c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.39 9.14 5.46 12 5.46Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 fill-current text-on-surface"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

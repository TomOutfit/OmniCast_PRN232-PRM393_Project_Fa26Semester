'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Tv,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Sparkles,
  Radio,
  Users,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { loginSchema, type LoginInput } from '@/lib/validators/auth';
import { parseApiError } from '@/lib/errors/api-error';
import { cn } from '@/lib/utils';

const REMEMBER_EMAIL_KEY = 'omnicast.lastEmail';
const REMEMBER_ME_KEY = 'omnicast.rememberMe';

const FEATURE_HIGHLIGHTS = [
  {
    icon: Radio,
    title: '500+ kênh trực tiếp',
    description: 'Phát sóng liên tục 24/7 từ các đài hàng đầu Việt Nam và quốc tế',
  },
  {
    icon: Sparkles,
    title: 'AI Curator thông minh',
    description: 'Gợi ý chương trình phù hợp với sở thích và thời gian của bạn',
  },
  {
    icon: Users,
    title: 'Cộng đồng sôi động',
    description: 'Bình luận, reaction và theo dõi cùng hàng triệu người xem',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo mật đa lớp',
    description: 'Mã hóa JWT, refresh token tự động và xác thực hai yếu tố',
  },
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
    // Keep last known state but hide warning until next keypress
    setCapsLock((prev) => ({ ...prev, visible: false }));
  };

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const res = await login(data);
      // Persist remember-me preference + email
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
    <div className="relative min-h-screen w-full overflow-hidden bg-dark-950">
      {/* Skip-link for a11y */}
      <a href="#login-form" className="skip-link">
        Bỏ qua đến form đăng nhập
      </a>

      {/* Decorative background — soft gradient orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-primary-600/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[420px] w-[420px] rounded-full bg-accent-cyan/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-[360px] w-[360px] rounded-full bg-primary-500/10 blur-3xl" />
      </div>

      <div className="relative grid min-h-screen w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ============================================================ */}
        {/* LEFT — Brand panel (desktop only)                            */}
        {/* ============================================================ */}
        <aside className="relative hidden flex-col justify-between p-10 lg:flex">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-3 transition-opacity hover:opacity-90"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-primary-500/40 blur-md" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-cyan">
                <Tv className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold text-white">OmniCast</span>
              <span className="text-xs text-dark-400">Nền tảng phát sóng thế hệ mới</span>
            </div>
          </Link>

          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-300">
              <Sparkles className="h-3.5 w-3.5" />
              Được tin dùng bởi hơn 2 triệu người xem
            </div>

            <div className="space-y-3">
              <h2 className="text-balance text-4xl font-bold leading-tight text-white">
                Khám phá thế giới{' '}
                <span className="gradient-text">phát sóng trực tiếp</span>{' '}
                không giới hạn
              </h2>
              <p className="max-w-md text-balance text-dark-300">
                Đăng nhập để tiếp tục theo dõi các kênh yêu thích, lưu chương trình
                vào danh sách xem và cá nhân hóa trải nghiệm với AI Curator.
              </p>
            </div>

            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FEATURE_HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="group rounded-xl border border-dark-700/60 bg-dark-800/40 p-4 transition-colors hover:border-primary-500/40 hover:bg-dark-800/70"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/30">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-white">{title}</h3>
                  <p className="text-xs leading-relaxed text-dark-400">
                    {description}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between text-xs text-dark-500">
            <p>© 2026 OmniCast. Bảo lưu mọi quyền.</p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-dark-300">
                Điều khoản
              </Link>
              <Link href="/privacy" className="hover:text-dark-300">
                Bảo mật
              </Link>
            </div>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* RIGHT — Form                                                */}
        {/* ============================================================ */}
        <main className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md animate-slide-up">
            {/* Mobile-only brand header */}
            <div className="mb-8 flex flex-col items-center text-center lg:hidden">
              <Link href="/" className="mb-6 inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-cyan">
                  <Tv className="h-7 w-7 text-white" />
                </div>
                <span className="text-xl font-bold text-white">OmniCast</span>
              </Link>
              <h1 className="text-3xl font-bold text-white">Chào mừng trở lại</h1>
              <p className="mt-2 text-dark-400">
                Đăng nhập để tiếp tục trải nghiệm
              </p>
            </div>

            {/* Desktop-only title */}
            <div className="mb-8 hidden lg:block">
              <h1 className="text-3xl font-bold text-white">Đăng nhập</h1>
              <p className="mt-2 text-dark-400">
                Chào mừng bạn quay lại! Vui lòng nhập thông tin để tiếp tục.
              </p>
            </div>

            <Card
              id="login-form"
              variant="elevated"
              className="border-dark-700/60 bg-dark-800/60 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8"
            >
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
                  <Label htmlFor="email" className="text-dark-200">
                    Email
                  </Label>
                  <div className="group relative">
                    <Mail
                      aria-hidden="true"
                      className={cn(
                        'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                        errors.email
                          ? 'text-red-400'
                          : 'text-dark-500 group-focus-within:text-primary-400',
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
                        'h-11 bg-dark-900/60 pl-10 pr-3',
                        errors.email &&
                          'border-red-500/60 focus-visible:ring-red-500/40',
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
                      className="flex items-center gap-1.5 text-sm text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-dark-200">
                      Mật khẩu
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-primary-400 transition-colors hover:text-primary-300"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <div className="group relative">
                    <Lock
                      aria-hidden="true"
                      className={cn(
                        'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
                        errors.password
                          ? 'text-red-400'
                          : 'text-dark-500 group-focus-within:text-primary-400',
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
                        'h-11 bg-dark-900/60 pl-10 pr-11',
                        errors.password &&
                          'border-red-500/60 focus-visible:ring-red-500/40',
                      )}
                      {...passwordReg}
                      ref={passwordFieldRef}
                      onKeyDown={handlePasswordKey}
                      onBlur={handlePasswordBlur}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-dark-400 transition-colors hover:bg-dark-700/60 hover:text-white"
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
                      className="flex items-center gap-1.5 text-sm text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {errors.password.message}
                    </p>
                  )}

                  {!errors.password && capsLock.visible && (
                    <p
                      id="caps-warning"
                      role="status"
                      className="flex items-center gap-1.5 text-sm text-amber-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      Phím Caps Lock đang bật
                    </p>
                  )}
                </div>

                {/* Remember me */}
                <div className="flex items-center justify-between pt-1">
                  <label
                    htmlFor="remember"
                    className="inline-flex cursor-pointer items-center gap-2 text-sm text-dark-300"
                  >
                    <input
                      id="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-dark-600 bg-dark-900 text-primary-600 transition-colors focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:ring-offset-dark-900"
                    />
                    Ghi nhớ email của tôi
                  </label>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  size="lg"
                  loading={isLoading}
                  className="h-12 w-full bg-gradient-to-r from-primary-600 to-primary-500 text-base shadow-lg shadow-primary-500/30 hover:from-primary-500 hover:to-primary-400"
                >
                  {!isLoading && (
                    <>
                      Đăng nhập
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                  {isLoading && 'Đang đăng nhập...'}
                </Button>

                {/* Divider */}
                <div className="relative my-1">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center"
                  >
                    <div className="w-full border-t border-dark-700/60" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-dark-800/60 px-3 text-dark-500">
                      hoặc tiếp tục với
                    </span>
                  </div>
                </div>

                {/* Social login placeholders */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() =>
                      toast.info('Sắp ra mắt', {
                        description: 'Đăng nhập bằng Google sẽ được hỗ trợ sớm.',
                      })
                    }
                    className="h-11 border-dark-700 bg-dark-900/40 hover:border-dark-600 hover:bg-dark-800/60"
                  >
                    <GoogleIcon />
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() =>
                      toast.info('Sắp ra mắt', {
                        description: 'Đăng nhập bằng GitHub sẽ được hỗ trợ sớm.',
                      })
                    }
                    className="h-11 border-dark-700 bg-dark-900/40 hover:border-dark-600 hover:bg-dark-800/60"
                  >
                    <GithubIcon />
                    GitHub
                  </Button>
                </div>
              </form>
            </Card>

            {/* Sign-up CTA */}
            <p className="mt-6 text-center text-sm text-dark-400">
              Chưa có tài khoản?{' '}
              <Link
                href="/register"
                className="inline-flex items-center gap-1 font-medium text-primary-400 transition-colors hover:text-primary-300"
              >
                Đăng ký miễn phí
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </p>

            {/* Mobile-only legal */}
            <p className="mt-4 text-center text-xs text-dark-500 lg:hidden">
              Bằng việc đăng nhập, bạn đồng ý với{' '}
              <Link href="/terms" className="text-primary-400 hover:text-primary-300">
                Điều khoản
              </Link>{' '}
              và{' '}
              <Link href="/privacy" className="text-primary-400 hover:text-primary-300">
                Chính sách bảo mật
              </Link>{' '}
              của chúng tôi.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------- Brand icons (inline SVG, no extra dep) ----------

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
    >
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
      className="h-4 w-4 fill-current"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
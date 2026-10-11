'use client';

/**
 * OmniCast · Login Page (Entrance Security Checkpoint)
 * ─────────────────────────────────────────────────────────────────────
 * Re-designed as a futuristic Cyber Ingress Checkpoint Gateway:
 *  • Fullscreen Checkpoint HUD (No Header / No Footer)
 *  • Master Network Logo Beacon with holographic radar & laser scan
 *  • Interactive credential verification beam
 *  • Strict validation, remember-me, Caps-Lock warning & Quick Demo credentials
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
  Fingerprint,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { loginSchema, type LoginInput } from '@/lib/validators/auth';
import { parseApiError } from '@/lib/errors/api-error';
import { cn } from '@/lib/utils';
import { CheckpointGateway } from '@/components/auth/checkpoint-gateway';

const REMEMBER_EMAIL_KEY = 'omnicast.lastEmail';
const REMEMBER_ME_KEY = 'omnicast.rememberMe';

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
    formState: { errors, isSubmitted, touchedFields },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
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

  // Focus email field on mount without triggering touched
  useEffect(() => {
    const t = setTimeout(() => {
      if (emailRef.current && !emailRef.current.value) {
        emailRef.current.focus({ preventScroll: true });
      }
    }, 250);
    return () => clearTimeout(t);
  }, []);

  // Focus the first invalid field when validation fails after submit
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
      toast.success('Xác thực cửa vào thành công!', {
        description: `Chào mừng ${res.user.fullName || res.user.email} bước vào OmniCast!`,
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
      toast.error('Xác thực thất bại', { description });
    } finally {
      setIsLoading(false);
    }
  };

  const { ref: emailFieldRef, ...emailReg } = register('email');
  const { ref: passwordFieldRef, ...passwordReg } = register('password');

  // Validation visibility: only show error after user interacts (blur/touch) or submits
  const showEmailError = Boolean(errors.email && (isSubmitted || touchedFields.email));
  const showPasswordError = Boolean(errors.password && (isSubmitted || touchedFields.password));

  // Quick fill helper for demo/grading (matched with backend database seed)
  const fillDemoAccount = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true, shouldTouch: true });
    setValue('password', pass, { shouldValidate: true, shouldTouch: true });
    toast.info('Đã điền tài khoản mẫu', { description: `Email: ${email}` });
  };

  return (
    <CheckpointGateway
      title="Đăng Nhập OmniCast"
      subtitle="Đăng nhập để xem truyền hình trực tuyến và quản lý nội dung phát sóng"
      isScanning={isLoading}
    >
      <div id="login-form" className="relative space-y-5">
        
        {/* Quick Demo Access Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-white/[0.08] text-xs">
          <span className="text-slate-400 font-medium">Tài khoản demo:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@omnicast.tv', 'Admin123!')}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('staff@omnicast.tv', 'Admin123!')}
              className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-medium transition-colors"
            >
              Staff
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('viewer1@omnicast.tv', 'Admin123!')}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium transition-colors"
            >
              Viewer
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
          aria-describedby={showEmailError || showPasswordError ? 'form-error' : undefined}
        >
          {/* Email Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="email"
                className="text-xs font-semibold text-slate-200"
              >
                Địa chỉ email
              </label>
              <span className="text-[11px] text-slate-400">Bắt buộc</span>
            </div>

            <div className="group relative">
              <Input
                id="email"
                type="email"
                placeholder="admin@omnicast.tv hoặc viewer1@omnicast.tv"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                aria-invalid={showEmailError}
                className={cn(
                  'h-11 rounded-xl border border-white/[0.1] bg-slate-950/80 px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all',
                  showEmailError && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
                )}
                {...emailReg}
                ref={(el) => {
                  emailFieldRef(el);
                  emailRef.current = el;
                }}
              />
            </div>
            {showEmailError && (
              <p
                id="email-error"
                role="alert"
                className="flex items-center gap-1.5 text-xs text-rose-400"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{errors.email?.message}</span>
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-slate-200"
              >
                Mật khẩu
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <div className="group relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu (ví dụ: Staff123!)"
                autoComplete="current-password"
                aria-invalid={showPasswordError}
                className={cn(
                  'h-11 rounded-xl border border-white/[0.1] bg-slate-950/80 pl-3.5 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all',
                  showPasswordError && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
                )}
                {...passwordReg}
                ref={passwordFieldRef}
                onKeyDown={handlePasswordKey}
                onBlur={handlePasswordBlur}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {showPasswordError && (
              <p
                id="password-error"
                role="alert"
                className="flex items-center gap-1.5 text-xs text-rose-400"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{errors.password?.message}</span>
              </p>
            )}

            {!showPasswordError && capsLock.visible && (
              <p
                id="caps-warning"
                role="status"
                className="flex items-center gap-1.5 text-xs text-amber-400"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Phím Caps Lock đang bật</span>
              </p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between pt-1">
            <label
              htmlFor="remember"
              className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300"
            >
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/[0.2] bg-slate-900 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'group relative h-11 w-full rounded-xl font-semibold text-sm text-slate-950 transition-all',
              'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400',
              'hover:shadow-lg hover:shadow-cyan-500/20 active:scale-[0.99]',
              'disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                <span>Đang đăng nhập…</span>
              </>
            ) : (
              <>
                <span>Đăng nhập</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts List */}
        <div className="pt-3 border-t border-white/[0.08]">
          <p className="text-xs text-slate-400 mb-2 font-medium">
            Phân quyền tài khoản trải nghiệm:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@omnicast.tv', 'Admin123!')}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-amber-500/40 text-left transition-all"
            >
              <span className="block text-xs font-semibold text-amber-300">
                Admin
              </span>
              <span className="block text-[11px] text-slate-400 truncate">Quản trị viên</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('staff@omnicast.tv', 'Admin123!')}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-purple-500/40 text-left transition-all"
            >
              <span className="block text-xs font-semibold text-purple-300">
                Staff
              </span>
              <span className="block text-[11px] text-slate-400 truncate">Biên tập viên</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('viewer1@omnicast.tv', 'Admin123!')}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-cyan-500/40 text-left transition-all"
            >
              <span className="block text-xs font-semibold text-cyan-300">
                Viewer
              </span>
              <span className="block text-[11px] text-slate-400 truncate">Khán giả</span>
            </button>
          </div>
        </div>

        {/* Switch to Register */}
        <div className="pt-2 text-center border-t border-white/[0.08]">
          <p className="text-xs text-slate-400">
            Chưa có tài khoản?{' '}
            <Link
              href="/register"
              className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
            >
              Tạo tài khoản mới
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>

      </div>
    </CheckpointGateway>
  );
}

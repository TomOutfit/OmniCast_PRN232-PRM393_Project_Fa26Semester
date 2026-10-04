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

  // Quick fill helper for demo/grading
  const fillDemoAccount = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    toast.info('Đã điền tài khoản mẫu', { description: `Email: ${email}` });
  };

  return (
    <CheckpointGateway
      title="Trạm Kiểm Soát Cổng Vào"
      subtitle="Xác thực danh tính người xem để kích hoạt phiên truy cập mạng phát sóng OmniCast Prime"
      badgeText="INGRESS CHECKPOINT // GATEWAY 01"
      isScanning={isLoading}
    >
      <div id="login-form" className="relative space-y-6">
        
        {/* Quick Demo Access Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#070d18] border border-cyan-500/20 text-[11px] font-mono">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tài khoản kiểm thử:</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@omnicast.tv', 'Admin@123456')}
              className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-bold hover:scale-105 transition-all"
            >
              Admin Demo
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('viewer@omnicast.tv', 'Viewer@123456')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:scale-105 transition-all"
            >
              Viewer Demo
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
          aria-describedby={errors.email || errors.password ? 'form-error' : undefined}
        >
          {/* Email Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="email"
                className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300 flex items-center gap-1"
              >
                <Mail className="w-3 h-3 text-cyan-400" />
                <span>ĐỊA CHỈ EMAIL TRUY CẬP</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">REQUIRED</span>
            </div>

            <div className="group relative">
              <Input
                id="email"
                type="email"
                placeholder="tennguoidung@omnicast.tv"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                aria-invalid={!!errors.email}
                className={cn(
                  'h-12 rounded-xl border border-slate-700 bg-[#060a12]/90 px-4 font-sans text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all',
                  errors.email && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
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
                className="flex items-center gap-1.5 font-mono text-[11px] text-rose-400"
              >
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{errors.email.message}</span>
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300 flex items-center gap-1"
              >
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>MẬT MÃ XÁC THỰC</span>
              </label>
              <Link
                href="/forgot-password"
                className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                Khôi phục mã?
              </Link>
            </div>

            <div className="group relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mã bảo mật của bạn"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                className={cn(
                  'h-12 rounded-xl border border-slate-700 bg-[#060a12]/90 pl-4 pr-11 font-sans text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all',
                  errors.password && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
                )}
                {...passwordReg}
                ref={passwordFieldRef}
                onKeyDown={handlePasswordKey}
                onBlur={handlePasswordBlur}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-cyan-300 transition-colors"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="flex items-center gap-1.5 font-mono text-[11px] text-rose-400"
              >
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{errors.password.message}</span>
              </p>
            )}

            {!errors.password && capsLock.visible && (
              <p
                id="caps-warning"
                role="status"
                className="flex items-center gap-1.5 font-mono text-[11px] text-amber-400"
              >
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>Phím Caps Lock đang bật</span>
              </p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between pt-1">
            <label
              htmlFor="remember"
              className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300 font-mono"
            >
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0"
              />
              <span>Ghi nhớ phiên trên thiết bị này</span>
            </label>

            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>TLS 1.3 ENCRYPTED</span>
            </span>
          </div>

          {/* Submit Ingress Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'group relative h-12 w-full overflow-hidden rounded-xl font-mono text-xs font-black uppercase tracking-wider text-black transition-all shadow-[0_0_20px_rgba(0,242,254,0.35)]',
              'bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-500 hover:from-cyan-300 hover:to-blue-400',
              'hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(0,242,254,0.6)]',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            <span className="relative flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>ĐANG MỞ CỔNG KIỂM SOÁT…</span>
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 text-black" />
                  <span>XÁC THỰC CỬA VÀO // TIẾN HÀNH ĐĂNG NHẬP</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </span>
          </button>
        </form>

        {/* Gate Switch Footer */}
        <div className="pt-2 text-center border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Chưa có phù hiệu nhận diện?{' '}
            <Link
              href="/register"
              className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              Cấp mới hồ sơ ngay
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>

      </div>
    </CheckpointGateway>
  );
}

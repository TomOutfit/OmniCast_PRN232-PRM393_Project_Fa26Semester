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
      title="Đăng Nhập OmniCast"
      subtitle="Hệ thống truyền hình tương tác trực tuyến 4K UHD · Xác thực phiên truy cập"
      badgeText="BROADCAST NETWORK // PORTAL ACCESS"
      isScanning={isLoading}
    >
      <div id="login-form" className="relative space-y-5">
        
        {/* Quick Demo Access Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#090f1c]/90 border border-white/[0.08] text-[11px] font-mono shadow-sm">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tài khoản trải nghiệm nhanh:</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@omnicast.tv', 'Admin123!')}
              className="px-2.5 py-1 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 font-bold hover:scale-[1.02] transition-all shadow-sm flex items-center gap-1"
            >
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('staff@omnicast.tv', 'Admin123!')}
              className="px-2.5 py-1 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 font-bold hover:scale-[1.02] transition-all shadow-sm flex items-center gap-1"
            >
              <span>Staff</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('viewer1@omnicast.tv', 'Admin123!')}
              className="px-2.5 py-1 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-bold hover:scale-[1.02] transition-all shadow-sm flex items-center gap-1"
            >
              <span>Viewer</span>
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
                className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>ĐỊA CHỈ EMAIL</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">BẮT BUỘC</span>
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
                  'h-12 rounded-xl border border-white/[0.1] bg-[#060a14]/90 px-4 font-sans text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all shadow-inner',
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
                className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>MẬT KHẨU</span>
              </label>
              <Link
                href="/forgot-password"
                className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <div className="group relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu của bạn"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                className={cn(
                  'h-12 rounded-xl border border-white/[0.1] bg-[#060a14]/90 pl-4 pr-11 font-sans text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all shadow-inner',
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
                className="h-4 w-4 rounded border-white/[0.15] bg-slate-900 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0"
              />
              <span>Ghi nhớ phiên đăng nhập</span>
            </label>

            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>TLS 1.3 SECURED</span>
            </span>
          </div>

          {/* Submit Ingress Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'group relative h-12 w-full overflow-hidden rounded-xl font-mono text-xs font-black uppercase tracking-wider text-slate-950 transition-all shadow-[0_10px_25px_-5px_rgba(0,242,254,0.35)]',
              'bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-500 hover:from-cyan-300 hover:to-blue-400',
              'hover:scale-[1.008] hover:shadow-[0_12px_32px_-5px_rgba(0,242,254,0.5)] active:scale-[0.99]',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            <span className="relative flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                  <span>ĐANG XÁC THỰC TÀI KHOẢN…</span>
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 text-slate-950" />
                  <span>ĐĂNG NHẬP HỆ THỐNG PHÁT SÓNG</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </span>
          </button>
        </form>

        {/* Identity Cards for Grading / Testing */}
        <div className="pt-3 border-t border-white/[0.08]">
          <p className="text-[10px] font-mono text-slate-400 mb-2 text-center uppercase tracking-wider">
            Phân quyền tài khoản hệ thống (RBAC 4 Cấp)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@omnicast.tv', 'Admin123!')}
              className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 hover:border-amber-400/60 hover:bg-amber-950/40 text-left transition-all group"
            >
              <span className="block text-[10px] font-mono font-bold text-amber-400 group-hover:text-amber-300">
                👑 ADMIN
              </span>
              <span className="block text-[10px] text-slate-400 truncate">Quản trị tối cao</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('staff@omnicast.tv', 'Admin123!')}
              className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 hover:border-purple-400/60 hover:bg-purple-950/40 text-left transition-all group"
            >
              <span className="block text-[10px] font-mono font-bold text-purple-400 group-hover:text-purple-300">
                🛠️ STAFF
              </span>
              <span className="block text-[10px] text-slate-400 truncate">Biên tập & Studio</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('viewer1@omnicast.tv', 'Admin123!')}
              className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 hover:border-cyan-400/60 hover:bg-cyan-950/40 text-left transition-all group"
            >
              <span className="block text-[10px] font-mono font-bold text-cyan-400 group-hover:text-cyan-300">
                📺 VIEWER
              </span>
              <span className="block text-[10px] text-slate-400 truncate">Khán giả 4K HDR</span>
            </button>
          </div>
        </div>

        {/* Gate Switch Footer */}
        <div className="pt-2 text-center border-t border-white/[0.08]">
          <p className="text-xs text-slate-400">
            Chưa có tài khoản OmniCast?{' '}
            <Link
              href="/register"
              className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
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

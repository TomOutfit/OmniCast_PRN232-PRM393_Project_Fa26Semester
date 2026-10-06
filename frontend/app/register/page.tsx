'use client';

/**
 * OmniCast · Register Page (Credential Clearance Checkpoint)
 * ─────────────────────────────────────────────────────────────────────
 * Re-designed as a futuristic Cyber Clearance Checkpoint Gateway:
 *  • Fullscreen Checkpoint HUD (No Header / No Footer)
 *  • Master Network Logo with holographic radar & laser scan
 *  • 3-Step Clearance Protocol: Danh tính -> Mật mã bảo vệ -> Cấp quyền Ingress
 *  • Live password-strength scanner pills & instant confirmation
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
  ChevronRight,
  ChevronLeft,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Fingerprint,
  Cpu,
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
import { CheckpointGateway } from '@/components/auth/checkpoint-gateway';

const STEPS = [
  { id: 1, label: 'Danh Tính', icon: User },
  { id: 2, label: 'Mật Mã', icon: Lock },
  { id: 3, label: 'Cấp Quyền', icon: ShieldCheck },
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

  const fullName = watch('fullName', '');
  const email = watch('email', '');
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
      toast.success('Cấp phù hiệu thành công!', {
        description: `Chào mừng ${res.user.fullName || res.user.email} gia nhập OmniCast Network!`,
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
      toast.error('Cấp phù hiệu thất bại', { description });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CheckpointGateway
      title="Tạo Tài Khoản Mới"
      subtitle="Đăng ký tài khoản để trải nghiệm toàn bộ hệ sinh thái truyền hình tương tác 4K UHD"
      badgeText="BROADCAST NETWORK // REGISTRATION"
      isScanning={isLoading}
    >
      <div id="register-form" className="relative space-y-5">
        
        {/* Step Progress Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#090f1c]/90 border border-white/[0.08] shadow-sm">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = step > s.id;
            const isCurrent = step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-xl text-xs font-mono font-bold transition-all',
                    isCurrent
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md font-bold'
                      : isCompleted
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-900 border border-white/[0.06] text-slate-500'
                  )}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-mono font-medium hidden sm:inline',
                    isCurrent ? 'text-cyan-300 font-bold' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                  )}
                >
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-[2px] mx-2 transition-all',
                      isCompleted ? 'bg-emerald-500/40' : 'bg-slate-800'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Multi-step Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          
          {/* ── STEP 1: Danh tính (Họ tên & Email) ── */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="fullName"
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>HỌ TÊN NGƯỜI DÙNG</span>
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  autoComplete="name"
                  className={cn(
                    'h-12 rounded-xl border border-white/[0.1] bg-[#060a14]/90 px-4 font-sans text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all shadow-inner',
                    errors.fullName && 'border-rose-500 focus:border-rose-500'
                  )}
                  {...register('fullName')}
                />
                {errors.fullName && (
                  <p className="flex items-center gap-1.5 font-mono text-[11px] text-rose-400">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span>{errors.fullName.message}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-email"
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ĐỊA CHỈ EMAIL ĐĂNG KÝ</span>
                </label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="nguoidung@omnicast.tv"
                  autoComplete="email"
                  className={cn(
                    'h-12 rounded-xl border border-white/[0.1] bg-[#060a14]/90 px-4 font-sans text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all shadow-inner',
                    errors.email && 'border-rose-500 focus:border-rose-500'
                  )}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="flex items-center gap-1.5 font-mono text-[11px] text-rose-400">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span>{errors.email.message}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="group relative h-12 w-full rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-500 text-slate-950 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:from-cyan-300 hover:to-blue-400 shadow-[0_10px_25px_-5px_rgba(0,242,254,0.35)] transition-all hover:scale-[1.008] active:scale-[0.99]"
              >
                <span>TIẾP TỤC: THIẾT LẬP MẬT KHẨU</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {/* ── STEP 2: Mật mã & Kiểm tra an ninh ── */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-password"
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>MẬT KHẨU BẢO MẬT (TỐI THIỂU 8 KÝ TỰ)</span>
                </label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu bảo mật"
                    className={cn(
                      'h-12 rounded-xl border border-white/[0.1] bg-[#060a14]/90 pl-4 pr-11 font-sans text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all shadow-inner',
                      errors.password && 'border-rose-500 focus:border-rose-500'
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-cyan-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#070d18] border border-white/[0.08] text-[11px] font-mono">
                {PASSWORD_REQUIREMENTS.map((r) => {
                  const passed = reqStatus[r.id];
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        'flex items-center gap-1.5 transition-colors',
                        passed ? 'text-emerald-400' : 'text-slate-500'
                      )}
                    >
                      <Check className={cn('w-3.5 h-3.5', passed ? 'opacity-100' : 'opacity-30')} />
                      <span>{r.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>XÁC NHẬN LẠI MẬT KHẨU</span>
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu vừa đặt"
                    className={cn(
                      'h-12 rounded-xl border border-white/[0.1] bg-[#060a14]/90 pl-4 pr-11 font-sans text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all shadow-inner',
                      errors.confirmPassword && 'border-rose-500 focus:border-rose-500'
                    )}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-cyan-300"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="flex items-center gap-1.5 font-mono text-[11px] text-rose-400">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span>{errors.confirmPassword.message}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="h-12 px-4 rounded-xl border border-white/[0.1] bg-[#0b1322] text-slate-300 hover:text-white flex items-center justify-center gap-1 font-mono text-xs font-bold transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Quay Lại</span>
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-500 text-slate-950 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:from-cyan-300 hover:to-blue-400 shadow-[0_10px_25px_-5px_rgba(0,242,254,0.35)] transition-all hover:scale-[1.008] active:scale-[0.99]"
                >
                  <span>TIẾP TỤC: XÁC THỰC THÔNG TIN</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Xác nhận & Hoàn tất cấp phù hiệu ── */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#090f1c]/90 border border-white/[0.08] space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <span className="font-mono text-[11px] text-slate-400 font-bold">TÓM TẮT THÔNG TIN TÀI KHOẢN</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                    SẴN SÀNG KÍCH HOẠT
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">HỌ TÊN:</span>
                    <span className="text-white font-bold">{fullName || 'Chưa nhập'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ĐỊA CHỈ EMAIL:</span>
                    <span className="text-cyan-300 font-bold">{email || 'Chưa nhập'}</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-white/[0.08] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Kích hoạt quyền xem hơn 500 sự kiện truyền hình 4K HDR, kho VOD và bình luận tương tác.</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="h-12 px-4 rounded-xl border border-white/[0.1] bg-[#0b1322] text-slate-300 hover:text-white flex items-center justify-center gap-1 font-mono text-xs font-bold transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sửa thông tin</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-500 text-slate-950 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:from-cyan-300 hover:to-blue-400 shadow-[0_12px_28px_-5px_rgba(0,242,254,0.45)] transition-all disabled:opacity-60 hover:scale-[1.008] active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      <span>ĐANG KÍCH HOẠT TÀI KHOẢN…</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="h-4 w-4 text-slate-950" />
                      <span>HOÀN TẤT & VÀO HỆ THỐNG PHÁT SÓNG</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </form>

        {/* Gate Switch Footer */}
        <div className="pt-2 text-center border-t border-white/[0.08]">
          <p className="text-xs text-slate-400">
            Đã có tài khoản OmniCast?{' '}
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              Đăng nhập ngay
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>

      </div>
    </CheckpointGateway>
  );
}

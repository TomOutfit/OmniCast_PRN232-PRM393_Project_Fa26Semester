'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Tv, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Phải chứa ít nhất 1 chữ hoa')
      .regex(/[a-z]/, 'Phải chứa ít nhất 1 chữ thường')
      .regex(/[0-9]/, 'Phải chứa ít nhất 1 số'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');

  const passwordRequirements = [
    { id: 'length', label: 'Ít nhất 8 ký tự', met: password.length >= 8 },
    { id: 'upper', label: 'Ít nhất 1 chữ hoa', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'Ít nhất 1 chữ thường', met: /[a-z]/.test(password) },
    { id: 'number', label: 'Ít nhất 1 số', met: /[0-9]/.test(password) },
  ];

  const onSubmit = async (data: RegisterFormData) => {
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
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Đã có lỗi xảy ra, vui lòng thử lại';
      toast.error('Đăng ký thất bại', {
        description: Array.isArray(message) ? message.join(', ') : message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center">
              <Tv className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Tạo tài khoản mới</h1>
          <p className="text-dark-400">Đăng ký để bắt đầu trải nghiệm OmniCast</p>
        </div>

        <Card className="p-8 glass-card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Full Name Field */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-dark-200">
                Họ và tên
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Nguyễn Văn A"
                className="bg-dark-900/50 border-dark-600 focus:border-primary-500"
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-sm text-red-400">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-dark-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nguoixem@omnicast.tv"
                className="bg-dark-900/50 border-dark-600 focus:border-primary-500"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-dark-200">
                Mật khẩu
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="bg-dark-900/50 border-dark-600 focus:border-primary-500 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Password Requirements */}
            {password && (
              <div className="space-y-1 p-3 bg-dark-900/50 rounded-lg border border-dark-700">
                <p className="text-xs text-dark-400 mb-2">Yêu cầu mật khẩu:</p>
                {passwordRequirements.map((req) => (
                  <div key={req.id} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <X className="w-3 h-3 text-dark-500" />
                    )}
                    <span className={req.met ? 'text-green-400' : 'text-dark-500'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-dark-200">
                Xác nhận mật khẩu
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                className="bg-dark-900/50 border-dark-600 focus:border-primary-500"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start gap-2">
              <input
                id="terms"
                type="checkbox"
                required
                className="mt-1 w-4 h-4 rounded border-dark-600 bg-dark-900 text-primary-600 focus:ring-primary-500"
              />
              <Label htmlFor="terms" className="text-sm text-dark-400 cursor-pointer">
                Tôi đồng ý với{' '}
                <Link href="/terms" className="text-primary-400 hover:text-primary-300">
                  Điều khoản sử dụng
                </Link>{' '}
                và{' '}
                <Link href="/privacy" className="text-primary-400 hover:text-primary-300">
                  Chính sách bảo mật
                </Link>
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang đăng ký...
                </>
              ) : (
                'Tạo tài khoản'
              )}
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <p className="text-center text-dark-400 mt-6">
          Đã có tài khoản?{' '}
          <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

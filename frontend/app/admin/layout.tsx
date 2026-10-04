'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="font-mono text-xs text-slate-400 uppercase tracking-widest">
          Đang xác thực quyền Quản trị viên (Role = 3)…
        </p>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#0b1322] border border-cyan-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white font-display">
            Yêu Cầu Đăng Nhập
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Khu vực Quản trị hệ thống yêu cầu xác thực tài khoản có thẩm quyền Quản trị viên (Admin - Role 3).
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-cyan-500 text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-cyan-400 transition-colors shadow-lg"
          >
            Đăng Nhập Ngay
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated but not ADMIN -> 403 Forbidden
  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#140b10] border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
              403 FORBIDDEN // RBAC POLICY
            </span>
            <h2 className="text-xl font-black text-white font-display pt-2">
              Truy Cập Bị Từ Chối
            </h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tài khoản của bạn hiện có vai trò{' '}
            <strong className="text-cyan-300 font-mono">[{user?.role}]</strong>. Khu vực này chỉ dành riêng cho{' '}
            <strong className="text-rose-400 font-mono">Quản Trị Viên (Role = 3 — Admin)</strong> theo quy định an ninh OmniCast.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay Về Trang Chủ</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

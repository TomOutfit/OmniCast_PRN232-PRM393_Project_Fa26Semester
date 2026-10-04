'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Loader2, Radio } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="font-mono text-xs text-slate-400 uppercase tracking-widest">
          Đang xác thực quyền Biên tập viên / Quản trị viên…
        </p>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#0e0e1a] border border-purple-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Radio className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white font-display">
            Yêu Cầu Quyền Biên Tập
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            OmniCast Studio & AI Curator yêu cầu đăng nhập bằng tài khoản Biên Tập Viên (Staff - Role 1) hoặc Quản Trị Viên (Admin - Role 3).
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-lg"
          >
            Đăng Nhập Ngay
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated but neither STAFF nor ADMIN -> 403 Forbidden
  const isAuthorized = user?.role === 'STAFF' || user?.role === 'ADMIN';
  if (!isAuthorized) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#140b10] border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
              403 FORBIDDEN // STAFF CLEARANCE REQUIRED
            </span>
            <h2 className="text-xl font-black text-white font-display pt-2">
              Giới Hạn Quyền Truy Cập
            </h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tài khoản của bạn hiện là <strong className="text-cyan-300 font-mono">[{user?.role}]</strong>. Tính năng xếp lịch phát sóng EPG và thẩm định AI Curator chỉ mở cho{' '}
            <strong className="text-purple-300 font-mono">Biên Tập Viên (Role = 1 — Staff)</strong> và{' '}
            <strong className="text-amber-300 font-mono">Quản Trị Viên (Role = 3 — Admin)</strong>.
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

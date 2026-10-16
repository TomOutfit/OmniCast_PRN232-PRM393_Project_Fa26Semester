'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  KeyRound,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Canvas3D } from '@/components/three/Canvas3D';
import { AuthScene3D } from '@/components/three/scenes/AuthScene3D';

interface CheckpointGatewayProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  badgeText?: string;
  isScanning?: boolean;
}

export function CheckpointGateway({
  children,
  title,
  subtitle,
  isScanning = false,
}: CheckpointGatewayProps) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const isRegister = pathname === '/register';

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ── 1. 3D Auth Background (replaces flat gradient) ──────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
      >
        <Canvas3D
          cameraPosition={[0, 0, 5]}
          fov={55}
          postprocessing
          className="w-full h-full"
        >
          <AuthScene3D
            brand="OMNICAST"
            tagline={isLogin ? 'Sign in to continue' : 'Create your account'}
          />
        </Canvas3D>
        {/* Subtle dimmer so the auth card stays readable. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(7,11,20,0.4) 0%, rgba(7,11,20,0.75) 70%, rgba(7,11,20,0.95) 100%)',
          }}
        />
      </div>

      {/* ── 2. Header: Clean & Modern Brand Bar ────────────────────────── */}
      <header className="relative z-20 w-full border-b border-white/[0.08] bg-[#070b14]/80 backdrop-blur-md px-4 py-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Identity */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-transform hover:scale-[1.01]"
            title="Về trang chủ OmniCast"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center overflow-hidden">
              <Image
                src="/omnicast_logo.png"
                alt="OmniCast Logo"
                width={36}
                height={36}
                priority
                unoptimized
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-white font-display">
                Omni<span className="text-cyan-400">Cast</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wide">
                Truyền hình trực tuyến 4K
              </span>
            </div>
          </Link>

          {/* Return Home Link */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Về Trang Chủ</span>
          </Link>
        </div>
      </header>

      {/* ── 3. Main Center Auth Card ──────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="relative w-full max-w-lg my-auto">
          <div className="rounded-3xl bg-[#0c1220]/90 border border-white/[0.1] shadow-2xl p-6 sm:p-8 md:p-9 backdrop-blur-xl">
            {/* Header with Clean Logo */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#131c30] to-[#0c1220] border border-cyan-500/30 p-2.5 flex items-center justify-center shadow-lg mb-3">
                <Image
                  src="/omnicast_logo.png"
                  alt="OmniCast Logo"
                  width={64}
                  height={64}
                  priority
                  unoptimized
                  className="w-full h-full object-contain"
                />
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {title}
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-sm">
                {subtitle}
              </p>

              {/* Segmented Control Tabs */}
              <div className="mt-5 w-full max-w-xs grid grid-cols-2 p-1 rounded-2xl bg-[#060a14] border border-white/[0.08]">
                <Link
                  href="/login"
                  className={cn(
                    'flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all',
                    isLogin
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Đăng Nhập</span>
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    'flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all',
                    isRegister
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tạo Tài Khoản</span>
                </Link>
              </div>
            </div>

            {/* Injected Form Content */}
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* ── 4. Footer: Clean, Professional Broadcast Legal Footer ────── */}
      <footer className="relative z-20 w-full border-t border-white/[0.08] bg-[#070b14]/90 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            <span>© 2026 OmniCast Network. Bản quyền phát sóng trực tuyến.</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/terms" className="hover:text-slate-200 transition-colors">Điều khoản dịch vụ</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-slate-200 transition-colors">Chính sách bảo mật</Link>
            <span>•</span>
            <Link href="/help" className="hover:text-slate-200 transition-colors">Trợ giúp & Hỗ trợ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  Radio,
  Lock,
  ArrowLeft,
  Activity,
  Wifi,
  Sparkles,
  KeyRound,
  UserPlus,
  Tv,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  badgeText = 'OMNICAST BROADCAST PORTAL',
  isScanning = false,
}: CheckpointGatewayProps) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const isRegister = pathname === '/register';

  // Live real-time clock for authentic broadcast network HUD
  const [timeString, setTimeString] = useState<string>('');
  const [latency] = useState<number>(() => Math.floor(Math.random() * 6) + 12);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#070b12] text-[#dfe2f1] flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200 studio-spatial-canvas">
      {/* ── 1. Soft 3D Spatial Lighting Ambience ─────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        {/* Upper soft cyan beam */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[480px] bg-gradient-to-b from-cyan-500/12 via-blue-600/06 to-transparent blur-[120px] animate-studio-breath" />
        
        {/* Subtle deep indigo accent orb */}
        <div className="absolute top-1/3 -right-24 w-[540px] h-[540px] rounded-full bg-blue-600/08 blur-[140px]" />
        
        {/* Soft bottom glow */}
        <div className="absolute -bottom-20 left-10 w-[500px] h-[350px] bg-cyan-600/06 blur-[130px]" />

        {/* Studio focal rings - refined & subtle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[840px] h-[840px] rounded-full border border-cyan-500/[0.05] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/[0.04] pointer-events-none" />
      </div>

      {/* ── 2. Top Broadcast Studio Header ────────────────────────── */}
      <header className="relative z-20 w-full border-b border-white/[0.06] bg-[#070b12]/80 backdrop-blur-2xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 group transition-transform hover:scale-[1.02]"
              title="Về trang chủ phát sóng OmniCast"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,254,0.2)] overflow-hidden">
                <Image
                  src="/omnicast_logo.png"
                  alt="OmniCast Master Logo"
                  width={36}
                  height={36}
                  priority
                  unoptimized
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-white font-display">
                    Omni<span className="text-cyan-400">Cast</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
                    NETWORK
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 tracking-wide">
                  ENTERPRISE BROADCAST SYSTEM
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-white/[0.08]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-mono font-medium text-emerald-400 tracking-wider">
                HỆ THỐNG TRỰC TUYẾN
              </span>
            </div>
          </div>

          {/* Center: Broadcast System Telemetry */}
          <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-full bg-[#0d1626]/70 border border-white/[0.08] text-xs font-mono backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>BẢO MẬT: AES-256 / TLS 1.3</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span>CHUẨN NÉN: 4K UHD H.265</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>ĐỘ TRỄ: {latency} ms</span>
            </div>
          </div>

          {/* Right: Exit / Return to Network Button & Real-time Clock */}
          <div className="flex items-center gap-3">
            {timeString && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e1726]/80 border border-white/[0.08] font-mono text-[11px] text-cyan-300">
                <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span>{timeString} ICT</span>
              </div>
            )}

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e1726]/80 hover:bg-cyan-950/40 border border-white/[0.1] hover:border-cyan-500/40 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
              title="Quay lại giao diện phát sóng"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Về Trang Chủ</span>
              <span className="sm:hidden">Trang Chủ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 3. Main Center Chamber ──────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        
        {/* Floating 3D Studio Glass Card */}
        <div className="relative w-full max-w-xl my-auto">
          
          <div className="studio-glass-card rounded-3xl p-6 sm:p-8 md:p-9 overflow-hidden transition-all duration-300">
            
            {/* Subtle Corner Brackets for Broadcast Studio Feel */}
            <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-cyan-400/40 rounded-tl-sm pointer-events-none" />
            <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-cyan-400/40 rounded-tr-sm pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-cyan-400/40 rounded-bl-sm pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-cyan-400/40 rounded-br-sm pointer-events-none" />

            {/* Header & Logo with 3D Depth */}
            <div className="flex flex-col items-center text-center mb-6">
              
              {/* Brand 3D Emblem */}
              <div className="relative mb-3 group">
                <div className="absolute -inset-2 rounded-2xl bg-cyan-500/15 blur-lg transition-all group-hover:bg-cyan-500/25" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#111c30] to-[#080d18] border border-cyan-500/40 p-2.5 flex items-center justify-center shadow-[0_12px_28px_rgba(0,0,0,0.6)]">
                  <Image
                    src="/omnicast_logo.png"
                    alt="OmniCast Master Network Logo"
                    width={80}
                    height={80}
                    priority
                    unoptimized
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,242,254,0.45)]"
                  />
                </div>
              </div>

              {/* Status Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-[10px] font-mono font-bold tracking-wider text-cyan-300 mb-2">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span>{badgeText}</span>
              </div>

              {/* Title & Subtitle */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                {title}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-sm">
                {subtitle}
              </p>

              {/* Segmented Control Tabs: Login vs Register */}
              <div className="mt-5 w-full max-w-sm grid grid-cols-2 p-1 rounded-2xl bg-[#090e18]/90 border border-white/[0.08] shadow-inner">
                <Link
                  href="/login"
                  className={cn(
                    'flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold font-mono transition-all',
                    isLogin
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  )}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>ĐĂNG NHẬP</span>
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    'flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold font-mono transition-all',
                    isRegister
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  )}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>TẠO TÀI KHOẢN</span>
                </Link>
              </div>

              {/* Scanning status banner */}
              {isScanning && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-400/40 text-[11px] font-mono text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>ĐANG XÁC THỰC THÔNG TIN TRUY CẬP...</span>
                </div>
              )}
            </div>

            {/* Injected Form Content (Login or Register) */}
            <div className="relative z-10">
              {children}
            </div>

          </div>
        </div>
      </main>

      {/* ── 4. Bottom Broadcast Telemetry Bar ────────────────────────── */}
      <footer className="relative z-20 w-full border-t border-white/[0.06] bg-[#070b12]/80 backdrop-blur-2xl px-4 py-2.5 sm:px-6">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-400">
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-cyan-400 font-bold">OMNICAST ENTERPRISE BROADCAST</span>
            <span className="text-slate-700">|</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              SESSION SECURED
            </span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline">INGRESS 4K UHD 60FPS</span>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <span>CHUẨN ÂM THANH DOLBY ATMOS</span>
            <span>•</span>
            <span>TIÊU CHUẨN TRUYỀN HÌNH W3C / DVB-I</span>
          </div>

        </div>
      </footer>
    </div>
  );
}

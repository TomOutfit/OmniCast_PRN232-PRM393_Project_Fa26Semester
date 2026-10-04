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
  Cpu,
  KeyRound,
  Fingerprint,
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
  badgeText = 'CHECKPOINT SECTOR 01',
  isScanning = false,
}: CheckpointGatewayProps) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const isRegister = pathname === '/register';

  // Live real-time clock for authentic checkpoint HUD
  const [timeString, setTimeString] = useState<string>('');
  const [latency] = useState<number>(() => Math.floor(Math.random() * 8) + 14);

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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#070b12] text-[#dfe2f1] flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ── 1. Cyber Security Grid & Matrix Ambience ─────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="checkpoint-grid-bg absolute inset-0 opacity-40" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-cyan-500/15 via-blue-600/10 to-transparent blur-[140px]" />
        <div className="absolute bottom-0 right-10 w-[500px] h-[400px] bg-gradient-to-t from-purple-600/10 via-cyan-500/5 to-transparent blur-[160px]" />
        {/* Subtle holographic radial rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-cyan-500/10 pointer-events-none animate-checkpoint-radar" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full border border-cyan-500/15 border-dashed pointer-events-none" />
      </div>

      {/* ── 2. Top Checkpoint HUD Control Bar ────────────────────────── */}
      <header className="relative z-20 w-full border-b border-cyan-500/20 bg-[#080e18]/90 backdrop-blur-xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Checkpoint Terminal Identity */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 group transition-transform hover:scale-105"
              title="Quay lại phát sóng OmniCast"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.35)] overflow-hidden">
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
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-white font-display">
                    Omni<span className="text-cyan-400">Cast</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                    GATEWAY
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  PORTAL // SEC-SECTOR-01
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-mono font-semibold text-emerald-400 tracking-wider">
                TRẠM KIỂM SOÁT ĐANG HOẠT ĐỘNG
              </span>
            </div>
          </div>

          {/* Center: Gate Telemetry (Security Clearance) */}
          <div className="hidden lg:flex items-center gap-4 px-4 py-1 rounded-full bg-[#0d1626]/80 border border-cyan-500/25 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>GIAO THỨC: ZERO-TRUST L4</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>MÃ HOÁ: AES-256 GCM</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>ĐỘ TRỄ: {latency} ms</span>
            </div>
          </div>

          {/* Right: Exit / Return to Network Button & Clock */}
          <div className="flex items-center gap-3">
            {timeString && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1726] border border-slate-800 font-mono text-[11px] text-cyan-300">
                <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span>{timeString} ICT</span>
              </div>
            )}

            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1726] hover:bg-cyan-950/40 border border-slate-700 hover:border-cyan-500/50 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-all shadow-sm"
              title="Rời khỏi trạm kiểm soát để về trang chủ"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Về Trang Chủ</span>
              <span className="sm:hidden">Thoát</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 3. Main Checkpoint Gateway Chamber ───────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        
        {/* Checkpoint Terminal Card */}
        <div className="relative w-full max-w-2xl my-auto">
          
          {/* Holographic Glowing Scanner Frame */}
          <div className="relative rounded-2xl checkpoint-hud-border p-6 sm:p-8 md:p-10 overflow-hidden shadow-[0_0_50px_rgba(0,242,254,0.12)]">
            
            {/* Dynamic Laser Beam Sweeping vertically across the checkpoint */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00f2fe,0_0_30px_#00f2fe] animate-checkpoint-scan z-20"
            />

            {/* Checkpoint Corner Reticles [ + ] */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />

            {/* Checkpoint Header with Master Network Logo */}
            <div className="flex flex-col items-center text-center mb-7">
              
              {/* Central Glowing Biometric Beacon */}
              <div className="relative mb-4 group">
                <div className="absolute -inset-3 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#0e1726] to-[#070b12] border-2 border-cyan-500/60 p-2 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,254,0.4)] animate-checkpoint-beacon">
                  <Image
                    src="/omnicast_logo.png"
                    alt="OmniCast Master Network Logo"
                    width={96}
                    height={96}
                    priority
                    unoptimized
                    className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(0,242,254,0.8)]"
                  />
                </div>
                {/* Scanner reticle badge */}
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400 text-[9px] font-mono font-bold text-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.6)] flex items-center gap-1">
                  <Fingerprint className="w-3 h-3 text-cyan-400" />
                  <span>ID SCAN</span>
                </div>
              </div>

              {/* Checkpoint Banner Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-[10px] font-mono font-bold tracking-widest text-cyan-300 mb-2 shadow-[0_0_12px_rgba(0,242,254,0.2)]">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span>{badgeText}</span>
              </div>

              {/* Title & Subtitle */}
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
                {title}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-md">
                {subtitle}
              </p>

              {/* Gate Mode Tabs: Login vs Register */}
              <div className="mt-5 w-full max-w-md grid grid-cols-2 p-1 rounded-xl bg-[#090e18] border border-slate-800">
                <Link
                  href="/login"
                  className={cn(
                    'flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold font-mono transition-all',
                    isLogin
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-[#121c2e]'
                  )}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>ĐĂNG NHẬP CỔNG</span>
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    'flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold font-mono transition-all',
                    isRegister
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-[#121c2e]'
                  )}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>CẤP PHÙ HIỆU MỚI</span>
                </Link>
              </div>

              {/* Active Scanner Status Line */}
              <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-cyan-400/90">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>
                  {isScanning
                    ? 'ĐANG QUÉT VÀ XÁC THỰC THÔNG TIN TRUY CẬP...'
                    : 'TRẠM KIỂM SOÁT SẴN SÀNG // NHẬP DỮ LIỆU ĐỂ MỞ CỔNG'}
                </span>
              </div>
            </div>

            {/* Injected Form Content (Login or Register) */}
            <div className="relative z-10">
              {children}
            </div>

          </div>
        </div>
      </main>

      {/* ── 4. Bottom Checkpoint Security Telemetry Strip ─────────────── */}
      <footer className="relative z-20 w-full border-t border-cyan-500/20 bg-[#080e18]/90 backdrop-blur-xl px-4 py-2.5 sm:px-6">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-400">
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-cyan-400 font-bold">OMNICAST NETWORK</span>
            <span className="text-slate-700">|</span>
            <span>GATE CONTROL: ONLINE</span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="hidden sm:inline">INGRESS: 4K UHD 60FPS</span>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <span>CHỨNG NHẬN DOLBY ATMOS</span>
            <span>•</span>
            <span>BẢO MẬT ĐA LỚP W3C / NIST</span>
          </div>

        </div>
      </footer>
    </div>
  );
}

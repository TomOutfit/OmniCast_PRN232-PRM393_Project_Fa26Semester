'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Github,
  Twitter,
  Facebook,
  Mail,
  Shield,
  CheckCircle2,
  LogIn,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  getFooterColumnsForRole,
  getStatusBannerForRole,
  getQuickActionsForRole,
  ROLE_META,
  ACCENT_CLASSES,
  type UserRole,
} from '@/lib/constants/role-config';
import { cn } from '@/lib/utils';

// ── Pulse color → tailwind class lookup ─────────────────────────
const PULSE_BG: Record<'emerald' | 'cyan' | 'purple' | 'amber', string> = {
  emerald: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
  cyan: 'bg-cyan-400 shadow-[0_0_8px_#00f2fe]',
  purple: 'bg-purple-400 shadow-[0_0_8px_#a855f7]',
  amber: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
};

const CHIP_ACCENT: Record<'cyan' | 'purple' | 'amber' | 'emerald', string> = {
  cyan: 'text-cyan-400',
  purple: 'text-purple-400',
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
};

export function Footer() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Resolve effective role – GUEST until auth hydrates
  const effectiveRole: UserRole = (() => {
    if (isLoading) return 'GUEST';
    if (!isAuthenticated) return 'GUEST';
    return user?.role ?? 'GUEST';
  })();

  const userMeta = ROLE_META[effectiveRole];
  const columns = getFooterColumnsForRole(effectiveRole);
  const status = getStatusBannerForRole(effectiveRole, isAuthenticated);
  const quickActions = getQuickActionsForRole(effectiveRole, isAuthenticated);

  return (
    <footer className="bg-[#05080e] border-t border-[#142033] text-slate-300">
      {/* ── 1. Status Banner (role-aware) ─────────────────────────── */}
      <div className="border-b border-[#121c2d] py-3 px-4 lg:px-6 bg-[#03060a]">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400 min-w-0">
            <span className={cn('w-2 h-2 rounded-full animate-pulse flex-shrink-0', PULSE_BG[status.pulse])} />
            <span
              className={cn(
                'font-bold flex-shrink-0',
                status.pulse === 'emerald' && 'text-emerald-400',
                status.pulse === 'cyan' && 'text-cyan-400',
                status.pulse === 'purple' && 'text-purple-400',
                status.pulse === 'amber' && 'text-amber-400',
              )}
            >
              {status.statusLabel}:
            </span>
            <span className="text-slate-200 truncate">{status.status}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] text-slate-500 flex-wrap">
            {status.chips.map((chip) => (
              <span
                key={chip.label}
                className={cn(
                  'whitespace-nowrap',
                  chip.accent ? CHIP_ACCENT[chip.accent] : 'text-slate-500',
                )}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. Quick Action Bar (role-aware shortcuts) ─────────────── */}
      {isAuthenticated && (
        <div className="border-b border-[#121c2d] py-4 px-4 lg:px-6 bg-[#06090f]">
          <div className="max-w-[1680px] mx-auto">
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[9px] font-black uppercase tracking-wider',
                  userMeta.pillClass,
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', userMeta.dotClass)} />
                LỐI TẮT NHANH · {userMeta.shortLabel} [{userMeta.rank}]
              </span>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                Click để truy cập nhanh
              </span>
            </div>
            <div
              className={cn(
                'grid gap-2.5',
                quickActions.length <= 3
                  ? 'grid-cols-2 sm:grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-4',
              )}
            >
              {quickActions.map((action) => {
                const Icon = action.icon;
                const accent = ACCENT_CLASSES[action.accent];
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={cn(
                      'group flex items-center gap-2.5 p-2.5 rounded-lg border transition-all hover:scale-[1.01]',
                      accent.bg,
                      accent.border,
                      'hover:border-current',
                    )}
                  >
                    <div
                      className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center border',
                        accent.bg,
                        accent.border,
                        accent.text,
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[11px] font-bold truncate', accent.text)}>
                        {action.label}
                      </p>
                      <p className="text-[9px] text-slate-500 truncate">{action.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Guest CTA strip (only when not authenticated) ───────── */}
      {!isAuthenticated && !isLoading && (
        <div className="border-b border-[#121c2d] py-4 px-4 lg:px-6 bg-gradient-to-r from-cyan-950/30 via-transparent to-purple-950/30">
          <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#00f2fe]" />
              <p className="text-xs font-mono text-slate-300">
                <strong className="text-cyan-300">CHƯA ĐĂNG NHẬP?</strong> Truy cập
                <span className="text-purple-300 font-bold"> Studio</span>,
                <span className="text-amber-300 font-bold"> Quản trị</span> hoặc
                <span className="text-cyan-300 font-bold"> Watchlist</span> sau khi đăng nhập.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-[11px] font-bold shadow-[0_0_12px_rgba(0,242,254,0.3)] transition-all"
            >
              <LogIn className="w-3 h-3" />
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      )}

      {/* ── 4. Main Link Columns (filtered by role) ───────────────── */}
      <div className="max-w-[1680px] mx-auto px-4 lg:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">

          {/* Brand Column (always shown) */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center transition-transform group-hover:scale-105 shadow-[0_0_15px_rgba(0,242,254,0.2)] overflow-hidden">
                <Image
                  src="/omnicast_logo.png"
                  alt="OmniCast Network Logo"
                  width={36}
                  height={36}
                  unoptimized
                  className="w-full h-full object-contain p-0.5 drop-shadow-[0_0_8px_rgba(0,242,254,0.8)]"
                />
              </div>
              <span className="text-xl font-black tracking-tight text-white flex items-center">
                Omni<span className="text-cyan-400">Cast</span>
              </span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed mb-4 max-w-sm">
              Nền tảng truyền hình trực tuyến thế hệ mới với hệ thống lịch phát sóng EPG thời gian thực, truyền dẫn Multi-Cam 4K UHD và âm thanh vòm Dolby Atmos.
            </p>

            {/* Social row */}
            <div className="flex gap-3">
              <a
                href="#"
                className="p-2 rounded-lg bg-[#0e1726] hover:bg-[#182840] border border-[#1f3350] text-slate-400 hover:text-cyan-400 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-[#0e1726] hover:bg-[#182840] border border-[#1f3350] text-slate-400 hover:text-cyan-400 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-[#0e1726] hover:bg-[#182840] border border-[#1f3350] text-slate-400 hover:text-cyan-400 transition-colors"
                aria-label="Github"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-[#0e1726] hover:bg-[#182840] border border-[#1f3350] text-slate-400 hover:text-cyan-400 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>

            {/* Current session indicator (auth only) */}
            {isAuthenticated && user && (
              <div className="mt-5 p-2.5 rounded-lg border border-[#1f3350] bg-[#0a121f]">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                  Phiên đang hoạt động
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white',
                      effectiveRole === 'ADMIN'
                        ? 'bg-gradient-to-tr from-amber-500 to-orange-500'
                        : effectiveRole === 'STAFF'
                        ? 'bg-gradient-to-tr from-purple-500 to-indigo-600'
                        : 'bg-gradient-to-tr from-cyan-500 to-blue-600',
                    )}
                  >
                    {(user.fullName || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-white truncate">
                      {user.fullName || user.email}
                    </p>
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-1.5 py-0.2 rounded border font-mono text-[9px] font-black',
                          userMeta.pillClass,
                        )}
                      >
                        <span className={cn('w-1 h-1 rounded-full', userMeta.dotClass)} />
                        {userMeta.shortLabel} [{userMeta.rank}]
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Role-filtered columns */}
          {columns.map((col) => {
            const Icon: LucideIcon = col.icon;
            return (
              <div key={col.title}>
                <h4
                  className={cn(
                    'text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-1.5',
                    col.accentClass,
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{col.title}</span>
                </h4>
                <ul className="space-y-2.5 text-xs">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 group"
                      >
                        <span className="group-hover:translate-x-0.5 transition-transform">
                          {link.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-[#142033] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 OmniCast Enterprise Broadcast Network. All rights reserved.</p>
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
            <span>Phiên bản 2.4.0 (Build 2026-10)</span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Shield className="w-3.5 h-3.5" />
              DRM Protected & Secured
            </span>
            {/* Show role in bottom-bar so the role is visible in the page chrome */}
            {isAuthenticated && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border font-mono text-[10px] font-black uppercase tracking-wider',
                  userMeta.pillClass,
                )}
              >
                <CheckCircle2 className="w-3 h-3" />
                {userMeta.shortLabel} [{userMeta.rank}]
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

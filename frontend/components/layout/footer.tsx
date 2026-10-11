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
  Smartphone,
  Globe,
  Heart,
  Send,
  Loader2,
  Apple,
  AlertCircle,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSubscribeNewsletter } from '@/lib/hooks/useNewsletter';
import {
  getFooterColumnsForRole,
  getStatusBannerForRole,
  ROLE_META,
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

export function Footer() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const subscribe = useSubscribeNewsletter();
  const [email, setEmail] = useState(
    isAuthenticated && user?.email ? user.email : '',
  );
  const [subscribed, setSubscribed] = useState<{ email: string; already: boolean } | null>(null);

  // Resolve effective role – GUEST until auth hydrates
  const effectiveRole: UserRole = (() => {
    if (isLoading) return 'GUEST';
    if (!isAuthenticated) return 'GUEST';
    return user?.role ?? 'GUEST';
  })();

  const userMeta = ROLE_META[effectiveRole];
  const columns = getFooterColumnsForRole(effectiveRole);
  const status = getStatusBannerForRole(effectiveRole, isAuthenticated);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      const res = await subscribe.mutateAsync({
        email: trimmed,
        topics: ['weekly_schedule', 'ai_curator_picks', 'live_alerts'],
        locale: 'vi',
        source: 'footer',
      });
      setSubscribed({ email: res.email, already: res.alreadySubscribed });
    } catch (err) {
      // Hook surfaces the error in `subscribe.error`; we keep the
      // error message minimal so the form remains friendly.
      // The footer shows the error state via subscribe.isError.
    }
  };

  return (
    <footer className="bg-[#05080e] border-t border-[#142033] text-slate-300">
      {/* ── 1. Compact Status Strip (1 line) ────────────────────────── */}
      <div className="border-b border-[#121c2d] py-2.5 px-4 lg:px-6 bg-[#03060a]">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-slate-400 min-w-0">
            <span
              className={cn(
                'w-2 h-2 rounded-full animate-pulse flex-shrink-0',
                PULSE_BG[status.pulse],
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'font-bold flex-shrink-0 uppercase tracking-wider text-[10px]',
                status.pulse === 'emerald' && 'text-emerald-400',
                status.pulse === 'cyan' && 'text-cyan-400',
                status.pulse === 'purple' && 'text-purple-400',
                status.pulse === 'amber' && 'text-amber-400',
              )}
            >
              {status.statusLabel}
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-200 truncate font-semibold">{status.status}</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-[10px] text-slate-500 flex-wrap uppercase tracking-wider">
            {status.chips.map((chip) => (
              <span
                key={chip.label}
                className={cn(
                  'whitespace-nowrap',
                  chip.accent === 'cyan' && 'text-cyan-400',
                  chip.accent === 'purple' && 'text-purple-400',
                  chip.accent === 'amber' && 'text-amber-400',
                  chip.accent === 'emerald' && 'text-emerald-400',
                  !chip.accent && 'text-slate-500',
                )}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. Newsletter Signup (only shown when not yet subscribed) ── */}
      {!subscribed && (
        <div className="border-b border-[#121c2d] py-8 px-4 lg:px-6 bg-gradient-to-r from-cyan-950/20 via-transparent to-purple-950/20">
          <div className="max-w-[1680px] mx-auto grid lg:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white mb-1">
                Nhận lịch phát sóng mới mỗi tuần
              </h3>
              <p className="text-sm text-slate-400">
                AI Curator sẽ gợi ý chương trình phù hợp với sở thích của bạn. Không spam.
              </p>
            </div>
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col sm:flex-row gap-2"
              aria-label="Đăng ký nhận bản tin"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email
              </label>
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  disabled={subscribe.isPending}
                  className={cn(
                    'w-full pl-10 pr-3 py-2.5 rounded-lg',
                    'bg-[#0a121f] border text-sm text-white',
                    'placeholder:text-slate-500',
                    'focus:outline-none focus:ring-2',
                    subscribe.isError
                      ? 'border-red-500/60 focus:ring-red-500/40'
                      : 'border-[#1f3350] focus:ring-cyan-500/50 focus:border-cyan-500/50',
                    'disabled:opacity-50',
                  )}
                />
              </div>
              <button
                type="submit"
                disabled={subscribe.isPending || !email.trim()}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg',
                  'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500',
                  'text-white text-sm font-bold whitespace-nowrap',
                  'shadow-[0_0_12px_rgba(0,242,254,0.3)]',
                  'transition-all hover:scale-[1.02] active:scale-95',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                )}
              >
                {subscribe.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Đăng ký</span>
              </button>
            </form>
          </div>

          {/* Error state — surfaces API failures gracefully */}
          {subscribe.isError && (
            <div className="max-w-[1680px] mx-auto mt-3 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Không thể đăng ký ngay bây giờ. Vui lòng thử lại sau ít phút.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Thank-you state when subscribed */}
      {subscribed && (
        <div className="border-b border-[#121c2d] py-5 px-4 lg:px-6 bg-emerald-950/20">
          <div className="max-w-[1680px] mx-auto flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-200">
              <strong className="font-bold">
                {subscribed.already ? 'Bạn đã đăng ký rồi!' : 'Đã đăng ký thành công!'}
              </strong>{' '}
              <span className="text-emerald-300/80">
                {subscribed.email}
              </span>
              <span className="text-emerald-300/60 ml-1">
                · Kiểm tra email để xác nhận (có thể trong thư mục spam).
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── 3. Guest CTA strip (only when not authenticated) ───────── */}
      {!isAuthenticated && !isLoading && (
        <div className="border-b border-[#121c2d] py-5 px-4 lg:px-6 bg-[#06090f]">
          <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#00f2fe] flex-shrink-0"
                aria-hidden="true"
              />
              <p className="text-sm text-slate-300">
                <strong className="text-cyan-300 font-bold">Mở khóa toàn bộ trải nghiệm.</strong>{' '}
                <span className="text-slate-400">
                  Đăng nhập để vào Studio, Admin hoặc Watchlist.
                </span>
              </p>
            </div>
            <Link
              href="/login"
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg',
                'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500',
                'text-white text-xs font-bold',
                'shadow-[0_0_12px_rgba(0,242,254,0.3)]',
                'transition-all hover:scale-[1.02] active:scale-95 whitespace-nowrap',
              )}
            >
              <LogIn className="w-3.5 h-3.5" />
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      )}

      {/* ── 4. Main Link Columns ───────────────────────────────────── */}
      <div className="max-w-[1680px] mx-auto px-4 lg:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="flex items-center gap-2.5 group">
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
              <span className="text-xl font-black tracking-tight text-white">
                Omni<span className="text-cyan-400">Cast</span>
              </span>
            </Link>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Nền tảng truyền hình trực tuyến thế hệ mới với EPG thời gian thực, Multi-Cam 4K UHD
              và âm thanh vòm Dolby Atmos.
            </p>

            {/* App store badges — convert mobile visits to installs */}
            <div className="flex flex-wrap gap-2">
              <a
                href="#"
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                  'bg-[#0a121f] hover:bg-[#0e1726] border border-[#1f3350]',
                  'transition-colors group',
                )}
                aria-label="Tải ứng dụng iOS"
              >
                <Apple className="w-4 h-4 text-slate-300 group-hover:text-white" />
                <div className="text-left">
                  <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider leading-none">
                    Tải trên
                  </p>
                  <p className="text-[11px] font-bold text-white leading-none mt-0.5">
                    App Store
                  </p>
                </div>
              </a>
              <a
                href="#"
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                  'bg-[#0a121f] hover:bg-[#0e1726] border border-[#1f3350]',
                  'transition-colors group',
                )}
                aria-label="Tải ứng dụng Android"
              >
                <Smartphone className="w-4 h-4 text-slate-300 group-hover:text-white" />
                <div className="text-left">
                  <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider leading-none">
                    Tải về
                  </p>
                  <p className="text-[11px] font-bold text-white leading-none mt-0.5">
                    Android
                  </p>
                </div>
              </a>
            </div>

            {/* Social row */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">
                Theo dõi chúng tôi
              </p>
              <div className="flex gap-2">
                <a
                  href="#"
                  className="w-9 h-9 rounded-lg bg-[#0e1726] hover:bg-[#182840] border border-[#1f3350] text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-lg bg-[#0e1726] hover:bg-[#182840] border border-[#1f3350] text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-lg bg-[#0e1726] hover:bg-[#182840] border border-[#1f3350] text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href="mailto:hello@omnicast.tv"
                  className="w-9 h-9 rounded-lg bg-[#0e1726] hover:bg-[#182840] border border-[#1f3350] text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center"
                  aria-label="Email"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Role-filtered columns */}
          <div
            className={cn(
              'lg:col-span-8 grid gap-8',
              columns.length <= 3
                ? 'grid-cols-2 sm:grid-cols-3'
                : columns.length === 4
                  ? 'grid-cols-2 sm:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4',
            )}
          >
            {columns.map((col) => {
              const Icon: LucideIcon = col.icon;
              return (
                <div key={col.title}>
                  <h4
                    className={cn(
                      'text-[11px] font-black uppercase tracking-wider mb-3 flex items-center gap-1.5',
                      col.accentClass,
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{col.title}</span>
                  </h4>
                  <ul className="space-y-2 text-xs">
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
        </div>

        {/* ── 5. Trust Badges Row ────────────────────────────────────── */}
        <div className="mt-10 pt-6 border-t border-[#142033] flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono uppercase tracking-wider text-slate-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ISO 27001
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Shield className="w-3.5 h-3.5" />
              DMCA Compliant
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <Globe className="w-3.5 h-3.5" />
              GDPR Ready
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              SOC 2 Type II
            </span>
          </div>
          <span className="text-slate-600">v2.4.0 · Build 2026.10</span>
        </div>
      </div>

      {/* ── 6. Bottom Bar (minimal) ─────────────────────────────────── */}
      <div className="border-t border-[#142033] py-4 px-4 lg:px-6 bg-[#03060a]">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
          <p className="flex items-center gap-1.5">
            © 2026 OmniCast Enterprise Broadcast Network.
            <span className="hidden sm:inline">All rights reserved.</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-600 ml-2">
              · Crafted with <Heart className="w-3 h-3 text-red-400 fill-red-400" /> in Hanoi
            </span>
          </p>
          {isAuthenticated && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[10px] font-black uppercase tracking-wider',
                userMeta.pillClass,
              )}
            >
              <span className={cn('w-1 h-1 rounded-full', userMeta.dotClass)} />
              Đang đăng nhập · {userMeta.shortLabel}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}

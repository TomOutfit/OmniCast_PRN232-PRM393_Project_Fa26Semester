'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  Search,
  User,
  LogOut,
  Settings,
  Shield,
  Bell,
  Sparkles,
  ChevronDown,
  Bookmark,
  LogIn,
  Crown,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { cn } from '@/lib/utils';
import { useChannels } from '@/lib/hooks/useChannels';
import {
  getNavLinksForRole,
  getHeaderCtaForRole,
  ROLE_META,
  ACCENT_CLASSES,
  type UserRole,
} from '@/lib/constants/role-config';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { locale, setLocale } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { data: channelsData } = useChannels({ limit: 50 });
  const dynamicChannels = useMemo<Array<{ id: string; slug: string; name: string; isLive?: boolean }>>(() => {
    if (!channelsData) return [];
    const list = Array.isArray(channelsData)
      ? channelsData
      : Array.isArray((channelsData as any)?.data)
      ? (channelsData as any).data
      : [];
    return list.map((c: any) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      isLive: c.isActive,
    }));
  }, [channelsData]);

  // Effective role: 'GUEST' when not authenticated
  const userRole: UserRole = (isAuthenticated && user ? user.role : 'GUEST') as UserRole;
  const userMeta = ROLE_META[userRole];

  // Role-aware navigation links
  const visibleNavLinks = useMemo(
    () => getNavLinksForRole(userRole),
    [userRole],
  );

  // Role-aware primary CTA (orange button)
  const headerCta = getHeaderCtaForRole(userRole, isAuthenticated);
  const CtaIcon = headerCta.icon;

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    router.push('/');
    router.refresh();
  };

  const toggleLanguage = () => {
    setLocale(locale === 'vi' ? 'en' : 'vi');
  };

  // Visual styling for the role indicator pill
  const roleAccent =
    userRole === 'ADMIN'
      ? ACCENT_CLASSES.amber
      : userRole === 'STAFF'
      ? ACCENT_CLASSES.purple
      : userRole === 'VIEWER'
      ? ACCENT_CLASSES.cyan
      : { bg: 'bg-slate-900/60', border: 'border-slate-500/30', text: 'text-slate-300', dot: 'bg-slate-400' };

  return (
    <header className="sticky top-0 z-50 w-full max-w-full overflow-hidden border-b border-[#142032] bg-[#070b12]/95 backdrop-blur-xl">
      {/* ── 1. Main Header Bar (Responsive at 100% & 90% Zoom) ──────── */}
      <div className="max-w-[1720px] w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex h-13 md:h-14 items-center justify-between gap-2 sm:gap-4">

          {/* Brand Logo & Compact Navigation Links */}
          <div className="flex items-center gap-3 sm:gap-6 xl:gap-8 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center transition-transform group-hover:scale-105 shadow-[0_0_12px_rgba(0,242,254,0.25)] overflow-hidden">
                <Image
                  src="/omnicast_logo.png"
                  alt="OmniCast Network Logo"
                  width={32}
                  height={32}
                  unoptimized
                  className="w-full h-full object-contain p-0.5 drop-shadow-[0_0_6px_rgba(0,242,254,0.8)]"
                />
              </div>
              <span className="text-base sm:text-lg font-black tracking-tight text-white flex items-center">
                Omni<span className="text-cyan-400">Cast</span>
              </span>
            </Link>

            {/* Desktop Navigation (Fit 100% / 90% without breaking) */}
            <nav className="hidden md:flex items-center gap-1 xl:gap-1.5">
              {visibleNavLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`);

                // Per-link accent ring
                const linkAccent =
                  item.accent === 'purple'
                    ? 'text-purple-300 bg-purple-950/40 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.18)]'
                    : item.accent === 'amber'
                    ? 'text-amber-300 bg-amber-950/40 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.18)]'
                    : 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30 shadow-[0_0_10px_rgba(0,242,254,0.15)]';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all duration-150 whitespace-nowrap border',
                      isActive
                        ? cn(linkAccent, 'font-black')
                        : 'text-slate-300 hover:text-white hover:bg-[#0e1726] border-transparent'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Compact Actions (Role-Aware) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">

            {/* Role Pill (visible when authenticated) */}
            {isAuthenticated && (
              <div
                className={cn(
                  'hidden lg:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border font-mono text-[10px] font-black uppercase tracking-wider',
                  roleAccent.bg,
                  roleAccent.border,
                  roleAccent.text,
                )}
                title={userMeta.description}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_6px_currentColor]', roleAccent.dot)} />
                {userRole === 'ADMIN' && <Crown className="w-3 h-3" />}
                <span>{userMeta.shortLabel}</span>
                <span className="opacity-60">[{userMeta.rank}]</span>
              </div>
            )}

            {/* Quick Search Button */}
            <Link
              href="/search"
              className="p-1.5 sm:p-2 rounded-lg bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-slate-300 hover:text-cyan-400 transition-colors"
              title="Tìm kiếm (⌘K)"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>

            {/* Quick Watchlist Bookmark Button – only for VIEWER+ */}
            {(userRole === 'VIEWER' || userRole === 'STAFF' || userRole === 'ADMIN') && (
              <Link
                href="/watchlist"
                className={cn(
                  'p-1.5 sm:p-2 rounded-lg bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] transition-colors',
                  pathname === '/watchlist' ? 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30' : 'text-slate-300 hover:text-cyan-400'
                )}
                title="Danh sách xem sau & Yêu thích"
              >
                <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Link>
            )}

            {/* Notification Bell – for authenticated users only */}
            {isAuthenticated && (
              <button
                className="relative p-1.5 sm:p-2 rounded-lg bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-slate-300 hover:text-white transition-colors"
                aria-label="Thông báo"
              >
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f2fe]" />
              </button>
            )}

            {/* Language Switch VIE / ENG */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-[10px] font-bold text-slate-300 hover:text-cyan-400 transition-colors"
              title="Đổi ngôn ngữ"
            >
              <span className={cn(locale === 'vi' ? 'text-cyan-400 font-black' : 'text-slate-500')}>VIE</span>
              <span className="text-slate-600">/</span>
              <span className={cn(locale === 'en' ? 'text-cyan-400 font-black' : 'text-slate-500')}>ENG</span>
            </button>

            {/* Role-Aware Primary CTA (was "Mua gói" hard-coded) */}
            {userRole === 'GUEST' || userRole === 'VIEWER' ? (
              <Link href={headerCta.href} title={headerCta.tooltip}>
                <button
                  className={cn(
                    'flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-black shadow-[0_0_12px_rgba(249,115,22,0.35)] transition-transform hover:scale-102 cursor-pointer whitespace-nowrap',
                    'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black'
                  )}
                >
                  <CtaIcon className="w-3 h-3 fill-current" />
                  <span>{headerCta.label}</span>
                </button>
              </Link>
            ) : userRole === 'STAFF' ? (
              <Link href={headerCta.href} title={headerCta.tooltip}>
                <button
                  className={cn(
                    'flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-black shadow-[0_0_12px_rgba(168,85,247,0.35)] transition-transform hover:scale-102 cursor-pointer whitespace-nowrap',
                    'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
                  )}
                >
                  <CtaIcon className="w-3 h-3" />
                  <span>{headerCta.label}</span>
                </button>
              </Link>
            ) : (
              <Link href={headerCta.href} title={headerCta.tooltip}>
                <button
                  className={cn(
                    'flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-black shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-transform hover:scale-102 cursor-pointer whitespace-nowrap',
                    'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black'
                  )}
                >
                  <CtaIcon className="w-3 h-3" />
                  <span>{headerCta.label}</span>
                </button>
              </Link>
            )}

            {/* User Profile Avatar / Login Button */}
            {isLoading ? (
              <div className="w-7 h-7 rounded-full bg-[#172233] animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1 p-0.5 rounded-full hover:bg-[#152339] border border-[#1b2b42] transition-all cursor-pointer"
                >
                  <div className={cn(
                    'w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm',
                    userRole === 'ADMIN'
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-500'
                      : userRole === 'STAFF'
                      ? 'bg-gradient-to-tr from-purple-500 to-indigo-600'
                      : 'bg-gradient-to-tr from-cyan-500 to-blue-600'
                  )}>
                    {(user.fullName || user.email || 'U')[0].toUpperCase()}
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#1e2d44] bg-[#0c1421] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-[#1a273b] mb-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-semibold text-white truncate">
                          {user.fullName || 'Thành viên OmniCast'}
                        </p>
                        <span className={cn(
                          'text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border whitespace-nowrap',
                          userMeta.pillClass
                        )}>
                          [{userMeta.rank}] {userMeta.shortLabel}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      Hồ sơ cá nhân
                    </Link>

                    <Link
                      href="/watchlist"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                      Danh sách yêu thích
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-cyan-400" />
                      Cài đặt & OmniPass
                    </Link>

                    {/* RBAC: Studio & AI Curator for STAFF & ADMIN only */}
                    {(userRole === 'STAFF' || userRole === 'ADMIN') && (
                      <Link
                        href="/studio/curator"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-purple-300 hover:text-white hover:bg-purple-950/30 rounded-lg transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        Studio & AI Curator
                      </Link>
                    )}

                    {/* RBAC: Admin Portal for ADMIN only */}
                    {userRole === 'ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-amber-300 hover:text-white hover:bg-amber-950/30 rounded-lg transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        Quản trị hệ thống
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border border-cyan-400/40"
                >
                  <LogIn className="w-3 h-3 mr-1" />
                  Đăng nhập
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-1.5 rounded-lg bg-[#0e1726] border border-[#1b2b42] text-slate-300"
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Dòng Phụ Kênh Chuyển Động Tự Động (Continuous Marquee Motion) ─ */}
      <div className="w-full max-w-full border-t border-[#121c2d] bg-[#05080e]/95 overflow-hidden py-1 px-4 select-none relative group/ticker">

        {/* Subtle Edge Fade Gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#05080e] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#05080e] to-transparent z-10 pointer-events-none" />

        <div className="max-w-[1720px] w-full mx-auto flex items-center gap-3">
          <div className="flex-shrink-0 flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-wider text-slate-500 bg-[#0c1422] px-2 py-0.5 rounded border border-[#16253c]">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_6px_currentColor]',
              isAuthenticated ? roleAccent.dot : 'bg-cyan-400',
              isAuthenticated ? roleAccent.text : 'text-cyan-400',
            )} />
            CHANNELS ({dynamicChannels.length})
            {isAuthenticated && (
              <span className="ml-1 opacity-60">· {userMeta.shortLabel}</span>
            )}
          </div>

          {/* Animated Continuous Smooth Marquee Track */}
          <div className="overflow-hidden flex-1">
            <div className="animate-ticker-marquee flex items-center gap-6">
              {/* First Track */}
              {dynamicChannels.map((ch) => (
                <Link
                  key={ch.id}
                  href={`/channels/${ch.slug}`}
                  className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 hover:text-cyan-300 transition-colors whitespace-nowrap group/item"
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-transform group-hover/item:scale-125',
                      ch.isLive ? 'bg-cyan-400 shadow-[0_0_6px_#00f2fe]' : 'bg-slate-600'
                    )}
                  />
                  <span className="group-hover/item:underline">{ch.name}</span>
                  {ch.isLive && (
                    <span className="text-[8px] font-black uppercase text-cyan-300 bg-cyan-950/70 px-1 py-0.2 rounded border border-cyan-800">
                      LIVE
                    </span>
                  )}
                </Link>
              ))}

              {/* Duplicate Track for Infinite Seamless Loop */}
              {dynamicChannels.map((ch) => (
                <Link
                  key={`dup-${ch.id}`}
                  href={`/channels/${ch.slug}`}
                  className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 hover:text-cyan-300 transition-colors whitespace-nowrap group/item"
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-transform group-hover/item:scale-125',
                      ch.isLive ? 'bg-cyan-400 shadow-[0_0_6px_#00f2fe]' : 'bg-slate-600'
                    )}
                  />
                  <span className="group-hover/item:underline">{ch.name}</span>
                  {ch.isLive && (
                    <span className="text-[8px] font-black uppercase text-cyan-300 bg-cyan-950/70 px-1 py-0.2 rounded border border-cyan-800">
                      LIVE
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-[#1a273b] bg-[#070b12] p-3 space-y-1">
          {/* Role Pill in mobile */}
          {isAuthenticated && (
            <div className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border font-mono text-[10px] font-black uppercase tracking-wider mb-2',
              roleAccent.bg,
              roleAccent.border,
              roleAccent.text,
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', roleAccent.dot)} />
              {userMeta.shortLabel} · {userMeta.description}
            </div>
          )}

          {visibleNavLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#121c2d] hover:text-cyan-400"
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}

          {isAuthenticated ? (
            <>
              <div className="my-1 border-t border-[#18273c]" />
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#121c2d] hover:text-cyan-400"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Hồ sơ cá nhân
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#121c2d] hover:text-cyan-400"
              >
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                Cài đặt
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng xuất
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-cyan-300 bg-cyan-950/30 border border-cyan-500/30"
            >
              <LogIn className="w-3.5 h-3.5" />
              Đăng nhập
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

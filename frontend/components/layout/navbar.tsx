'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Shield,
  Bookmark,
  LogIn,
  Crown,
  Radio,
  Gauge,
  Users,
  Calendar,
  FileLock,
  Wand2,
  HelpCircle,
  BookOpen,
  Compass,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useSpatial3D } from '@/lib/three/spatial-context';
import { cn } from '@/lib/utils';
import {
  getNavLinksForRole,
  getHeaderCtaForRole,
  ROLE_META,
  ACCENT_CLASSES,
  type UserRole,
} from '@/lib/constants/role-config';
import { SearchBar } from './search-bar';
import { NotificationBell } from './notification-bell';
import { NowPlayingBar } from './now-playing-bar';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout, logoutAll } = useAuth();
  const { locale, setLocale } = useI18n();
  const { open: openSpatial3D } = useSpatial3D();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  // Two-step confirm: when the user clicks "Đăng xuất" we open a
  // dialog instead of immediately destroying the session. Prevents
  // accidental clicks on a tiny button from logging the user out.
  const [logoutDialog, setLogoutDialog] = useState<
    | null
    | { mode: 'single' }
    | { mode: 'all' }
  >(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Effective role: 'GUEST' when not authenticated
  const userRole: UserRole = (isAuthenticated && user ? user.role : 'GUEST') as UserRole;
  const userMeta = ROLE_META[userRole];

  // Role-aware navigation links
  const visibleNavLinks = useMemo(
    () => getNavLinksForRole(userRole),
    [userRole],
  );

  // Role-aware primary CTA
  const headerCta = getHeaderCtaForRole(userRole, isAuthenticated);
  const CtaIcon = headerCta.icon;

  // Sticky-shadow when scrolled (visual depth)
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutAll = async () => {
    setIsUserMenuOpen(false);
    setIsLoggingOut(true);
    try {
      await logoutAll();
      router.push('/');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const openSingleLogout = () => {
    setIsUserMenuOpen(false);
    setLogoutDialog({ mode: 'single' });
  };

  const openAllLogout = () => {
    setIsUserMenuOpen(false);
    setLogoutDialog({ mode: 'all' });
  };

  const closeLogoutDialog = () => {
    if (!isLoggingOut) setLogoutDialog(null);
  };

  const toggleLanguage = () => {
    setLocale(locale === 'vi' ? 'en' : 'vi');
  };

  // Visual styling for the role indicator pill (used only in user menu header)
  const roleAccent =
    userRole === 'ADMIN'
      ? ACCENT_CLASSES.amber
      : userRole === 'STAFF'
        ? ACCENT_CLASSES.purple
        : userRole === 'VIEWER'
          ? ACCENT_CLASSES.cyan
          : {
              bg: 'bg-slate-900/60',
              border: 'border-slate-500/30',
              text: 'text-slate-300',
              dot: 'bg-slate-400',
            };

  return (
    <header
      className={cn(
        // Removed `overflow-hidden` so the user-menu dropdown (which is
        // `absolute` inside this header) can extend below the navbar.
        // The now-playing-bar handles its own horizontal overflow
        // through `overflow-x-auto` on the inner scroller.
        'sticky top-0 z-50 w-full',
        'border-b bg-[#070b12]/92 backdrop-blur-2xl',
        'transition-all duration-300',
        scrolled
          ? 'border-cyan-500/25 shadow-[0_12px_36px_rgba(0,0,0,0.85),0_1px_0_rgba(255,255,255,0.12)_inset]'
          : 'border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.6)]',
      )}
    >
      {/* ── 1. Top Utility Bar (slim, role-aware) ──────────────────── */}
      <div className="hidden md:block border-b border-[#0e1726] bg-[#03060a]">
        <div className="max-w-[1720px] w-full mx-auto px-4 lg:px-6 h-7 flex items-center justify-between text-[10px] font-mono">
          {/* Left: status indicator */}
          <div className="flex items-center gap-3 text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold">LIVE</span>
              <span>25 kênh · 4K HDR</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="hidden lg:inline">DOLBY ATMOS 5.1 · HEVC H.265 · Latency &lt;1.2s</span>
          </div>

          {/* Right: quick links */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleLanguage}
              className="px-2 py-0.5 rounded text-slate-400 hover:text-cyan-400 transition-colors"
              aria-label="Đổi ngôn ngữ"
            >
              <span className={cn(locale === 'vi' && 'text-cyan-400 font-bold')}>VIE</span>
              <span className="mx-1 text-slate-700">/</span>
              <span className={cn(locale === 'en' && 'text-cyan-400 font-bold')}>ENG</span>
            </button>
            <span className="text-slate-700">|</span>
            <Link
              href="/help"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <HelpCircle className="w-3 h-3" />
              Trợ giúp
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              Tài liệu
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. Main Header Bar ─────────────────────────────────────── */}
      <div className="relative z-20 max-w-[1720px] w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex h-14 md:h-[60px] items-center justify-between gap-2 sm:gap-3">
          {/* Brand Logo & Compact Navigation Links */}
          <div className="flex items-center gap-3 sm:gap-5 xl:gap-7 flex-shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 group flex-shrink-0"
              aria-label="OmniCast — Trang chủ"
            >
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
              <span className="hidden sm:inline text-base sm:text-lg font-black tracking-tight text-white">
                Omni<span className="text-cyan-400">Cast</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-0.5 xl:gap-1" aria-label="Điều hướng chính">
              {visibleNavLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`);

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
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 whitespace-nowrap border',
                      isActive
                        ? cn(linkAccent, 'font-black')
                        : 'text-slate-300 hover:text-white hover:bg-[#0e1726] border-transparent',
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
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* 3D Spatial Universe Launcher */}
            <button
              type="button"
              onClick={openSpatial3D}
              title="Mở Không Gian Vũ Trụ 3D OmniCast (3D Spatial Universe)"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-blue-600/20 hover:from-cyan-500/35 hover:to-blue-600/35 border border-cyan-400/40 text-cyan-300 shadow-[0_0_14px_rgba(0,242,254,0.22)] transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
              <span className="hidden xl:inline">KHÔNG GIAN 3D</span>
              <span className="xl:hidden">3D</span>
            </button>

            {/* Search bar (inline, ⌘K accessible) */}
            <SearchBar />

            {/* Quick Watchlist – only for VIEWER+ */}
            {(userRole === 'VIEWER' || userRole === 'STAFF' || userRole === 'ADMIN') && (
              <Link
                href="/watchlist"
                aria-label="Danh sách yêu thích"
                className={cn(
                  'p-2 rounded-lg bg-[#0e1726] hover:bg-[#152339] border transition-colors',
                  pathname === '/watchlist'
                    ? 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30'
                    : 'text-slate-300 hover:text-cyan-400 border-[#1b2b42]',
                )}
              >
                <Bookmark className="w-4 h-4" />
              </Link>
            )}

            {/* Notification Bell – for authenticated users only */}
            {isAuthenticated && <NotificationBell />}

            {/* Role-Aware Primary CTA */}
            {userRole === 'GUEST' || userRole === 'VIEWER' ? (
              <Link href={headerCta.href} title={headerCta.tooltip} aria-label={headerCta.label}>
                <button
                  className={cn(
                    'flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] font-black',
                    'shadow-[0_0_12px_rgba(249,115,22,0.35)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap',
                    'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black',
                  )}
                >
                  <CtaIcon className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">{headerCta.label}</span>
                </button>
              </Link>
            ) : userRole === 'STAFF' ? (
              <Link href={headerCta.href} title={headerCta.tooltip} aria-label={headerCta.label}>
                <button
                  className={cn(
                    'flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] font-black',
                    'shadow-[0_0_12px_rgba(168,85,247,0.35)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap',
                    'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white',
                  )}
                >
                  <CtaIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{headerCta.label}</span>
                </button>
              </Link>
            ) : (
              <Link href={headerCta.href} title={headerCta.tooltip} aria-label={headerCta.label}>
                <button
                  className={cn(
                    'flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] font-black',
                    'shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap',
                    'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black',
                  )}
                >
                  <CtaIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{headerCta.label}</span>
                </button>
              </Link>
            )}

            {/* User Profile Avatar / Login Button */}
            {isLoading ? (
              <div
                className="w-8 h-8 rounded-full bg-[#172233] animate-pulse"
                aria-label="Đang tải"
              />
            ) : isAuthenticated && user ? (
              <div className="relative z-30">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  aria-label="Mở menu tài khoản"
                  className="flex items-center gap-1 p-0.5 rounded-full hover:bg-[#152339] border border-[#1b2b42] transition-all cursor-pointer"
                >
                  <div
                    className={cn(
                      'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm',
                      'ring-2 ring-offset-2 ring-offset-[#070b12] transition-all',
                      userRole === 'ADMIN'
                        ? 'bg-gradient-to-tr from-amber-500 to-orange-500 ring-amber-500/40'
                        : userRole === 'STAFF'
                          ? 'bg-gradient-to-tr from-purple-500 to-indigo-600 ring-purple-500/40'
                          : 'bg-gradient-to-tr from-cyan-500 to-blue-600 ring-cyan-500/40',
                    )}
                  >
                    {(user.fullName || user.email || 'U')[0].toUpperCase()}
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 rounded-xl border border-[#1e2d44] bg-[#0c1421] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <div className="px-3 py-2 border-b border-[#1a273b] mb-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {user.fullName || 'Thành viên OmniCast'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[9px] font-black uppercase tracking-wider',
                            userMeta.pillClass,
                          )}
                        >
                          <span className={cn('w-1 h-1 rounded-full', userMeta.dotClass)} />
                          {userMeta.shortLabel} [{userMeta.rank}]
                        </span>
                      </div>
                    </div>

                    {/* Role-tailored menu links */}
                    {userRole === 'ADMIN' ? (
                      <>
                        <Link
                          href="/admin"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-amber-300 hover:text-white hover:bg-amber-950/40 rounded-lg transition-colors font-bold"
                        >
                          <Gauge className="w-3.5 h-3.5 text-amber-400" />
                          Bảng điều khiển Admin
                        </Link>
                        <Link
                          href="/admin/users"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-amber-300 hover:text-white hover:bg-amber-950/40 rounded-lg transition-colors"
                        >
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          Quản lý người dùng & RBAC
                        </Link>
                        <Link
                          href="/admin/audit-logs"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-amber-300 hover:text-white hover:bg-amber-950/40 rounded-lg transition-colors"
                        >
                          <FileLock className="w-3.5 h-3.5 text-amber-400" />
                          Nhật ký Audit Logs
                        </Link>
                        <Link
                          href="/studio/live"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-purple-300 hover:text-white hover:bg-purple-950/40 rounded-lg transition-colors"
                        >
                          <Radio className="w-3.5 h-3.5 text-purple-400" />
                          Live Studio
                        </Link>
                        <div className="my-1 border-t border-[#1a273b]" />
                        <Link
                          href="/profile"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Hồ sơ cá nhân
                        </Link>
                        <Link
                          href="/settings"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5 text-slate-400" />
                          Cài đặt hệ thống
                        </Link>
                      </>
                    ) : userRole === 'STAFF' ? (
                      <>
                        <Link
                          href="/studio/live"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-purple-300 hover:text-white hover:bg-purple-950/40 rounded-lg transition-colors font-bold"
                        >
                          <Radio className="w-3.5 h-3.5 text-purple-400" />
                          Live Studio Phát Sóng
                        </Link>
                        <Link
                          href="/studio/curator"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-purple-300 hover:text-white hover:bg-purple-950/40 rounded-lg transition-colors"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                          AI Curator Phân Tích
                        </Link>
                        <Link
                          href="/epg"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-cyan-300 hover:text-white hover:bg-cyan-950/40 rounded-lg transition-colors"
                        >
                          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                          Lịch Phát Sóng EPG
                        </Link>
                        <div className="my-1 border-t border-[#1a273b]" />
                        <Link
                          href="/profile"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Hồ sơ cá nhân
                        </Link>
                        <Link
                          href="/settings"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5 text-slate-400" />
                          Cài đặt Studio
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/profile"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors font-bold"
                        >
                          <User className="w-3.5 h-3.5 text-cyan-400" />
                          Hồ sơ cá nhân
                        </Link>
                        <Link
                          href="/watchlist"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-cyan-300 hover:text-white hover:bg-cyan-950/40 rounded-lg transition-colors"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                          Danh sách yêu thích
                        </Link>
                        <Link
                          href="/settings"
                          role="menuitem"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5 text-slate-400" />
                          Cài đặt & OmniPass
                        </Link>
                      </>
                    )}

                    <div className="my-1 border-t border-[#1a273b]" />
                    <button
                      type="button"
                      onClick={openSingleLogout}
                      disabled={isLoggingOut}
                      role="menuitem"
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Đăng xuất
                    </button>
                    <button
                      type="button"
                      onClick={openAllLogout}
                      disabled={isLoggingOut}
                      role="menuitem"
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-300/80 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Đăng xuất khỏi mọi thiết bị (điện thoại, tablet, máy tính khác)"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Đăng xuất mọi thiết bị
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button
                  size="sm"
                  className="h-8 px-2.5 sm:px-3 text-[11px] font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border border-cyan-400/40"
                >
                  <LogIn className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Mở menu"
              aria-expanded={isMenuOpen}
              className="md:hidden p-2 rounded-lg bg-[#0e1726] border border-[#1b2b42] text-slate-300 hover:text-cyan-400 transition-colors"
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Now-Playing Channel Strip (replaces horizontal marquee) ── */}
      <NowPlayingBar />

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-[#1a273b] bg-[#070b12] p-3 space-y-1">
          {/* Role pill in mobile */}
          {isAuthenticated && (
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border font-mono text-[10px] font-black uppercase tracking-wider mb-2',
                roleAccent.bg,
                roleAccent.border,
                roleAccent.text,
              )}
            >
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

              {userRole === 'ADMIN' && (
                <>
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-amber-300 hover:bg-amber-950/40"
                  >
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    Bảng điều khiển Admin
                  </Link>
                  <Link
                    href="/admin/users"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-amber-300 hover:bg-amber-950/40"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    Quản lý người dùng
                  </Link>
                  <Link
                    href="/admin/audit-logs"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-amber-300 hover:bg-amber-950/40"
                  >
                    <FileLock className="w-3.5 h-3.5 text-amber-400" />
                    Nhật ký Audit Logs
                  </Link>
                </>
              )}

              {userRole === 'STAFF' && (
                <>
                  <Link
                    href="/studio/live"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-purple-300 hover:bg-purple-950/40"
                  >
                    <Radio className="w-3.5 h-3.5 text-purple-400" />
                    Live Studio Phát Sóng
                  </Link>
                  <Link
                    href="/studio/curator"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-purple-300 hover:bg-purple-950/40"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                    AI Curator Phân Tích
                  </Link>
                </>
              )}

              {userRole === 'VIEWER' && (
                <Link
                  href="/watchlist"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-cyan-300 hover:bg-cyan-950/40"
                >
                  <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                  Danh sách yêu thích
                </Link>
              )}

              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#121c2d] hover:text-cyan-400"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                Hồ sơ cá nhân
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#121c2d] hover:text-cyan-400"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                Cài đặt
              </Link>
              <button
                type="button"
                onClick={openSingleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng xuất
              </button>
              <button
                type="button"
                onClick={openAllLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-300/80 hover:bg-red-500/10 disabled:opacity-50"
                title="Đăng xuất khỏi mọi thiết bị (điện thoại, tablet, máy tính khác)"
              >
                <Shield className="w-3.5 h-3.5" />
                Đăng xuất mọi thiết bị
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

      {/* ── 4. Logout Confirm Dialog ─────────────────────────────────
          Two flavours: "single device" (revoke this session) and
          "all devices" (revoke every session the user owns). */}
      {logoutDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeLogoutDialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#1e2d44] bg-[#0a1220] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className={cn(
                  'p-2 rounded-lg flex-shrink-0',
                  logoutDialog.mode === 'all'
                    ? 'bg-red-950/60 border border-red-500/40'
                    : 'bg-amber-950/60 border border-amber-500/40',
                )}
              >
                {logoutDialog.mode === 'all' ? (
                  <Shield className="w-5 h-5 text-red-400" />
                ) : (
                  <LogOut className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="flex-1">
                <h3
                  id="logout-dialog-title"
                  className="text-base font-bold text-white mb-1"
                >
                  {logoutDialog.mode === 'all'
                    ? 'Đăng xuất khỏi mọi thiết bị?'
                    : 'Đăng xuất khỏi OmniCast?'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {logoutDialog.mode === 'all'
                    ? 'Tất cả phiên đăng nhập của bạn (điện thoại, máy tính bảng, trình duyệt khác) sẽ bị đăng xuất ngay lập tức. Bạn sẽ cần đăng nhập lại trên từng thiết bị.'
                    : 'Phiên đăng nhập hiện tại sẽ bị đăng xuất. Các thiết bị khác của bạn vẫn hoạt động bình thường.'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={closeLogoutDialog}
                disabled={isLoggingOut}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-bold text-slate-300 bg-[#152339] hover:bg-[#1a2c47] border border-[#1e2d44] transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={
                  logoutDialog.mode === 'all' ? handleLogoutAll : handleLogout
                }
                disabled={isLoggingOut}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50',
                  logoutDialog.mode === 'all'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-amber-600 hover:bg-amber-500',
                )}
              >
                {isLoggingOut ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Đang xử lý...
                  </span>
                ) : logoutDialog.mode === 'all' ? (
                  'Đăng xuất tất cả'
                ) : (
                  'Đăng xuất'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

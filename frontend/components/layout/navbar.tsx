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
  Tv,
  Film,
  Calendar,
  Radio,
  ChevronDown,
  Bookmark,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { cn } from '@/lib/utils';
import { useChannels } from '@/lib/hooks/useChannels';

export const CHANNELS_TICKER_LIST = [
  { id: '1', slug: 'sport-1', name: 'Omni Sport 1', isLive: true },
  { id: '2', slug: 'sport-2', name: 'Sport 2', isLive: true },
  { id: '3', slug: 'cine', name: 'Omni Cine', isLive: true },
  { id: '4', slug: 'drama', name: 'Omni Drama', isLive: false },
  { id: '5', slug: 'news', name: 'News 24/7', isLive: true },
  { id: '6', slug: 'music', name: 'Music Hits', isLive: false },
  { id: '7', slug: 'show', name: 'Omni Show', isLive: false },
  { id: '8', slug: 'entertain', name: 'Omni Entertain', isLive: false },
  { id: '9', slug: 'esports', name: 'Omni Esports', isLive: true },
  { id: '10', slug: 'indie-games', name: 'Indie Games', isLive: false },
  { id: '11', slug: 'discovery', name: 'Omni Discovery', isLive: true },
  { id: '12', slug: 'tech', name: 'Omni Tech', isLive: false },
  { id: '13', slug: 'food', name: 'Food Life', isLive: false },
  { id: '14', slug: 'kids', name: 'Kids Zone', isLive: false },
  { id: '15', slug: 'podcast', name: 'Omni Podcast', isLive: false },
  { id: '16', slug: 'audiobook', name: 'Audiobook', isLive: false },
  { id: '17', slug: 'academy', name: 'Omni Academy', isLive: false },
  { id: '18', slug: 'skill-lab', name: 'Skill Lab', isLive: false },
  { id: '19', slug: 'wellness', name: 'Omni Wellness', isLive: false },
  { id: '20', slug: 'fashion', name: 'Omni Fashion', isLive: false },
  { id: '21', slug: 'travel-vn', name: 'Travel VN', isLive: false },
  { id: '22', slug: 'travel-world', name: 'Travel World', isLive: false },
  { id: '23', slug: 'art-design', name: 'Art & Design', isLive: false },
  { id: '24', slug: 'business', name: 'Omni Business', isLive: false },
  { id: '25', slug: 'health', name: 'Omni Health', isLive: false },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { locale, setLocale } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { data: channelsData } = useChannels({ limit: 50 });
  const dynamicChannels = channelsData?.data && channelsData.data.length > 0
    ? channelsData.data.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        isLive: c.isActive,
      }))
    : CHANNELS_TICKER_LIST;

  const userRole = user?.role;

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    router.push('/');
    router.refresh();
  };

  const toggleLanguage = () => {
    setLocale(locale === 'vi' ? 'en' : 'vi');
  };

  const NAV_LINKS = [
    { label: 'Trang Chủ', href: '/' },
    { label: 'Truyền Hình', href: '/channels' },
    { label: 'Lịch EPG', href: '/epg' },
    { label: 'Kho Phim', href: '/recordings' },
    { label: 'OmniPass', href: '/settings' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full max-w-full overflow-hidden border-b border-[#142032] bg-[#070b12]/95 backdrop-blur-xl">
      {/* ── 1. Main Header Bar (Responsive at 100% & 90% Zoom) ──────── */}
      <div className="max-w-[1720px] w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex h-13 md:h-14 items-center justify-between gap-2 sm:gap-4">
          
          {/* Brand Logo & Compact Navigation Links */}
          <div className="flex items-center gap-3 sm:gap-6 xl:gap-8 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center transition-transform group-hover:scale-105 shadow-[0_0_12px_rgba(0,242,254,0.25)]">
                <Image
                  src="/logo.svg"
                  alt="OmniCast Logo"
                  width={22}
                  height={22}
                  unoptimized
                  className="w-5 h-5 object-contain drop-shadow-[0_0_6px_rgba(0,242,254,0.8)]"
                />
              </div>
              <span className="text-base sm:text-lg font-black tracking-tight text-white flex items-center">
                Omni<span className="text-cyan-400">Cast</span>
              </span>
            </Link>

            {/* Desktop Navigation (Fit 100% / 90% without breaking) */}
            <nav className="hidden md:flex items-center gap-1 xl:gap-1.5">
              {NAV_LINKS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg transition-all duration-150 whitespace-nowrap',
                      isActive
                        ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,242,254,0.15)] font-black'
                        : 'text-slate-300 hover:text-white hover:bg-[#0e1726]'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Compact Actions (No bulky 4K/UHD, fits smoothly) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            
            {/* Quick Search Button */}
            <Link
              href="/search"
              className="p-1.5 sm:p-2 rounded-lg bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-slate-300 hover:text-cyan-400 transition-colors"
              title="Tìm kiếm (⌘K)"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>

            {/* Quick Watchlist Bookmark Button */}
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

            {/* Notification Bell */}
            <button
              className="relative p-1.5 sm:p-2 rounded-lg bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-slate-300 hover:text-white transition-colors"
              aria-label="Thông báo"
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f2fe]" />
            </button>

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

            {/* Mua Gói OmniPass CTA Button */}
            <Link href="/settings">
              <button className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black text-[11px] font-black shadow-[0_0_12px_rgba(249,115,22,0.35)] transition-transform hover:scale-102 cursor-pointer whitespace-nowrap">
                <Sparkles className="w-3 h-3 fill-current" />
                <span>Mua gói</span>
              </button>
            </Link>

            {/* User Profile Avatar */}
            {isLoading ? (
              <div className="w-7 h-7 rounded-full bg-[#172233] animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1 p-0.5 rounded-full hover:bg-[#152339] border border-[#1b2b42] transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
                    {(user.fullName || user.email || 'U')[0].toUpperCase()}
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#1e2d44] bg-[#0c1421] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-[#1a273b] mb-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {user.fullName || 'Thành viên OmniCast'}
                      </p>
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

                    <Link
                      href="/studio/curator"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5 text-purple-400" />
                      Studio & AI Curator
                    </Link>

                    {userRole === 'ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
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
                  className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-[#121c2d] hover:bg-[#1a2940] text-slate-200 border border-[#22334d]"
                >
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
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#00f2fe]" />
            CHANNELS ({dynamicChannels.length})
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
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#121c2d] hover:text-cyan-400"
            >
              {item.label}
            </Link>
          ))}
          {isAuthenticated && (
            <>
              <div className="my-1 border-t border-[#18273c]" />
              <Link
                href="/watchlist"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#121c2d] hover:text-cyan-400"
              >
                <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                Danh sách xem sau & Yêu thích
              </Link>
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#121c2d] hover:text-cyan-400"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Hồ sơ cá nhân
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

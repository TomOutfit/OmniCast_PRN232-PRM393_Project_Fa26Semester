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
  LayoutDashboard,
  Shield,
  Bell,
  Sparkles,
  Radio,
  Tv,
  Film,
  Calendar,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { useChannels } from '@/lib/hooks/useChannels';

export const CHANNELS_TICKER_FALLBACK = [
  { id: 'sport-1', name: 'Omni Sport 1', isLive: true, slug: 'sport-1' },
  { id: 'sport-2', name: 'Sport 2', isLive: true, slug: 'sport-2' },
  { id: 'show', name: 'Omni Show', isLive: false, slug: 'show' },
  { id: 'entertain', name: 'Omni Entertain', isLive: false, slug: 'entertain' },
  { id: 'cine', name: 'Omni Cine', isLive: true, slug: 'cine' },
  { id: 'drama', name: 'Omni Drama', isLive: false, slug: 'drama' },
  { id: 'news', name: 'News 24/7', isLive: true, slug: 'news' },
  { id: 'music', name: 'Music Hits', isLive: false, slug: 'music' },
  { id: 'kids', name: 'Kids Zone', isLive: false, slug: 'kids' },
  { id: 'tech', name: 'Omni Tech', isLive: false, slug: 'tech' },
  { id: 'food', name: 'Food Life', isLive: false, slug: 'food' },
  { id: 'discovery', name: 'Omni Discovery', isLive: false, slug: 'discovery' },
  { id: 'esports', name: 'Omni Esports', isLive: true, slug: 'esports' },
  { id: 'indie-games', name: 'Indie Games', isLive: false, slug: 'indie-games' },
  { id: 'podcast', name: 'Omni Podcast', isLive: false, slug: 'podcast' },
  { id: 'audiobook', name: 'Audiobook', isLive: false, slug: 'audiobook' },
  { id: 'academy', name: 'Omni Academy', isLive: false, slug: 'academy' },
  { id: 'skill-lab', name: 'Skill Lab', isLive: false, slug: 'skill-lab' },
  { id: 'wellness', name: 'Omni Wellness', isLive: false, slug: 'wellness' },
  { id: 'fashion', name: 'Omni Fashion', isLive: false, slug: 'fashion' },
  { id: 'travel-vn', name: 'Travel VN', isLive: false, slug: 'travel-vn' },
  { id: 'travel-world', name: 'Travel World', isLive: false, slug: 'travel-world' },
  { id: 'art-design', name: 'Art & Design', isLive: false, slug: 'art-design' },
  { id: 'business', name: 'Omni Business', isLive: false, slug: 'business' },
  { id: 'health', name: 'Omni Health', isLive: false, slug: 'health' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeTickerChannel, setActiveTickerChannel] = useState('sport-1');

  // Dynamically fetch channels from API
  const { data: channelsData } = useChannels({ limit: 50 });
  const dynamicChannels = channelsData?.data && channelsData.data.length > 0
    ? channelsData.data.map((c) => ({
        id: c.id,
        name: c.name,
        isLive: c.isActive,
        slug: c.slug,
      }))
    : CHANNELS_TICKER_FALLBACK;

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
    { label: 'Lịch Phát Sóng (EPG)', href: '/epg' },
    { label: 'Kênh Truyền Hình', href: '/channels' },
    { label: 'Kho VOD & Phim', href: '/recordings' },
    { label: 'Gói Dịch Vụ OmniPass', href: '/settings' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full max-w-full overflow-hidden border-b border-[#182333] bg-[#070b12]/95 backdrop-blur-xl">
      {/* ── Main Top Bar ───────────────────────────────────────────── */}
      <div className="max-w-[1680px] w-full mx-auto px-4 lg:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Brand Logo + Nav Links */}
          <div className="flex items-center gap-6 xl:gap-8">
            <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center transition-transform group-hover:scale-105 shadow-[0_0_15px_rgba(0,242,254,0.2)]">
                <Image
                  src="/logo.svg"
                  alt="OmniCast Logo"
                  width={28}
                  height={28}
                  unoptimized
                  className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(0,242,254,0.8)]"
                />
              </div>
              <span className="text-xl font-black tracking-tight text-white flex items-center">
                Omni<span className="text-cyan-400">Cast</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-1.5">
              {NAV_LINKS.map((item) => {
                const isActive = pathname === item.href || (item.href === '/' && pathname === '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-3.5 py-2 text-xs font-bold tracking-wide rounded-lg transition-all duration-200 text-center whitespace-nowrap',
                      isActive
                        ? 'bg-[#102235] text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,242,254,0.15)]'
                        : 'text-slate-300 hover:text-white hover:bg-[#0e1624]'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section: ON-AIR Badge, Search, Lang, User */}
          <div className="flex items-center gap-3.5">
            {/* Live Broadcast ON-AIR Tag */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#111927] border border-[#1e2d44] text-[11px] font-bold text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
              <span className="tracking-wider text-red-400 font-extrabold">ON-AIR</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400 font-semibold">4K UHD</span>
            </div>

            {/* Quick Search */}
            <div className="relative hidden md:block w-52 lg:w-72">
              <Link href="/search" className="block relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                <Input
                  type="search"
                  placeholder="Tìm kiếm kênh, giải đấu, phim..."
                  className="pl-9 pr-8 h-9 text-xs bg-[#0c1421] border-[#1a273b] hover:border-cyan-500/50 text-slate-200 placeholder:text-slate-500 rounded-lg cursor-pointer focus:border-cyan-400"
                  readOnly
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 bg-[#141f32] px-1.5 py-0.5 rounded border border-[#24334d]">
                  ⌘K
                </kbd>
              </Link>
            </div>

            {/* Language Switch Button VIE / ENG */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0e1726] hover:bg-[#152339] border border-[#1f304b] text-[11px] font-bold text-slate-300 hover:text-cyan-400 transition-colors"
              title="Đổi ngôn ngữ"
            >
              <span className={cn(locale === 'vi' ? 'text-cyan-400' : 'text-slate-400')}>VIE</span>
              <span className="text-slate-600">/</span>
              <span className={cn(locale === 'en' ? 'text-cyan-400' : 'text-slate-400')}>ENG</span>
            </button>

            {/* Notification Bell */}
            <button
              className="relative p-2 rounded-lg bg-[#0e1726] hover:bg-[#152339] border border-[#1f304b] text-slate-300 hover:text-white transition-colors"
              aria-label="Thông báo"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f2fe]"></span>
            </button>

            {/* User Profile / VIP Badge */}
            {isLoading ? (
              <div className="w-9 h-9 rounded-full bg-[#172233] animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-[#152339] border border-[#1f304b] transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {(user.fullName || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-sm mr-1">
                    VIP
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#1e2d44] bg-[#0c1421] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-[#1a273b] mb-1">
                      <p className="text-sm font-semibold text-white truncate">
                        {user.fullName || 'Thành viên OmniCast'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4 text-cyan-400" />
                      Cài đặt tài khoản & OmniPass
                    </Link>

                    {userRole === 'ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
                      >
                        <Shield className="w-4 h-4 text-emerald-400" />
                        Quản trị hệ thống
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button
                    size="sm"
                    className="h-8 px-4 text-xs font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(0,242,254,0.3)] border-0"
                  >
                    Đăng nhập
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="xl:hidden p-2 rounded-lg bg-[#0e1726] border border-[#1f304b] text-slate-300"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Sub-header Channel Ticker Strip (Stitch 1:1) ───────────────── */}
      <div className="w-full max-w-full border-t border-[#121c2d] bg-[#05080e]/90 overflow-x-auto scrollbar-none py-1.5 px-4 lg:px-6">
        <div className="max-w-[1680px] w-full mx-auto flex items-center gap-4 min-w-max text-[11px]">
          <span className="font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            CHANNELS ({dynamicChannels.length})
          </span>
          <div className="flex items-center gap-4">
            {dynamicChannels.map((ch) => {
              const isSelected = activeTickerChannel === ch.id;
              return (
                <Link
                  key={ch.id}
                  href={`/channels/${ch.slug}`}
                  onClick={() => setActiveTickerChannel(ch.id)}
                  className={cn(
                    'flex items-center gap-1.5 transition-colors font-medium cursor-pointer',
                    isSelected
                      ? 'text-cyan-400 font-bold drop-shadow-[0_0_6px_rgba(0,242,254,0.6)]'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      ch.isLive
                        ? 'bg-cyan-400 shadow-[0_0_6px_#00f2fe]'
                        : 'bg-slate-600'
                    )}
                  />
                  <span>{ch.name}</span>
                  {ch.isLive && (
                    <span className="text-[9px] font-black uppercase text-cyan-300 bg-cyan-950/60 px-1 rounded border border-cyan-800">
                      LIVE
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="xl:hidden border-t border-[#1a273b] bg-[#070b12] p-4 space-y-2">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-[#121c2d] hover:text-cyan-400"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

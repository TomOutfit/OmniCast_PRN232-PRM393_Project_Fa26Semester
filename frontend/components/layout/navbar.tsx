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
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { locale, setLocale } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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
    { label: 'Truyền Hình', href: '/channels', icon: Tv },
    { label: 'Lịch Phát Sóng (EPG)', href: '/epg', icon: Calendar },
    { label: 'Kho VOD & Phim', href: '/recordings', icon: Film },
    { label: 'Gói OmniPass', href: '/settings', icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-50 w-full max-w-full border-b border-[#142032] bg-[#070b12]/95 backdrop-blur-xl">
      <div className="max-w-[1720px] w-full mx-auto px-4 lg:px-8">
        <div className="flex h-14 md:h-16 items-center justify-between gap-4">
          
          {/* ── Brand Logo + Nav Links (VTVGo Style) ────────────────── */}
          <div className="flex items-center gap-6 xl:gap-8">
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="relative w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center transition-transform group-hover:scale-105 shadow-[0_0_15px_rgba(0,242,254,0.25)]">
                <Image
                  src="/logo.svg"
                  alt="OmniCast Logo"
                  width={24}
                  height={24}
                  unoptimized
                  className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(0,242,254,0.8)]"
                />
              </div>
              <span className="text-lg md:text-xl font-black tracking-tight text-white flex items-center">
                Omni<span className="text-cyan-400">Cast</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((item) => {
                const isActive = pathname === item.href;
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 whitespace-nowrap',
                      isActive
                        ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,242,254,0.15)]'
                        : 'text-slate-300 hover:text-white hover:bg-[#0e1726]'
                    )}
                  >
                    <IconComponent className={cn('w-3.5 h-3.5', isActive ? 'text-cyan-400' : 'text-slate-400')} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* ── Right Actions: Search, Notif, Mua Gói CTA, User ───────── */}
          <div className="flex items-center gap-2.5 md:gap-3">
            
            {/* Quick Search Icon Button */}
            <Link
              href="/search"
              className="p-2 rounded-xl bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-slate-300 hover:text-cyan-400 transition-colors"
              title="Tìm kiếm (⌘K)"
            >
              <Search className="w-4 h-4" />
            </Link>

            {/* Notification Bell */}
            <button
              className="relative p-2 rounded-xl bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-slate-300 hover:text-white transition-colors"
              aria-label="Thông báo"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f2fe]" />
            </button>

            {/* Language Switch */}
            <button
              onClick={toggleLanguage}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-[11px] font-bold text-slate-300 hover:text-cyan-400 transition-colors"
              title="Đổi ngôn ngữ"
            >
              <span className={cn(locale === 'vi' ? 'text-cyan-400 font-black' : 'text-slate-500')}>VIE</span>
              <span className="text-slate-600">/</span>
              <span className={cn(locale === 'en' ? 'text-cyan-400 font-black' : 'text-slate-500')}>ENG</span>
            </button>

            {/* VTVGo-style "Mua Gói" Highlight CTA Button */}
            <Link href="/settings">
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-400 hover:to-amber-400 text-black text-xs font-black shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-transform hover:scale-105 cursor-pointer">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Mua gói</span>
              </button>
            </Link>

            {/* User Profile Avatar */}
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-[#172233] animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-full hover:bg-[#152339] border border-[#1b2b42] transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {(user.fullName || user.email || 'U')[0].toUpperCase()}
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#1e2d44] bg-[#0c1421] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-[#1a273b] mb-1">
                      <p className="text-sm font-semibold text-white truncate">
                        {user.fullName || 'Thành viên OmniCast'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>

                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-xl transition-colors"
                    >
                      <Settings className="w-4 h-4 text-cyan-400" />
                      Cài đặt & OmniPass
                    </Link>

                    {userRole === 'ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-xl transition-colors"
                      >
                        <Shield className="w-4 h-4 text-emerald-400" />
                        Quản trị hệ thống
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs font-bold rounded-xl bg-[#121c2d] hover:bg-[#1a2940] text-slate-200 border border-[#22334d]"
                >
                  Đăng nhập
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#0e1726] border border-[#1b2b42] text-slate-300"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-[#1a273b] bg-[#070b12] p-4 space-y-2">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-[#121c2d] hover:text-cyan-400"
            >
              <item.icon className="w-4 h-4 text-cyan-400" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

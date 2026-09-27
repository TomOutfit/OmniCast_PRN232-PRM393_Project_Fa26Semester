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
  ChevronDown,
  Moon,
  Sun,
  Bell,
  Globe,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n/i18n-provider';
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type Locale,
} from '@/lib/i18n/config';
import { useTheme, type ThemeMode } from '@/lib/theme/theme-provider';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { key: 'nav.home', href: '/' },
  { key: 'nav.epg', href: '/epg' },
  { key: 'nav.channels', href: '/channels' },
  { key: 'nav.search', href: '/search' },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { mode, setMode, resolved } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userRole = user?.role;

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    router.push('/');
    router.refresh();
  };

  const cycleTheme = (current: ThemeMode): ThemeMode => {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(current);
    return order[(idx + 1) % order.length];
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-dark-700 bg-dark-950/80 backdrop-blur-lg dark:bg-dark-950/80 light:bg-white/80">
      <nav className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105">
                <Image
                  src="/logo.svg"
                  alt="OmniCast Logo"
                  width={36}
                  height={36}
                  unoptimized
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold gradient-text hidden sm:block">
                OmniCast
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    pathname === item.href
                      ? 'text-primary-400 bg-primary-500/10'
                      : 'text-dark-300 hover:text-white hover:bg-dark-800 dark:text-dark-300 dark:hover:text-white dark:hover:bg-dark-800 light:text-gray-700 light:hover:text-black light:hover:bg-gray-100',
                  )}
                >
                  {t(item.key)}
                </Link>
              ))}
            </div>
          </div>

          {/* Search Bar (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <Link href="/search" className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 dark:text-dark-500 light:text-gray-400" />
              <Input
                type="search"
                placeholder={t('common.search.placeholder')}
                className="pl-10 bg-dark-800/50 border-dark-700 dark:bg-dark-800/50 dark:border-dark-700 light:bg-white light:border-gray-200 cursor-pointer"
                readOnly
              />
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={() => setMode(cycleTheme(mode))}
              className="p-2 rounded-lg hover:bg-dark-800 dark:hover:bg-dark-800 light:hover:bg-gray-100 transition-colors focus-visible-ring"
              aria-label={t('common.theme.toggle')}
              title={mode}
            >
              {resolved === 'dark' ? (
                <Moon className="w-5 h-5 text-dark-200 dark:text-dark-200 light:text-gray-700" />
              ) : (
                <Sun className="w-5 h-5 text-dark-200 dark:text-dark-200 light:text-gray-700" />
              )}
            </button>

            {/* Language dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-dark-800 dark:hover:bg-dark-800 light:hover:bg-gray-100 transition-colors focus-visible-ring"
                  aria-label={t('common.language.toggle')}
                >
                  <Globe className="w-5 h-5 text-dark-200 dark:text-dark-200 light:text-gray-700" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 min-w-[10rem] rounded-xl border border-dark-700 bg-dark-800 p-1 shadow-xl dark:bg-dark-800 dark:border-dark-700 light:bg-white light:border-gray-200"
                >
                  {SUPPORTED_LOCALES.map((loc) => (
                    <DropdownMenu.Item
                      key={loc}
                      onSelect={() => setLocale(loc as Locale)}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer outline-none',
                        locale === loc
                          ? 'bg-primary-500/10 text-primary-300'
                          : 'text-dark-200 hover:bg-dark-700 dark:hover:bg-dark-700 light:text-gray-700 light:hover:bg-gray-100',
                      )}
                    >
                      <span>{LOCALE_LABELS[loc]}</span>
                      {locale === loc && (
                        <span className="text-primary-400 text-xs">✓</span>
                      )}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Notifications quick link (auth) */}
            {isAuthenticated && (
              <Link
                href="/notifications"
                className="p-2 rounded-lg hover:bg-dark-800 dark:hover:bg-dark-800 light:hover:bg-gray-100 transition-colors focus-visible-ring"
                aria-label={t('nav.notifications')}
              >
                <Bell className="w-5 h-5 text-dark-200 dark:text-dark-200 light:text-gray-700" />
              </Link>
            )}

            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-dark-700 animate-pulse ml-2" />
            ) : isAuthenticated && user ? (
              <div className="relative ml-2">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-dark-800 dark:hover:bg-dark-800 light:hover:bg-gray-100 transition-colors focus-visible-ring"
                  aria-label={t('nav.profile')}
                >
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-medium text-white">
                    {(user.fullName || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-dark-400 hidden sm:block dark:text-dark-400 light:text-gray-500" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-dark-800 border border-dark-700 shadow-xl py-2 z-50 dark:bg-dark-800 dark:border-dark-700 light:bg-white light:border-gray-200">
                    <div className="px-4 py-2 border-b border-dark-700 dark:border-dark-700 light:border-gray-200">
                      <p className="text-sm font-medium text-white dark:text-white light:text-gray-900 truncate">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-dark-400 truncate dark:text-dark-400 light:text-gray-500">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700 dark:text-dark-300 dark:hover:text-white dark:hover:bg-dark-700 light:text-gray-700 light:hover:text-gray-900 light:hover:bg-gray-100"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        {t('nav.profile')}
                      </Link>

                      {(userRole === 'STAFF' || userRole === 'ADMIN') && (
                        <Link
                          href="/studio/curator"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700 dark:text-dark-300 dark:hover:text-white dark:hover:bg-dark-700 light:text-gray-700 light:hover:text-gray-900 light:hover:bg-gray-100"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          {t('nav.studio')}
                        </Link>
                      )}

                      {userRole === 'ADMIN' && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700 dark:text-dark-300 dark:hover:text-white dark:hover:bg-dark-700 light:text-gray-700 light:hover:text-gray-900 light:hover:bg-gray-100"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4" />
                          {t('nav.admin')}
                        </Link>
                      )}

                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700 dark:text-dark-300 dark:hover:text-white dark:hover:bg-dark-700 light:text-gray-700 light:hover:text-gray-900 light:hover:bg-gray-100"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        {t('nav.settings')}
                      </Link>

                      <Link
                        href="/premium"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-accent-gold hover:bg-dark-700 dark:hover:bg-dark-700 light:hover:bg-gray-100"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Sparkles className="w-4 h-4" />
                        {t('nav.premium')}
                      </Link>
                    </div>

                    <div className="border-t border-dark-700 pt-1 dark:border-dark-700 light:border-gray-200">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-dark-700 dark:hover:bg-dark-700 light:hover:bg-gray-100"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">{t('nav.login')}</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">{t('nav.register')}</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-dark-800 transition-colors focus-visible-ring dark:hover:bg-dark-800 light:hover:bg-gray-100"
              aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-white dark:text-white light:text-black" />
              ) : (
                <Menu className="w-6 h-6 text-white dark:text-white light:text-black" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-700 dark:border-dark-700 light:border-gray-200">
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    pathname === item.href
                      ? 'text-primary-400 bg-primary-500/10'
                      : 'text-dark-300 hover:text-white hover:bg-dark-800 dark:text-dark-300 dark:hover:text-white dark:hover:bg-dark-800 light:text-gray-700 light:hover:text-gray-900 light:hover:bg-gray-100',
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t(item.key)}
                </Link>
              ))}

              <div className="mt-4 pt-4 border-t border-dark-700 dark:border-dark-700 light:border-gray-200">
                <Link href="/search" onClick={() => setIsMenuOpen(false)}>
                  <Input
                    type="search"
                    placeholder={t('common.search.placeholder')}
                    className="bg-dark-800/50 border-dark-700 dark:bg-dark-800/50 dark:border-dark-700 light:bg-white light:border-gray-200"
                    readOnly
                  />
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

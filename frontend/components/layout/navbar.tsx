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
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Trang chủ', href: '/' },
  { name: 'Lịch phát sóng', href: '/epg' },
  { name: 'Kênh', href: '/channels' },
  { name: 'Tìm kiếm', href: '/search' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userRole = user?.role;

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-dark-700 bg-dark-950/80 backdrop-blur-lg">
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
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    pathname === item.href
                      ? 'text-primary-400 bg-primary-500/10'
                      : 'text-dark-300 hover:text-white hover:bg-dark-800',
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Search Bar (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <Link href="/search" className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <Input
                type="search"
                placeholder="Tìm kiếm chương trình..."
                className="pl-10 bg-dark-800/50 border-dark-700 cursor-pointer"
                readOnly
              />
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-dark-700 animate-pulse" />
            ) : isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-dark-800 transition-colors"
                  aria-label="Mở menu người dùng"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-medium text-white">
                    {(user.fullName || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-dark-400 hidden sm:block" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-dark-800 border border-dark-700 shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-dark-700">
                      <p className="text-sm font-medium text-white truncate">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-dark-400 truncate">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Hồ sơ
                      </Link>

                      {(userRole === 'STAFF' || userRole === 'ADMIN') && (
                        <Link
                          href="/studio/curator"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Studio
                        </Link>
                      )}

                      {userRole === 'ADMIN' && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4" />
                          Quản trị
                        </Link>
                      )}

                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Cài đặt
                      </Link>
                    </div>

                    <div className="border-t border-dark-700 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-dark-700"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Đăng nhập</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Đăng ký</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-dark-800 transition-colors"
              aria-label="Mở menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-700">
            <div className="flex flex-col gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    pathname === item.href
                      ? 'text-primary-400 bg-primary-500/10'
                      : 'text-dark-300 hover:text-white hover:bg-dark-800',
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              <div className="mt-4 pt-4 border-t border-dark-700">
                <Link href="/search" onClick={() => setIsMenuOpen(false)}>
                  <Input
                    type="search"
                    placeholder="Tìm kiếm..."
                    className="bg-dark-800/50 border-dark-700"
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

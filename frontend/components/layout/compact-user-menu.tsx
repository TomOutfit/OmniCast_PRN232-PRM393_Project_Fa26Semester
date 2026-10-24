'use client';

// ============================================================
// OmniCast - Compact User Menu
// ------------------------------------------------------------
// Small avatar + dropdown that can be embedded in any sub-header
// (Studio, Admin, etc.) where the full Navbar user menu isn't
// visible or is hard to reach. Reuses the same logout dialog
// pattern as Navbar for consistency.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  LogOut,
  Settings,
  Shield,
  Loader2,
  Radio,
  Tv,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface CompactUserMenuProps {
  /** Visual variant: 'cyan' (default), 'purple', 'amber' */
  variant?: 'cyan' | 'purple' | 'amber';
  /** Optional size override */
  size?: 'sm' | 'md';
}

export function CompactUserMenu({
  variant = 'cyan',
  size = 'sm',
}: CompactUserMenuProps) {
  const router = useRouter();
  const { user, isAuthenticated, logout, logoutAll } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [logoutDialog, setLogoutDialog] = useState<
    null | { mode: 'single' } | { mode: 'all' }
  >(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isAuthenticated || !user) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Đã đăng xuất', {
        description: 'Phiên của bạn đã được kết thúc an toàn.',
      });
      setLogoutDialog(null);
      router.push('/');
    } catch {
      toast.error('Đăng xuất thất bại');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutAll = async () => {
    setIsLoggingOut(true);
    try {
      const res = await logoutAll();
      toast.success(`Đã đăng xuất khỏi ${res.revokedCount} thiết bị`);
      setLogoutDialog(null);
      router.push('/');
    } catch {
      toast.error('Đăng xuất thất bại');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const avatarSize = size === 'md' ? 'w-9 h-9' : 'w-8 h-8';
  const avatarText = size === 'md' ? 'text-sm' : 'text-xs';

  const ringColor =
    variant === 'amber'
      ? 'ring-amber-500/40'
      : variant === 'purple'
        ? 'ring-purple-500/40'
        : 'ring-cyan-500/40';

  const gradientColor =
    variant === 'amber'
      ? 'from-amber-500 to-orange-500'
      : variant === 'purple'
        ? 'from-purple-500 to-indigo-600'
        : 'from-cyan-500 to-blue-600';

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Mở menu tài khoản"
          className={cn(
            'flex items-center gap-1.5 px-1.5 py-1 rounded-full',
            'hover:bg-[#152339] border border-[#1b2b42]',
            'transition-all cursor-pointer',
          )}
        >
          <div
            className={cn(
              avatarSize,
              'rounded-full flex items-center justify-center font-bold text-white shadow-sm',
              'ring-2 ring-offset-2 ring-offset-[#070b12] transition-all',
              `bg-gradient-to-tr ${gradientColor}`,
              ringColor,
              avatarText,
            )}
          >
            {(user.fullName || user.email || 'U')[0].toUpperCase()}
          </div>
          <span className="hidden md:inline text-[11px] font-semibold text-slate-200 max-w-[100px] truncate">
            {user.fullName || user.email}
          </span>
        </button>

        {isOpen && (
          <div
            role="menu"
            className={cn(
              'absolute right-0 mt-2 w-64 rounded-xl',
              'border border-[#1e2d44] bg-[#0c1421]',
              'p-1.5 shadow-2xl z-50',
              'animate-in fade-in slide-in-from-top-2 duration-150',
            )}
          >
            <div className="px-3 py-2 border-b border-[#1a273b] mb-1">
              <p className="text-xs font-semibold text-white truncate">
                {user.fullName || 'Thành viên OmniCast'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user.email}
              </p>
            </div>

            <Link
              href="/channels"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-rose-300 hover:text-white hover:bg-rose-950/40 rounded-lg transition-colors font-bold"
            >
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              Xem các phòng phát trực tiếp
            </Link>
            <div className="my-1 border-t border-[#1a273b]" />

            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors font-semibold"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Hồ sơ cá nhân
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#152339] rounded-lg transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              Cài đặt
            </Link>

            <div className="my-1 border-t border-[#1a273b]" />
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setLogoutDialog({ mode: 'single' });
              }}
              role="menuitem"
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Đăng xuất
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setLogoutDialog({ mode: 'all' });
              }}
              role="menuitem"
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-300/80 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Đăng xuất khỏi mọi thiết bị"
            >
              <Shield className="w-3.5 h-3.5" />
              Đăng xuất mọi thiết bị
            </button>
          </div>
        )}
      </div>

      {/* Logout confirm dialog */}
      {logoutDialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !isLoggingOut && setLogoutDialog(null)}
          role="dialog"
          aria-modal="true"
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
                <h3 className="text-base font-bold text-white mb-1">
                  {logoutDialog.mode === 'all'
                    ? 'Đăng xuất khỏi mọi thiết bị?'
                    : 'Đăng xuất khỏi OmniCast?'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {logoutDialog.mode === 'all'
                    ? 'Tất cả phiên đăng nhập của bạn sẽ bị thu hồi ngay lập tức. Bạn sẽ cần đăng nhập lại trên từng thiết bị.'
                    : 'Phiên đăng nhập hiện tại sẽ bị đăng xuất. Các thiết bị khác của bạn vẫn hoạt động bình thường.'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setLogoutDialog(null)}
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
                    <Loader2 className="w-3 h-3 animate-spin" />
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
    </>
  );
}

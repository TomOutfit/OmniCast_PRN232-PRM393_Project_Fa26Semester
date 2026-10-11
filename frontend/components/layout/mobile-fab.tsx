'use client';

// ============================================================
// OmniCast - Mobile Floating Action Button (Role-Aware)
// ------------------------------------------------------------
// Surfaces the most-used action per role as a Material-style
// FAB. Hidden on desktop and on auth routes.
//   VIEWER  → Watchlist
//   STAFF   → Live Studio (purple gradient)
//   ADMIN   → Admin Dashboard (amber gradient)
//   GUEST   → Login (cyan gradient)
// ============================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bookmark,
  Radio,
  Gauge,
  LogIn,
  Wand2,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface FabAction {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional secondary action surfaced from the FAB */
  secondary?: { label: string; href: string; icon: LucideIcon };
}

function pickFab(role: 'GUEST' | 'VIEWER' | 'STAFF' | 'ADMIN'): FabAction {
  switch (role) {
    case 'ADMIN':
      return {
        label: 'Quản trị',
        href: '/admin',
        icon: Gauge,
        secondary: { label: 'AI Curator', href: '/studio/curator', icon: Wand2 },
      };
    case 'STAFF':
      return {
        label: 'Studio',
        href: '/studio',
        icon: Radio,
        secondary: { label: 'AI Curator', href: '/studio/curator', icon: Wand2 },
      };
    case 'VIEWER':
      return {
        label: 'Yêu thích',
        href: '/watchlist',
        icon: Bookmark,
      };
    case 'GUEST':
    default:
      return { label: 'Đăng nhập', href: '/login', icon: LogIn };
  }
}

const GRADIENT: Record<'GUEST' | 'VIEWER' | 'STAFF' | 'ADMIN', string> = {
  GUEST: 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_22px_rgba(0,242,254,0.55)]',
  VIEWER: 'bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-[0_0_22px_rgba(0,242,254,0.55)]',
  STAFF: 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-[0_0_22px_rgba(168,85,247,0.55)]',
  ADMIN: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-[0_0_22px_rgba(245,158,11,0.55)]',
};

export function MobileFab() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Hide on auth + studio/admin (those have their own nav)
  const hide =
    isLoading ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/studio') ||
    pathname?.startsWith('/admin');

  if (hide) return null;

  const role = !isAuthenticated ? 'GUEST' : (user?.role ?? 'GUEST');
  const action = pickFab(role);
  const Icon = action.icon;
  const SecondaryIcon = action.secondary?.icon;

  return (
    <div className="md:hidden fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2">
      {/* Secondary mini-FAB */}
      {open && action.secondary && SecondaryIcon && (
        <Link
          href={action.secondary.href}
          onClick={() => setOpen(false)}
          className={cn(
            'flex items-center gap-2 pl-3 pr-4 py-2 rounded-full',
            'bg-[#0a121f] border border-[#1e2d44] text-slate-200 text-xs font-bold',
            'shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200',
          )}
        >
          <SecondaryIcon className="w-3.5 h-3.5 text-cyan-400" />
          {action.secondary.label}
        </Link>
      )}

      {/* Main FAB */}
      <Link
        href={action.href}
        onClick={() => action.secondary && setOpen((o) => !o)}
        aria-label={action.label}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center text-white',
          'transition-transform active:scale-95',
          GRADIENT[role],
          open && 'rotate-45',
        )}
      >
        {action.secondary ? (
          <Plus
            className={cn('w-6 h-6 transition-transform', open && 'rotate-45')}
            strokeWidth={2.5}
          />
        ) : (
          <Icon className="w-6 h-6" strokeWidth={2.5} />
        )}
      </Link>
    </div>
  );
}

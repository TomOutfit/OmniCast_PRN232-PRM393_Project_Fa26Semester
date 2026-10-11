'use client';

// ============================================================
// OmniCast - Back-to-Top Button
// ------------------------------------------------------------
// Appears after the user has scrolled past one viewport
// height. Smoothly scrolls to the top on click. Hidden on
// the auth routes (login / register) where there is no
// long page to scroll.
// ============================================================

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BackToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  // Skip on auth routes — there is no long scroll there.
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname?.startsWith('/auth');

  useEffect(() => {
    if (isAuthRoute) return;
    const onScroll = () => setVisible(window.scrollY > window.innerHeight);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isAuthRoute]);

  if (isAuthRoute) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Cuộn lên đầu trang"
      className={cn(
        'fixed bottom-6 right-6 z-40',
        'w-11 h-11 rounded-full',
        'bg-cyan-500/90 hover:bg-cyan-400 text-black',
        'shadow-[0_0_18px_rgba(0,242,254,0.5)] hover:shadow-[0_0_24px_rgba(0,242,254,0.7)]',
        'flex items-center justify-center',
        'transition-all duration-200 hover:scale-110 active:scale-95',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-3 pointer-events-none',
      )}
    >
      <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
    </button>
  );
}

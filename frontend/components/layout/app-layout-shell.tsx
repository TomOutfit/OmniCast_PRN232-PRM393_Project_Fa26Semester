'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './navbar';
import { Footer } from './footer';

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Login / Register / Auth routes MUST NOT render Header and Footer
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname?.startsWith('/auth');

  if (isAuthRoute) {
    return (
      <main id="main-content" className="min-h-screen w-full flex flex-col">
        {children}
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}

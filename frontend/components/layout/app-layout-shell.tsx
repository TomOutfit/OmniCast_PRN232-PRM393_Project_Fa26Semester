'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { SkipLink } from './skip-link';
import { BackToTop } from './back-to-top';
import { MobileFab } from './mobile-fab';
import { PageTransition3D } from '@/components/three/PageTransition3D';
import { Spatial3DProvider, useSpatial3D } from '@/lib/three/spatial-context';
import { SpatialUniverseModal } from '@/components/three/SpatialUniverseModal';
import { ThemeToggle } from './theme-toggle';

function SpatialUniverseHost() {
  const { isOpen, close } = useSpatial3D();
  return <SpatialUniverseModal isOpen={isOpen} onClose={close} />;
}

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Login / Register / Auth routes MUST NOT render Header and Footer
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname?.startsWith('/auth');

  if (isAuthRoute) {
    return (
      <Spatial3DProvider>
        <SkipLink />
        <div className="fixed right-4 top-4 z-[60]">
          <ThemeToggle compact />
        </div>
        <main id="main-content" className="min-h-screen w-full flex flex-col relative z-10">
          <PageTransition3D>{children}</PageTransition3D>
        </main>
      </Spatial3DProvider>
    );
  }

  return (
    <Spatial3DProvider>
      <SkipLink />
      <div className="relative z-40">
        <Navbar />
      </div>
      <main id="main-content" className="flex-1 relative z-10">
        <PageTransition3D>{children}</PageTransition3D>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      <MobileFab />
      <BackToTop />
      <SpatialUniverseHost />
    </Spatial3DProvider>
  );
}


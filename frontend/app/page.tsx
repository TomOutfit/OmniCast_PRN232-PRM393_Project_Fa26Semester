'use client';

import React, { useMemo } from 'react';
import { useChannels } from '@/lib/hooks/useChannels';
import { OmniCastHomeExperience } from '@/components/home/omnicast-home-experience';
import { Page3DHero } from '@/components/three/Page3DHero';
import { Scroll3DParallax } from '@/components/three/Scroll3DParallax';
import { useSpatial3D } from '@/lib/three/spatial-context';
import { Compass, Sparkles, Tv, Radio } from 'lucide-react';
import type { Channel } from '@/types';

export default function HomePage() {
  const { open: openSpatial3D } = useSpatial3D();
  const { data } = useChannels({ isActive: true, limit: 8 });
  const channels = useMemo<Channel[]>(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any).data)) return (data as any).data;
    if (Array.isArray((data as any).items)) return (data as any).items;
    return [];
  }, [data]);

  const heroChannels = useMemo(
    () =>
      channels.slice(0, 6).map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: c.category,
        category: c.category,
        color: '#0e1625',
        isLive: true,
      })),
    [channels]
  );

  return (
    <main className="min-h-screen bg-[#070b12]/40 backdrop-blur-[1px] text-slate-100 relative selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 3D Hero Section */}
      <div className="relative">
        <Page3DHero
          variant="hero"
          channels={heroChannels}
          headline="OMNICAST"
          subline="Enterprise Media & Broadcast Intelligence"
          height={540}
        />

        {/* 3D Spatial Universe Quick Interactive Button */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          <button
            type="button"
            onClick={openSpatial3D}
            className="group px-6 py-3 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-white font-black text-xs md:text-sm uppercase tracking-wider flex items-center gap-2.5 shadow-[0_0_25px_rgba(0,242,254,0.3)] hover:shadow-[0_0_35px_rgba(0,242,254,0.5)] transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xl"
          >
            <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow group-hover:rotate-90 transition-transform" />
            <span>Mở Vũ Trụ 3D Toàn Diện (Spatial Universe)</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </button>
        </div>
      </div>

      <Scroll3DParallax depth={1} z={25}>
        <OmniCastHomeExperience />
      </Scroll3DParallax>
    </main>
  );
}

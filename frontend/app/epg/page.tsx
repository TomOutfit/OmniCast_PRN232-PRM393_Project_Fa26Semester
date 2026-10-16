'use client';

import { useMemo } from 'react';
import { EPGGrid } from '@/components/epg/epg-grid';
import { Page3DHero } from '@/components/three/Page3DHero';
import type { EPGProgram } from '@/components/three/scenes/EPGScene3D';
import { useChannels } from '@/lib/hooks/useChannels';
import { useLiveNow } from '@/lib/hooks/usePrograms';
import type { Channel } from '@/types';

export default function EPGPage() {
  const { data } = useChannels({ isActive: true, limit: 12 });
  const { data: liveEvents } = useLiveNow();

  const channels = useMemo<Channel[]>(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any).data)) return (data as any).data;
    if (Array.isArray((data as any).items)) return (data as any).items;
    return [];
  }, [data]);

  // Build mock EPG data for the 3D scene from current programs
  const epgPrograms = useMemo<EPGProgram[]>(() => {
    const events = Array.isArray(liveEvents) ? liveEvents : (liveEvents as any)?.data ?? [];
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    return events.slice(0, 24).map((e: any, i: number) => {
      const channelIdx = i % Math.max(1, channels.length);
      const start = Math.max(0, currentMin - i * 30);
      return {
        id: e.id || `prog-${i}`,
        title: e.title || 'Chương trình',
        startMin: start,
        durationMin: 30 + (i % 4) * 30,
        channelId: channels[channelIdx]?.slug || `ch-${channelIdx}`,
        category: channels[channelIdx]?.category || 'NEWS',
        isLive: e.status === 'LIVE' || i < 4,
      };
    });
  }, [liveEvents, channels]);

  const epgChannels = useMemo(() => channels.slice(0, 8).map((c) => c.slug), [channels]);

  return (
    <main className="min-h-screen bg-[#070b12]/50 backdrop-blur-[1px] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <h1 className="sr-only">Lịch Phát Sóng Điện Tử & Catch-Up 7 Ngày | OmniCast</h1>

      {/* 3D EPG Timeline Hero */}
      <Page3DHero
        variant="epg"
        epgPrograms={epgPrograms}
        epgChannels={epgChannels}
        height={460}
        headline="EPG TIMELINE"
        subline="Lịch phát sóng 3D trực quan"
      />

      <div className="py-6 px-4 lg:px-6">
        <div className="max-w-[1680px] w-full mx-auto">
          <EPGGrid />
        </div>
      </div>
    </main>
  );
}

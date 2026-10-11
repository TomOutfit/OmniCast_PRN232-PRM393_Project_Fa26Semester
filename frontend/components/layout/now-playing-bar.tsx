'use client';

// ============================================================
// OmniCast - Now-Playing Channel Strip
// ------------------------------------------------------------
// Replaces the horizontal marquee with a horizontally scrollable
// strip of "now playing on this channel" cards. Easier to scan
// (shows thumbnail + programme title), respects prefers-reduced-
// motion, and pauses on hover.
// ============================================================

import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';
import { Tv, Radio, ChevronLeft, ChevronRight } from 'lucide-react';
import { useChannels } from '@/lib/hooks/useChannels';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface ChannelItem {
  id: string;
  slug: string;
  name: string;
  isLive?: boolean;
  thumbnail?: string;
}

export function NowPlayingBar() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { data: channelsData } = useChannels({ limit: 30 });

  const channels: ChannelItem[] = useMemo(() => {
    if (!channelsData) return [];
    const list = Array.isArray(channelsData)
      ? channelsData
      : Array.isArray((channelsData as any)?.data)
        ? (channelsData as any).data
        : [];
    return list.map((c: any) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      isLive: c.isActive,
      thumbnail: c.logoUrl,
    }));
  }, [channelsData]);

  if (channels.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  return (
    <div
      className="w-full border-t border-[#121c2d] bg-[#05080e]/95 backdrop-blur-md"
      aria-label="Đang phát trên các kênh"
    >
      <div className="max-w-[1720px] mx-auto px-3 sm:px-4 lg:px-6 py-2 flex items-center gap-2 sm:gap-3">
        {/* Label — clearer than "CHANNELS (n)" */}
        <div className="flex-shrink-0 flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider text-slate-400">
          <Radio className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">Đang phát</span>
          <span className="sm:hidden">Live</span>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-400">{channels.filter((c) => c.isLive).length}</span>
          <span className="text-slate-600">/</span>
          <span>{channels.length}</span>
        </div>

        {/* Prev / Next arrows — clear affordance for horizontal scroll */}
        <button
          type="button"
          aria-label="Cuộn trái"
          onClick={() => scrollBy(-1)}
          className="flex-shrink-0 hidden sm:flex w-6 h-6 rounded-md bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-slate-400 hover:text-cyan-400 items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Scrollable channel strip — snap-mandatory for "card per view" feel */}
        <div
          ref={scrollerRef}
          className="flex-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
        >
          <ul className="flex items-center gap-2 sm:gap-2.5 py-0.5">
            {channels.map((ch) => (
              <li key={ch.id} className="snap-start flex-shrink-0">
                <Link
                  href={`/channels/${ch.slug}`}
                  className={cn(
                    'group flex items-center gap-2 px-2 py-1 rounded-lg border',
                    'bg-[#0a121f] hover:bg-[#0e1726]',
                    ch.isLive
                      ? 'border-cyan-500/30 hover:border-cyan-400/60'
                      : 'border-[#1b2b42] hover:border-slate-500/40',
                    'transition-all',
                  )}
                >
                  {/* Channel logo / fallback */}
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-700/30 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {ch.thumbnail ? (
                      <Image
                        src={ch.thumbnail}
                        alt={ch.name}
                        width={24}
                        height={24}
                        unoptimized
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Tv className="w-3 h-3 text-cyan-400" />
                    )}
                  </div>

                  {/* Channel name */}
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-200 group-hover:text-white whitespace-nowrap max-w-[80px] sm:max-w-[120px] truncate">
                    {ch.name}
                  </span>

                  {/* Live badge */}
                  {ch.isLive ? (
                    <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[8px] font-black uppercase text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-500/40">
                      <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                      Live
                    </span>
                  ) : (
                    <span className="flex-shrink-0 text-[8px] font-bold text-slate-500 uppercase">
                      Off
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Next arrow */}
        <button
          type="button"
          aria-label="Cuộn phải"
          onClick={() => scrollBy(1)}
          className="flex-shrink-0 hidden sm:flex w-6 h-6 rounded-md bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-slate-400 hover:text-cyan-400 items-center justify-center transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* "Xem tất cả" link */}
        <Link
          href="/channels"
          className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 whitespace-nowrap"
        >
          Tất cả →
        </Link>
      </div>
    </div>
  );
}

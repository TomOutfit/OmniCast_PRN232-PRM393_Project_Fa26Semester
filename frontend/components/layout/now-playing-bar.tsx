'use client';

// ============================================================
// OmniCast - Now-Playing Channel Strip with Continuous Motion
// ------------------------------------------------------------
// Displays currently broadcasted channels in a sleek ticker strip:
//   - Continuous auto-scrolling motion with seamless loop
//   - Auto-pauses on hover and resumes when cursor leaves
//   - Left/Right navigation buttons for quick step-scrolling
//   - Fully collapsible / hideable with state persistence in localStorage
// ============================================================

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState, useEffect, useRef } from 'react';
import { Tv, Radio, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useChannels } from '@/lib/hooks/useChannels';
import { cn } from '@/lib/utils';

interface ChannelItem {
  id: string;
  slug: string;
  name: string;
  isLive?: boolean;
  thumbnail?: string;
}

const STORAGE_KEY = 'omnicast.nowPlayingBar.hidden';

export function NowPlayingBar() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const isHovered = useRef(false);
  const isInteracting = useRef(false);
  const resumeTimer = useRef<NodeJS.Timeout | null>(null);

  const [isHidden, setIsHidden] = useState(false);
  const { data: channelsData } = useChannels({ limit: 30 });

  // Read collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'true') setIsHidden(true);
    } catch {
      // ignore storage access errors
    }
  }, []);

  const toggleHidden = () => {
    setIsHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

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

  // Duplicate channels to produce a seamless, infinite ticker loop
  const displayChannels = useMemo(() => {
    if (channels.length === 0) return [];
    if (channels.length < 8) {
      return [...channels, ...channels, ...channels, ...channels];
    }
    return [...channels, ...channels];
  }, [channels]);

  // Smooth continuous auto-scroll ticker via requestAnimationFrame
  useEffect(() => {
    if (isHidden) return;
    const el = scrollerRef.current;
    if (!el || displayChannels.length === 0) return;

    let animId: number;
    const speed = 0.65; // ~40px per second at 60fps

    const step = () => {
      if (!isHovered.current && !isInteracting.current && el) {
        el.scrollLeft += speed;
        const halfWidth = el.scrollWidth / 2;
        if (halfWidth > 0 && el.scrollLeft >= halfWidth) {
          el.scrollLeft -= halfWidth;
        }
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [displayChannels.length, isHidden]);

  if (channels.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    isInteracting.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    scrollerRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
    // Resume auto-scroll after 3 seconds of user inactivity
    resumeTimer.current = setTimeout(() => {
      isInteracting.current = false;
    }, 3000);
  };

  // Compact minimized bar when user collapsed it
  if (isHidden) {
    return (
      <div
        className="relative z-10 w-full border-t border-[#121c2d] bg-[#05080e]/95 backdrop-blur-md transition-all duration-300"
        aria-label="Thanh kênh đang phát (đã ẩn)"
      >
        <div className="max-w-[1720px] mx-auto px-3 sm:px-4 lg:px-6 py-2 min-h-[36px] flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={toggleHidden}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 font-mono text-[10px] font-bold transition-colors group cursor-pointer"
            title="Nhấn để mở lại danh sách kênh đang phát"
          >
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="uppercase tracking-wider">
              Đang phát ({channels.filter((c) => c.isLive).length}/{channels.length} kênh)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 group-hover:bg-cyan-500 group-hover:text-black transition-colors font-sans font-semibold">
              <span>Hiện kênh</span>
              <ChevronDown className="w-3 h-3" />
            </span>
          </button>
          <Link
            href="/channels"
            className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-cyan-300 transition-colors"
          >
            Tất cả kênh →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative z-10 w-full border-t border-[#121c2d] bg-[#05080e]/95 backdrop-blur-md transition-all duration-300"
      aria-label="Đang phát trên các kênh"
    >
      <div className="max-w-[1720px] mx-auto px-3 sm:px-4 lg:px-6 py-2 flex items-center gap-2 sm:gap-3">
        {/* Label */}
        <div className="flex-shrink-0 flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-wider text-slate-400">
          <Radio className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">Đang phát</span>
          <span className="sm:hidden">Live</span>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-400">{channels.filter((c) => c.isLive).length}</span>
          <span className="text-slate-600">/</span>
          <span>{channels.length}</span>
        </div>

        {/* Prev arrow */}
        <button
          type="button"
          aria-label="Cuộn trái"
          onClick={() => scrollBy(-1)}
          className="flex-shrink-0 hidden sm:flex w-6 h-6 rounded-md bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-slate-400 hover:text-cyan-400 items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Infinite auto-scroll channel strip */}
        <div
          className="flex-1 min-w-0"
          onMouseEnter={() => {
            isHovered.current = true;
          }}
          onMouseLeave={() => {
            isHovered.current = false;
          }}
          onTouchStart={() => {
            isInteracting.current = true;
          }}
          onTouchEnd={() => {
            if (resumeTimer.current) clearTimeout(resumeTimer.current);
            resumeTimer.current = setTimeout(() => {
              isInteracting.current = false;
            }, 3000);
          }}
        >
          <div
            ref={scrollerRef}
            className="overflow-x-auto scrollbar-none select-none py-0.5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <ul className="flex items-center gap-2 sm:gap-2.5">
              {displayChannels.map((ch, idx) => (
                <li key={`${ch.id}-${idx}`} className="flex-shrink-0">
                  <Link
                    href={`/channels/${ch.slug}`}
                    className={cn(
                      'group flex items-center gap-2 px-2.5 py-1.5 min-h-[38px] sm:min-h-[42px]',
                      'rounded-lg border',
                      'bg-[#0a121f] hover:bg-[#0e1726]',
                      ch.isLive
                        ? 'border-cyan-500/30 hover:border-cyan-400/70 hover:shadow-[0_0_12px_rgba(0,242,254,0.25)]'
                        : 'border-[#1b2b42] hover:border-slate-500/40',
                      'transition-all duration-200',
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
                      <span className="flex-shrink-0 inline-flex items-center gap-1 text-[9px] font-black uppercase text-white bg-red-600 px-1.5 py-0.5 rounded shadow-[0_0_6px_rgba(239,68,68,0.6)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="flex-shrink-0 text-[9px] font-bold text-slate-500 uppercase">
                        Off
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Next arrow */}
        <button
          type="button"
          aria-label="Cuộn phải"
          onClick={() => scrollBy(1)}
          className="flex-shrink-0 hidden sm:flex w-6 h-6 rounded-md bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-slate-400 hover:text-cyan-400 items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Action buttons: Tất cả + Ẩn */}
        <div className="flex items-center gap-2 flex-shrink-0 pl-1">
          <Link
            href="/channels"
            className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 whitespace-nowrap"
          >
            Tất cả →
          </Link>

          <span className="text-slate-700">|</span>

          {/* Nút Ẩn hàng */}
          <button
            type="button"
            onClick={toggleHidden}
            aria-label="Ẩn hàng kênh đang phát"
            title="Ẩn hàng kênh đang phát"
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-slate-400 hover:text-white hover:bg-[#152339] border border-transparent hover:border-[#1b2b42] text-[10px] font-semibold transition-all cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ẩn</span>
          </button>
        </div>
      </div>
    </div>
  );
}

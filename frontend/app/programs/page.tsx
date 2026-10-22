'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Tv,
  Radio,
  Clock,
  Calendar,
  Play,
  Search,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveBadge } from '@/components/ui/live-badge';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiveEvents, useLiveNow } from '@/lib/hooks/usePrograms';
import type { LiveCategory, LiveEvent } from '@/types';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Page3DHero } from '@/components/three/Page3DHero';
import { ChannelCardTilt } from '@/components/three';
import type { ProgramPoster } from '@/components/three/scenes/ProgramsScene3D';

const CATEGORIES = [
  { key: 'ALL', label: 'Tất Cả Thể Loại' },
  { key: 'SPORTS', label: 'Thể Thao' },
  { key: 'CINE', label: 'Điện Ảnh 4K' },
  { key: 'DRAMA', label: 'Phim Truyện' },
  { key: 'SHOW', label: 'Show Truyền Hình' },
  { key: 'NEWS', label: 'Tin Tức Thời Sự' },
  { key: 'TECH', label: 'Công Nghệ' },
  { key: 'GAMING', label: 'Esports & Gaming' },
];

export default function ProgramsHubPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const { data: liveNowList, isLoading: loadingLive } = useLiveNow();
  const { data: allEventsData, isLoading: loadingEvents } = useLiveEvents({
    limit: 60,
  });

  const liveEvents = useMemo<LiveEvent[]>(() => {
    return Array.isArray(liveNowList) ? liveNowList : (liveNowList as any)?.data ?? [];
  }, [liveNowList]);

  const allEvents = useMemo<LiveEvent[]>(() => {
    const list = allEventsData?.data ?? [];
    if (activeTab === 'live') {
      return list.filter((e) => e.status === 'LIVE');
    }
    if (activeTab === 'upcoming') {
      return list.filter((e) => e.status === 'SCHEDULED');
    }
    return list;
  }, [allEventsData, activeTab]);

  // 3D poster showcase data
  const programPosters = useMemo<ProgramPoster[]>(
    () =>
      allEvents.slice(0, 15).map((e) => ({
        id: e.id,
        title: e.title,
        category: (e.channel as any)?.category || 'NEWS',
        rating: 8.5,
        year: new Date().getFullYear(),
        isLive: e.status === 'LIVE',
      })),
    [allEvents]
  );

  const filteredEvents = useMemo(() => {
    let list = allEvents;
    if (selectedCategory !== 'ALL') {
      const cat = selectedCategory.toUpperCase();
      list = list.filter((e) => {
        const matchesTag = e.tags?.some((t) => t.toUpperCase().includes(cat));
        const matchesCat = (e as any).category === selectedCategory || (e.channel as any)?.category === selectedCategory;
        const matchesTitle = e.title.toUpperCase().includes(cat);
        return matchesTag || matchesCat || matchesTitle;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allEvents, selectedCategory, search]);

  return (
    <div className="min-h-screen bg-[#070b12]/50 backdrop-blur-[1px] text-slate-100 pb-6 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 3D Poster Showcase Hero */}
      <Page3DHero
        variant="programs"
        programs={programPosters}
        height={460}
        headline="PROGRAM SHOWCASE"
        subline="Khám phá chương trình nổi bật"
      />

      <div className="px-4 lg:px-6 space-y-6">
        
        {/* ── Page Header ───────────────────────────────────────────── */}
        <div className="p-6 md:p-8 rounded-3xl bg-[#090f1a] border border-[#162338] shadow-2xl flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                OMNICAST BROADCAST HUB // LIVE EVENTS & PROGRAMMES
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Trung Tâm Chương Trình & Sự Kiện Phát Sóng
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Theo dõi toàn bộ các trận cầu tâm điểm, phim chiếu rạp và talkshow trực tiếp đang lên sóng trên hệ thống 25 kênh OmniCast.
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <Link
              href="/epg"
              className="px-4 py-2.5 rounded-xl bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-cyan-300 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              Lịch Phát Sóng EPG
            </Link>
            <Link
              href="/recordings"
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black flex items-center gap-2 shadow-[0_0_12px_rgba(0,242,254,0.3)] transition-transform hover:scale-102"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Kho Phim VOD
            </Link>
          </div>
        </div>

        {/* ── Search & Filter Controls ──────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-[#080d17] border border-[#142033]">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {[
              { key: 'all', label: 'Tất Cả Chương Trình', count: allEventsData?.meta?.total ?? allEvents.length },
              { key: 'live', label: 'Đang Trực Tiếp', count: liveEvents.length },
              { key: 'upcoming', label: 'Sắp Diễn Ra' },
            ].map((tab) => {
              const isSelected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5',
                    isSelected
                      ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,242,254,0.4)] font-black'
                      : 'bg-[#0e1625] hover:bg-[#152338] text-slate-300 border border-[#1b2b42]'
                  )}
                >
                  {tab.key === 'live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={cn('px-1.5 py-0.2 rounded text-[10px] font-mono', isSelected ? 'bg-black/20 text-black' : 'bg-[#152339] text-cyan-300')}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm trận đấu, chương trình..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0e1726] border border-[#1d2f4a] focus:border-cyan-400 text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* ── Category Chips ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                selectedCategory === cat.key
                  ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 border shadow-[0_0_10px_rgba(0,242,254,0.2)]'
                  : 'bg-[#0b1320] hover:bg-[#111e32] text-slate-400 border border-[#16253c]'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Events Grid ───────────────────────────────────────────── */}
        {loadingEvents || loadingLive ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl bg-[#0b1320] border border-[#16253c]" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-[#090f1a] border border-[#162338]">
            <Tv className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Chưa có chương trình nào phù hợp</h3>
            <p className="text-xs text-slate-400">Vui lòng thử đổi bộ lọc hoặc kiểm tra lại lịch phát sóng EPG.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map((event) => {
              const isLive = event.status === 'LIVE';
              return (
                <ChannelCardTilt key={event.id} intensity={10} className="h-full">
                  <Link
                    href={`/programs/${event.id}`}
                    className="group relative rounded-2xl bg-gradient-to-b from-[#0e1726]/95 via-[#08101d]/95 to-[#04070e]/98 border border-[#1b2b42] hover:border-cyan-400/70 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_45px_rgba(0,242,254,0.22)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between h-full before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent group-hover:before:via-cyan-400/80 cursor-pointer"
                  >
                    {/* Thumbnail / Channel Banner */}
                    <div className="relative aspect-video w-full bg-[#05080e] overflow-hidden">
                      {event.thumbnailUrl ? (
                        <Image
                          src={event.thumbnailUrl}
                          alt={event.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0c1829] to-[#05080e]">
                          <Tv className="w-10 h-10 text-cyan-400/40" />
                        </div>
                      )}

                      {/* Top Gradient Vignette */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#04070e] via-transparent to-black/40 pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.6)] border border-red-400/30">
                            {/* Animated Equalizer */}
                            <span className="flex items-center gap-0.5 h-2">
                              <span className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" />
                              <span className="w-0.5 h-2 bg-white rounded-full animate-ping" />
                              <span className="w-0.5 h-1 bg-white rounded-full animate-pulse" />
                            </span>
                            LIVE NOW
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-black/70 text-slate-300 backdrop-blur-md border border-white/10">
                            {event.status || 'SCHEDULED'}
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-black uppercase bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(0,242,254,0.5)]">
                          4K UHD
                        </span>
                      </div>

                      {/* Play Button Overlay with Radiant Glow */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="w-13 h-13 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 flex items-center justify-center shadow-[0_0_25px_rgba(0,242,254,0.7)] transform scale-75 group-hover:scale-100 transition-all duration-300">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-4 flex flex-col flex-1 justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          {event.channel && (
                            <div className="w-4 h-4 rounded-md overflow-hidden bg-[#101b2a] flex-shrink-0">
                              <ChannelLogo
                                slug={event.channel.slug}
                                name={event.channel.name}
                                logoUrl={event.channel.logoUrl ?? undefined}
                                size="sm"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider font-mono truncate">
                            {event.channel?.name || 'Kênh OmniCast'}
                          </span>
                        </div>

                        <h3 className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug font-display">
                          {event.title}
                        </h3>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400/70" />
                          {event.scheduledAt
                            ? format(parseISO(event.scheduledAt), 'HH:mm dd/MM', { locale: vi })
                            : 'Đang phát sóng'}
                        </span>
                        <span className="text-cyan-400 font-extrabold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          Xem ngay &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                </ChannelCardTilt>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

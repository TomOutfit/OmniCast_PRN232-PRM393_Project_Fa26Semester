'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play,
  Tv,
  Film,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Star,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { useChannels } from '@/lib/hooks/useChannels';
import { useLiveNow, useLiveEvents, useRecordings } from '@/lib/hooks/usePrograms';
import { getCategoryThumbnail } from '@/components/epg/epg-channels-data';
import type { Channel } from '@/types';

interface HeroSpotlightItem {
  id: string;
  title: string;
  headline: string;
  category: string;
  badge: string;
  isLive: boolean;
  channelName: string;
  channelSlug: string;
  viewers: string;
  quality: string;
  audio: string;
  rating?: number;
  backdropUrl: string;
  targetHref: string;
}

export function OmniCastHomeExperience() {
  // ── 1. DYNAMIC DATA FROM BACKEND API ──────────────────────────────────────
  const { data: channelsData, isLoading: loadingChannels } = useChannels({
    isActive: true,
    limit: 100,
  });

  const channels = useMemo<Channel[]>(() => {
    if (!channelsData) return [];
    if (Array.isArray(channelsData)) return channelsData;
    if (Array.isArray((channelsData as any).data)) return (channelsData as any).data;
    if (Array.isArray((channelsData as any).items)) return (channelsData as any).items;
    return [];
  }, [channelsData]);

  const { data: liveNowList, isLoading: loadingLive } = useLiveNow();
  const { data: liveEventsData } = useLiveEvents({ limit: 12 });
  const { data: recordingsData, isLoading: loadingRecs } = useRecordings({
    limit: 10,
    isFeatured: false,
  });

  // ── 2. DYNAMIC HERO SPOTLIGHTS ───────────────────────────────────────────
  const heroSpotlights = useMemo<HeroSpotlightItem[]>(() => {
    const liveItems = Array.isArray(liveNowList) ? liveNowList : (liveNowList as any)?.data ?? [];
    const scheduledItems = liveEventsData?.data ?? [];
    const combined = [...liveItems, ...scheduledItems];

    if (combined.length > 0) {
      return combined.slice(0, 8).map((event: any, idx) => {
        const isLive = event.status === 'LIVE';
        const channelSlug = event.channel?.slug || 'sport-1';
        const channelName = event.channel?.name || 'OmniCast';
        const backdrop =
          event.thumbnailUrl ||
          getCategoryThumbnail(event.channel?.category || 'SPORTS', idx);
        const viewers = event.viewerCount
          ? event.viewerCount >= 1000
            ? `${(event.viewerCount / 1000).toFixed(1)}K`
            : `${event.viewerCount}`
          : `${(24 + idx * 9).toFixed(1)}K`;

        return {
          id: event.id || `spot-${idx}`,
          title: event.title,
          headline:
            event.description ||
            `${event.title} phát sóng trực tiếp chất lượng cao trên ${channelName}`,
          category: (event.channel?.category || 'TRUYỀN HÌNH').toUpperCase(),
          badge: isLive ? 'TRỰC TIẾP' : 'SẮP PHÁT SÓNG',
          isLive,
          channelName,
          channelSlug,
          viewers,
          quality: '4K UHD 60FPS',
          audio: 'DOLBY AUDIO',
          rating: 9.8,
          backdropUrl: backdrop,
          targetHref: `/channels/${channelSlug}`,
        };
      });
    }

    if (channels.length > 0) {
      return channels.slice(0, 6).map((ch, idx) => ({
        id: `spot-${ch.id}`,
        title: `${ch.name.toUpperCase()} - ${ch.tagline?.toUpperCase() || 'PHÁT SÓNG 24/7'}`,
        headline: ch.description || `Kênh truyền hình trực tuyến ${ch.name} chất lượng cao 4K HDR`,
        category: (ch.category || 'LIVE').toUpperCase(),
        badge: 'TRỰC TIẾP 24/7',
        isLive: true,
        channelName: ch.name,
        channelSlug: ch.slug,
        viewers: ch.totalViews ? `${(ch.totalViews / 1000000).toFixed(1)}M` : '35.0K',
        quality: '4K 60FPS',
        audio: 'DOLBY 5.1',
        rating: 9.9,
        backdropUrl: ch.badgeUrl || ch.logoUrl || getCategoryThumbnail(ch.category, idx),
        targetHref: `/channels/${ch.slug}`,
      }));
    }

    return [];
  }, [liveNowList, liveEventsData, channels]);

interface ShowcasePosterItem {
  id: string;
  title: string;
  category: string;
  rating: number;
  year: number;
  quality: string;
  audio: string;
  channel: string;
  poster: string;
  href: string;
}

  // ── 3. DYNAMIC SHOWCASE VOD RECORDINGS ────────────────────────────────────
  const showcasePosters = useMemo<ShowcasePosterItem[]>(() => {
    const list = Array.isArray(recordingsData)
      ? recordingsData
      : (recordingsData as any)?.data ?? [];
    if (list.length > 0) {
      return list.slice(0, 10).map((r: any, idx: number) => {
        const year = r.publishedAt ? new Date(r.publishedAt).getFullYear() : 2026;
        const channelName = r.channel?.name || 'OmniCast VOD';
        return {
          id: r.id,
          title: r.title,
          category: r.category || 'VOD',
          rating: 4.9,
          year,
          quality: '4K HDR',
          audio: 'Dolby Atmos',
          channel: channelName,
          poster: r.thumbnailUrl || getCategoryThumbnail(r.category || 'CINE', idx),
          href: `/programs/recording/${r.id}`,
        };
      });
    }
    return [];
  }, [recordingsData]);

  // ── 4. CAROUSEL SLIDE STATE ───────────────────────────────────────────────
  const [activeSpotlightIdx, setActiveSpotlightIdx] = useState(0);
  const [isAutoSlide, setIsAutoSlide] = useState(true);
  const channelScrollRef = useRef<HTMLDivElement>(null);

  const heroLen = heroSpotlights.length;
  const safeIdx = heroLen > 0 ? activeSpotlightIdx % heroLen : 0;
  const currentHero = heroLen > 0 ? heroSpotlights[safeIdx] : null;
  const prevHero = heroLen > 0 ? heroSpotlights[(safeIdx - 1 + heroLen) % heroLen] : null;
  const nextHero = heroLen > 0 ? heroSpotlights[(safeIdx + 1) % heroLen] : null;

  // Auto rotate hero carousel every 8 seconds
  useEffect(() => {
    if (!isAutoSlide || heroLen <= 1) return;
    const interval = setInterval(() => {
      setActiveSpotlightIdx((prev) => (prev + 1) % heroLen);
    }, 8000);
    return () => clearInterval(interval);
  }, [isAutoSlide, heroLen]);

  const handleScrollChannels = (dir: 'left' | 'right') => {
    if (channelScrollRef.current) {
      const offset = dir === 'left' ? -350 : 350;
      channelScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#060910] text-slate-100 flex flex-col space-y-8 md:space-y-10 pb-20">
      
      {/* ── 1. VTVGo-Style 3D Angled Hero Carousel ────────────────────── */}
      <section className="relative w-full overflow-hidden pt-3 md:pt-5">
        
        {/* Soft Ambient Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-red-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-[1720px] mx-auto px-4 lg:px-8 relative z-10">
          
          {loadingLive && !currentHero ? (
            <div className="w-full aspect-[16/9] max-h-[520px] rounded-3xl bg-[#09111e] border border-[#16253c] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="text-xs font-mono text-cyan-300">Đang tải luồng sự kiện trực tiếp...</span>
            </div>
          ) : currentHero ? (
            <div className="relative flex items-center justify-center min-h-[380px] md:min-h-[480px] lg:min-h-[560px]">
              
              {/* Left Flanking 3D Angled Card (VTVGo Style) */}
              {prevHero && (
                <div
                  onClick={() => {
                    setIsAutoSlide(false);
                    setActiveSpotlightIdx((p) => (p === 0 ? heroLen - 1 : p - 1));
                  }}
                  className="hidden lg:block absolute left-0 w-[24%] h-[78%] rounded-3xl overflow-hidden border border-white/10 opacity-40 hover:opacity-75 transition-all duration-500 cursor-pointer shadow-2xl z-10 -translate-x-4 rotate-y-12 scale-90"
                  style={{ perspective: '1000px', transform: 'perspective(1000px) rotateY(18deg) scale(0.88)' }}
                >
                  <Image
                    src={prevHero.backdropUrl}
                    alt={prevHero.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] font-black text-cyan-400 uppercase">{prevHero.channelName}</span>
                    <h4 className="text-xs font-black text-white line-clamp-1">{prevHero.title}</h4>
                  </div>
                </div>
              )}

              {/* Center Main Spotlight Stage Card */}
              <div className="relative w-full lg:w-[68%] rounded-3xl overflow-hidden bg-[#0a111c] border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.9)] aspect-[16/9] z-20 group">
                
                <Image
                  src={currentHero.backdropUrl}
                  alt={currentHero.title}
                  fill
                  unoptimized
                  priority
                  className="object-cover object-center group-hover:scale-102 transition-transform duration-700"
                />

                {/* Gradient Vignette Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#060910] via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#060910]/90 via-[#060910]/40 to-transparent w-full md:w-3/4" />

                {/* Center Play Button Overlay */}
                <Link
                  href={currentHero.targetHref}
                  className="absolute inset-0 flex items-center justify-center z-25 group/play"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600/90 group-hover/play:bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.7)] group-hover/play:scale-110 transition-transform">
                    <Play className="w-7 h-7 md:w-9 md:h-9 fill-current ml-1" />
                  </div>
                </Link>

                {/* VTVGo-Style Lower Third Headline Banner */}
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 z-30 flex flex-col justify-end space-y-2">
                  
                  {/* Channel & Live Badge */}
                  <div className="flex items-center gap-2">
                    {currentHero.isLive && (
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        LIVE
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-black/70 backdrop-blur-md text-cyan-300 border border-cyan-500/30">
                      {currentHero.channelName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 bg-black/60">
                      {currentHero.quality}
                    </span>
                  </div>

                  {/* Main White Lower-Third Box (VTVGo Signature) */}
                  <div className="bg-white/95 text-black px-4 py-2.5 rounded-xl shadow-2xl max-w-2xl">
                    <h2 className="text-sm md:text-lg font-black tracking-tight uppercase leading-snug line-clamp-2">
                      {currentHero.title}
                    </h2>
                    <p className="text-[11px] md:text-xs text-slate-700 line-clamp-1 mt-0.5">
                      {currentHero.headline}
                    </p>
                  </div>
                </div>

                {/* Left / Right Carousel Controls */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setIsAutoSlide(false);
                    setActiveSpotlightIdx((p) => (p === 0 ? heroLen - 1 : p - 1));
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-35 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/20 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setIsAutoSlide(false);
                    setActiveSpotlightIdx((p) => (p + 1) % heroLen);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-35 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/20 cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Right Flanking 3D Angled Card (VTVGo Style) */}
              {nextHero && (
                <div
                  onClick={() => {
                    setIsAutoSlide(false);
                    setActiveSpotlightIdx((p) => (p + 1) % heroLen);
                  }}
                  className="hidden lg:block absolute right-0 w-[24%] h-[78%] rounded-3xl overflow-hidden border border-white/10 opacity-40 hover:opacity-75 transition-all duration-500 cursor-pointer shadow-2xl z-10 translate-x-4 -rotate-y-12 scale-90"
                  style={{ perspective: '1000px', transform: 'perspective(1000px) rotateY(-18deg) scale(0.88)' }}
                >
                  <Image
                    src={nextHero.backdropUrl}
                    alt={nextHero.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] font-black text-cyan-400 uppercase">{nextHero.channelName}</span>
                    <h4 className="text-xs font-black text-white line-clamp-1">{nextHero.title}</h4>
                  </div>
                </div>
              )}

            </div>
          ) : null}

          {/* Centered Dots Indicator (VTVGo Style) */}
          {heroLen > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {heroSpotlights.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIsAutoSlide(false);
                    setActiveSpotlightIdx(idx);
                  }}
                  className={cn(
                    'h-1.5 rounded-full transition-all cursor-pointer',
                    activeSpotlightIdx % heroLen === idx
                      ? 'w-6 bg-white shadow-[0_0_8px_white]'
                      : 'w-1.5 bg-slate-600 hover:bg-slate-400'
                  )}
                />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* ── 2. Dòng Kênh Truyền Hình (VTVGo Exact Signature Style) ──── */}
      <section className="max-w-[1720px] w-full mx-auto px-4 lg:px-8 space-y-3">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm md:text-base font-black text-white tracking-wide">
              Kênh truyền hình trực tuyến
            </h3>
            {channels.length > 0 && (
              <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800">
                {channels.length} Kênh
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleScrollChannels('left')}
              className="p-1.5 rounded-lg bg-[#0e1726] hover:bg-[#16253c] text-slate-300 hover:text-white border border-[#1b2b42] transition-colors cursor-pointer"
              title="Cuộn trái"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScrollChannels('right')}
              className="p-1.5 rounded-lg bg-[#0e1726] hover:bg-[#16253c] text-slate-300 hover:text-white border border-[#1b2b42] transition-colors cursor-pointer"
              title="Cuộn phải"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrolling Pill Card Strip with Continuous Motion Animation */}
        <div className="relative overflow-hidden w-full select-none py-1 group/channelbar">
          
          {/* Edge fade gradients */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#060910] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#060910] to-transparent z-10 pointer-events-none" />

          <div
            ref={channelScrollRef}
            className="flex items-center gap-3 overflow-x-auto scrollbar-none"
          >
            {loadingChannels && channels.length === 0 ? (
              <div className="flex items-center gap-3 py-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-24 h-12 md:w-28 md:h-14 rounded-2xl bg-[#0b1320] border border-[#18283e] animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="animate-ticker-marquee flex items-center gap-3">
                {/* First Set of Channels */}
                {channels.map((ch) => (
                  <Link
                    key={ch.id}
                    href={`/channels/${ch.slug}`}
                    className="flex-shrink-0 w-24 h-12 md:w-28 md:h-14 rounded-2xl bg-[#0b1320] hover:bg-[#121f33] border border-[#18283e] hover:border-cyan-400/80 p-2 flex items-center justify-center shadow-lg transition-all duration-300 group/card hover:scale-105 hover:shadow-[0_0_15px_rgba(0,242,254,0.3)] cursor-pointer"
                  >
                    <ChannelLogo
                      slug={ch.slug}
                      name={ch.name}
                      size="md"
                      className="w-full h-full object-contain pointer-events-none group-hover/card:scale-110 transition-transform"
                    />
                  </Link>
                ))}

                {/* Second Set of Channels for Infinite Seamless Loop */}
                {channels.map((ch) => (
                  <Link
                    key={`loop-${ch.id}`}
                    href={`/channels/${ch.slug}`}
                    className="flex-shrink-0 w-24 h-12 md:w-28 md:h-14 rounded-2xl bg-[#0b1320] hover:bg-[#121f33] border border-[#18283e] hover:border-cyan-400/80 p-2 flex items-center justify-center shadow-lg transition-all duration-300 group/card hover:scale-105 hover:shadow-[0_0_15px_rgba(0,242,254,0.3)] cursor-pointer"
                  >
                    <ChannelLogo
                      slug={ch.slug}
                      name={ch.name}
                      size="md"
                      className="w-full h-full object-contain pointer-events-none group-hover/card:scale-110 transition-transform"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. Kho Nội Dung Mới & Bom Tấn Đề Xuất (Showcase Grid) ────── */}
      <section className="max-w-[1720px] w-full mx-auto px-4 lg:px-8 space-y-4">
        
        <div className="flex items-center justify-between border-b border-[#142236] pb-3">
          <div>
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Film className="w-5 h-5 text-cyan-400" />
              Kho Nội Dung & Bản Ghi VOD
            </h2>
            <p className="text-xs text-slate-400">
              Tuyển tập phim chiếu rạp, trận cầu đỉnh cao và show truyền hình phát lại từ thư viện OmniCast
            </p>
          </div>

          <Link
            href="/recordings"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Xem tất cả →
          </Link>
        </div>

        {/* 5-Column Vertical Poster Showcase Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {loadingRecs && showcasePosters.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] w-full rounded-2xl bg-[#09111e] border border-[#16253c] animate-pulse"
              />
            ))
          ) : (
            showcasePosters.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-2xl overflow-hidden bg-[#0a111d] border border-[#162338] hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(0,242,254,0.25)] transition-all duration-300 flex flex-col"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#060a12]">
                  <Image
                    src={item.poster}
                    alt={item.title}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  <div className="absolute top-2 left-2 z-10">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-cyan-500 text-black shadow-[0_0_8px_rgba(0,242,254,0.6)]">
                      {item.quality}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-black/80 backdrop-blur-md text-amber-400 border border-amber-500/30">
                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                    {item.rating}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 space-y-2">
                    <Link
                      href={item.href}
                      className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,242,254,0.5)] transition-transform group-hover:scale-105 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      XEM NGAY
                    </Link>
                    <div className="text-[10px] text-center text-slate-300 font-medium">
                      {item.audio} • {item.channel}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 flex flex-col flex-1 justify-between space-y-1.5">
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                      {item.category}
                    </span>
                    <h3 className="text-xs font-black text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-[#131f32]">
                    <span>{item.year}</span>
                    <span className="text-slate-400 font-bold">{item.channel}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── 4. Lịch Khung Giờ Vàng EPG Preview (Prime-Time EPG) ──────── */}
      <section className="max-w-[1720px] w-full mx-auto px-4 lg:px-8">
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#09111f] via-[#0d182b] to-[#09111f] border border-[#1b2f4a] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 font-mono">
                LỊCH PHÁT SÓNG ĐIỆN TỬ & CATCH-UP 7 NGÀY
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Khung Giờ Vàng Toàn Hệ Thống Trên OmniCast
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Dễ dàng tra cứu lịch thi đấu thể thao, các tập phim mới nhất và sử dụng tính năng xem lại trong 7 ngày từ hệ thống API đồng bộ hóa thời gian thực.
            </p>
          </div>

          <Link
            href="/epg"
            className="flex-shrink-0 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs md:text-sm font-black shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all hover:scale-105"
          >
            Mở Bảng Lịch EPG Toàn Diện →
          </Link>
        </div>
      </section>

    </div>
  );
}

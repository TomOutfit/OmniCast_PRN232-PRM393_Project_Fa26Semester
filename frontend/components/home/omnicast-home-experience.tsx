'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Play,
  Tv,
  Radio,
  Sparkles,
  Star,
  Film,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Share2,
  Volume2,
  Flame,
  Award,
  Layers,
  Search,
  CheckCircle2,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChannelLogo } from '@/components/ui/channel-logo';

// 25 Official Channels Data for the VTVGo-style Channel Bar
export const ALL_25_CHANNELS = [
  { id: '1', slug: 'sport-1', name: 'Omni Sport 1', num: '01' },
  { id: '2', slug: 'sport-2', name: 'Sport 2', num: '02' },
  { id: '3', slug: 'show', name: 'Omni Show', num: '03' },
  { id: '4', slug: 'entertain', name: 'Omni Entertain', num: '04' },
  { id: '5', slug: 'cine', name: 'Omni Cine', num: '05' },
  { id: '6', slug: 'drama', name: 'Omni Drama', num: '06' },
  { id: '7', slug: 'news', name: 'News 24/7', num: '07' },
  { id: '8', slug: 'music', name: 'Music Hits', num: '08' },
  { id: '9', slug: 'kids', name: 'Kids Zone', num: '09' },
  { id: '10', slug: 'tech', name: 'Omni Tech', num: '10' },
  { id: '11', slug: 'food', name: 'Food Life', num: '11' },
  { id: '12', slug: 'discovery', name: 'Omni Discovery', num: '12' },
  { id: '13', slug: 'esports', name: 'Omni Esports', num: '13' },
  { id: '14', slug: 'indie-games', name: 'Indie Games', num: '14' },
  { id: '15', slug: 'podcast', name: 'Omni Podcast', num: '15' },
  { id: '16', slug: 'audiobook', name: 'Audiobook', num: '16' },
  { id: '17', slug: 'academy', name: 'Omni Academy', num: '17' },
  { id: '18', slug: 'skill-lab', name: 'Skill Lab', num: '18' },
  { id: '19', slug: 'wellness', name: 'Omni Wellness', num: '19' },
  { id: '20', slug: 'fashion', name: 'Omni Fashion', num: '20' },
  { id: '21', slug: 'travel-vn', name: 'Travel VN', num: '21' },
  { id: '22', slug: 'travel-world', name: 'Travel World', num: '22' },
  { id: '23', slug: 'art-design', name: 'Art & Design', num: '23' },
  { id: '24', slug: 'business', name: 'Omni Business', num: '24' },
  { id: '25', slug: 'health', name: 'Omni Health', num: '25' },
];

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

const HERO_SPOTLIGHTS: HeroSpotlightItem[] = [
  {
    id: 'spot-1',
    title: 'PHÁT HUY SỨC MẠNH TỔNG HỢP TRONG THAM MƯU CHIẾN LƯỢC',
    headline: 'Hội nghị trực tiếp toàn quốc với sự tham gia của các lãnh đạo cấp cao',
    category: 'THỜI SỰ CHÍNH TRỊ',
    badge: 'TRỰC TIẾP 4K',
    isLive: true,
    channelName: 'News 24/7',
    channelSlug: 'news',
    viewers: '245.8K',
    quality: '4K UHD 60FPS',
    audio: 'DOLBY AUDIO',
    rating: 9.8,
    backdropUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1600&q=80',
    targetHref: '/channels/news',
  },
  {
    id: 'spot-2',
    title: 'CHUNG KẾT UEFA CHAMPIONS LEAGUE: REAL MADRID VS MAN CITY',
    headline: 'Đại chiến nảy lửa tranh cúp vô địch châu Âu tại SVĐ Wembley',
    category: 'THỂ THAO ĐỈNH CAO',
    badge: 'MULTI-CAM 4K',
    isLive: true,
    channelName: 'Omni Sport 1',
    channelSlug: 'sport-1',
    viewers: '380.2K',
    quality: '4K 60FPS HEVC',
    audio: 'DOLBY ATMOS 5.1',
    rating: 9.9,
    backdropUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80',
    targetHref: '/channels/sport-1',
  },
  {
    id: 'spot-3',
    title: 'SPIDER-MAN: ACROSS THE SPIDER-VERSE',
    headline: 'Siêu phẩm hoạt hình Đa vũ trụ đoạt kỷ lục phòng vé toàn cầu',
    category: 'BOM TẤN ĐIỆN ẢNH',
    badge: 'ĐỘC QUYỀN 4K',
    isLive: false,
    channelName: 'Omni Cine 4K',
    channelSlug: 'cine',
    viewers: '190.5K',
    quality: '4K DOLBY VISION',
    audio: 'DOLBY ATMOS 7.1',
    rating: 9.4,
    backdropUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=1600&q=80',
    targetHref: '/channels/cine',
  },
  {
    id: 'spot-4',
    title: 'CHUNG KẾT THẾ GIỚI LMHT 2025: T1 VS GEN.G',
    headline: 'Trận Bo5 kinh điển tranh ngôi vương Esports thế giới',
    category: 'ESPORTS QUỐC TẾ',
    badge: 'BO5 KỊCH TÍNH',
    isLive: true,
    channelName: 'Omni Esports',
    channelSlug: 'esports',
    viewers: '412.0K',
    quality: '4K UHD 60FPS',
    audio: 'DOLBY DIGITAL',
    rating: 9.7,
    backdropUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80',
    targetHref: '/channels/esports',
  },
  {
    id: 'spot-5',
    title: 'PLANET EARTH III: KỲ QUAN THẾ GIỚI TỰ NHIÊN',
    headline: 'Series tài liệu thiên nhiên ngoạn mục chất lượng 4K đỉnh cao từ BBC',
    category: 'TÀI LIỆU DISCOVERY',
    badge: '4K ULTRA HD',
    isLive: false,
    channelName: 'Omni Discovery',
    channelSlug: 'discovery',
    viewers: '78.4K',
    quality: '4K 60FPS HDR',
    audio: 'DOLBY ATMOS',
    rating: 9.9,
    backdropUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80',
    targetHref: '/channels/discovery',
  },
];

const SHOWCASE_POSTERS = [
  {
    id: 'p-01',
    title: 'Spider-Man: Across the Spider-Verse',
    category: 'Điện Ảnh',
    rating: 4.9,
    year: 2024,
    quality: '4K HDR',
    audio: 'Atmos 7.1',
    channel: 'Omni Cine',
    poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=500&q=80',
    href: '/channels/cine',
  },
  {
    id: 'p-02',
    title: 'Chung Kết UEFA Champions League 2025',
    category: 'Thể Thao',
    rating: 5.0,
    year: 2025,
    quality: '4K 60FPS',
    audio: 'Dolby Live',
    channel: 'Omni Sport 1',
    poster: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=500&q=80',
    href: '/channels/sport-1',
  },
  {
    id: 'p-03',
    title: 'Dune: Part Two (Hành Tinh Cát 2)',
    category: 'Sci-Fi',
    rating: 4.8,
    year: 2024,
    quality: '4K IMAX',
    audio: 'Atmos 7.1',
    channel: 'Omni Cine',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=500&q=80',
    href: '/channels/cine',
  },
  {
    id: 'p-04',
    title: 'Chung Kết CKTG LMHT: T1 vs Gen.G',
    category: 'Esports',
    rating: 4.9,
    year: 2025,
    quality: '4K UHD',
    audio: 'Dolby Audio',
    channel: 'Omni Esports',
    poster: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=500&q=80',
    href: '/channels/esports',
  },
  {
    id: 'p-05',
    title: 'Oppenheimer (Bản Chuẩn Điện Ảnh 4K)',
    category: 'Chính Kịch',
    rating: 4.9,
    year: 2023,
    quality: '4K MASTER',
    audio: 'Atmos 5.1',
    channel: 'Omni Cine',
    poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=500&q=80',
    href: '/channels/cine',
  },
  {
    id: 'p-06',
    title: 'Planet Earth III: Kỳ Quan Thiên Nhiên',
    category: 'Khám Phá',
    rating: 4.9,
    year: 2024,
    quality: '4K 60FPS',
    audio: 'Dolby Atmos',
    channel: 'Omni Discovery',
    poster: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=500&q=80',
    href: '/channels/discovery',
  },
  {
    id: 'p-07',
    title: 'Cyberpunk: Edgerunners Season 2',
    category: 'Anime',
    rating: 4.7,
    year: 2024,
    quality: '1080p FHD',
    audio: 'Stereo HD',
    channel: 'Omni Indie Games',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=500&q=80',
    href: '/channels/indie-games',
  },
  {
    id: 'p-08',
    title: 'MasterChef Grand Finale Season 12',
    category: 'Show',
    rating: 4.6,
    year: 2024,
    quality: '1080p FHD',
    audio: 'Dolby 5.1',
    channel: 'Food Life',
    poster: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=500&q=80',
    href: '/channels/food',
  },
  {
    id: 'p-09',
    title: 'The Batman: Hiệp Sĩ Bóng Đêm',
    category: 'Điện Ảnh',
    rating: 4.8,
    year: 2023,
    quality: '4K HDR',
    audio: 'Atmos 5.1',
    channel: 'Omni Cine',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=500&q=80',
    href: '/channels/cine',
  },
  {
    id: 'p-10',
    title: 'Interstellar: Du Hành Liên Sao 4K',
    category: 'Sci-Fi',
    rating: 4.9,
    year: 2024,
    quality: '4K IMAX',
    audio: 'Atmos 7.1',
    channel: 'Omni Cine',
    poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=500&q=80',
    href: '/channels/cine',
  },
];

export function OmniCastHomeExperience() {
  const [activeSpotlightIdx, setActiveSpotlightIdx] = useState(0);
  const [isAutoSlide, setIsAutoSlide] = useState(true);
  const channelScrollRef = useRef<HTMLDivElement>(null);

  const currentHero = HERO_SPOTLIGHTS[activeSpotlightIdx];
  const prevHero = HERO_SPOTLIGHTS[(activeSpotlightIdx - 1 + HERO_SPOTLIGHTS.length) % HERO_SPOTLIGHTS.length];
  const nextHero = HERO_SPOTLIGHTS[(activeSpotlightIdx + 1) % HERO_SPOTLIGHTS.length];

  // Auto rotate hero carousel every 8 seconds
  useEffect(() => {
    if (!isAutoSlide) return;
    const interval = setInterval(() => {
      setActiveSpotlightIdx((prev) => (prev + 1) % HERO_SPOTLIGHTS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isAutoSlide]);

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
          
          <div className="relative flex items-center justify-center min-h-[380px] md:min-h-[480px] lg:min-h-[560px]">
            
            {/* Left Flanking 3D Angled Card (VTVGo Style) */}
            <div
              onClick={() => {
                setIsAutoSlide(false);
                setActiveSpotlightIdx((p) => (p === 0 ? HERO_SPOTLIGHTS.length - 1 : p - 1));
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
                  setActiveSpotlightIdx((p) => (p === 0 ? HERO_SPOTLIGHTS.length - 1 : p - 1));
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-35 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/20 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  setIsAutoSlide(false);
                  setActiveSpotlightIdx((p) => (p + 1) % HERO_SPOTLIGHTS.length);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-35 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all border border-white/20 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Right Flanking 3D Angled Card (VTVGo Style) */}
            <div
              onClick={() => {
                setIsAutoSlide(false);
                setActiveSpotlightIdx((p) => (p + 1) % HERO_SPOTLIGHTS.length);
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

          </div>

          {/* Centered Dots Indicator (VTVGo Style) */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {HERO_SPOTLIGHTS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsAutoSlide(false);
                  setActiveSpotlightIdx(idx);
                }}
                className={cn(
                  'h-1.5 rounded-full transition-all cursor-pointer',
                  activeSpotlightIdx === idx
                    ? 'w-6 bg-white shadow-[0_0_8px_white]'
                    : 'w-1.5 bg-slate-600 hover:bg-slate-400'
                )}
              />
            ))}
          </div>

        </div>
      </section>

      {/* ── 2. Dòng Kênh Truyền Hình (VTVGo Exact Signature Style) ──── */}
      <section className="max-w-[1720px] w-full mx-auto px-4 lg:px-8 space-y-3">
        
        <div className="flex items-center justify-between">
          <h3 className="text-sm md:text-base font-black text-white tracking-wide">
            Kênh truyền hình
          </h3>

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
            <div className="animate-ticker-marquee flex items-center gap-3">
              {/* First Set of 25 Channel Cards */}
              {ALL_25_CHANNELS.map((ch) => (
                <Link
                  key={ch.slug}
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

              {/* Second Set of 25 Channel Cards for Infinite Seamless Loop */}
              {ALL_25_CHANNELS.map((ch) => (
                <Link
                  key={`loop-${ch.slug}`}
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
          </div>
        </div>
      </section>

      {/* ── 3. Kho Nội Dung Mới & Bom Tấn Đề Xuất (Showcase Grid) ────── */}
      <section className="max-w-[1720px] w-full mx-auto px-4 lg:px-8 space-y-4">
        
        <div className="flex items-center justify-between border-b border-[#142236] pb-3">
          <div>
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Film className="w-5 h-5 text-cyan-400" />
              Kho Nội Dung & Sự Kiện Nổi Bật
            </h2>
            <p className="text-xs text-slate-400">
              Tuyển tập phim chiếu rạp, trận cầu đỉnh cao và show truyền hình chất lượng 4K HDR
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
          {SHOWCASE_POSTERS.map((item) => (
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
          ))}
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
              Khung Giờ Vàng Tối Nay (18:00 - 22:00) Trên 25 Kênh
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Dễ dàng tra cứu lịch thi đấu thể thao, các tập phim mới nhất và sử dụng tính năng xem lại trong 7 ngày với đầy đủ thuyết minh & phụ đề.
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

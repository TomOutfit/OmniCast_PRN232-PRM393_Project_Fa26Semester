'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { useChannels } from '@/lib/hooks/useChannels';
import { useRecordings, useLiveNow } from '@/lib/hooks/usePrograms';
import type { Channel, LiveCategory } from '@/types';

// Featured Spotlight Carousel for OmniCast
interface HeroSpotlightItem {
  id: string;
  title: string;
  subtitle: string;
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
  description: string;
  targetHref: string;
}

const HERO_SPOTLIGHTS: HeroSpotlightItem[] = [
  {
    id: 'spot-1',
    title: 'Chung Kết UEFA Champions League: Real Madrid vs Man City',
    subtitle: 'Đại chiến nảy lửa tranh cúp vô địch châu Âu tại SVĐ Wembley',
    category: 'THỂ THAO ĐỈNH CAO',
    badge: 'TRỰC TIẾP 4K MULTI-CAM',
    isLive: true,
    channelName: 'Omni Sport 1',
    channelSlug: 'sport-1',
    viewers: '128.4K',
    quality: '4K 60FPS HEVC',
    audio: 'DOLBY ATMOS 5.1',
    rating: 9.9,
    backdropUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80',
    description: 'Trực tiếp 16 góc máy độc quyền cùng bình luận viên Quang Huy & Anh Ngọc. Hệ thống phân tích chiến thuật Tactical AI thời gian thực.',
    targetHref: '/channels/sport-1',
  },
  {
    id: 'spot-2',
    title: 'Spider-Man: Across the Spider-Verse',
    subtitle: 'Siêu phẩm hoạt hình Đa vũ trụ đoạt kỷ lục phòng vé toàn cầu',
    category: 'ĐIỆN ẢNH BOM TẤN',
    badge: 'ĐỘC QUYỀN 4K HDR',
    isLive: false,
    channelName: 'Omni Cine 4K',
    channelSlug: 'cine',
    viewers: '96.2K',
    quality: '4K DOLBY VISION',
    audio: 'DOLBY ATMOS 7.1',
    rating: 9.4,
    backdropUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=1600&q=80',
    description: 'Miles Morales du hành qua các chiều không gian song song và đối mặt với sự truy đuổi của Quân đoàn Nhện dưới sự dẫn dắt của Miguel O’Hara.',
    targetHref: '/channels/cine',
  },
  {
    id: 'spot-3',
    title: 'Chung Kết Thế Giới LMHT 2025: T1 vs Gen.G',
    subtitle: 'Trận Bo5 kinh điển tranh ngôi vương Esports thế giới',
    category: 'ESPORTS QUỐC TẾ',
    badge: 'BO5 KỊCH TÍNH',
    isLive: true,
    channelName: 'Omni Esports',
    channelSlug: 'esports',
    viewers: '210.5K',
    quality: '4K UHD 60FPS',
    audio: 'DOLBY DIGITAL',
    rating: 9.7,
    backdropUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80',
    description: 'Faker và T1 bước vào trận chung kết lịch sử đối đầu đại kình địch Gen.G. Phân tích chi tiết từng pha giao tranh với góc nhìn tuyển thủ.',
    targetHref: '/channels/esports',
  },
  {
    id: 'spot-4',
    title: 'Dune: Part Two (Hành Tinh Cát 2)',
    subtitle: 'Kiệt tác khoa học viễn tưởng điện ảnh của Denis Villeneuve',
    category: 'KHOA HỌC VIỄN TƯỞNG',
    badge: 'SIÊU PHẨM IMAX',
    isLive: false,
    channelName: 'Omni Cine 4K',
    channelSlug: 'cine',
    viewers: '84.1K',
    quality: '4K IMAX MASTER',
    audio: 'DOLBY ATMOS',
    rating: 9.2,
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    description: 'Cuộc chiến khốc liệt giành quyền kiểm soát nguồn hương liệu đắt giá nhất vũ trụ trên hành tinh sa mạc khắc nghiệt Arrakis.',
    targetHref: '/channels/cine',
  },
  {
    id: 'spot-5',
    title: 'Planet Earth III: Khám Phá Thế Giới Tự Nhiên',
    subtitle: 'Series tài liệu thiên nhiên ngoạn mục chất lượng 4K đỉnh cao từ BBC',
    category: 'TÀI LIỆU DISCOVERY',
    badge: '4K ULTRA HD',
    isLive: false,
    channelName: 'Omni Discovery',
    channelSlug: 'discovery',
    viewers: '45.8K',
    quality: '4K 60FPS HDR',
    audio: 'DOLBY ATMOS 5.1',
    rating: 9.8,
    backdropUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80',
    description: 'Hành trình khám phá những vùng đất kỳ vĩ và những câu chuyện sinh tồn phi thường nhất của muôn loài trên Trái Đất.',
    targetHref: '/channels/discovery',
  },
];

// Curated 25 Channels Showcase
const CHANNELS_PREVIEW_LIST = [
  { id: '1', slug: 'sport-1', name: 'Omni Sport 1', category: 'SPORTS', categoryName: 'Thể Thao 1', currentProgram: 'UCL: Real Madrid vs Man City', isLive: true, viewers: '128K' },
  { id: '2', slug: 'sport-2', name: 'Omni Sport 2', category: 'SPORTS', categoryName: 'Thể Thao 2', currentProgram: 'Premier League: Arsenal vs Chelsea', isLive: true, viewers: '94K' },
  { id: '3', slug: 'cine', name: 'Omni Cine', category: 'CINE', categoryName: 'Điện Ảnh 4K', currentProgram: 'Spider-Man: Across the Spider-Verse', isLive: true, viewers: '88K' },
  { id: '4', slug: 'drama', name: 'Omni Drama', category: 'DRAMA', categoryName: 'Phim Truyện', currentProgram: 'Hậu Duệ Mặt Trời (Bản 4K)', isLive: false, viewers: '32K' },
  { id: '5', slug: 'esports', name: 'Omni Esports', category: 'GAMING', categoryName: 'Esports', currentProgram: 'CKTG LMHT 2025: T1 vs Gen.G', isLive: true, viewers: '210K' },
  { id: '6', slug: 'news', name: 'News 24/7', category: 'NEWS', categoryName: 'Tin Tức', currentProgram: 'Bản Tin Thời Sự Quốc Tế 19:00', isLive: true, viewers: '55K' },
  { id: '7', slug: 'show', name: 'Omni Show', category: 'SHOW', categoryName: 'Showbiz', currentProgram: 'Ca Sĩ Mặt Nạ: Chung Kết', isLive: false, viewers: '64K' },
  { id: '8', slug: 'music', name: 'Music Hits', category: 'MUSIC', categoryName: 'Âm Nhạc', currentProgram: 'Top 50 Hits Billboard 4K', isLive: true, viewers: '42K' },
  { id: '9', slug: 'discovery', name: 'Omni Discovery', category: 'DOCUMENTARY', categoryName: 'Khám Phá', currentProgram: 'Planet Earth III (Tập 4)', isLive: true, viewers: '39K' },
  { id: '10', slug: 'tech', name: 'Omni Tech', category: 'TECH', categoryName: 'Công Nghệ', currentProgram: 'Kỷ Nguyên Trí Tuệ Nhân Tạo AI', isLive: false, viewers: '28K' },
  { id: '11', slug: 'food', name: 'Food Life', category: 'FOOD', categoryName: 'Ẩm Thực', currentProgram: 'MasterChef: Đại Chiến Siêu Đầu Bếp', isLive: true, viewers: '31K' },
  { id: '12', slug: 'kids', name: 'Kids Zone', category: 'KIDS', categoryName: 'Thiếu Nhi', currentProgram: 'Thế Giới Hoạt Hình Disney', isLive: false, viewers: '24K' },
];

// Curated Showcase Posters (Movies, Shows, Matches)
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
  const [selectedChannelCategory, setSelectedChannelCategory] = useState<string>('ALL');
  const [isAutoSlide, setIsAutoSlide] = useState(true);

  const currentHero = HERO_SPOTLIGHTS[activeSpotlightIdx];

  // Auto rotate hero spotlight
  useEffect(() => {
    if (!isAutoSlide) return;
    const interval = setInterval(() => {
      setActiveSpotlightIdx((prev) => (prev + 1) % HERO_SPOTLIGHTS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isAutoSlide]);

  const filteredChannels = useMemo(() => {
    if (selectedChannelCategory === 'ALL') return CHANNELS_PREVIEW_LIST;
    return CHANNELS_PREVIEW_LIST.filter((ch) => ch.category === selectedChannelCategory);
  }, [selectedChannelCategory]);

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col space-y-12 pb-20">
      
      {/* ── 1. Hero Spotlight Carousel (Sân Khấu Tâm Điểm OmniCast) ── */}
      <section className="max-w-[1720px] w-full mx-auto px-4 lg:px-8 pt-4">
        <div className="relative w-full rounded-3xl overflow-hidden bg-[#0a111c] border border-[#1b2b42] shadow-[0_20px_60px_rgba(0,0,0,0.85)] aspect-[21/9] min-h-[460px] max-h-[640px] group">
          
          {/* Main Hero Backdrop Image */}
          <Image
            src={currentHero.backdropUrl}
            alt={currentHero.title}
            fill
            unoptimized
            priority
            className="object-cover object-center scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
          />

          {/* Atmospheric Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-[#070b12]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b12] via-[#070b12]/85 to-transparent w-full lg:w-3/4" />

          {/* Hero Content Overlay */}
          <div className="absolute inset-0 p-6 md:p-12 lg:p-14 flex flex-col justify-end max-w-3xl z-20 space-y-4">
            
            {/* Meta Tags & Live Status */}
            <div className="flex flex-wrap items-center gap-2.5">
              {currentHero.isLive && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  {currentHero.badge}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]">
                {currentHero.channelName}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-black/60 backdrop-blur-md text-cyan-300 border border-cyan-500/30">
                {currentHero.quality}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-black/60 backdrop-blur-md text-amber-400 border border-amber-500/30">
                {currentHero.audio}
              </span>
              {currentHero.isLive && (
                <span className="text-xs text-slate-300 font-medium flex items-center gap-1 ml-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  {currentHero.viewers} đang xem
                </span>
              )}
            </div>

            {/* Main Title */}
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
              {currentHero.title}
            </h1>

            {/* Description */}
            <p className="text-xs md:text-sm text-slate-300 line-clamp-2 md:line-clamp-3 leading-relaxed max-w-2xl drop-shadow">
              {currentHero.description}
            </p>

            {/* Call To Action Buttons */}
            <div className="flex items-center gap-3.5 pt-2">
              <Link
                href={currentHero.targetHref}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs md:text-sm font-black shadow-[0_0_25px_rgba(0,242,254,0.5)] transition-all hover:scale-105 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                XEM TRỰC TIẾP NGAY
              </Link>

              <Link
                href="/epg"
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-slate-200 hover:text-white text-xs font-bold transition-colors"
              >
                <Calendar className="w-4 h-4 text-cyan-400" />
                Lịch Phát Sóng (EPG)
              </Link>
            </div>
          </div>

          {/* Carousel Arrows */}
          <button
            onClick={() => {
              setIsAutoSlide(false);
              setActiveSpotlightIdx((p) => (p === 0 ? HERO_SPOTLIGHTS.length - 1 : p - 1));
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/70 hover:bg-cyan-500 hover:text-black text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xl cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={() => {
              setIsAutoSlide(false);
              setActiveSpotlightIdx((p) => (p + 1) % HERO_SPOTLIGHTS.length);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/70 hover:bg-cyan-500 hover:text-black text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xl cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 right-6 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
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
                    ? 'w-6 bg-cyan-400 shadow-[0_0_8px_#00f2fe]'
                    : 'w-1.5 bg-slate-600 hover:bg-slate-400'
                )}
              />
            ))}
          </div>
        </div>

        {/* Thumbnail Selector Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
          {HERO_SPOTLIGHTS.map((item, idx) => {
            const isActive = activeSpotlightIdx === idx;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setIsAutoSlide(false);
                  setActiveSpotlightIdx(idx);
                }}
                className={cn(
                  'group relative rounded-2xl overflow-hidden aspect-[16/9] border transition-all text-left cursor-pointer p-2 flex flex-col justify-end',
                  isActive
                    ? 'border-cyan-400 shadow-[0_0_18px_rgba(0,242,254,0.35)] ring-2 ring-cyan-500/50 scale-[1.02] bg-[#0c1524]'
                    : 'border-[#172438] opacity-60 hover:opacity-100 bg-[#080e18]'
                )}
              >
                <Image
                  src={item.backdropUrl}
                  alt={item.title}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="relative z-10">
                  <div className="text-[10px] font-bold text-cyan-300 line-clamp-1">{item.channelName}</div>
                  <div className="text-xs font-black text-white line-clamp-1 group-hover:text-cyan-400">{item.title}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 2. 25 Kênh Đang Phát Sóng Trực Tiếp (Live Channels Matrix) ── */}
      <section className="max-w-[1720px] w-full mx-auto px-4 lg:px-8 space-y-5">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#142236] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Kênh Truyền Hình Đang Phát Sóng Trực Tiếp
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Hệ thống 25 kênh truyền hình độ nét cao 4K UHD cùng đa luồng bình luận viên
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Tất Cả (25 Kênh)' },
              { id: 'SPORTS', label: 'Thể Thao' },
              { id: 'CINE', label: 'Điện Ảnh 4K' },
              { id: 'GAMING', label: 'Esports' },
              { id: 'NEWS', label: 'Tin Tức' },
              { id: 'DOCUMENTARY', label: 'Khám Phá' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedChannelCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  selectedChannelCategory === cat.id
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                    : 'bg-[#0e1726] hover:bg-[#142338] text-slate-300 border border-[#1b2b42]'
                )}
              >
                {cat.label}
              </button>
            ))}

            <Link
              href="/channels"
              className="ml-2 text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1"
            >
              Xem tất cả →
            </Link>
          </div>
        </div>

        {/* Channel Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
          {filteredChannels.map((ch) => (
            <Link
              key={ch.slug}
              href={`/channels/${ch.slug}`}
              className="group p-3.5 rounded-2xl bg-[#09101c] hover:bg-[#101b2e] border border-[#16253c] hover:border-cyan-500/50 transition-all duration-300 shadow-lg flex flex-col justify-between space-y-3 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ChannelLogo slug={ch.slug} name={ch.name} size="sm" />
                  <div>
                    <h3 className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors">
                      {ch.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {ch.categoryName}
                    </span>
                  </div>
                </div>

                {ch.isLive ? (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-950/90 text-red-400 border border-red-800 shadow-[0_0_6px_rgba(239,68,68,0.4)]">
                    LIVE
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-500">
                    24/7
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-[#142135]">
                <div className="text-[11px] font-bold text-slate-200 line-clamp-1 group-hover:text-cyan-400">
                  {ch.currentProgram}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span className="flex items-center gap-1 text-cyan-400/90">
                    <Users className="w-3 h-3" /> {ch.viewers}
                  </span>
                  <span className="font-mono text-slate-500">4K Atmos</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 3. Kho Nội Dung Mới & Bom Tấn Đề Xuất (Showcase Poster Grid) ─ */}
      <section className="max-w-[1720px] w-full mx-auto px-4 lg:px-8 space-y-5">
        
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-[#142236] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Film className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-black text-white tracking-tight">
                Kho Nội Dung Mới & Sự Kiện Nổi Bật
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Tuyển tập phim chiếu rạp, trận cầu đỉnh cao và show truyền hình chất lượng 4K HDR
            </p>
          </div>

          <Link
            href="/recordings"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Xem toàn bộ kho VOD →
          </Link>
        </div>

        {/* 5-Column Vertical Poster Showcase Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {SHOWCASE_POSTERS.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl overflow-hidden bg-[#0a111d] border border-[#162338] hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(0,242,254,0.25)] transition-all duration-300 flex flex-col"
            >
              {/* Poster Image Container */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#060a12]">
                <Image
                  src={item.poster}
                  alt={item.title}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Quality Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-cyan-500 text-black shadow-[0_0_8px_rgba(0,242,254,0.6)]">
                    {item.quality}
                  </span>
                </div>

                {/* Star Rating Badge */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-black/80 backdrop-blur-md text-amber-400 border border-amber-500/30">
                  <Star className="w-2.5 h-2.5 fill-amber-400" />
                  {item.rating}
                </div>

                {/* Hover Overlay with Action Buttons */}
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

              {/* Card Metadata */}
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

      {/* ── 5. Hệ Sinh Thái Đặc Quyền OmniCast ────────────────────────── */}
      <section className="max-w-[1720px] w-full mx-auto px-4 lg:px-8">
        <div className="p-6 md:p-8 rounded-3xl bg-[#080e19] border border-[#16253c] shadow-2xl relative overflow-hidden">
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-5 rounded-2xl bg-[#05080e] border border-[#142032] hover:border-cyan-500/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Tv className="w-5 h-5 text-cyan-400" />
              </div>
              <h4 className="text-sm font-black text-white mb-1.5">25 Kênh 4K UHD 60FPS</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Độ phân giải siêu nét chuẩn truyền hình thế hệ mới không giật lag.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#05080e] border border-[#142032] hover:border-cyan-500/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Radio className="w-5 h-5 text-red-400" />
              </div>
              <h4 className="text-sm font-black text-white mb-1.5">Multi-Cam 16 Góc Máy</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tự do điều khiển góc máy Tactical, Spider-cam hoặc xem riêng ngôi sao.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#05080e] border border-[#142032] hover:border-cyan-500/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-sm font-black text-white mb-1.5">Dolby Atmos & Đa Luồng</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Âm thanh vòm khán đài sống động, tùy chọn BLV quốc tế và tiếng Việt.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#05080e] border border-[#142032] hover:border-cyan-500/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-sm font-black text-white mb-1.5">AI Curator Thông Minh</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tự động đề xuất nội dung theo sở thích và thông báo khi sắp phát sóng.
              </p>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}

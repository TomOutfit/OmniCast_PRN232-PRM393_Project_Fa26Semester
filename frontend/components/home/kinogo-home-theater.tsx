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
  Maximize2,
  Flame,
  Award,
  SlidersHorizontal,
  Layers,
  Search,
  CheckCircle2,
  Cast,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { useChannels } from '@/lib/hooks/useChannels';
import { useRecordings, useLiveNow } from '@/lib/hooks/usePrograms';
import type { Recording, Channel } from '@/types';

// Featured 3D Stage Carousel Items (Cinematic Blockbusters & Prime Live Arena)
export interface TheaterStageItem {
  id: string;
  title: string;
  category: string;
  badge: string;
  rating: number;
  year: number;
  duration: string;
  quality: string;
  audio: string;
  backdropUrl: string;
  posterUrl: string;
  description: string;
  director: string;
  cast: string;
  streamUrl?: string;
  channelSlug?: string;
}

const CINEMA_STAGE_ITEMS: TheaterStageItem[] = [
  {
    id: 'stage-1',
    title: 'Spider-Man: Across the Spider-Verse',
    category: 'BOM TẤN ĐIỆN ẢNH',
    badge: 'TOP #1 PHÒNG VÉ',
    rating: 9.4,
    year: 2024,
    duration: '2h 20m',
    quality: '4K UHD HDR10+',
    audio: 'DOLBY ATMOS 7.1',
    backdropUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=1600&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=600&q=80',
    description: 'Miles Morales tái xuất trong hành trình xuyên Đa vũ trụ nghẹt thở, đối đầu với Liên minh Người Nhện để bảo vệ định mệnh của chính mình.',
    director: 'Joaquim Dos Santos, Kemp Powers',
    cast: 'Shameik Moore, Hailee Steinfeld, Oscar Isaac',
    channelSlug: 'cine',
  },
  {
    id: 'stage-2',
    title: 'Chung Kết UEFA Champions League: Real Madrid vs Man City',
    category: 'THỂ THAO ĐỈNH CAO',
    badge: 'TRỰC TIẾP 4K MULTI-CAM',
    rating: 9.8,
    year: 2025,
    duration: '90m + Hiệp phụ',
    quality: '4K 60FPS HEVC',
    audio: 'DOLBY ATMOS LIVE',
    backdropUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
    description: 'Đại chiến nảy lửa tranh ngôi vương châu Âu tại sân vận động Wembley. Trực tiếp 16 góc máy cùng bình luận viên Quang Huy & Anh Ngọc.',
    director: 'OmniCast Sports Network',
    cast: 'Vinicius Jr, Jude Bellingham, Erling Haaland, De Bruyne',
    channelSlug: 'sport-1',
  },
  {
    id: 'stage-3',
    title: 'Dune: Part Two (Hành Tinh Cát 2)',
    category: 'KHOA HỌC VIỄN TƯỞNG',
    badge: 'SIÊU PHẨM IMAX',
    rating: 9.2,
    year: 2024,
    duration: '2h 46m',
    quality: '4K DOLBY VISION',
    audio: 'DOLBY ATMOS 7.1',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    description: 'Paul Atreides hợp lực cùng Chani và tộc người Fremen thực hiện cuộc trả thù chống lại những kẻ đã hủy hoại gia đình mình.',
    director: 'Denis Villeneuve',
    cast: 'Timothée Chalamet, Zendaya, Rebecca Ferguson, Austin Butler',
    channelSlug: 'cine',
  },
  {
    id: 'stage-4',
    title: 'Chung Kết Thế Giới LMHT 2025: T1 vs Gen.G',
    category: 'ESPORTS QUỐC TẾ',
    badge: 'BO5 KỊCH TÍNH',
    rating: 9.6,
    year: 2025,
    duration: '5 Ván Đấu',
    quality: '4K UHD 60FPS',
    audio: 'DOLBY AUDIO',
    backdropUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    description: 'Trận đại chiến kinh điển giữa Faker và Chovy tranh chiếc cúp vô địch thế giới danh giá. Tường thuật trực tiếp với phân tích Tactical AI.',
    director: 'Riot Games & Omni Esports',
    cast: 'Faker, Gumayusi, Keria, Chovy, Canyon',
    channelSlug: 'esports',
  },
  {
    id: 'stage-5',
    title: 'Oppenheimer (Bản Gốc 4K Không Cắt)',
    category: 'LỊCH SỬ • CHÍNH KỊCH',
    badge: '7 TƯỢNG VÀNG OSCAR',
    rating: 9.0,
    year: 2023,
    duration: '3h 00m',
    quality: '4K MASTER HDR',
    audio: 'DOLBY ATMOS 5.1',
    backdropUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1600&q=80',
    posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80',
    description: 'Câu chuyện cuộc đời đầy biến động của J. Robert Oppenheimer trong dự án Manhattan - chế tạo ra quả bom nguyên tử đầu tiên của nhân loại.',
    director: 'Christopher Nolan',
    cast: 'Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr.',
    channelSlug: 'cine',
  },
];

// Fallback Posters for Kinogo Vertical Grid
const POSTER_MOVIES_SHOWCASE = [
  {
    id: 'm-01',
    title: 'Spider-Man: Across the Spider-Verse',
    category: 'Điện Ảnh',
    genre: 'Hoạt hình • Hành động',
    rating: 4.9,
    year: 2024,
    quality: '4K HDR',
    audio: 'Atmos 7.1',
    views: '1.4M',
    poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=500&q=80',
    href: '/programs/m-01',
  },
  {
    id: 'm-02',
    title: 'Dune: Part Two (Hành Tinh Cát)',
    category: 'Sci-Fi',
    genre: 'Khoa học viễn tưởng • Phiêu lưu',
    rating: 4.8,
    year: 2024,
    quality: '4K UHD',
    audio: 'Atmos 5.1',
    views: '980K',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=500&q=80',
    href: '/programs/m-02',
  },
  {
    id: 'm-03',
    title: 'Oppenheimer (Bản Chiếu Rạp 4K)',
    category: 'Điện Ảnh',
    genre: 'Chính kịch • Lịch sử',
    rating: 4.9,
    year: 2023,
    quality: '4K UHD',
    audio: 'Atmos 5.1',
    views: '850K',
    poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=500&q=80',
    href: '/programs/m-03',
  },
  {
    id: 'm-04',
    title: 'UEFA Champions League 2025: Highlights',
    category: 'Thể Thao',
    genre: 'Bóng đá • Đỉnh cao',
    rating: 5.0,
    year: 2025,
    quality: '4K 60FPS',
    audio: 'Dolby Live',
    views: '2.1M',
    poster: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=500&q=80',
    href: '/programs/m-04',
  },
  {
    id: 'm-05',
    title: 'Cyberpunk: Edgerunners Season 2',
    category: 'Anime',
    genre: 'Anime • Hành động • AI',
    rating: 4.7,
    year: 2024,
    quality: '1080p FHD',
    audio: 'Dolby Digital',
    views: '620K',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=500&q=80',
    href: '/programs/m-05',
  },
  {
    id: 'm-06',
    title: 'The Batman: Hiệp Sĩ Bóng Đêm',
    category: 'Điện Ảnh',
    genre: 'Tội phạm • Giật gân',
    rating: 4.6,
    year: 2023,
    quality: '4K HDR',
    audio: 'Atmos 5.1',
    views: '740K',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=500&q=80',
    href: '/programs/m-06',
  },
  {
    id: 'm-07',
    title: 'Avatar: The Way of Water 3D Remaster',
    category: 'Sci-Fi',
    genre: 'Phiêu lưu • Kỳ ảo',
    rating: 4.8,
    year: 2023,
    quality: '4K HFR 60fps',
    audio: 'Atmos 7.1',
    views: '1.8M',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80',
    href: '/programs/m-07',
  },
  {
    id: 'm-08',
    title: 'MasterChef Grand Finale Season 12',
    category: 'Show',
    genre: 'Ẩm thực • Reality',
    rating: 4.5,
    year: 2024,
    quality: '1080p FHD',
    audio: 'Stereo HD',
    views: '430K',
    poster: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=500&q=80',
    href: '/programs/m-08',
  },
  {
    id: 'm-09',
    title: 'Interstellar (Bản Kỷ Niệm 10 Năm)',
    category: 'Điện Ảnh',
    genre: 'Khoa học • Không gian',
    rating: 4.9,
    year: 2024,
    quality: '4K IMAX HDR',
    audio: 'Atmos 7.1',
    views: '1.2M',
    poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=500&q=80',
    href: '/programs/m-09',
  },
  {
    id: 'm-10',
    title: 'Planet Earth III (Khám Phá Thế Giới Tự Nhiên)',
    category: 'Khám Phá',
    genre: 'Tài liệu • 4K BBC',
    rating: 4.9,
    year: 2024,
    quality: '4K UHD 60FPS',
    audio: 'Dolby Atmos',
    views: '910K',
    poster: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=500&q=80',
    href: '/programs/m-10',
  },
];

export function KinogoHomeTheater() {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedQuality, setSelectedQuality] = useState<string>('ALL');
  const [selectedSort, setSelectedSort] = useState<string>('TRENDING');
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCinemaTheaterMode, setIsCinemaTheaterMode] = useState(false);

  // External API integration
  const { data: channelsData } = useChannels({ limit: 25 });
  const { data: recordingsData } = useRecordings({ limit: 20 });
  const { data: liveEventsData } = useLiveNow();

  const currentStage = CINEMA_STAGE_ITEMS[activeStageIndex];

  // Auto rotate stage every 7 seconds
  useEffect(() => {
    if (!isAutoPlay) return;
    const timer = setInterval(() => {
      setActiveStageIndex((prev) => (prev + 1) % CINEMA_STAGE_ITEMS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isAutoPlay]);

  const handlePrevStage = () => {
    setIsAutoPlay(false);
    setActiveStageIndex((prev) => (prev === 0 ? CINEMA_STAGE_ITEMS.length - 1 : prev - 1));
  };

  const handleNextStage = () => {
    setIsAutoPlay(false);
    setActiveStageIndex((prev) => (prev + 1) % CINEMA_STAGE_ITEMS.length);
  };

  // Filtered poster list
  const filteredPosters = useMemo(() => {
    let list = POSTER_MOVIES_SHOWCASE;
    if (selectedCategory !== 'ALL') {
      list = list.filter((p) => p.category.toLowerCase().includes(selectedCategory.toLowerCase()) || p.genre.toLowerCase().includes(selectedCategory.toLowerCase()));
    }
    if (searchQuery.trim().length > 0) {
      list = list.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.genre.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (selectedQuality !== 'ALL') {
      list = list.filter((p) => p.quality.toLowerCase().includes(selectedQuality.toLowerCase()));
    }
    return list;
  }, [selectedCategory, searchQuery, selectedQuality]);

  const SIDEBAR_GENRES = [
    { id: 'ALL', label: 'Tất Cả Nội Dung', count: '1,420+' },
    { id: 'Điện Ảnh', label: 'Phim Chiếu Rạp 4K', count: '380+' },
    { id: 'Thể Thao', label: 'Thể Thao & Trực Tiếp', count: '120+' },
    { id: 'Sci-Fi', label: 'Khoa Học Viễn Tưởng', count: '94+' },
    { id: 'Anime', label: 'Anime & Hoạt Hình', count: '215+' },
    { id: 'Show', label: 'Game Show & Talk', count: '140+' },
    { id: 'Khám Phá', label: 'Tài Liệu Discovery', count: '88+' },
    { id: 'Âm Nhạc', label: 'Live Concert & MV', count: '160+' },
  ];

  return (
    <div className={cn('min-h-screen bg-[#05080e] text-slate-100 transition-all duration-500 overflow-hidden', isCinemaTheaterMode ? 'bg-[#020408]' : '')}>
      
      {/* ── Background Theater Ambient Orbs (Kinogo Vibe) ─────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-40 right-10 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1720px] w-full mx-auto px-4 lg:px-8 pt-6 pb-20 space-y-12">
        
        {/* ── 1. Kinogo Top Header Title & Theater Mode Switch ────────── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#142236] pb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#00f2fe] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400 font-mono">
                CINEMA THEATER & LIVE ARENA AT HOME
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Rạp Chiếu Phim Tại Gia Đẳng Cấp <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">4K Dolby Atmos</span>
            </h1>
          </div>

          {/* Quick Actions / Mode */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCinemaTheaterMode(!isCinemaTheaterMode)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-lg cursor-pointer',
                isCinemaTheaterMode
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.4)]'
                  : 'bg-[#0d1624] hover:bg-[#132034] text-slate-300 border-[#1a2b42]'
              )}
            >
              <Tv className="w-4 h-4" />
              {isCinemaTheaterMode ? 'Đang Bật Chế Độ Rạp Chiếu' : 'Chế Độ Rạp Chiếu (Cinema)'}
            </button>

            <Link
              href="/epg"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0d1624] hover:bg-[#132034] text-cyan-300 border border-[#1a2b42] hover:border-cyan-500/40 transition-colors"
            >
              <Calendar className="w-4 h-4 text-cyan-400" />
              Lịch Phát Sóng 24/7 (EPG)
            </Link>
          </div>
        </div>

        {/* ── 2. Kinogo 3D Multi-Slide Center Stage Carousel ─────────── */}
        <section className="relative w-full">
          {/* Main Stage Viewport */}
          <div className="relative w-full rounded-3xl overflow-hidden bg-[#070d17] border border-[#182840] shadow-[0_25px_60px_rgba(0,0,0,0.8)] aspect-[21/9] min-h-[420px] max-h-[620px] group">
            
            {/* Stage Backdrop Image with Smooth Fade */}
            <Image
              src={currentStage.backdropUrl}
              alt={currentStage.title}
              fill
              unoptimized
              priority
              className="object-cover object-center scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
            />

            {/* Cinematic Gradient Overlays (Left/Bottom/Vignette) */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#05080e] via-[#05080e]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#05080e] via-[#05080e]/80 to-transparent w-full lg:w-3/4" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none" />

            {/* Stage Content Information Box */}
            <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end max-w-3xl z-20 space-y-3.5">
              
              {/* Badges & Meta Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,242,254,0.5)]">
                  {currentStage.badge}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-cyan-300 border border-cyan-500/40">
                  {currentStage.quality}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-amber-400 border border-amber-500/40 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400" />
                  IMDb {currentStage.rating}
                </span>
                <span className="text-xs text-slate-300 font-medium ml-1">
                  {currentStage.year} • {currentStage.duration} • {currentStage.audio}
                </span>
              </div>

              {/* Main Title */}
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
                {currentStage.title}
              </h2>

              {/* Description */}
              <p className="text-xs md:text-sm text-slate-300 line-clamp-2 md:line-clamp-3 leading-relaxed max-w-2xl drop-shadow">
                {currentStage.description}
              </p>

              {/* Cast & Director */}
              <div className="hidden sm:block text-[11px] text-slate-400 space-y-0.5">
                <div><span className="text-slate-200 font-semibold">Đạo diễn:</span> {currentStage.director}</div>
                <div><span className="text-slate-200 font-semibold">Diễn viên / Nhân vật:</span> {currentStage.cast}</div>
              </div>

              {/* Stage Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Link
                  href={currentStage.channelSlug ? `/channels/${currentStage.channelSlug}` : `/programs/${currentStage.id}`}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs md:text-sm font-black shadow-[0_0_25px_rgba(0,242,254,0.4)] transition-all hover:scale-105 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  XEM TRỰC TIẾP NGAY
                </Link>

                <button
                  onClick={() => setIsAutoPlay(!isAutoPlay)}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-slate-200 hover:text-white text-xs font-bold transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  {isAutoPlay ? 'Tự Động Chiếu' : 'Tạm Dừng Slide'}
                </button>
              </div>
            </div>

            {/* Left / Right Carousel Navigation Arrows */}
            <button
              onClick={handlePrevStage}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/70 hover:bg-cyan-500 hover:text-black text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xl cursor-pointer"
              title="Phim trước"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={handleNextStage}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/70 hover:bg-cyan-500 hover:text-black text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xl cursor-pointer"
              title="Phim tiếp theo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Bottom Dots Indicator */}
            <div className="absolute bottom-4 right-6 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              {CINEMA_STAGE_ITEMS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIsAutoPlay(false);
                    setActiveStageIndex(idx);
                  }}
                  className={cn(
                    'h-1.5 rounded-full transition-all cursor-pointer',
                    activeStageIndex === idx
                      ? 'w-6 bg-cyan-400 shadow-[0_0_8px_#00f2fe]'
                      : 'w-1.5 bg-slate-600 hover:bg-slate-400'
                  )}
                />
              ))}
            </div>
          </div>

          {/* 3D Flanking Thumbnails Preview Strip (Kinogo Carousel Sub-bar) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
            {CINEMA_STAGE_ITEMS.map((item, idx) => {
              const isActive = activeStageIndex === idx;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsAutoPlay(false);
                    setActiveStageIndex(idx);
                  }}
                  className={cn(
                    'group relative rounded-2xl overflow-hidden aspect-[16/9] border transition-all text-left cursor-pointer',
                    isActive
                      ? 'border-cyan-400 shadow-[0_0_18px_rgba(0,242,254,0.4)] ring-2 ring-cyan-500/50 scale-[1.02]'
                      : 'border-[#18263c] opacity-60 hover:opacity-100 bg-[#09111c]'
                  )}
                >
                  <Image
                    src={item.backdropUrl}
                    alt={item.title}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="text-[10px] font-bold text-cyan-300 line-clamp-1">{item.category}</div>
                    <div className="text-xs font-black text-white line-clamp-1 group-hover:text-cyan-400">{item.title}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 3. Kinogo Category Filter & Search Bar ─────────────────── */}
        <section className="p-5 rounded-3xl bg-[#080e19] border border-[#16253c] shadow-2xl space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'ALL', label: 'TẤT CẢ' },
                { id: 'Điện Ảnh', label: 'BOM TẤN ĐIỆN ẢNH' },
                { id: 'Thể Thao', label: 'THỂ THAO ĐỈNH CAO' },
                { id: 'Sci-Fi', label: 'KHOA HỌC VIỄN TƯỞNG' },
                { id: 'Anime', label: 'ANIME & HOẠT HÌNH' },
                { id: 'Show', label: 'SHOW & TRUYỀN HÌNH' },
                { id: 'Khám Phá', label: 'DISCOVERY' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer',
                    selectedCategory === tab.id
                      ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,242,254,0.5)]'
                      : 'bg-[#101b2a] hover:bg-[#18283e] text-slate-300 hover:text-white border border-[#1a2d47]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quality & Sort Selectors */}
            <div className="flex items-center gap-2.5 w-full lg:w-auto">
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                className="bg-[#101b2a] border border-[#1a2d47] text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="ALL">Định dạng: Tất Cả</option>
                <option value="4K">Chất lượng: 4K UHD</option>
                <option value="HDR">Chuẩn HDR / Vision</option>
                <option value="Atmos">Âm thanh Dolby Atmos</option>
              </select>

              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="bg-[#101b2a] border border-[#1a2d47] text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="TRENDING">🔥 Thịnh hành nhất</option>
                <option value="NEWEST">⭐ Mới phát sóng</option>
                <option value="TOP_RATED">🏆 Đánh giá cao nhất</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── 4. Main Kinogo Showcase Layout (Sidebar + Vertical Posters) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (3 cols): Genre Navigation & Live 25 Channels Feed */}
          <aside className="lg:col-span-3 space-y-6">
            
            {/* Genre List Box */}
            <div className="p-5 rounded-3xl bg-[#080e19] border border-[#16253c] shadow-xl space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-2">
                <Layers className="w-4 h-4" />
                DANH MỤC CHUYÊN SÂU
              </h3>
              <div className="space-y-1">
                {SIDEBAR_GENRES.map((g) => {
                  const isCurrent = selectedCategory === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedCategory(g.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group',
                        isCurrent
                          ? 'bg-cyan-950/60 border border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,242,254,0.2)]'
                          : 'bg-transparent hover:bg-[#111c2e] text-slate-300'
                      )}
                    >
                      <span className="group-hover:text-cyan-300">{g.label}</span>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-400">
                        {g.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick 25 Channels Fast Switcher */}
            <div className="p-5 rounded-3xl bg-[#080e19] border border-[#16253c] shadow-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                  KÊNH LIVE TRUYỀN HÌNH
                </h3>
                <Link href="/channels" className="text-[11px] font-bold text-cyan-400 hover:underline">
                  Tất cả (25) →
                </Link>
              </div>

              <div className="space-y-2">
                {[
                  { slug: 'sport-1', name: 'Omni Sport 1', tag: 'CHAMPIONS LEAGUE', isLive: true },
                  { slug: 'cine', name: 'Omni Cine 4K', tag: 'SPIDER-MAN 4K', isLive: true },
                  { slug: 'esports', name: 'Omni Esports', tag: 'LMHT CKTG BO5', isLive: true },
                  { slug: 'news', name: 'News 24/7', tag: 'BẢN TIN THẾ GIỚI', isLive: true },
                  { slug: 'discovery', name: 'Omni Discovery', tag: 'PLANET EARTH III', isLive: true },
                ].map((ch) => (
                  <Link
                    key={ch.slug}
                    href={`/channels/${ch.slug}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#0e1726] hover:bg-[#142236] border border-[#1a2b42] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ChannelLogo slug={ch.slug} name={ch.name} size="sm" />
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-cyan-300">{ch.name}</div>
                        <div className="text-[10px] text-slate-400">{ch.tag}</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800">
                      LIVE
                    </span>
                  </Link>
                ))}
              </div>
            </div>

          </aside>

          {/* Right Column (9 cols): Kinogo Vertical Poster Grid */}
          <main className="lg:col-span-9 space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <Film className="w-5 h-5 text-cyan-400" />
                  Kho Phim Chiếu Rạp & Sự Kiện Mới Nhất
                </h2>
                <p className="text-xs text-slate-400">
                  Hiển thị {filteredPosters.length} tác phẩm chuẩn 4K HDR & âm thanh vòm Dolby Atmos
                </p>
              </div>

              <Link
                href="/recordings"
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                Xem toàn bộ kho VOD <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 5-Column Vertical Poster Showcase Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredPosters.map((item) => (
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
                        className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,242,254,0.5)] transition-transform group-hover:scale-105"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        XEM NGAY
                      </Link>
                      <div className="text-[10px] text-center text-slate-300 font-medium">
                        {item.audio} • {item.views} lượt xem
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
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#131f32]">
                      <span>{item.year}</span>
                      <span className="text-slate-500 font-mono">{item.genre.split('•')[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </main>
        </section>

      </div>
    </div>
  );
}

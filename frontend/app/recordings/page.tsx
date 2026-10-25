'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Play,
  Clock,
  Eye,
  Search,
  Sparkles,
  Tv,
  Film,
  Calendar,
  ChevronRight,
  Flame,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecordings } from '@/lib/hooks/usePrograms';
import type { Recording, LiveCategory } from '@/types';
import { cn } from '@/lib/utils';
import { Page3DHero, ChannelCardTilt } from '@/components/three';
import type { ProgramPoster } from '@/components/three/scenes/ProgramsScene3D';

const CATEGORY_LABELS: Record<string, string> = {
  SPORTS: 'Thể thao',
  SHOW: 'Show',
  ENTERTAINMENT: 'Giải trí',
  CINE: 'Điện ảnh',
  DRAMA: 'Phim truyện',
  NEWS: 'Tin tức',
  MUSIC: 'Âm nhạc',
  KIDS: 'Thiếu nhi',
  TECH: 'Công nghệ',
  FOOD: 'Ẩm thực',
  DOCUMENTARY: 'Khám phá',
  EDUCATION: 'Giáo dục',
  GAMING: 'Trò chơi',
  PODCAST: 'Podcast',
  LIFESTYLE: 'Phong cách sống',
  TRAVEL: 'Du lịch',
  ART: 'Nghệ thuật',
  BUSINESS: 'Kinh doanh',
  HEALTH: 'Sức khỏe',
};

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '45 phút';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} phút`;
}

function formatViewCount(n?: number | string | bigint): string {
  if (n == null) return '12.5K';
  const v = typeof n === 'bigint' ? Number(n) : Number(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

export default function RecordingsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { data, isLoading } = useRecordings({
    isFeatured: false,
    category: selectedCategory === 'ALL' ? undefined : (selectedCategory as LiveCategory),
    search: search || undefined,
    limit: 24,
    page: 1,
  });

  const recordings = useMemo<Recording[]>(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any).data)) return (data as any).data;
    return [];
  }, [data]);

  const categories = [
    { key: 'ALL', label: 'Tất Cả VOD' },
    { key: 'SPORTS', label: 'Thể Thao Đỉnh Cao' },
    { key: 'CINE', label: 'Phim Chiếu Rạp 4K' },
    { key: 'DRAMA', label: 'Series Truyền Hình' },
    { key: 'SHOW', label: 'Game Show & Talk' },
    { key: 'TECH', label: 'Công Nghệ & AI' },
    { key: 'MUSIC', label: 'Live Concert' },
  ];

  const vodPosters = useMemo<ProgramPoster[]>(
    () =>
      recordings.slice(0, 15).map((r) => ({
        id: r.id,
        title: r.title,
        category: (r.category as any) || 'CINE',
        rating: 9.2,
        year: 2025,
        isLive: false,
      })),
    [recordings]
  );

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 py-6 px-4 lg:px-6">
      <div className="max-w-[1680px] mx-auto space-y-6">
        
        {/* ── Interactive 3D VOD Spatial Hero ────────────────────────── */}
        {vodPosters.length > 0 && (
          <Page3DHero
            variant="programs"
            programs={vodPosters}
            height={360}
            className="rounded-3xl border border-[#16253c] overflow-hidden shadow-2xl mb-2"
          />
        )}

        {/* ── Page Header ───────────────────────────────────────────── */}
        <div className="p-6 md:p-8 rounded-3xl card-3d-surface flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-40 bg-gradient-to-l from-cyan-500/10 to-transparent blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00f2fe]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                CLOUD VOD & ON-DEMAND ARCHIVE // 4K MASTER
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-display">
              Kho Video & Bản Ghi Sự Kiện
            </h1>
            <p className="text-xs text-slate-300/80 mt-1 max-w-xl leading-relaxed">
              Thư viện lưu trữ không giới hạn các trận cầu kinh điển, phim điện ảnh bản quyền và talkshow với chất lượng 4K HDR Dolby Atmos trên giao diện 3D không gian.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-80 z-10">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm phim, video VOD..."
              className="w-full pl-10 pr-4 py-3 bg-[#0a111e]/90 border border-cyan-500/30 focus:border-cyan-400 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none shadow-[0_4px_20px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.1)_inset] transition-all"
            />
          </div>
        </div>

        {/* ── Category Filter Bar ────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-[#080d17]/85 border border-white/[0.08] backdrop-blur-xl shadow-lg">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                selectedCategory === cat.key
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_15px_rgba(0,242,254,0.45)] font-black scale-105'
                  : 'bg-[#0e1625]/90 hover:bg-[#152338] text-slate-300 border border-[#1b2b42] hover:border-cyan-500/30'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Recordings Grid ────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl bg-[#0b1320] border border-[#16253c]" />
            ))}
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-[#090f1a] border border-[#162338]">
            <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Chưa có video nào trong mục này</h3>
            <p className="text-xs text-slate-400">Thử tìm kiếm với từ khóa khác hoặc chuyển danh mục.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {recordings.map((rec) => (
              <ChannelCardTilt key={rec.id} intensity={12} scale={1.03} glow className="h-full">
                <Link
                  href={`/programs/recording/${rec.id}`}
                  className="group relative rounded-2xl bg-gradient-to-b from-[#0e1726]/95 via-[#08101d]/95 to-[#04070e]/98 border border-[#1b2b42] hover:border-cyan-400/70 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_45px_rgba(0,242,254,0.22)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between h-full before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent group-hover:before:via-cyan-400/80 cursor-pointer"
                >
                {/* Thumbnail Image Container */}
                <div className="relative aspect-video w-full bg-[#05080e] overflow-hidden">
                  {rec.thumbnailUrl ? (
                    <Image
                      src={rec.thumbnailUrl}
                      alt={rec.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-950/40 to-[#070d17]">
                      <Film className="w-10 h-10 text-cyan-400/40" />
                    </div>
                  )}

                  {/* Top Gradient Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#04070e] via-transparent to-black/40 pointer-events-none" />

                  {/* Badges Over Thumbnail */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-wider bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(0,242,254,0.5)]">
                      4K MASTER
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-extrabold uppercase bg-black/75 text-slate-200 backdrop-blur-md border border-white/10">
                      {formatDuration(rec.duration)}
                    </span>
                  </div>

                  {/* Hover Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                    <div className="w-13 h-13 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 flex items-center justify-center shadow-[0_0_25px_rgba(0,242,254,0.7)] transform scale-75 group-hover:scale-100 transition-all duration-300">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1 justify-between relative z-10">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 font-mono">
                      {CATEGORY_LABELS[rec.category as LiveCategory] || rec.category || 'VOD KHÁM PHÁ'}
                    </span>
                    <h3 className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mt-1 leading-snug font-display">
                      {rec.title}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400/70" />
                      {formatViewCount(rec.viewCount)} lượt xem
                    </span>
                    <span className="text-cyan-400 font-extrabold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      Xem ngay &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </ChannelCardTilt>
          ))}
          </div>
        )}

      </div>
    </div>
  );
}

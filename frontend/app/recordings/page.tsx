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
import { useRecordings } from '@/lib/hooks/usePrograms';
import type { Recording, LiveCategory } from '@/types';
import { cn } from '@/lib/utils';

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

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 py-6 px-4 lg:px-6">
      <div className="max-w-[1680px] mx-auto space-y-6">
        
        {/* ── Page Header ───────────────────────────────────────────── */}
        <div className="p-6 rounded-3xl bg-[#090f1a] border border-[#162338] shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                CLOUD VOD & ON-DEMAND ARCHIVE // 4K MASTER
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Kho Video & Bản Ghi Sự Kiện
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Thư viện lưu trữ không giới hạn các trận cầu kinh điển, phim điện ảnh bản quyền và talkshow với chất lượng 4K HDR Dolby Atmos.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm phim, video VOD..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0e1726] border border-[#1d2f4a] focus:border-cyan-400 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none shadow-inner"
            />
          </div>
        </div>

        {/* ── Category Filter Bar ────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-[#080d17] border border-[#142033]">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all',
                selectedCategory === cat.key
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,242,254,0.4)] font-black'
                  : 'bg-[#0e1625] hover:bg-[#152338] text-slate-300 border border-[#1b2b42]'
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
              <div key={i} className="h-64 rounded-2xl bg-[#0b1320] border border-[#16253c] animate-pulse" />
            ))}
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-[#090f1a] border border-[#162338]">
            <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Chưa có video nào trong mục này</h3>
            <p className="text-xs text-slate-400">Thử tìm kiếm với từ khóa khác hoặc chuyển danh mục.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {recordings.map((rec) => (
              <Link
                key={rec.id}
                href={`/programs/${rec.id}`}
                className="group rounded-2xl bg-[#0b1320] hover:bg-[#0f1a2c] border border-[#16253c] hover:border-cyan-500/50 overflow-hidden shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                {/* Thumbnail Image Container */}
                <div className="relative aspect-video w-full bg-[#05080e] overflow-hidden">
                  {rec.thumbnailUrl ? (
                    <Image
                      src={rec.thumbnailUrl}
                      alt={rec.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-950/40 to-[#070d17]">
                      <Film className="w-8 h-8 text-cyan-400/40" />
                    </div>
                  )}

                  {/* Badges Over Thumbnail */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-500 text-black shadow-md">
                      4K MASTER
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-black/70 text-slate-200 backdrop-blur-md">
                      {formatDuration(rec.duration)}
                    </span>
                  </div>

                  {/* Hover Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-[0_0_20px_#00f2fe] transform scale-75 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-cyan-400">
                      {CATEGORY_LABELS[rec.category as LiveCategory] || rec.category || 'VOD'}
                    </span>
                    <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mt-1 leading-snug">
                      {rec.title}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-slate-500" />
                      {formatViewCount(rec.viewCount)} lượt xem
                    </span>
                    <span className="text-cyan-400 font-bold group-hover:underline">
                      Xem ngay &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

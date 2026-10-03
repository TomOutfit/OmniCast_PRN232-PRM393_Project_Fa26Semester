'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  Tv,
  Play,
  Clock,
  Calendar,
  Sparkles,
  Radio,
  SlidersHorizontal,
  Film,
  Flame,
  ChevronRight,
} from 'lucide-react';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { useSearch } from '@/lib/hooks/useSearch';
import type { LiveCategory } from '@/types';
import { searchTypeSchema, searchSortSchema } from '@/lib/validators/search';
import { cn } from '@/lib/utils';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LiveCategory | ''>('');
  const [selectedSort, setSelectedSort] = useState<string>('relevance');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isQueryValid = !!debouncedQuery && debouncedQuery.trim().length >= 2;

  const { data, isLoading } = useSearch(
    isQueryValid
      ? {
          query: debouncedQuery.trim(),
          type: 'all',
          category: selectedCategory || undefined,
          sortBy: selectedSort as any,
        }
      : { query: '' },
    { enabled: isQueryValid },
  );

  const channels = data?.channels ?? [];
  const liveEvents = data?.liveEvents ?? [];
  const recordings = data?.recordings ?? [];
  const total = (data as any)?.totalResults ?? (channels.length + liveEvents.length + recordings.length);

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 py-6 px-4 lg:px-6">
      <div className="max-w-[1680px] mx-auto space-y-6">
        
        {/* ── Search Hero Section ───────────────────────────────────── */}
        <div className="p-8 rounded-3xl bg-[#090f1a] border border-[#162338] shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101b2c] border border-cyan-500/30 text-xs font-bold text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>TÌM KIẾM THÔNG MINH // TOÀN BỘ 25 KÊNH & VOD</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Tìm Kiếm Kênh, Giải Đấu & Phim 4K
            </h1>

            {/* Glowing Search Bar */}
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên kênh, đội bóng, giải đấu Ngoại Hạng Anh, phim chiếu rạp..."
                className="w-full pl-12 pr-12 py-4 rounded-2xl bg-[#0b1422] border-2 border-[#1c2e47] focus:border-cyan-400 text-sm text-white placeholder:text-slate-500 shadow-[0_0_25px_rgba(0,0,0,0.6)] focus:outline-none transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-[#18263a] text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Popular Quick Searches */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-400">
              <span className="font-bold text-slate-500">Gợi ý tìm kiếm:</span>
              {['Omni Sport', 'Champions League', 'Cine', 'Dune 2', 'Omni Esports', 'News 24/7'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-2.5 py-1 rounded-lg bg-[#0e1726] hover:bg-[#152339] border border-[#1b2b42] text-cyan-300 font-semibold transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* ── Search Results ────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-40 rounded-2xl bg-[#0b1320] border border-[#16253c] animate-pulse" />
            <div className="h-40 rounded-2xl bg-[#0b1320] border border-[#16253c] animate-pulse" />
          </div>
        ) : !isQueryValid ? (
          <div className="text-center py-16 rounded-3xl bg-[#090f1a] border border-[#162338]">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Hãy nhập từ khóa để bắt đầu tìm kiếm</h3>
            <p className="text-xs text-slate-400">Hệ thống sẽ tự động quét qua toàn bộ 25 kênh truyền hình trực tiếp và kho bản ghi VOD 4K.</p>
          </div>
        ) : total === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-[#090f1a] border border-[#162338]">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Không tìm thấy kết quả nào cho &quot;{debouncedQuery}&quot;</h3>
            <p className="text-xs text-slate-400">Vui lòng thử lại với tên khác hoặc từ khóa ngắn gọn hơn.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Matching Channels */}
            {channels.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-cyan-400" />
                  Kênh Truyền Hình Phù Hợp ({channels.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {channels.map((ch) => (
                    <Link
                      key={ch.id}
                      href={`/channels/${ch.slug}`}
                      className="group p-4 rounded-2xl bg-[#0b1320] hover:bg-[#0f1a2c] border border-[#16253c] hover:border-cyan-500/50 transition-all flex items-center gap-3.5 shadow-lg"
                    >
                      <ChannelLogo slug={ch.slug} name={ch.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f2fe]" />
                          <span className="text-[10px] font-bold uppercase text-cyan-400 truncate">
                            {ch.category || 'LIVE TV'}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors truncate">
                          {ch.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {ch.tagline || `${ch.followerCount ?? 0} người theo dõi`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Live & Upcoming Events */}
            {liveEvents.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Sự Kiện Trực Tiếp & Lịch Phát Sóng ({liveEvents.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/programs/${event.id}`}
                      className="group p-4 rounded-2xl bg-[#0b1320] hover:bg-[#0f1a2c] border border-[#16253c] hover:border-cyan-500/50 transition-all flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#121e30] border border-[#1f304a] flex items-center justify-center p-2 flex-shrink-0">
                        <Tv className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-black uppercase text-red-400 bg-red-950/80 px-1.5 py-0.2 rounded border border-red-800">
                            LIVE
                          </span>
                          <span className="text-[10px] text-cyan-400 font-bold uppercase truncate">
                            {(event.channel as any)?.category || 'Trực tiếp'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {event.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recordings VOD */}
            {recordings.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-cyan-400" />
                  Bản Ghi Video & Kho Phim VOD ({recordings.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {recordings.map((rec) => (
                    <Link
                      key={rec.id}
                      href={`/programs/${rec.id}`}
                      className="group rounded-2xl bg-[#0b1320] hover:bg-[#0f1a2c] border border-[#16253c] hover:border-cyan-500/50 p-3 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase text-cyan-400">
                          {rec.category || 'VOD'}
                        </span>
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 mt-1">
                          {rec.title}
                        </h4>
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>4K MASTER</span>
                        <span className="text-cyan-400 font-bold">Xem ngay &rarr;</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Tv,
  Radio,
  Search,
  Sparkles,
  Calendar,
  Play,
  Star,
  Users,
  Eye,
  Info,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { ChannelQuickView } from '@/components/channels/channel-quick-view';
import { useChannels, useChannelCategories } from '@/lib/hooks/useChannels';
import { useLiveNow } from '@/lib/hooks/usePrograms';
import type { Channel, LiveCategory } from '@/types';
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

export default function ChannelsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [quickViewChannel, setQuickViewChannel] = useState<Channel | null>(null);

  const { data, isLoading } = useChannels({
    isActive: true,
    category: selectedCategory === 'ALL' ? undefined : (selectedCategory as LiveCategory),
    search: search || undefined,
    limit: 100,
  });

  const { data: liveEvents } = useLiveNow();

  const channels = useMemo<Channel[]>(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any).data)) return (data as any).data;
    if (Array.isArray((data as any).items)) return (data as any).items;
    return [];
  }, [data]);

  const liveList = Array.isArray(liveEvents) ? liveEvents : (liveEvents as any)?.data ?? [];
  const liveChannelMap = useMemo(() => {
    const map = new Map<string, any>();
    liveList.forEach((e: any) => map.set(e.channelId, e));
    return map;
  }, [liveList]);

  const categories = [
    { key: 'ALL', label: 'Tất Cả (25 Kênh)' },
    { key: 'SPORTS', label: 'Thể Thao' },
    { key: 'CINE', label: 'Điện Ảnh 4K' },
    { key: 'DRAMA', label: 'Phim Truyện' },
    { key: 'SHOW', label: 'Show & Reality' },
    { key: 'NEWS', label: 'Tin Tức 24/7' },
    { key: 'MUSIC', label: 'Âm Nhạc' },
    { key: 'KIDS', label: 'Thiếu Nhi' },
    { key: 'TECH', label: 'Công Nghệ & AI' },
    { key: 'FOOD', label: 'Ẩm Thực' },
    { key: 'DOCUMENTARY', label: 'Khám Phá' },
    { key: 'GAMING', label: 'Esports & Gaming' },
    { key: 'PODCAST', label: 'Podcast & Audio' },
    { key: 'EDUCATION', label: 'Giáo Dục' },
    { key: 'LIFESTYLE', label: 'Đời Sống & Fashion' },
    { key: 'TRAVEL', label: 'Du Lịch' },
    { key: 'ART', label: 'Nghệ Thuật' },
    { key: 'BUSINESS', label: 'Kinh Doanh' },
    { key: 'HEALTH', label: 'Sức Khỏe' },
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
                BROADCAST NETWORK // 12 HIGH-BITRATE CHANNELS
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Danh Sách Kênh Truyền Hình Trực Tuyến
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Hệ thống kênh độc quyền phát sóng 24/7 với độ trễ siêu thấp, chuẩn nén HEVC 2160p60 và hỗ trợ xem lại Catch-up 7 ngày.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm kênh hoặc chương trình..."
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

        {/* ── Channels Grid ──────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-[#0b1320] border border-[#16253c] animate-pulse" />
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-[#090f1a] border border-[#162338]">
            <Tv className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Không tìm thấy kênh nào</h3>
            <p className="text-xs text-slate-400">Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc thể loại.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {channels.map((channel, idx) => {
              const liveEvent = liveChannelMap.get(channel.id);
              return (
                <div
                  key={channel.id}
                  className="group rounded-2xl bg-[#0b1320] hover:bg-[#0f1a2c] border border-[#16253c] hover:border-cyan-500/50 p-5 shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Top Ambient Glow on Hover */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/15 transition-all pointer-events-none" />

                  {/* Channel Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#121e30] border border-[#1f304a] p-2 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                          <ChannelLogo
                            slug={channel.slug}
                            name={channel.name}
                            logoUrl={channel.logoUrl ?? undefined}
                            category={channel.category}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-slate-500 font-bold">
                            CH #{String(idx + 1).padStart(3, '0')}
                          </span>
                          <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                            {channel.name}
                          </h3>
                          <span className="text-[10px] font-bold uppercase text-cyan-400">
                            {CATEGORY_LABELS[channel.category as LiveCategory] || channel.category}
                          </span>
                        </div>
                      </div>

                      {/* Live Badge */}
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-950/80 text-red-400 border border-red-800 shadow-[0_0_8px_rgba(239,68,68,0.3)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        LIVE
                      </span>
                    </div>

                    {/* Current Broadcasting Info */}
                    <div className="p-3 rounded-xl bg-[#070e1a] border border-[#142236] space-y-2 mb-4">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-slate-300">Đang phát:</span>
                        <span className="text-amber-400 font-mono font-semibold">ON-AIR 4K</span>
                      </div>
                      <p className="text-xs font-bold text-white line-clamp-1">
                        {liveEvent?.title || `${channel.name} — Chương trình đặc biệt`}
                      </p>
                      
                      {/* Fake Progress Bar */}
                      <div className="w-full h-1 bg-[#162338] rounded-full overflow-hidden">
                        <div className="bg-cyan-400 h-full w-[65%]" />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <Link
                      href={`/programs/${liveEvent?.id || 'live'}`}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(0,242,254,0.3)] transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Xem Trực Tiếp
                    </Link>

                    <button
                      onClick={() => setQuickViewChannel(channel)}
                      className="p-2 rounded-xl bg-[#101b2c] hover:bg-[#182840] border border-[#1e3250] text-slate-300 hover:text-cyan-400 transition-colors"
                      title="Xem nhanh thông tin kênh"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick View Modal */}
        {quickViewChannel && (
          <ChannelQuickView
            channel={quickViewChannel}
            onClose={() => setQuickViewChannel(null)}
          />
        )}

      </div>
    </div>
  );
}

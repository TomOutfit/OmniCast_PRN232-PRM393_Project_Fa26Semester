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
import { Skeleton } from '@/components/ui/skeleton';
import { useChannels, useChannelCategories } from '@/lib/hooks/useChannels';
import { useLiveNow } from '@/lib/hooks/usePrograms';
import type { Channel, LiveCategory } from '@/types';
import { cn } from '@/lib/utils';
import { isChannelPremium } from '@/lib/constants/channel-tiers';
import { Page3DHero } from '@/components/three/Page3DHero';
import { ChannelCardTilt } from '@/components/three';
import type { ChannelOrbData } from '@/components/three/scenes/ChannelsScene3D';

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
  const [tierFilter, setTierFilter] = useState<'ALL' | 'FREE' | 'VIP'>('ALL');
  const [quickViewChannel, setQuickViewChannel] = useState<Channel | null>(null);

  const { data, isLoading } = useChannels({
    isActive: true,
    category: selectedCategory === 'ALL' ? undefined : (selectedCategory as LiveCategory),
    search: search || undefined,
    limit: 100,
  });

  const { data: liveEvents } = useLiveNow();

  const channels = useMemo<Channel[]>(() => {
    let list: Channel[] = [];
    if (data) {
      if (Array.isArray(data)) list = data;
      else if (Array.isArray((data as any).data)) list = (data as any).data;
      else if (Array.isArray((data as any).items)) list = (data as any).items;
    }
    if (tierFilter === 'FREE') {
      return list.filter((c) => !isChannelPremium(c.slug));
    }
    if (tierFilter === 'VIP') {
      return list.filter((c) => isChannelPremium(c.slug));
    }
    return list;
  }, [data, tierFilter]);

  const liveChannelMap = useMemo(() => {
    const list = Array.isArray(liveEvents) ? liveEvents : (liveEvents as any)?.data ?? [];
    const map = new Map<string, any>();
    list.forEach((e: any) => map.set(e.channelId, e));
    return map;
  }, [liveEvents]);

  // 3D channel orbs for the hero sphere
  const channelOrbs = useMemo<ChannelOrbData[]>(
    () =>
      channels.slice(0, 25).map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        isLive: true,
      })),
    [channels]
  );

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
    <div className="min-h-screen bg-[#070b12]/50 backdrop-blur-[1px] text-slate-100 pb-6 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ── 3D Channel Sphere Hero ─────────────────────────────── */}
      <Page3DHero
        variant="channels"
        channelOrbs={channelOrbs}
        height={460}
        onSelect={(id) => {
          const ch = channels.find((c) => c.id === id);
          if (ch) setQuickViewChannel(ch);
        }}
      />

      <div className="px-4 lg:px-6 space-y-6">
      <div className="max-w-[1680px] mx-auto space-y-6">
        
        {/* ── Page Header ───────────────────────────────────────────── */}
        <div className="p-6 md:p-8 rounded-3xl card-3d-surface flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-40 bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_#00f2fe]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                BROADCAST NETWORK // 25 HIGH-BITRATE 4K CHANNELS
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-display">
              Danh Sách Kênh Truyền Hình Trực Tuyến
            </h1>
            <p className="text-xs text-slate-300/80 mt-1.5 max-w-xl leading-relaxed">
              Hệ thống kênh độc quyền phát sóng 24/7 với độ trễ siêu thấp, chuẩn nén HEVC 2160p60 và hỗ trợ xem lại Catch-up 7 ngày qua giao diện 3D không gian.
            </p>
          </div>

          {/* Quick Search with 3D Bevel */}
          <div className="relative w-full sm:w-80 z-10">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm kênh hoặc chương trình..."
              className="w-full pl-10 pr-4 py-3 bg-[#0a111e]/90 border border-cyan-500/30 focus:border-cyan-400 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none shadow-[0_4px_20px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.1)_inset] transition-all"
            />
          </div>
        </div>

        {/* ── Tier & Category Filter Bar ────────────────────────────── */}
        <div className="space-y-3.5">
          {/* Tier Switcher with 3D Depth */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#090f1d]/90 border border-white/[0.08] backdrop-blur-xl shadow-lg w-fit">
            <button
              onClick={() => setTierFilter('ALL')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer',
                tierFilter === 'ALL'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-[0_0_15px_rgba(0,242,254,0.4)] scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              TẤT CẢ (25 KÊNH)
            </button>
            <button
              onClick={() => setTierFilter('FREE')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                tierFilter === 'FREE'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105'
                  : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10'
              )}
            >
              <span>GÓI FREE (5 KÊNH)</span>
            </button>
            <button
              onClick={() => setTierFilter('VIP')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                tierFilter === 'VIP'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_0_18px_rgba(245,158,11,0.5)] scale-105'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
              )}
            >
              <span>👑 GÓI VIP 4K (20 KÊNH)</span>
            </button>
          </div>

          {/* Category Tabs with 3D Pills */}
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-[#080d17]/80 border border-white/[0.06] backdrop-blur-xl shadow-lg">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  selectedCategory === cat.key
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_15px_rgba(0,242,254,0.45)] font-black scale-105'
                    : 'bg-[#0e1625]/90 hover:bg-[#152338] text-slate-300 border border-[#1b2b42] hover:border-cyan-500/40'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Channels Grid ──────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl bg-[#0b1320] border border-[#16253c]" />
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-[#090f1a] border border-[#162338]">
            <Tv className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Không tìm thấy kênh nào</h3>
            <p className="text-xs text-slate-400">Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc thể loại.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {channels.map((channel, idx) => {
              const liveEvent = liveChannelMap.get(channel.id);
              const isPremium = isChannelPremium(channel.slug);
              return (
                <ChannelCardTilt
                  key={channel.id}
                  className="group relative rounded-2xl bg-gradient-to-b from-[#0e1726]/95 via-[#09101d]/95 to-[#05080f]/98 border border-[#1c2c44] hover:border-cyan-400/60 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_45px_rgba(0,242,254,0.18)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent group-hover:before:via-cyan-400/80"
                  intensity={10}
                >
                  {/* Top Ambient Glow on Hover */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-400/20 group-hover:scale-125 transition-all duration-500 pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-500/15 transition-all duration-500 pointer-events-none" />

                  {/* Channel Header */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#142338] to-[#091220] border border-[#223652] p-2 flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_15px_rgba(0,242,254,0.25)] transition-all duration-300">
                          <ChannelLogo
                            slug={channel.slug}
                            name={channel.name}
                            logoUrl={channel.logoUrl ?? undefined}
                            category={channel.category}
                            className="w-full h-full object-contain filter drop-shadow"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-300/80 bg-cyan-950/50 border border-cyan-800/40 font-bold">
                              CH #{String(idx + 1).padStart(3, '0')}
                            </span>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 font-mono">
                              {CATEGORY_LABELS[channel.category as LiveCategory] || channel.category}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors mt-0.5 line-clamp-1 font-display">
                            {channel.name}
                          </h3>
                        </div>
                      </div>

                      {/* Tier & Live Badges */}
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)] border border-red-400/30">
                          {/* Mini Equalizer Waves */}
                          <span className="flex items-center gap-0.5 h-2">
                            <span className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="w-0.5 h-2 bg-white rounded-full animate-ping" />
                            <span className="w-0.5 h-1 bg-white rounded-full animate-pulse" />
                          </span>
                          LIVE
                        </span>

                        {isPremium ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                            <Star className="w-2.5 h-2.5 fill-amber-300" />
                            VIP 4K
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                            FREE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Current Broadcasting Info */}
                    <div className="p-3.5 rounded-xl bg-[#060c17]/90 border border-[#16253c] group-hover:border-cyan-500/30 space-y-2 mb-4 transition-colors">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-extrabold text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          ĐANG CHIẾU:
                        </span>
                        <span className="text-amber-400 font-mono font-extrabold text-[9px] px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/30">
                          ON-AIR 4K HDR
                        </span>
                      </div>
                      <p className="text-xs font-black text-white line-clamp-1 group-hover:text-cyan-200 transition-colors">
                        {liveEvent?.title || `${channel.name} — Phát sóng trực tiếp`}
                      </p>
                      
                      {/* Broadcast Progress Bar */}
                      <div className="w-full h-1.5 bg-[#101b2a] rounded-full overflow-hidden p-0.5 border border-[#1a2d46]">
                        <div className="bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 h-full w-[72%] rounded-full shadow-[0_0_8px_#00f2fe]" />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5 relative z-10">
                    <Link
                      href={liveEvent ? `/programs/${liveEvent.id}` : `/channels/${channel.slug}`}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,242,254,0.35)] hover:shadow-[0_0_25px_rgba(0,242,254,0.6)] transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Xem Trực Tiếp
                    </Link>

                    <button
                      onClick={() => setQuickViewChannel(channel)}
                      className="p-2.5 rounded-xl bg-[#0e1726] hover:bg-[#152338] border border-[#1e304a] hover:border-cyan-400/50 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer shadow-sm"
                      title="Xem nhanh thông tin kênh"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </ChannelCardTilt>
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
    </div>
  );
}

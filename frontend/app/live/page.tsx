'use client';

// ============================================================
// OmniCast · Trung Tâm Phát Sóng Trực Tiếp (Live Broadcast Hub)
// ============================================================

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Radio,
  Sparkles,
  Film,
  Music,
  Baby,
  Trophy,
  ChevronRight,
  Search,
  CalendarDays,
  Clock,
} from 'lucide-react';
import { useChannels } from '@/lib/hooks/useChannels';
import { useLiveEvents, useLiveNow } from '@/lib/hooks/usePrograms';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { Page3DHero, ChannelCardTilt } from '@/components/three';
import { cn } from '@/lib/utils';
import type { Channel, LiveEvent } from '@/types';

const GENRE_CARDS = [
  {
    slug: 'kids',
    title: 'Phòng Thiếu Nhi & Hoạt Hình 24/7',
    desc: 'Cừu Vui Vẻ, Sói Xám, hoạt hình thiếu nhi an toàn và vui nhộn cho bé',
    category: 'KIDS',
    icon: Baby,
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    border: 'border-amber-400/30 hover:border-amber-400/60',
    tag: '🎪 KHÔNG GIAN THIẾU NHI',
  },
  {
    slug: 'sport-1',
    title: 'Đấu Trường Thể Thao Đỉnh Cao',
    desc: 'Ngoại Hạng Anh, Cúp C1, bóng đá, thể thao mạo hiểm 4K HDR',
    category: 'SPORTS',
    icon: Trophy,
    gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    border: 'border-cyan-400/30 hover:border-cyan-400/60',
    tag: '⚽ THỂ THAO 4K',
  },
  {
    slug: 'cine',
    title: 'Rạp Phim Bom Tấn Dolby Atmos',
    desc: 'Tuyển tập phim điện ảnh bom tấn, trailer rạp và series đình đám',
    category: 'CINE',
    icon: Film,
    gradient: 'from-purple-500/20 via-pink-500/10 to-transparent',
    border: 'border-purple-400/30 hover:border-purple-400/60',
    tag: '🎬 ĐIỆN ẢNH & SERI',
  },
  {
    slug: 'music',
    title: 'Sân Khấu Âm Nhạc & Lofi Chill',
    desc: 'Nhạc trẻ sống động, MV 4K, Lofi Beats thư giãn học tập làm việc',
    category: 'MUSIC',
    icon: Music,
    gradient: 'from-rose-500/20 via-red-500/10 to-transparent',
    border: 'border-rose-400/30 hover:border-rose-400/60',
    tag: '🎵 ÂM NHẠC TRỰC TUYẾN',
  },
];

export default function LiveDirectoryPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const scheduleQueryStart = useMemo(() => new Date().toISOString(), []);

  const { data: channelsData } = useChannels({
    isActive: true,
    limit: 100,
  });

  const { data: liveEventsData } = useLiveNow();
  const {
    data: scheduledResponse,
    isLoading: isScheduleLoading,
    isError: isScheduleError,
    refetch: refetchSchedule,
  } = useLiveEvents(
    { status: 'SCHEDULED', fromDate: scheduleQueryStart, limit: 12 },
    { refetchInterval: 60_000 },
  );

  const channels = useMemo<Channel[]>(() => {
    if (!channelsData) return [];
    if (Array.isArray(channelsData)) return channelsData;
    if (Array.isArray((channelsData as any).data)) return (channelsData as any).data;
    if (Array.isArray((channelsData as any).items)) return (channelsData as any).items;
    return [];
  }, [channelsData]);

  const liveEvents = useMemo<LiveEvent[]>(() => {
    if (!liveEventsData) return [];
    if (Array.isArray(liveEventsData)) return liveEventsData;
    if (Array.isArray((liveEventsData as any).data)) return (liveEventsData as any).data;
    return [];
  }, [liveEventsData]);

  const upcomingEvents = useMemo(
    () => (scheduledResponse?.data ?? []).filter(
      (event) => new Date(event.scheduledAt).getTime() >= Date.now(),
    ),
    [scheduledResponse],
  );

  const filteredChannels = useMemo(() => {
    return channels.filter((c) => {
      const matchCat = selectedFilter === 'ALL' || c.category === selectedFilter;
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [channels, selectedFilter, search]);

  return (
    <div className="min-h-screen bg-surface text-foreground selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ── 3D Live TV Hero ─────────────────────────────────────────── */}
      <Page3DHero
        variant="channels"
        height={440}
        headline="TRUYỀN HÌNH TRỰC TIẾP"
        subline="Trải nghiệm phát sóng liên tục 24/7 với chuẩn 4K HDR & độ trễ siêu thấp"
      />

      <div className="max-w-[1680px] mx-auto py-8 px-4 lg:px-6 space-y-10">
        
        {/* ── Featured Lounges / Phóng Sự Nổi Bật ───────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl md:text-2xl font-black font-display tracking-tight text-foreground">
                Phòng Phát Sóng Chủ Đề Liên Tục (Live Lounges)
              </h2>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Không gián đoạn · Tương tác thời gian thực
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {GENRE_CARDS.map((lounge) => {
              const Icon = lounge.icon;
              return (
                <Link
                  key={lounge.slug}
                  href={`/channels/${lounge.slug}`}
                  className={cn(
                    'group relative p-6 rounded-3xl border transition-all duration-300 card-3d-surface overflow-hidden flex flex-col justify-between hover:scale-[1.02]',
                    lounge.border,
                  )}
                >
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-br opacity-40 pointer-events-none transition-opacity group-hover:opacity-70',
                      lounge.gradient,
                    )}
                  />

                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black px-2.5 py-1 rounded-full bg-surface-container-high/80 border border-border/60">
                        {lounge.tag}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-cyan-400 border border-border">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-foreground group-hover:text-cyan-400 transition-colors">
                        {lounge.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {lounge.desc}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 pt-4 mt-4 border-t border-border/50 flex items-center justify-between text-xs font-bold text-cyan-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      Vào phòng xem
                    </span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="upcoming-live-heading">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 id="upcoming-live-heading" className="text-xl font-black text-foreground">
                Lịch livestream sắp phát
              </h2>
              <p className="text-xs text-muted-foreground">
                Lịch được đồng bộ tự động từ các sự kiện đã lên sóng.
              </p>
            </div>
          </div>

          {isScheduleLoading ? (
            <div className="rounded-2xl border border-border bg-surface-container p-5 text-sm text-muted-foreground">
              Đang tải lịch phát sóng...
            </div>
          ) : isScheduleError ? (
            <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-rose-400/30 bg-rose-950/20 p-5 text-sm text-rose-200">
              <span>Không thể tải lịch livestream lúc này.</span>
              <button
                type="button"
                onClick={() => void refetchSchedule()}
                className="shrink-0 rounded-lg border border-rose-300/30 px-3 py-1.5 text-xs font-bold hover:bg-rose-400/10"
              >
                Thử lại
              </button>
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/live/${event.id}`}
                  className="group rounded-2xl border border-border bg-surface-container p-4 transition hover:border-cyan-400/60 hover:bg-surface-container-high"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-bold text-foreground group-hover:text-cyan-300">
                        {event.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {event.channel?.name || 'OmniCast'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-300">
                      SẮP PHÁT
                    </span>
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Clock className="h-4 w-4 text-cyan-400" />
                    {new Date(event.scheduledAt).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface-container p-5 text-sm text-muted-foreground">
              Chưa có livestream nào được lên lịch. Lịch phát mới sẽ xuất hiện tại đây.
            </div>
          )}
        </section>

        {/* ── All Channels Directory ─────────────────────────────────── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl md:text-2xl font-black font-display tracking-tight text-foreground">
                  Danh Sách Toàn Bộ Kênh Phát Sóng ({filteredChannels.length} Kênh)
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lựa chọn kênh để theo dõi lịch trình EPG hoặc bắt đầu xem luồng trực tiếp
              </p>
            </div>

            {/* Search filter */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên kênh..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-surface-container-low border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </div>
          </div>

          {/* Grid of channels */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredChannels.map((ch, idx) => (
              <ChannelCardTilt
                key={ch.id}
                className="group relative rounded-2xl bg-surface-container border border-border hover:border-cyan-400/60 p-4 shadow-sm hover:shadow-[0_8px_24px_rgba(0,242,254,0.15)] transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
                intensity={8}
              >
                <Link href={`/channels/${ch.slug}`} className="space-y-3 block">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">
                      CH #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/15 text-red-400 border border-red-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-border p-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ChannelLogo
                      slug={ch.slug}
                      name={ch.name}
                      logoUrl={ch.logoUrl ?? undefined}
                      category={ch.category}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {ch.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5 uppercase">
                      {ch.category}
                    </p>
                  </div>
                </Link>
              </ChannelCardTilt>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

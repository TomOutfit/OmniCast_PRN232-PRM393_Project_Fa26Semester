'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Radio,
  Tv,
  Film,
  Flame,
  Star,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Bell,
  Info,
  SlidersHorizontal,
  Layers,
  Volume2,
  Maximize2,
  Share2,
  Cast,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { useChannels } from '@/lib/hooks/useChannels';
import { useEpgDay } from '@/lib/hooks/usePrograms';
import {
  type RealEpgProgram,
  type RealEpgChannel,
  CATEGORY_FILTERS,
  buildFallbackChannels,
  mapApiEpgToRealChannels,
} from './epg-channels-data';
export type { RealEpgProgram, RealEpgChannel };

export function EPGGrid() {
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeChannelId, setActiveChannelId] = useState<string>('ch-01');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'timeline' | 'schedule_list'>('timeline');
  const [selectedProgram, setSelectedProgram] = useState<RealEpgProgram | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Compute wall-clock target date from selected offset
  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDayOffset);
    return d;
  }, [selectedDayOffset]);

  // Dynamic API queries
  const { data: epgResponse, isLoading: isEpgLoading, isFetching: isEpgFetching } = useEpgDay(selectedDate);
  const { data: channelsResponse } = useChannels({ limit: 100, isActive: true });

  const rawChannels = useMemo(() => {
    if (!channelsResponse) return [];
    if (Array.isArray(channelsResponse)) return channelsResponse;
    return (channelsResponse as any)?.data ?? [];
  }, [channelsResponse]);

  const channelMetaMap = useMemo(() => {
    const map = new Map<string, any>();
    rawChannels.forEach((ch: any) => {
      if (ch.id) map.set(ch.id, ch);
      if (ch.slug) map.set(ch.slug, ch);
    });
    return map;
  }, [rawChannels]);

  // Current real time marker (e.g. 19:15 = 1155 minutes)
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 7-Day Date Carousel List (Hôm qua, Hôm nay, Ngày mai...)
  const SEVEN_DAYS = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const isToday = offset === 0;
      const dayName = isToday
        ? 'Hôm Nay'
        : offset === -1
        ? 'Hôm Qua'
        : offset === 1
        ? 'Ngày Mai'
        : `Thứ ${d.getDay() === 0 ? 'CN' : d.getDay() + 1}`;
      const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      days.push({ offset, isToday, dayName, dateFormatted });
    }
    return days;
  }, []);

  // Combine API data or rotated 25-channel fallback without jarring flicker
  const allChannels = useMemo<RealEpgChannel[]>(() => {
    if (epgResponse?.channels && epgResponse.channels.length > 0) {
      return mapApiEpgToRealChannels(epgResponse, rawChannels);
    }
    // Only fall back to local schedule if API has finished loading and returned no channels,
    // avoiding the jarring 1-2s flash of different content before API response settles.
    if (!isEpgLoading && rawChannels.length > 0) {
      return buildFallbackChannels(selectedDayOffset, channelMetaMap);
    }
    return [];
  }, [epgResponse, rawChannels, selectedDayOffset, channelMetaMap, isEpgLoading]);

  // Filter channels by category
  const filteredChannels = useMemo(() => {
    let list = allChannels;
    if (selectedCategory !== 'ALL') {
      list = list.filter((ch) => ch.category === selectedCategory);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.map((ch) => ({
        ...ch,
        programs: ch.programs.filter(
          (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
        ),
      })).filter((ch) => ch.programs.length > 0);
    }
    return list;
  }, [allChannels, selectedCategory, searchQuery]);

  const activeChannel = useMemo(() => {
    return filteredChannels.find((ch) => ch.id === activeChannelId || ch.slug === activeChannelId) || filteredChannels[0] || allChannels[0] || null;
  }, [filteredChannels, activeChannelId, allChannels]);

  // Set reminder handler with cyber toast
  const handleSetReminder = (prog: RealEpgProgram) => {
    setReminderToast(`Đã đặt lịch nhắc nhở: "${prog.title}" lúc ${prog.startTime}`);
    setTimeout(() => setReminderToast(null), 4000);
  };

  // Helper to determine program status
  const getProgramStatus = (prog: RealEpgProgram) => {
    if (selectedDayOffset < 0) return 'catchup';
    if (selectedDayOffset > 0) return 'upcoming';
    // Today
    const endMinutes = prog.startMinutes + prog.durationMinutes;
    if (currentTimeMinutes >= prog.startMinutes && currentTimeMinutes < endMinutes) {
      return 'live';
    }
    if (currentTimeMinutes >= endMinutes) {
      return 'catchup';
    }
    return 'upcoming';
  };

  return (
    <div className="w-full space-y-6 text-slate-100">
      
      {/* ── 1. Top EPG Header & 7-Day Date Carousel Bar ─────────────── */}
      <div className="p-5 md:p-6 rounded-3xl bg-[#090f1a] border border-[#16253c] shadow-2xl space-y-5">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#142236] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]" />
              <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400 font-mono flex items-center gap-1.5">
                REALTIME ELECTRONIC PROGRAMME GUIDE • {allChannels.length} CHANNELS
                {isEpgLoading && <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-cyan-400" />
              Lịch Phát Sóng Truyền Hình & Xem Lại 7 Ngày
            </h1>
          </div>

          {/* View Mode Toggle: Timeline Grid vs Detailed Linear Schedule */}
          <div className="flex items-center gap-2 bg-[#060a12] p-1.5 rounded-2xl border border-[#18283e]">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                viewMode === 'timeline'
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              Lưới Timeline 24H
            </button>

            <button
              onClick={() => setViewMode('schedule_list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                viewMode === 'schedule_list'
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Lịch Theo Kênh
            </button>
          </div>
        </div>

        {/* 7-Day Date Carousel Tabs */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-2 min-w-max">
            {SEVEN_DAYS.map((day) => {
              const isSelected = selectedDayOffset === day.offset;
              return (
                <button
                  key={day.offset}
                  onClick={() => setSelectedDayOffset(day.offset)}
                  className={cn(
                    'flex flex-col items-center px-4 py-2.5 rounded-2xl border text-center transition-all cursor-pointer min-w-[100px]',
                    isSelected
                      ? 'bg-gradient-to-b from-cyan-950/80 to-[#0e1a2b] border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,242,254,0.3)] scale-102'
                      : 'bg-[#0d1624] hover:bg-[#132034] border-[#18273c] text-slate-300'
                  )}
                >
                  <span className={cn('text-xs font-black tracking-wide', isSelected ? 'text-cyan-400' : 'text-slate-200')}>
                    {day.dayName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {day.dateFormatted}
                  </span>
                  {day.isToday && (
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedDayOffset !== 0 && (
            <button
              onClick={() => setSelectedDayOffset(0)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs font-bold hover:bg-cyan-900/60 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              Về Hôm Nay
            </button>
          )}
        </div>

        {/* Category Filters & Quick Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  selectedCategory === cat.id
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                    : 'bg-[#0d1624] hover:bg-[#132034] text-slate-300 border border-[#1b2b42]'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm chương trình, trận đấu..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0c1421] border border-[#1b2b42] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

      </div>

      {/* ── 2. VIEW MODE 1: CONTINUOUS 24-HOUR TIMELINE GRID ────────── */}
      {viewMode === 'timeline' && (
        <div className="p-4 md:p-6 rounded-3xl bg-[#090f1a] border border-[#16253c] shadow-2xl space-y-4 overflow-hidden">
          
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#142236] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-bold text-white">Trực Quan Thời Lượng Thực:</span>
              <span>Độ rộng thẻ tự động co giãn theo số phút thực tế (15p, 30p, 45p, 90p, 150p...)</span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Đang Chiếu</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Xem Lại (Catch-Up)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> Sắp Chiếu</span>
            </div>
          </div>

          {/* Timeline Scrollable Grid Container */}
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-cyan-500/20 pb-4">
            <div className="min-w-[1400px] space-y-3">
              {isEpgFetching && filteredChannels.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-mono shadow-md animate-pulse mb-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Đang đồng bộ dữ liệu lịch phát sóng ngày {SEVEN_DAYS.find(d => d.offset === selectedDayOffset)?.dayName ?? ''}...</span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">REALTIME EPG SYNC</span>
                </div>
              )}

              {isEpgLoading && filteredChannels.length === 0 ? (
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-xs font-mono">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Đang nạp dữ liệu lịch phát sóng 24H chuẩn thực tế...</span>
                  </div>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-stretch gap-3">
                      <div className="w-44 md:w-52 h-24 rounded-2xl bg-[#0b1320] border border-[#18283e] animate-pulse flex items-center p-3 gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800/80 animate-pulse flex-shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3 w-24 bg-slate-800 rounded animate-pulse" />
                          <div className="h-2 w-16 bg-slate-800/60 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-2 overflow-hidden py-1">
                        <div className="w-36 h-24 rounded-2xl bg-[#0a111c] border border-[#142135] animate-pulse flex-shrink-0" />
                        <div className="w-56 h-24 rounded-2xl bg-[#0a111c] border border-[#142135] animate-pulse flex-shrink-0" />
                        <div className="w-48 h-24 rounded-2xl bg-[#0a111c] border border-[#142135] animate-pulse flex-shrink-0" />
                        <div className="w-64 h-24 rounded-2xl bg-[#0a111c] border border-[#142135] animate-pulse flex-shrink-0" />
                        <div className="w-44 h-24 rounded-2xl bg-[#0a111c] border border-[#142135] animate-pulse flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-400 mx-auto flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Không có chương trình nào</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Chưa có lịch phát sóng cho ngày hoặc bộ lọc đã chọn từ máy chủ. Vui lòng chọn ngày khác.
                  </p>
                </div>
              ) : (
                <>
                  {/* 24-Hour Timeline Ruler Header Bar (00:00 -> 24:00) */}
                  <div className="flex items-center gap-3 pb-2 border-b border-[#142236]/80 text-[11px] font-mono text-slate-400">
                    <div className="flex-shrink-0 w-44 md:w-52 px-3 text-cyan-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      LỊCH 0:00 - 24:00
                    </div>
                    <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                      {Array.from({ length: 25 }).map((_, h) => (
                        <div
                          key={h}
                          className="flex-shrink-0 text-center py-1 px-2.5 rounded-lg bg-[#0b1320] border border-[#16253c] text-cyan-300 font-mono text-[10px] font-bold shadow-sm"
                          style={{ minWidth: '78px' }}
                        >
                          {String(h).padStart(2, '0')}:00
                        </div>
                      ))}
                    </div>
                  </div>

                  {filteredChannels.map((ch) => (
                <div key={ch.id} className="flex items-stretch gap-3 group/row">
                  
                  {/* Channel Header (Sticky Left) */}
                  <Link
                    href={`/channels/${ch.slug}`}
                    className="flex-shrink-0 w-44 md:w-52 p-3 rounded-2xl bg-[#0b1320] border border-[#18283e] hover:border-cyan-400/60 flex items-center gap-3 transition-colors shadow-lg"
                  >
                    <ChannelLogo slug={ch.slug} name={ch.name} size="md" />
                    <div className="overflow-hidden">
                      <div className="text-xs font-black text-white truncate group-hover/row:text-cyan-300">
                        {ch.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {ch.chNumber} • {ch.categoryLabel}
                      </div>
                    </div>
                  </Link>

                  {/* Flexible Programs Flow with Natural Durations */}
                  <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                    {ch.programs.map((prog) => {
                      const status = getProgramStatus(prog);
                      const isLive = status === 'live';
                      const isCatchUp = status === 'catchup';

                      // Width proportional to realistic duration: min 140px, max 380px
                      const cardWidth = Math.max(140, Math.min(380, prog.durationMinutes * 2.2));

                      return (
                        <div
                          key={prog.id}
                          style={{ width: `${cardWidth}px` }}
                          onClick={() => setSelectedProgram({ ...prog, channelSlug: ch.slug, channelName: ch.name })}
                          className={cn(
                            'flex-shrink-0 h-24 p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group/prog overflow-hidden',
                            isLive
                              ? 'bg-gradient-to-r from-red-950/60 to-[#120a14] border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)] ring-1 ring-red-500/50'
                              : isCatchUp
                              ? 'bg-[#0d1624] hover:bg-[#132034] border-[#18273c] hover:border-cyan-400/60'
                              : 'bg-[#080d17] hover:bg-[#0e1624] border-[#142032] opacity-85 hover:opacity-100'
                          )}
                        >
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-1 z-10">
                            <span className="text-[10px] font-mono font-bold text-slate-300">
                              {prog.startTime} - {prog.endTime}
                            </span>
                            {isLive ? (
                              <span className="flex items-center gap-1 text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-red-600 text-white animate-pulse">
                                LIVE
                              </span>
                            ) : prog.badge ? (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                                {prog.badge}
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-slate-500">
                                {prog.durationMinutes}p
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <div className="z-10">
                            <h4 className="text-xs font-bold text-white line-clamp-1 group-hover/prog:text-cyan-300 transition-colors">
                              {prog.title}
                            </h4>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {prog.category} {prog.quality ? `• ${prog.quality}` : ''}
                            </div>
                          </div>

                          {/* Hover Play / Catchup Icon */}
                          <div className="absolute right-2 bottom-2 z-10 opacity-0 group-hover/prog:opacity-100 transition-opacity">
                            {isLive || isCatchUp ? (
                              <div className="w-6 h-6 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-[0_0_8px_#00f2fe]">
                                <Play className="w-3 h-3 fill-current ml-0.5" />
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetReminder(prog);
                                }}
                                className="w-6 h-6 rounded-full bg-[#18283e] hover:bg-cyan-500 hover:text-black text-slate-300 flex items-center justify-center transition-colors"
                                title="Đặt lịch nhắc nhở"
                              >
                                <Bell className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              ))}
            </>
          )}

            </div>
          </div>

        </div>
      )}

      {/* ── 3. VIEW MODE 2: DETAILED CHANNEL LINEAR SCHEDULE (THEO KHUNG GIỜ) */}
      {viewMode === 'schedule_list' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Channel Selector Sidebar (3 cols) */}
          <aside className="lg:col-span-3 space-y-3">
            <div className="p-4 rounded-3xl bg-[#090f1a] border border-[#16253c] shadow-xl space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-2">
                <Tv className="w-4 h-4" />
                CHỌN KÊNH TRUYỀN HÌNH
              </h3>
              
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 pr-1">
                {filteredChannels.map((ch) => {
                  const isCurrent = activeChannel ? ch.id === activeChannel.id : false;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannelId(ch.id)}
                      className={cn(
                        'w-full p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer group',
                        isCurrent
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.25)]'
                          : 'bg-[#0d1624] hover:bg-[#132034] border-[#18273c]'
                      )}
                    >
                      <ChannelLogo slug={ch.slug} name={ch.name} size="sm" />
                      <div className="overflow-hidden flex-1">
                        <div className="text-xs font-black text-white group-hover:text-cyan-300 truncate">
                          {ch.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {ch.programs.length} chương trình hôm nay
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Chronological Daily Timeline Program Cards (9 cols) */}
          <main className="lg:col-span-9 space-y-4">
            {activeChannel ? (
              <>
                {/* Active Channel Header Card */}
            <div className="p-5 rounded-3xl bg-[#090f1a] border border-[#16253c] shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <ChannelLogo slug={activeChannel.slug} name={activeChannel.name} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">{activeChannel.name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800">
                      {activeChannel.chNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Thể loại: {activeChannel.categoryLabel} • Hỗ trợ độ phân giải 4K HDR & âm thanh Dolby Atmos
                  </p>
                </div>
              </div>

              <Link
                href={`/channels/${activeChannel.slug}`}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,242,254,0.3)] transition-transform hover:scale-105"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Xem Kênh Trực Tiếp
              </Link>
            </div>

            {/* Program Timeline Items */}
            <div className="space-y-3">
              {activeChannel.programs.map((prog) => {
                const status = getProgramStatus(prog);
                const isLive = status === 'live';
                const isCatchUp = status === 'catchup';

                return (
                  <div
                    key={prog.id}
                    onClick={() => setSelectedProgram({ ...prog, channelSlug: activeChannel.slug, channelName: activeChannel.name })}
                    className={cn(
                      'p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group',
                      isLive
                        ? 'bg-gradient-to-r from-red-950/60 via-[#101927] to-[#0a101b] border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)] ring-1 ring-red-500/50'
                        : 'bg-[#0a111d] hover:bg-[#111c2e] border-[#16253c] hover:border-cyan-500/40'
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-4 flex-1">
                      
                      {/* Time Block */}
                      <div className="w-24 text-left sm:text-center flex-shrink-0">
                        <div className={cn('text-sm font-black font-mono', isLive ? 'text-red-400' : 'text-cyan-400')}>
                          {prog.startTime}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {prog.endTime} ({prog.durationMinutes}p)
                        </div>
                      </div>

                      {/* Thumbnail */}
                      <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-black flex-shrink-0 hidden sm:block">
                        <Image
                          src={prog.thumbnailUrl}
                          alt={prog.title}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isLive && (
                            <span className="flex items-center gap-1 px-2 py-0.2 rounded text-[9px] font-black uppercase bg-red-600 text-white animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" /> ĐANG PHÁT
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-cyan-300 uppercase">
                            {prog.category}
                          </span>
                          {prog.quality && (
                            <span className="text-[9px] font-mono text-slate-400 bg-black/50 px-1.5 py-0.2 rounded">
                              {prog.quality}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                          {prog.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {prog.description}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                      {isLive ? (
                        <Link
                          href={`/channels/${activeChannel.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.5)] transition-transform hover:scale-105"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Xem Ngay
                        </Link>
                      ) : isCatchUp ? (
                        <Link
                          href={prog.sourceRecordingId ? `/programs/recording/${prog.sourceRecordingId}` : `/channels/${activeChannel.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 py-2 rounded-xl bg-[#121f33] hover:bg-cyan-500 hover:text-black border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Xem Lại
                        </Link>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetReminder(prog);
                          }}
                          className="px-3 py-2 rounded-xl bg-[#101b2a] hover:bg-[#18283e] border border-[#1a2d44] text-slate-300 hover:text-cyan-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          Nhắc Nhở
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
                </div>
              </>
            ) : (
              <div className="p-12 rounded-3xl bg-[#090f1a] border border-[#16253c] text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                <p className="text-xs text-slate-400">Đang tải thông tin kênh từ máy chủ...</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ── 4. PROGRAM DETAIL CYBER DRAWER / MODAL ───────────────────── */}
      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl bg-[#09111e] border border-[#1b2f4a] p-6 shadow-2xl relative space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#162338]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400 font-mono">
                  THÔNG TIN CHƯƠNG TRÌNH PHÁT SÓNG
                </span>
              </div>
              <button
                onClick={() => setSelectedProgram(null)}
                className="p-1.5 rounded-lg bg-[#101b2a] hover:bg-[#18283e] text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Poster / Backdrop */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black">
              <Image
                src={selectedProgram.thumbnailUrl}
                alt={selectedProgram.title}
                fill
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-cyan-300 bg-black/70 px-2.5 py-1 rounded-md border border-cyan-500/40">
                  {selectedProgram.category}
                </span>
                <span className="text-xs font-mono font-bold text-white bg-black/70 px-2.5 py-1 rounded-md">
                  {selectedProgram.startTime} - {selectedProgram.endTime} ({selectedProgram.durationMinutes} phút)
                </span>
              </div>
            </div>

            {/* Details Content */}
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">
                {selectedProgram.title}
              </h3>
              {selectedProgram.subtitle && (
                <p className="text-xs font-semibold text-cyan-400">
                  {selectedProgram.subtitle}
                </p>
              )}
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedProgram.description}
              </p>
            </div>

            {/* Audio / Quality Features */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#142135]">
              {selectedProgram.quality && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#121f33] text-cyan-300 border border-cyan-800">
                  {selectedProgram.quality}
                </span>
              )}
              {selectedProgram.audio && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#121f33] text-amber-400 border border-amber-800">
                  {selectedProgram.audio}
                </span>
              )}
              {selectedProgram.features?.map((f, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/60 text-slate-400 border border-slate-700">
                  {f}
                </span>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                href={`/channels/${selectedProgram.channelSlug || activeChannel.slug}`}
                onClick={() => setSelectedProgram(null)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.4)]"
              >
                <Play className="w-4 h-4 fill-current" />
                Mở Luồng Kênh Trực Tiếp
              </Link>
              {selectedProgram.sourceRecordingId ? (
                <Link
                  href={`/programs/recording/${selectedProgram.sourceRecordingId}`}
                  onClick={() => setSelectedProgram(null)}
                  className="px-4 py-3 rounded-xl bg-[#121f33] hover:bg-[#1a2b45] text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Xem Bản Ghi VOD
                </Link>
              ) : (
                <button
                  onClick={() => {
                    handleSetReminder(selectedProgram);
                    setSelectedProgram(null);
                  }}
                  className="px-4 py-3 rounded-xl bg-[#121f33] hover:bg-[#1a2b45] text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Đặt Nhắc Nhở
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── 5. CYBER TOAST NOTIFICATION ─────────────────────────────── */}
      {reminderToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#09121f] border border-cyan-400 text-cyan-200 text-xs font-bold shadow-[0_0_25px_rgba(0,242,254,0.4)] flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{reminderToast}</span>
        </div>
      )}

    </div>
  );
}
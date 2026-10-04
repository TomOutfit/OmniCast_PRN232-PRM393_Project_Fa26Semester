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
  mapApiEpgToRealChannels,
} from './epg-channels-data';
export type { RealEpgProgram, RealEpgChannel };

// ── VTVGo Synchronized Timeline Geometry ──
const TOTAL_HOURS = 24;
const HOUR_WIDTH = 240; // 240px per hour => 4px per minute (roomy enough for 15-min cards with title & time)
const MINUTE_WIDTH = HOUR_WIDTH / 60; // 4px / minute
const TOTAL_WIDTH = TOTAL_HOURS * HOUR_WIDTH; // 5760px

export function EPGGrid() {
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'timeline' | 'schedule_list'>('timeline');
  const [selectedProgram, setSelectedProgram] = useState<RealEpgProgram | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll timeline to current time on mount / offset 0
  useEffect(() => {
    if (selectedDayOffset === 0 && timelineScrollRef.current) {
      const scrollPos = Math.max(0, currentTimeMinutes * MINUTE_WIDTH - 240);
      timelineScrollRef.current.scrollLeft = scrollPos;
    }
  }, [selectedDayOffset, currentTimeMinutes]);

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

  // Use API data only - no hardcoded fallback
  const allChannels = useMemo<RealEpgChannel[]>(() => {
    if (epgResponse?.channels && epgResponse.channels.length > 0) {
      return mapApiEpgToRealChannels(epgResponse, rawChannels);
    }
    return [];
  }, [epgResponse, rawChannels]);

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

      {/* ── 2. VIEW MODE 1: CONTINUOUS 24-HOUR TIMELINE GRID (VTVGo Style) ────────── */}
      {viewMode === 'timeline' && (
        <div className="rounded-3xl bg-[#090f1a] border border-[#16253c] shadow-2xl overflow-hidden">
          
          {/* Subheader bar with legend & live clock */}
          <div className="px-4 py-3 bg-[#070b13] border-b border-[#142236] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
              <span className="font-black text-white text-xs">Lưới Phát Sóng Chuẩn VTVGo:</span>
              <span className="text-slate-400 hidden sm:inline">Khung giờ bắt đầu tự nhiên (:00, :15, :30, :45), độ dài linh hoạt 15p - 120p, thước thời gian cuộn đồng bộ.</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Đang Phát</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Đã Chiếu (Catch-Up)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> Sắp Chiếu</span>
            </div>
          </div>

          {/* THE SINGLE SYNCHRONIZED SCROLL CONTAINER */}
          <div
            ref={timelineScrollRef}
            className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-[#080d16]"
          >
            <div style={{ width: `${TOTAL_WIDTH + 208}px` }} className="relative select-none min-h-[400px]">
              
              {/* Red vertical "LIVE NOW" line tracking real time */}
              {selectedDayOffset === 0 && (
                <div
                  style={{ left: `${208 + currentTimeMinutes * MINUTE_WIDTH}px` }}
                  className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none shadow-[0_0_10px_#ef4444]"
                >
                  <div className="sticky top-0 -ml-1.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-[0_0_8px_#ef4444] animate-pulse" />
                </div>
              )}

              {/* ── HEADER ROW: STICKY CHANNEL LABEL + TIME RULER ── */}
              <div className="flex items-stretch sticky top-0 z-30 bg-[#090f1a] border-b border-[#18283e] h-12 shadow-md">
                {/* Sticky Left Header */}
                <div className="sticky left-0 z-40 w-44 md:w-52 flex-shrink-0 bg-[#090f1a] border-r border-[#18283e] flex items-center justify-between px-3 text-cyan-400 font-mono text-[11px] font-bold shadow-md">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>LỊCH 0:00 - 24:00</span>
                  </div>
                </div>

                {/* Time Ruler with Hour & Half-Hour Marks (VTVGo Style) */}
                <div className="relative flex-1 h-full bg-[#070c16]">
                  {Array.from({ length: TOTAL_HOURS }).map((_, h) => {
                    const hourLeft = h * HOUR_WIDTH;
                    return (
                      <React.Fragment key={h}>
                        {/* Hour mark */}
                        <div
                          style={{ left: `${hourLeft}px` }}
                          className="absolute top-0 bottom-0 flex flex-col justify-between border-l border-slate-700/70 pl-2 pt-1 text-[11px] font-mono font-bold text-slate-200"
                        >
                          <span>{String(h).padStart(2, '0')}:00</span>
                          <div className="flex items-end gap-[13px] pb-1 opacity-50">
                            <span className="w-px h-2 bg-slate-500" />
                            <span className="w-px h-1 bg-slate-600" />
                            <span className="w-px h-1.5 bg-slate-500" />
                            <span className="w-px h-1 bg-slate-600" />
                          </div>
                        </div>

                        {/* Half-hour mark (:30) */}
                        <div
                          style={{ left: `${hourLeft + HOUR_WIDTH / 2}px` }}
                          className="absolute top-0 bottom-0 border-l border-dashed border-slate-700/40 pl-1.5 pt-1.5 text-[9px] font-mono text-slate-400"
                        >
                          <span>{String(h).padStart(2, '0')}:30</span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* ── CHANNEL ROWS ── */}
              {isEpgLoading && filteredChannels.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                  <p className="text-xs text-slate-400">Đang nạp dữ liệu lịch phát sóng 24H...</p>
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Không tìm thấy kênh hoặc chương trình phù hợp với bộ lọc đã chọn.
                </div>
              ) : (
                <div className="divide-y divide-[#142032]">
                  {filteredChannels.map((ch) => (
                    <div key={ch.id} className="flex items-stretch h-24 hover:bg-slate-900/30 transition-colors group/row">
                      
                      {/* Sticky Left: Channel Logo, Name & Badge */}
                      <Link
                        href={`/channels/${ch.slug}`}
                        className="sticky left-0 z-30 w-44 md:w-52 flex-shrink-0 bg-[#090f1a] border-r border-[#18283e] p-3 flex items-center gap-3 hover:bg-[#0d1624] transition-colors shadow-md group-hover/row:border-cyan-500/40"
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

                      {/* Relative Timeline Track */}
                      <div className="relative flex-1 h-full bg-[#080d16]/50">
                        {/* Hour background grid lines */}
                        {Array.from({ length: TOTAL_HOURS }).map((_, h) => (
                          <div
                            key={h}
                            style={{ left: `${h * HOUR_WIDTH}px` }}
                            className="absolute top-0 bottom-0 border-l border-[#131f32]/60 pointer-events-none"
                          />
                        ))}

                        {/* Program Cards positioned accurately by startMinutes and durationMinutes */}
                        {ch.programs.map((prog) => {
                          const status = getProgramStatus(prog);
                          const isLive = status === 'live';
                          const isCatchUp = status === 'catchup';

                          const leftPx = prog.startMinutes * MINUTE_WIDTH;
                          const widthPx = Math.max(50, prog.durationMinutes * MINUTE_WIDTH - 2);

                          return (
                            <div
                              key={prog.id}
                              style={{
                                left: `${leftPx}px`,
                                width: `${widthPx}px`,
                              }}
                              onClick={() => setSelectedProgram({ ...prog, channelSlug: ch.slug, channelName: ch.name })}
                              className={cn(
                                'absolute top-1.5 bottom-1.5 rounded-xl border p-2 flex flex-col justify-between cursor-pointer transition-all duration-150 overflow-hidden group/card shadow-sm',
                                isLive
                                  ? 'bg-gradient-to-r from-red-950/80 to-[#1c0d1b] border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.25)] ring-1 ring-red-500/60 z-10'
                                  : isCatchUp
                                  ? 'bg-[#0d1624]/90 hover:bg-[#132034] border-[#18273c] hover:border-cyan-400/60'
                                  : 'bg-[#090f1b]/85 hover:bg-[#0e1728] border-[#142032] hover:border-slate-500'
                              )}
                            >
                              {/* Top line: Time + Category */}
                              <div className="flex items-center justify-between gap-1 text-[9px] font-mono text-slate-400 z-10">
                                <span className="font-bold text-slate-300">
                                  {prog.startTime}
                                </span>
                                {isLive ? (
                                  <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-red-600 text-white animate-pulse">
                                    LIVE
                                  </span>
                                ) : (
                                  <span className="truncate max-w-[75px] text-slate-400">
                                    {prog.category}
                                  </span>
                                )}
                              </div>

                              {/* Title */}
                              <div className="my-auto z-10">
                                <h4 className={cn(
                                  'text-[11px] font-bold leading-snug line-clamp-2 transition-colors',
                                  isLive ? 'text-red-100 group-hover/card:text-white' : 'text-white group-hover/card:text-cyan-300'
                                )}>
                                  {prog.title}
                                </h4>
                              </div>

                              {/* Bottom line: End time + Duration Badge */}
                              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 z-10">
                                <span>{prog.endTime}</span>
                                <span className={cn(
                                  'text-[8px] font-bold px-1 rounded',
                                  prog.durationMinutes <= 30
                                    ? 'bg-amber-950/60 text-amber-300'
                                    : prog.durationMinutes <= 60
                                    ? 'bg-cyan-950/60 text-cyan-300'
                                    : 'bg-indigo-950/60 text-indigo-300'
                                )}>
                                  {prog.durationMinutes}p
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  ))}
                </div>
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
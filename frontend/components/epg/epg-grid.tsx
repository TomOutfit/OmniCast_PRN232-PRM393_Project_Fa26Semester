'use client';

import { useState, useMemo, useCallback, useEffect, useRef, type MouseEvent } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Tv,
  Calendar,
  ZoomIn,
  ZoomOut,
  Loader2,
  Search,
  Repeat,
  Sparkles,
  X,
  Radio,
  Play,
} from 'lucide-react';
import {
  format,
  startOfDay,
  addDays,
  isSameDay,
  parseISO,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { cn } from '@/lib/utils';
import { useChannels } from '@/lib/hooks/useChannels';
import { useEpgDay } from '@/lib/hooks/usePrograms';
import type { Channel } from '@/types';

interface EPGProgram {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  startTime: string;
  endTime: string;
  channelId: string;
  channelName: string;
  channelSlug: string;
  channelLogo?: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  category?: string;
  isFiller: boolean;
  fillerKind: 'recording-replay' | 'channel-branding' | null;
  sourceRecordingId: string | null;
  durationMinutes: number;
}

interface EPGChannel {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  category: string;
}

interface EPGGridProps {
  onProgramClick?: (program: EPGProgram) => void;
}

/* ── Layout tokens — modern dark, hero-first hierarchy ────────────────── */
const CHANNEL_COL_WIDTH = 144;
const ROW_HEIGHT = 60;
const TIMELINE_HEADER_HEIGHT = 32;
const CHANNELS_PER_PAGE = 8;

/*  Modern streaming palette — deep navy with vivid LIVE accent            */
const BG = '#0a0e1a';
const SURFACE = '#141826';
const SURFACE_RAISED = '#1a1f30';
const BORDER = 'rgba(255,255,255,0.08)';
const BORDER_STRONG = 'rgba(255,255,255,0.14)';
const TEXT = '#f1f5f9';
const TEXT_DIM = '#94a3b8';
const TEXT_FAINT = '#64748b';
const LIVE = '#ef4444';
const LIVE_GLOW = 'rgba(239,68,68,0.35)';
const ACCENT = '#3b82f6';

const HOUR_PRESETS = [
  { label: 'Sáng', hour: 6 },
  { label: 'Trưa', hour: 12 },
  { label: 'Chiều', hour: 15 },
  { label: 'Tối', hour: 18 },
  { label: 'Đêm', hour: 22 },
] as const;

export function EPGGrid({ onProgramClick }: EPGGridProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(),
  );
  const [hideFiller, setHideFiller] = useState(false);
  const [channelPageIdx, setChannelPageIdx] = useState(0);
  const [now, setNow] = useState<Date>(() => new Date());
  const timelineRef = useRef<HTMLDivElement>(null);

  /* ── Channels ─────────────────────────────────────────────────────────── */
  const { data: channelsData, isLoading: loadingChannels } = useChannels({
    isActive: true,
    limit: 50,
  });

  const channelsAll: EPGChannel[] = useMemo(() => {
    const list = Array.isArray(channelsData)
      ? channelsData
      : channelsData?.data ?? [];
    return list.map((c: Channel) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      logoUrl: c.logoUrl,
      category: c.category,
    }));
  }, [channelsData]);

  const channels = useMemo(() => {
    if (activeCategories.size === 0) return channelsAll;
    return channelsAll.filter((c) => activeCategories.has(c.category));
  }, [channelsAll, activeCategories]);

  const allCategories = useMemo(
    () => Array.from(new Set(channelsAll.map((c) => c.category))).sort(),
    [channelsAll],
  );

  const channelIds = useMemo(() => channels.map((c) => c.id), [channels]);

  /* ── Pagination of channels ───────────────────────────────────────────── */
  const channelPageCount = Math.max(
    1,
    Math.ceil(channels.length / CHANNELS_PER_PAGE),
  );
  const safePageIdx = Math.min(channelPageIdx, channelPageCount - 1);
  const visibleChannels = useMemo(
    () =>
      channels.slice(
        safePageIdx * CHANNELS_PER_PAGE,
        (safePageIdx + 1) * CHANNELS_PER_PAGE,
      ),
    [channels, safePageIdx],
  );

  useEffect(() => {
    setChannelPageIdx(0);
  }, [activeCategories, searchQuery, selectedDate]);

  /* ── EPG data ─────────────────────────────────────────────────────────── */
  const { data: epgResponse, isLoading: loadingSchedule } = useEpgDay(
    selectedDate,
    channelIds,
  );

  /* ── Live clock ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  /* ── Keyboard navigation ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!timelineRef.current) return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const hourWidth = 100 * zoom;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        timelineRef.current?.scrollBy({ left: -hourWidth, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        timelineRef.current?.scrollBy({ left: hourWidth, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoom]);

  /* ── Flatten programs ─────────────────────────────────────────────────── */
  const programs: EPGProgram[] = useMemo(() => {
    if (!epgResponse) return [];
    const channelMap = new Map(channels.map((c) => [c.id, c]));
    const startOfDaySelected = startOfDay(selectedDate);
    const endOfDaySelected = addDays(startOfDaySelected, 1);
    const out: EPGProgram[] = [];
    for (const ch of epgResponse.channels) {
      const meta = channelMap.get(ch.channelId);
      const channelName = meta?.name ?? ch.channelName;
      const channelSlug = meta?.slug ?? ch.channelId;
      const channelLogo = meta?.logoUrl ?? ch.channelLogoUrl ?? undefined;
      const category = meta?.category ?? ch.channelCategory;
      for (const p of ch.programs) {
        const start = parseISO(p.startTime);
        if (start < startOfDaySelected || start >= endOfDaySelected) continue;
        out.push({
          id: p.id,
          title: p.title,
          startTime: start.toISOString(),
          endTime: parseISO(p.endTime).toISOString(),
          channelId: ch.channelId,
          channelName,
          channelSlug,
          channelLogo,
          status:
            p.status === 'LIVE'
              ? 'LIVE'
              : p.status === 'ENDED' || p.status === 'CANCELLED'
                ? 'ENDED'
                : 'SCHEDULED',
          category: p.tags?.[0] ?? category,
          isFiller: p.isFiller,
          fillerKind: p.fillerKind,
          sourceRecordingId: p.sourceRecordingId,
          durationMinutes: p.durationMinutes,
        });
      }
    }
    return out;
  }, [epgResponse, channels, selectedDate]);

  /* ── Apply filters ────────────────────────────────────────────────────── */
  const filteredPrograms = useMemo(() => {
    let rows = programs;
    if (hideFiller) rows = rows.filter((p) => !p.isFiller);
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.trim().toLowerCase();
    return rows.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.channelName.toLowerCase().includes(q),
    );
  }, [programs, searchQuery, hideFiller]);

  /* ── Timeline always renders full 24 hours (00:00 – 24:00) ────────────── */
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  /* ── Auto-scroll to current time on mount / date change ───────────────── */
  useEffect(() => {
    if (!timelineRef.current || !isSameDay(selectedDate, now)) return;
    const hourWidth = 100 * zoom;
    const left = ((now.getHours() * 60 + now.getMinutes()) / 60) * hourWidth;
    const visibleStart = timelineRef.current.scrollLeft;
    const visibleEnd = visibleStart + timelineRef.current.clientWidth;
    if (left < visibleStart || left > visibleEnd - 200) {
      timelineRef.current.scrollTo({
        left: Math.max(0, left - 300),
        behavior: 'smooth',
      });
    }
  }, [selectedDate, zoom, loadingSchedule, now]);

  const getProgramStyle = useCallback(
    (program: EPGProgram) => {
      const start = parseISO(program.startTime);
      const end = parseISO(program.endTime);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();
      const durationMinutes = Math.max(endMinutes - startMinutes, 15);
      const hourWidth = 100 * zoom;
      const left = (startMinutes / 60) * hourWidth;
      const width = (durationMinutes / 60) * hourWidth;
      return { left: `${left}px`, width: `${Math.max(width, 32)}px` };
    },
    [zoom],
  );

  const goToPreviousDay = () => setSelectedDate(addDays(selectedDate, -1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => {
    setSelectedDate(new Date());
    setNow(new Date());
  };

  const isToday = isSameDay(selectedDate, now);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isLoading = loadingChannels || loadingSchedule;

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveCategories(new Set());
    setHideFiller(false);
  };

  const scrollToHour = (hour: number) => {
    if (!timelineRef.current) return;
    const hourWidth = 100 * zoom;
    timelineRef.current.scrollTo({
      left: hour * hourWidth,
      behavior: 'smooth',
    });
  };

  const hourWidth = 100 * zoom;
  const timelineTotalWidth = hourWidth * 24;

  /*  Hero data — currently-live programs (already filtered)                */
  const livePrograms = useMemo(
    () => filteredPrograms.filter((p) => p.status === 'LIVE'),
    [filteredPrograms],
  );

  /*  Up-next — first non-filler scheduled program per channel after now  */
  const nextProgramsByChannel = useMemo(() => {
    const map = new Map<string, EPGProgram>();
    const nowMs = now.getTime();
    const sorted = [...filteredPrograms]
      .filter((p) => !p.isFiller && parseISO(p.startTime).getTime() >= nowMs)
      .sort(
        (a, b) =>
          parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime(),
      );
    for (const p of sorted) {
      if (!map.has(p.channelId)) map.set(p.channelId, p);
    }
    return map;
  }, [filteredPrograms, now]);

  /*  Toggle: hero view vs full schedule                                   */
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  const filtersActive =
    activeCategories.size > 0 || searchQuery.trim() !== '' || hideFiller;
  const showPagination = channelPageCount > 1;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: BG, color: TEXT }}
    >
      {/* ═════════════════════════════════════════════════════════════
          MASTHEAD — magazine title block with red rule
      ═════════════════════════════════════════════════════════════ */}

      {/* ═════════════════════════════════════════════════════════════
          PAGE HEADER — compact title · view toggle · date nav
      ═════════════════════════════════════════════════════════════ */}
      <div
        className="px-5 py-4 flex-shrink-0 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-1 h-7 rounded-sm flex-shrink-0"
            style={{ background: `linear-gradient(180deg, ${LIVE}, ${ACCENT})` }}
          />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight truncate">
              Đang phát &amp; Sắp chiếu
            </h1>
            <p
              className="text-xs mt-0.5"
              style={{ color: TEXT_DIM }}
            >
              {format(selectedDate, "EEEE, d 'tháng' M, yyyy", { locale: vi })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <button
              onClick={() => setShowFullSchedule(false)}
              className="px-3 h-8 text-xs font-medium transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: !showFullSchedule
                  ? SURFACE_RAISED
                  : 'transparent',
                color: !showFullSchedule ? TEXT : TEXT_DIM,
              }}
              aria-pressed={!showFullSchedule}
            >
              <Radio className="w-3.5 h-3.5" />
              Live &amp; Up Next
            </button>
            <button
              onClick={() => setShowFullSchedule(true)}
              className="px-3 h-8 text-xs font-medium transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: showFullSchedule
                  ? SURFACE_RAISED
                  : 'transparent',
                color: showFullSchedule ? TEXT : TEXT_DIM,
                borderLeft: `1px solid ${BORDER}`,
              }}
              aria-pressed={showFullSchedule}
            >
              <Calendar className="w-3.5 h-3.5" />
              Lịch cả ngày
            </button>
          </div>

          {/* Date nav */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <button
              onClick={goToPreviousDay}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/5 transition-colors"
              style={{ color: TEXT_DIM }}
              aria-label="Ngày trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="h-8 px-3 text-xs font-medium flex items-center gap-1.5"
              style={{
                borderLeft: `1px solid ${BORDER}`,
                borderRight: `1px solid ${BORDER}`,
                color: isToday ? LIVE : TEXT,
              }}
            >
              {format(selectedDate, 'EEE dd/MM', { locale: vi })}
            </button>
            <button
              onClick={goToNextDay}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/5 transition-colors"
              style={{ color: TEXT_DIM }}
              aria-label="Ngày sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          FILTER BAR
      ═════════════════════════════════════════════════════════════ */}
      <div
        className="px-5 py-3 flex-shrink-0 flex items-center gap-2 flex-wrap"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        {/* Search */}
        <div className="relative">
          <Search
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: TEXT_FAINT }}
          />
          <input
            type="text"
            placeholder="Tìm chương trình…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-56 text-sm rounded-lg focus:outline-none transition-colors"
            style={{
              backgroundColor: SURFACE,
              border: `1px solid ${BORDER}`,
              color: TEXT,
            }}
            aria-label="Tìm kiếm chương trình"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 hover:opacity-70"
              style={{ color: TEXT_FAINT }}
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Categories */}
        {allCategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {allCategories.map((cat) => {
              const active =
                activeCategories.size === 0 || activeCategories.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: active ? SURFACE_RAISED : SURFACE,
                    color: active ? TEXT : TEXT_DIM,
                    border: `1px solid ${active ? BORDER_STRONG : BORDER}`,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setHideFiller((v) => !v)}
          className="px-3 py-1.5 text-xs rounded-lg transition-colors"
          style={{
            backgroundColor: hideFiller ? SURFACE_RAISED : SURFACE,
            color: hideFiller ? TEXT : TEXT_DIM,
            border: `1px solid ${hideFiller ? BORDER_STRONG : BORDER}`,
          }}
        >
          {hideFiller ? 'Hiện filler' : 'Chỉ chương trình'}
        </button>

        {filtersActive && (
          <button
            onClick={clearFilters}
            className="text-xs underline ml-1"
            style={{ color: TEXT_DIM }}
          >
            Đặt lại
          </button>
        )}

        {/* Counters */}
        <div
          className="ml-auto flex items-center gap-3 text-xs"
          style={{ color: TEXT_DIM }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: LIVE,
                boxShadow: `0 0 6px ${LIVE_GLOW}`,
              }}
            />
            <span style={{ color: TEXT, fontWeight: 600 }}>
              {livePrograms.length}
            </span>{' '}
            đang phát
          </span>
          <span style={{ color: BORDER_STRONG }}>·</span>
          <span>
            <span style={{ color: TEXT, fontWeight: 600 }}>
              {nextProgramsByChannel.size}
            </span>{' '}
            sắp chiếu
          </span>
          <span style={{ color: BORDER_STRONG }}>·</span>
          <span>{channels.length} kênh</span>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          MAIN CONTENT
      ═════════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 overflow-y-auto min-h-0"
        style={{ backgroundColor: BG }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full py-20">
            <Loader2
              className="w-5 h-5 animate-spin"
              style={{ color: TEXT_DIM }}
            />
          </div>
        ) : channels.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-2"
            style={{ color: TEXT_DIM }}
          >
            <Tv className="w-7 h-7 opacity-50" />
            <p className="text-sm">Không có kênh nào khớp bộ lọc.</p>
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="mt-1 text-xs underline"
                style={{ color: TEXT }}
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : showFullSchedule ? (
          /* ────────────────────────────────────────────────────────
              FULL SCHEDULE — compact dark timeline grid
          ──────────────────────────────────────────────────────── */
          <FullScheduleGrid
            channels={visibleChannels}
            filteredPrograms={filteredPrograms}
            now={now}
            isToday={isToday}
            currentHour={currentHour}
            currentMinute={currentMinute}
            hourWidth={hourWidth}
            hours={hours}
            zoom={zoom}
            setZoom={setZoom}
            hourPresets={HOUR_PRESETS}
            scrollToHour={scrollToHour}
            safePageIdx={safePageIdx}
            channelPageCount={channelPageCount}
            setChannelPageIdx={setChannelPageIdx}
            showPagination={showPagination}
            getProgramStyle={getProgramStyle}
            onProgramClick={onProgramClick}
            timelineRef={timelineRef}
            timelineTotalWidth={timelineTotalWidth}
          />
        ) : (
          <div className="px-5 py-5 space-y-8">
            {/* ── HERO: LIVE NOW ───────────────────────────────────── */}
            <section>
              <div className="flex items-baseline justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: LIVE,
                      boxShadow: `0 0 10px ${LIVE_GLOW}`,
                    }}
                  />
                  <h2 className="text-sm font-semibold uppercase tracking-wider">
                    Đang phát ngay bây giờ
                  </h2>
                </div>
                <span
                  className="text-xs tabular-nums"
                  style={{ color: TEXT_FAINT }}
                >
                  {livePrograms.length} chương trình
                </span>
              </div>

              {livePrograms.length === 0 ? (
                <div
                  className="rounded-xl py-12 flex flex-col items-center gap-2"
                  style={{
                    backgroundColor: SURFACE,
                    border: `1px solid ${BORDER}`,
                    color: TEXT_DIM,
                  }}
                >
                  <Radio className="w-6 h-6 opacity-40" />
                  <p className="text-sm">
                    Hiện không có chương trình nào đang phát.
                  </p>
                  {filtersActive && (
                    <button
                      onClick={clearFilters}
                      className="text-xs underline mt-1"
                      style={{ color: TEXT }}
                    >
                      Đặt lại bộ lọc
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                  {livePrograms.map((p) => {
                    const start = parseISO(p.startTime);
                    const end = parseISO(p.endTime);
                    const total = end.getTime() - start.getTime();
                    const elapsed = now.getTime() - start.getTime();
                    const pct = Math.max(
                      0,
                      Math.min(100, (elapsed / total) * 100),
                    );
                    const remainingMin = Math.max(
                      0,
                      Math.round((total - elapsed) / 60000),
                    );
                    const h = Math.floor(remainingMin / 60);
                    const m = remainingMin % 60;
                    const remainingStr =
                      h > 0 ? `${h}h ${m}'` : `${m}'`;
                    return (
                      <Link
                        key={p.id}
                        href={`/programs/${p.id}`}
                        onClick={() => onProgramClick?.(p)}
                        className="group block rounded-xl overflow-hidden transition-all"
                        style={{
                          backgroundColor: SURFACE,
                          border: `1px solid ${BORDER}`,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = BORDER_STRONG;
                          e.currentTarget.style.transform =
                            'translateY(-2px)';
                          e.currentTarget.style.boxShadow = `0 12px 28px -12px ${LIVE_GLOW}`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = BORDER;
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Thumbnail */}
                        <div
                          className="relative aspect-video flex items-center justify-center"
                          style={{
                            background: p.thumbnailUrl
                              ? `url(${p.thumbnailUrl}) center/cover no-repeat`
                              : `linear-gradient(135deg, ${ACCENT} 0%, #8b5cf6 100%)`,
                          }}
                        >
                          {/* Dark overlay for thumbnail readability */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background:
                                'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
                            }}
                          />
                          {/* Top badges */}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                            <span
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: LIVE,
                                color: '#fff',
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-white"
                                style={{
                                  boxShadow: '0 0 4px #fff',
                                }}
                              />
                              Live
                            </span>
                            {p.category && (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-medium"
                                style={{
                                  backgroundColor: 'rgba(0,0,0,0.55)',
                                  color: '#fff',
                                  backdropFilter: 'blur(8px)',
                                }}
                              >
                                {p.category}
                              </span>
                            )}
                          </div>
                          {/* Channel overlay bottom-left */}
                          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 z-10">
                            <div
                              className="w-7 h-7 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
                              style={{
                                backgroundColor: 'rgba(0,0,0,0.55)',
                                backdropFilter: 'blur(8px)',
                              }}
                            >
                              <ChannelLogo
                                slug={p.channelSlug}
                                logoUrl={p.channelLogo}
                                name={p.channelName}
                                category={p.category}
                                size="sm"
                              />
                            </div>
                            <span
                              className="text-xs font-medium truncate"
                              style={{ color: '#fff' }}
                            >
                              {p.channelName}
                            </span>
                          </div>
                        </div>
                        {/* Body */}
                        <div className="p-3">
                          <h3
                            className="font-semibold leading-snug line-clamp-2 mb-3"
                            style={{ color: TEXT, fontSize: '15px' }}
                          >
                            {p.title}
                          </h3>
                          {/* Progress bar */}
                          <div
                            className="h-1 rounded-full overflow-hidden mb-2"
                            style={{ backgroundColor: SURFACE_RAISED }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: LIVE,
                                boxShadow: `0 0 8px ${LIVE_GLOW}`,
                              }}
                            />
                          </div>
                          <div
                            className="flex items-center justify-between text-xs tabular-nums"
                            style={{ color: TEXT_DIM }}
                          >
                            <span>
                              {format(start, 'HH:mm')} –{' '}
                              {format(end, 'HH:mm')}
                            </span>
                            <span
                              style={{ color: LIVE, fontWeight: 600 }}
                            >
                              Còn {remainingStr}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── UP NEXT ─────────────────────────────────────────── */}
            {(() => {
              const upNext = visibleChannels
                .map((ch) => ({
                  channel: ch,
                  program: nextProgramsByChannel.get(ch.id),
                }))
                .filter((x) => x.program);
              if (upNext.length === 0) return null;
              return (
                <section>
                  <div className="flex items-baseline justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Play
                        className="w-3.5 h-3.5"
                        style={{ color: ACCENT }}
                        fill="currentColor"
                      />
                      <h2 className="text-sm font-semibold uppercase tracking-wider">
                        Sắp chiếu
                      </h2>
                    </div>
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: TEXT_FAINT }}
                    >
                      {upNext.length} kênh
                    </span>
                  </div>
                  <div className="-mx-5 px-5 overflow-x-auto scrollbar-hide pb-2">
                    <div
                      className="flex gap-3"
                      style={{ width: 'max-content' }}
                    >
                      {upNext.map(({ channel, program }) => {
                        if (!program) return null;
                        const startDate = parseISO(program.startTime);
                        const minutesUntil = Math.max(
                          0,
                          Math.round(
                            (startDate.getTime() - now.getTime()) / 60000,
                          ),
                        );
                        return (
                          <Link
                            key={`${channel.id}-${program.id}`}
                            href={`/programs/${program.id}`}
                            onClick={() => onProgramClick?.(program)}
                            className="block rounded-lg p-3 transition-colors flex-shrink-0"
                            style={{
                              width: 280,
                              backgroundColor: SURFACE,
                              border: `1px solid ${BORDER}`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor =
                                BORDER_STRONG;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = BORDER;
                            }}
                          >
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-7 h-7 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
                                  style={{
                                    backgroundColor: SURFACE_RAISED,
                                  }}
                                >
                                  <ChannelLogo
                                    slug={channel.slug}
                                    logoUrl={channel.logoUrl}
                                    name={channel.name}
                                    category={channel.category}
                                    size="sm"
                                  />
                                </div>
                                <span
                                  className="text-xs font-medium truncate"
                                  style={{ color: TEXT_DIM }}
                                >
                                  {channel.name}
                                </span>
                              </div>
                              <span
                                className="text-xs tabular-nums flex-shrink-0"
                                style={{ color: ACCENT, fontWeight: 700 }}
                              >
                                {format(startDate, 'HH:mm')}
                              </span>
                            </div>
                            <h4
                              className="text-sm font-semibold leading-snug line-clamp-2 mb-2"
                              style={{ color: TEXT }}
                            >
                              {program.title}
                            </h4>
                            <p
                              className="text-xs flex items-center gap-1"
                              style={{ color: TEXT_FAINT }}
                            >
                              <span
                                className="inline-block w-1 h-1 rounded-full"
                                style={{ backgroundColor: ACCENT }}
                              />
                              {minutesUntil < 60
                                ? `${minutesUntil} phút nữa`
                                : `khoảng ${Math.round(minutesUntil / 60)} giờ nữa`}
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* ── OPEN FULL SCHEDULE ──────────────────────────────── */}
            <section>
              <button
                onClick={() => setShowFullSchedule(true)}
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  color: TEXT,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = SURFACE_RAISED;
                  e.currentTarget.style.borderColor = BORDER_STRONG;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = SURFACE;
                  e.currentTarget.style.borderColor = BORDER;
                }}
              >
                <Calendar className="w-4 h-4" />
                Xem lịch chiếu cả ngày
                <ChevronRight className="w-4 h-4" />
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
    FullScheduleGrid — compact dark timeline (collapsed secondary view)
───────────────────────────────────────────────────────────────────── */
interface FullScheduleGridProps {
  channels: EPGChannel[];
  filteredPrograms: EPGProgram[];
  now: Date;
  isToday: boolean;
  currentHour: number;
  currentMinute: number;
  hourWidth: number;
  hours: number[];
  zoom: number;
  setZoom: (z: number) => void;
  hourPresets: typeof HOUR_PRESETS;
  scrollToHour: (h: number) => void;
  safePageIdx: number;
  channelPageCount: number;
  setChannelPageIdx: (fn: (p: number) => number) => void;
  showPagination: boolean;
  getProgramStyle: (p: EPGProgram) => { left: string; width: string };
  onProgramClick?: (p: EPGProgram) => void;
  timelineRef: React.RefObject<HTMLDivElement>;
  timelineTotalWidth: number;
}

function FullScheduleGrid({
  channels,
  filteredPrograms,
  now,
  isToday,
  currentHour,
  currentMinute,
  hourWidth,
  hours,
  zoom,
  setZoom,
  hourPresets,
  scrollToHour,
  safePageIdx,
  channelPageCount,
  setChannelPageIdx,
  showPagination,
  getProgramStyle,
  onProgramClick,
  timelineRef,
  timelineTotalWidth,
}: FullScheduleGridProps) {
  return (
    <div className="flex h-full min-h-0">
      {/* Channel column */}
      <div
        className="flex-shrink-0 flex flex-col"
        style={{ width: CHANNEL_COL_WIDTH, borderRight: `1px solid ${BORDER}` }}
      >
        <div
          className="flex items-center justify-between px-3 flex-shrink-0"
          style={{
            height: TIMELINE_HEADER_HEIGHT,
            backgroundColor: SURFACE,
            borderBottom: `1px solid ${BORDER}`,
            color: TEXT_DIM,
          }}
        >
          <span
            className="uppercase tracking-wider"
            style={{ fontSize: '10px', fontWeight: 600 }}
          >
            Kênh
          </span>
          <span
            className="tabular-nums"
            style={{ fontSize: '10px', color: TEXT_FAINT }}
          >
            {channels.length}/{channelPageCount > 1 ? `p${safePageIdx + 1}` : ''}
          </span>
        </div>

        <div className="flex-1 overflow-hidden">
          {channels.map((channel) => {
            const live = filteredPrograms.find(
              (p) => p.channelId === channel.id && p.status === 'LIVE',
            );
            return (
              <div
                key={channel.id}
                className="flex items-center gap-2 px-2"
                style={{
                  height: ROW_HEIGHT,
                  borderBottom: `1px solid ${BORDER}`,
                  backgroundColor: live ? `${LIVE}10` : 'transparent',
                }}
              >
                <div
                  className="w-8 h-8 rounded flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: SURFACE }}
                >
                  <ChannelLogo
                    slug={channel.slug}
                    logoUrl={channel.logoUrl}
                    name={channel.name}
                    category={channel.category}
                    size="sm"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium truncate leading-tight"
                    style={{ color: TEXT }}
                  >
                    {channel.name}
                  </p>
                  <p
                    className="text-[10px] truncate leading-tight mt-0.5"
                    style={{
                      color: live ? LIVE : TEXT_FAINT,
                      fontWeight: live ? 600 : 400,
                    }}
                  >
                    {live ? `● ${live.title}` : channel.category}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {showPagination && (
          <div
            className="flex items-center justify-between px-3 flex-shrink-0"
            style={{
              height: 36,
              borderTop: `1px solid ${BORDER}`,
              backgroundColor: SURFACE,
            }}
          >
            <button
              onClick={() => setChannelPageIdx((p) => Math.max(0, p - 1))}
              disabled={safePageIdx === 0}
              className="w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded disabled:opacity-30"
              style={{ color: TEXT_DIM }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span
              className="tabular-nums"
              style={{ color: TEXT_DIM, fontSize: '11px' }}
            >
              Trang {safePageIdx + 1} / {channelPageCount}
            </span>
            <button
              onClick={() =>
                setChannelPageIdx((p) => Math.min(channelPageCount - 1, p + 1))
              }
              disabled={safePageIdx >= channelPageCount - 1}
              className="w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded disabled:opacity-30"
              style={{ color: TEXT_DIM }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar"
        ref={timelineRef}
        style={{ backgroundColor: BG }}
      >
        {/* Zoom + presets bar */}
        <div
          className="flex items-center justify-between px-3 flex-shrink-0"
          style={{
            height: TIMELINE_HEADER_HEIGHT,
            backgroundColor: SURFACE,
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div className="flex items-center gap-0.5">
            {hourPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => scrollToHour(preset.hour)}
                className="px-2 py-0.5 text-[10px] uppercase rounded hover:bg-white/5 transition-colors"
                style={{ color: TEXT_DIM }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              disabled={zoom <= 0.5}
              className="w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded disabled:opacity-30"
              style={{ color: TEXT_DIM }}
              aria-label="Thu nhỏ"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span
              className="tabular-nums"
              style={{ color: TEXT_FAINT, fontSize: '10px' }}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              disabled={zoom >= 2}
              className="w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded disabled:opacity-30"
              style={{ color: TEXT_DIM }}
              aria-label="Phóng to"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div style={{ width: timelineTotalWidth, minWidth: '100%' }}>
          {/* Hour header */}
          <div
            className="flex relative flex-shrink-0"
            style={{
              height: TIMELINE_HEADER_HEIGHT,
              backgroundColor: SURFACE_RAISED,
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            {hours.map((hour) => {
              const isCurrentHour = isToday && currentHour === hour;
              const h12 =
                hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
              const ampm = hour < 12 ? 'AM' : 'PM';
              return (
                <div
                  key={hour}
                  className="flex-shrink-0 flex items-baseline justify-end pr-2"
                  style={{
                    width: hourWidth,
                    borderRight: `1px solid ${BORDER}`,
                  }}
                >
                  <span
                    className="tabular-nums leading-none"
                    style={{
                      fontWeight: isCurrentHour ? 700 : 500,
                      color: isCurrentHour ? TEXT : TEXT_DIM,
                      fontSize: '13px',
                    }}
                  >
                    {h12}
                  </span>
                  <span
                    className="uppercase ml-0.5"
                    style={{
                      color: isCurrentHour ? TEXT : TEXT_FAINT,
                      fontSize: '8px',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {ampm}
                  </span>
                </div>
              );
            })}

            {isToday && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{
                  left:
                    ((currentHour * 60 + currentMinute) / 60) * hourWidth,
                  width: 2,
                  backgroundColor: LIVE,
                  boxShadow: `0 0 6px ${LIVE_GLOW}`,
                }}
              />
            )}
          </div>

          {/* Program rows */}
          <div className="relative">
            {channels.map((channel) => {
              const channelPrograms = filteredPrograms.filter(
                (p) => p.channelId === channel.id,
              );
              return (
                <div
                  key={channel.id}
                  className="relative"
                  style={{
                    height: ROW_HEIGHT,
                    borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  {/* Hour grid lines */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute top-0 bottom-0 pointer-events-none"
                      style={{
                        left: hour * hourWidth,
                        width: 1,
                        backgroundColor: BORDER,
                      }}
                    />
                  ))}

                  {/* Now-line */}
                  {isToday && (
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none"
                      style={{
                        left:
                          ((currentHour * 60 + currentMinute) / 60) *
                          hourWidth,
                        width: 1,
                        backgroundColor: LIVE,
                        opacity: 0.3,
                      }}
                    />
                  )}

                  {channelPrograms.map((program) => {
                    const { left, width } = getProgramStyle(program);
                    const isFiller = program.isFiller;
                    const isReplay =
                      program.fillerKind === 'recording-replay';
                    const isBranding =
                      program.fillerKind === 'channel-branding';
                    const isLive = program.status === 'LIVE';
                    const isEnded = program.status === 'ENDED';

                    const href = isFiller ? '#' : `/programs/${program.id}`;
                    const onClick = (
                      e: MouseEvent<HTMLAnchorElement>,
                    ) => {
                      if (isFiller) e.preventDefault();
                      else onProgramClick?.(program);
                    };

                    return (
                      <Link
                        key={program.id}
                        href={href}
                        onClick={onClick}
                        aria-disabled={isFiller}
                        tabIndex={isFiller ? -1 : 0}
                        className={cn(
                          'absolute overflow-hidden flex items-center gap-1 px-2 rounded',
                          isFiller ? 'cursor-default' : 'cursor-pointer',
                        )}
                        style={{
                          left,
                          width,
                          top: 6,
                          bottom: 6,
                          backgroundColor: isLive
                            ? `${LIVE}20`
                            : isEnded
                              ? SURFACE
                              : SURFACE_RAISED,
                          border: isLive
                            ? `1px solid ${LIVE}`
                            : isFiller
                              ? `1px dashed ${TEXT_FAINT}`
                              : `1px solid ${BORDER_STRONG}`,
                          opacity: isEnded ? 0.5 : 1,
                          transition: 'background 120ms',
                        }}
                        title={program.title}
                        onMouseEnter={(e) => {
                          if (!isFiller && !isEnded)
                            e.currentTarget.style.backgroundColor =
                              isLive ? `${LIVE}30` : SURFACE_RAISED;
                        }}
                        onMouseLeave={(e) => {
                          if (!isFiller && !isEnded)
                            e.currentTarget.style.backgroundColor = isLive
                              ? `${LIVE}20`
                              : SURFACE_RAISED;
                        }}
                      >
                        {isLive && (
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: LIVE,
                              boxShadow: `0 0 6px ${LIVE_GLOW}`,
                            }}
                          />
                        )}
                        {isReplay && (
                          <Repeat
                            className="w-3 h-3 flex-shrink-0"
                            style={{ color: TEXT_DIM }}
                          />
                        )}
                        {isBranding && (
                          <Sparkles
                            className="w-3 h-3 flex-shrink-0"
                            style={{ color: TEXT_FAINT }}
                          />
                        )}
                        <span
                          className="truncate leading-tight text-xs"
                          style={{
                            color: isLive
                              ? TEXT
                              : isEnded
                                ? TEXT_FAINT
                                : TEXT,
                            fontWeight: isLive ? 600 : 400,
                            fontStyle:
                              isFiller || isBranding ? 'italic' : 'normal',
                          }}
                        >
                          {program.title}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
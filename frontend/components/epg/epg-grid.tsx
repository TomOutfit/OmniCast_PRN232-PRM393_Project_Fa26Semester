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
  Filter,
  Repeat,
  Sparkles,
} from 'lucide-react';
import {
  format,
  addHours,
  startOfDay,
  addDays,
  isSameDay,
  parseISO,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LiveBadge } from '@/components/ui/live-badge';
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
  /** True when this slot was synthesised by the backend to fill a gap. */
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
  initialChannels?: EPGChannel[];
  initialPrograms?: EPGProgram[];
  onProgramClick?: (program: EPGProgram) => void;
}

export function EPGGrid({
  onProgramClick,
}: EPGGridProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(),
  );
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    null,
  );
  const [hideFiller, setHideFiller] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const channelColumnRef = useRef<HTMLDivElement>(null);

  // Fetch active channels for the channel column
  const { data: channelsData, isLoading: loadingChannels } = useChannels({
    isActive: true,
    limit: 50,
  });

  const channelsAll: EPGChannel[] = useMemo(() => {
    const list = Array.isArray(channelsData) ? channelsData : (channelsData?.data ?? []);
    return list.map((c: Channel) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      logoUrl: c.logoUrl,
      category: c.category,
    }));
  }, [channelsData]);

  // Apply category filter — empty set means "all"
  const channels = useMemo(() => {
    if (activeCategories.size === 0) return channelsAll;
    return channelsAll.filter((c) => activeCategories.has(c.category));
  }, [channelsAll, activeCategories]);

  // All available categories
  const allCategories = useMemo(
    () => Array.from(new Set(channelsAll.map((c) => c.category))).sort(),
    [channelsAll],
  );

  const channelIds = useMemo(() => channels.map((c) => c.id), [channels]);

  // Fetch EPG schedule for the selected day — `useEpgDay` hits the
  // backend's `/programs/epg/day` endpoint which guarantees a **dense,
  // 24/7** schedule (real events + recording-replay + channel-branding
  // fillers) for every day, so the grid is never blank.
  const { data: epgResponse, isLoading: loadingSchedule } = useEpgDay(
    selectedDate,
    channelIds,
  );

  // Auto-scroll to current time on initial load when today
  useEffect(() => {
    if (!timelineRef.current || !isSameDay(selectedDate, new Date())) return;
    const hourWidth = 120 * zoom;
    const now = new Date();
    const left =
      ((now.getHours() * 60 + now.getMinutes()) / 60) * hourWidth;
    const visibleStart = timelineRef.current.scrollLeft;
    const visibleEnd = visibleStart + timelineRef.current.clientWidth;
    if (left < visibleStart || left > visibleEnd - 200) {
      // Scroll so the current time is roughly centered
      timelineRef.current.scrollTo({
        left: Math.max(0, left - 300),
        behavior: 'smooth',
      });
    }
  }, [selectedDate, zoom, timelineRef, loadingSchedule]);

  // Keyboard navigation on the timeline
  useEffect(() => {
    if (!timelineRef.current) return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const hourWidth = 120 * zoom;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        timelineRef.current?.scrollBy({
          left: -hourWidth,
          behavior: 'smooth',
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        timelineRef.current?.scrollBy({
          left: hourWidth,
          behavior: 'smooth',
        });
      } else if (e.key === 'Enter' && selectedProgramId) {
        e.preventDefault();
        onProgramClick?.(filteredPrograms.find((p) => p.id === selectedProgramId)!);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoom, selectedProgramId, onProgramClick]);

  /**
   * Flatten the per-channel EPG response into a flat list of
   * `EPGProgram` rows. The backend already returns programs sorted by
   * `startTime` within each channel, and covers the full 00:00 → 24:00
   * window via fillers, so no client-side gap detection is needed.
   */
  const programs: EPGProgram[] = useMemo(() => {
    if (!epgResponse) return [];
    const channelMap = new Map(channels.map((c) => [c.id, c]));
    const startOfDaySelected = startOfDay(selectedDate);
    const endOfDaySelected = addDays(startOfDaySelected, 1);

    const out: EPGProgram[] = [];
    for (const ch of epgResponse.channels) {
      const meta = channelMap.get(ch.channelId);
      // Even when the channel isn't in our local cache (e.g. brand new
      // channels), still surface the program so the row never goes blank.
      const channelName = meta?.name ?? ch.channelName;
      const channelSlug = meta?.slug ?? ch.channelId;
      const channelLogo = meta?.logoUrl ?? ch.channelLogoUrl ?? undefined;
      const category = meta?.category ?? ch.channelCategory;

      for (const p of ch.programs) {
        const start = parseISO(p.startTime);
        const end = parseISO(p.endTime);
        // Defensive: skip any program whose start falls outside the day
        // (shouldn't happen, but the backend clamps day boundaries too).
        if (start < startOfDaySelected || start >= endOfDaySelected) continue;
        out.push({
          id: p.id,
          title: p.title,
          description: undefined,
          thumbnailUrl: p.thumbnailUrl ?? undefined,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          channelId: ch.channelId,
          channelName,
          channelSlug,
          channelLogo,
          status: (p.status === 'LIVE'
            ? 'LIVE'
            : p.status === 'ENDED' || p.status === 'CANCELLED'
              ? 'ENDED'
              : 'SCHEDULED') as EPGProgram['status'],
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

  // Apply search filter + filler-toggle filter
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

  // Generate hours array (24 hours)
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const isLoading = loadingChannels || loadingSchedule;

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Calculate program position and width
  const getProgramStyle = useCallback(
    (program: EPGProgram) => {
      const start = parseISO(program.startTime);
      const end = parseISO(program.endTime);

      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const endMinutes = end.getHours() * 60 + end.getMinutes();
      const durationMinutes = Math.max(endMinutes - startMinutes, 30);

      const hourWidth = 120 * zoom;
      const left = (startMinutes / 60) * hourWidth;
      const width = (durationMinutes / 60) * hourWidth;

      return { left: `${left}px`, width: `${Math.max(width, 60)}px` };
    },
    [zoom],
  );

  const goToPreviousDay = () => setSelectedDate(addDays(selectedDate, -1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  const isToday = isSameDay(selectedDate, new Date());
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <Calendar className="w-4 h-4 mr-1" />
            Hôm nay
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="ml-4 text-white font-medium">
            {format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Tìm chương trình..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-dark-800 border border-dark-700 rounded text-sm text-white w-56 placeholder:text-dark-500 focus:outline-none focus:border-primary-500"
              aria-label="Tìm kiếm chương trình"
            />
          </div>

          {/* Category filter */}
          {allCategories.length > 0 && (
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-dark-400" />
              {allCategories.map((cat) => {
                const active =
                  activeCategories.size === 0 || activeCategories.has(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      'px-2 py-1 rounded text-xs transition-colors',
                      active
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-white',
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
              {activeCategories.size > 0 && (
                <button
                  onClick={() => setActiveCategories(new Set())}
                  className="ml-1 text-xs text-dark-500 hover:text-white"
                >
                  Xóa
                </button>
              )}
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-white"
              aria-label="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-sm text-dark-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-white"
              aria-label="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Day coverage summary — quick visual confirmation that the day is dense */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-dark-400">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          Lịch phát sóng 24/7 — mỗi ngày đều được lấp đầy với chương trình
          thực, replay từ VOD và khung quảng bá kênh.
        </span>
        <button
          onClick={() => setHideFiller((v) => !v)}
          className={cn(
            'ml-auto px-2 py-1 rounded border transition-colors',
            hideFiller
              ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
              : 'bg-dark-800 text-dark-300 border-dark-700 hover:text-white',
          )}
          aria-pressed={hideFiller}
        >
          {hideFiller ? 'Hiện tất cả khung giờ' : 'Chỉ chương trình thực'}
        </button>
      </div>

      {/* EPG Grid Container */}
      <Card className="flex-1 overflow-hidden glass-card">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-dark-400">
            <Tv className="w-10 h-10 mb-2 opacity-50" />
            <p>Chưa có kênh nào đang hoạt động.</p>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Channel Column */}
            <div className="w-48 flex-shrink-0 border-r border-dark-700 bg-dark-900/50">
              <div className="h-12 border-b border-dark-700 flex items-center px-4">
                <span className="text-sm font-medium text-dark-400">Kênh</span>
              </div>
              <div
                className="overflow-y-auto"
                style={{ height: 'calc(100% - 48px)' }}
              >
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="h-20 border-b border-dark-800 flex items-center gap-3 px-4 hover:bg-dark-800/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-dark-700">
                      <ChannelLogo
                        slug={channel.slug}
                        logoUrl={channel.logoUrl}
                        name={channel.name}
                        category={channel.category}
                        size="sm"
                        className="rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {channel.name}
                      </p>
                      <p className="text-xs text-dark-500">{channel.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Area */}
            <div className="flex-1 overflow-x-auto" ref={timelineRef}>
              <div className="min-w-max">
                {/* Time Header */}
                <div className="h-12 border-b border-dark-700 flex relative bg-dark-900/50">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className={cn(
                        'flex-shrink-0 text-center border-r border-dark-800',
                        isToday && currentHour === hour && 'bg-primary-500/20',
                      )}
                      style={{ width: `${120 * zoom}px` }}
                    >
                      <span
                        className={cn(
                          'text-xs font-medium',
                          isToday && currentHour === hour
                            ? 'text-primary-400'
                            : 'text-dark-400',
                        )}
                      >
                        {format(addHours(startOfDay(selectedDate), hour), 'HH:mm')}
                      </span>
                    </div>
                  ))}
                  {isToday && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                      style={{
                        left: `${((currentHour * 60 + currentMinute) / 60) * 120 * zoom}px`,
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 -mt-1 -ml-1 absolute" />
                    </div>
                  )}
                </div>

                {/* Program Grid */}
                <div
                  className="relative"
                  style={{ height: `${channels.length * 80}px` }}
                >
                  {/* Hour Lines */}
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute top-0 bottom-0 border-r border-dark-800/50"
                      style={{ left: `${hour * 120 * zoom}px` }}
                    />
                  ))}

                  {/* Channel Rows */}
                  {channels.map((channel, channelIndex) => {
                    const channelPrograms = filteredPrograms.filter(
                      (p) => p.channelId === channel.id,
                    );

                    return (
                      <div
                        key={channel.id}
                        className="absolute left-0 right-0 border-b border-dark-800"
                        style={{
                          top: `${channelIndex * 80}px`,
                          height: '80px',
                        }}
                      >
                        {/* Row Background for current time */}
                        {isToday && (
                          <div
                            className="absolute top-0 bottom-0 bg-primary-500/5"
                            style={{
                              left: `${((currentHour * 60 + currentMinute) / 60) * 120 * zoom}px`,
                              width: `${((60 - currentMinute) / 60) * 120 * zoom}px`,
                            }}
                          />
                        )}

                        {/* Programs */}
                        {channelPrograms.map((program) => {
                          const { left, width } = getProgramStyle(program);
                          const isFiller = program.isFiller;
                          const isRecordingReplay =
                            program.fillerKind === 'recording-replay';
                          const isChannelBranding =
                            program.fillerKind === 'channel-branding';

                          // Filler programmes are non-clickable placeholders
                          // — only real events link to a detail page.
                          const href = isFiller
                            ? '#'
                            : `/programs/${program.id}`;
                          const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
                            if (isFiller) {
                              e.preventDefault();
                              return;
                            }
                            onProgramClick?.(program);
                          };

                          const card = (
                            <div
                              className={cn(
                                'h-full p-2 flex flex-col',
                                program.status === 'LIVE' && 'text-white',
                                isFiller &&
                                  'bg-dark-800/60 border border-dashed',
                              )}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                {program.status === 'LIVE' && (
                                  <LiveBadge size="sm" />
                                )}
                                {isRecordingReplay && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30"
                                    title="Phát lại từ thư viện VOD"
                                  >
                                    <Repeat className="w-2.5 h-2.5" />
                                    Replay
                                  </span>
                                )}
                                {isChannelBranding && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold bg-dark-700 text-dark-300 border border-dark-600"
                                    title="Khung giờ quảng bá kênh"
                                  >
                                    <Sparkles className="w-2.5 h-2.5" />
                                    On Air
                                  </span>
                                )}
                                {program.category && !isFiller && (
                                  <span className="text-[10px] text-dark-300 truncate">
                                    {program.category}
                                  </span>
                                )}
                              </div>
                              <p
                                className={cn(
                                  'text-xs font-medium truncate flex-1',
                                  isFiller
                                    ? 'text-dark-300 italic'
                                    : 'text-white',
                                  program.status === 'LIVE' && 'text-white',
                                )}
                              >
                                {program.title}
                              </p>
                              <p className="text-[10px] text-dark-400">
                                {format(parseISO(program.startTime), 'HH:mm')} -{' '}
                                {format(parseISO(program.endTime), 'HH:mm')}
                              </p>
                            </div>
                          );

                          return (
                            <Link
                              key={program.id}
                              href={href}
                              onClick={onClick}
                              aria-disabled={isFiller}
                              tabIndex={isFiller ? -1 : 0}
                              className={cn(
                                'absolute top-2 bottom-2 rounded-lg overflow-hidden transition-all hover:z-10',
                                !isFiller && 'hover:scale-[1.02]',
                                program.status === 'LIVE' &&
                                  !isFiller &&
                                  'ring-2 ring-red-500 shadow-glow-live',
                                program.status === 'ENDED' && 'opacity-60',
                                program.status === 'SCHEDULED' &&
                                  !isFiller &&
                                  'bg-dark-700 hover:bg-dark-600',
                                isFiller &&
                                  'cursor-default hover:scale-100 bg-dark-800/50',
                              )}
                              style={{
                                left,
                                width,
                                backgroundColor:
                                  program.status === 'LIVE' && !isFiller
                                    ? '#dc2626'
                                    : undefined,
                              }}
                            >
                              {card}
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
        )}
      </Card>
    </div>
  );
}

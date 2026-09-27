'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Tv,
  Play,
  Calendar,
  ZoomIn,
  ZoomOut,
  Loader2,
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
import { useEpgSchedule } from '@/lib/hooks/usePrograms';
import type { Channel, LiveEvent } from '@/types';

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

  // Fetch active channels for the channel column
  const { data: channelsData, isLoading: loadingChannels } = useChannels({
    isActive: true,
    limit: 50,
  });

  const channels: EPGChannel[] = useMemo(
    () =>
      (channelsData?.data ?? []).map((c: Channel) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        logoUrl: c.logoUrl,
        category: c.category,
      })),
    [channelsData],
  );

  const channelIds = useMemo(() => channels.map((c) => c.id), [channels]);

  // Fetch EPG schedule for the selected day
  const { data: scheduleData, isLoading: loadingSchedule } = useEpgSchedule(
    selectedDate,
    channelIds,
  );

  const programs: EPGProgram[] = useMemo(() => {
    const events: LiveEvent[] = scheduleData?.data ?? [];
    const startOfDaySelected = startOfDay(selectedDate);
    const endOfDaySelected = addDays(startOfDaySelected, 1);
    const channelMap = new Map(channels.map((c) => [c.id, c]));

    return events
      .map((e) => {
        const channel = channelMap.get(e.channelId);
        if (!channel) return null;
        const start = parseISO(e.scheduledAt);
        const end = e.endedAt
          ? parseISO(e.endedAt)
          : new Date(start.getTime() + (e.duration ?? 120) * 60 * 1000);
        return {
          id: e.id,
          title: e.title,
          description: e.description,
          thumbnailUrl: e.thumbnailUrl,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          channelId: e.channelId,
          channelName: channel.name,
          channelSlug: channel.slug,
          channelLogo: channel.logoUrl,
          status: (e.status === 'LIVE'
            ? 'LIVE'
            : e.status === 'ENDED' || e.status === 'CANCELLED'
              ? 'ENDED'
              : 'SCHEDULED') as EPGProgram['status'],
          category: e.tags?.[0],
        } as EPGProgram;
      })
      .filter((p): p is EPGProgram => !!p)
      .filter((p) => {
        const programStart = parseISO(p.startTime);
        return programStart >= startOfDaySelected && programStart < endOfDaySelected;
      });
  }, [scheduleData, channels, selectedDate]);

  // Generate hours array (24 hours)
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const isLoading = loadingChannels || loadingSchedule;

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
            <div className="flex-1 overflow-x-auto">
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
                    const channelPrograms = programs.filter(
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
                              left: `${(currentHour * 60 / 60) * 120 * zoom}px`,
                              width: `${((60 - currentMinute) / 60) * 120 * zoom}px`,
                            }}
                          />
                        )}

                        {/* Programs */}
                        {channelPrograms.map((program) => {
                          const { left, width } = getProgramStyle(program);

                          return (
                            <Link
                              key={program.id}
                              href={`/programs/${program.id}`}
                              onClick={() => onProgramClick?.(program)}
                              className={cn(
                                'absolute top-2 bottom-2 rounded-lg overflow-hidden transition-all hover:z-10 hover:scale-[1.02]',
                                program.status === 'LIVE' &&
                                  'ring-2 ring-red-500 shadow-glow-live',
                                program.status === 'ENDED' && 'opacity-60',
                                program.status === 'SCHEDULED' &&
                                  'bg-dark-700 hover:bg-dark-600',
                              )}
                              style={{
                                left,
                                width,
                                backgroundColor:
                                  program.status === 'LIVE'
                                    ? '#dc2626'
                                    : undefined,
                              }}
                            >
                              <div className="h-full p-2 flex flex-col">
                                <div className="flex items-center gap-1 mb-1">
                                  {program.status === 'LIVE' && (
                                    <LiveBadge size="sm" />
                                  )}
                                  {program.category && (
                                    <span className="text-[10px] text-dark-300 truncate">
                                      {program.category}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-medium text-white truncate flex-1">
                                  {program.title}
                                </p>
                                <p className="text-[10px] text-dark-400">
                                  {format(parseISO(program.startTime), 'HH:mm')} -{' '}
                                  {format(parseISO(program.endTime), 'HH:mm')}
                                </p>
                              </div>
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

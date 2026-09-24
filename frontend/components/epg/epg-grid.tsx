'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Tv, 
  Play,
  Filter,
  Calendar,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { format, addHours, startOfDay, addDays, isSameDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LiveBadge } from '@/components/ui/live-badge';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { cn } from '@/lib/utils';

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
  programs?: EPGProgram[];
  channels?: EPGChannel[];
  onProgramClick?: (program: EPGProgram) => void;
}

// Mock data for demonstration
const mockChannels: EPGChannel[] = [
  { id: '1', name: 'Omni Sport 1', slug: 'omni-sport-1', category: 'Thể thao' },
  { id: '2', name: 'Omni Sport 2', slug: 'omni-sport-2', category: 'Thể thao' },
  { id: '3', name: 'Omni Show', slug: 'omni-show', category: 'Giải trí' },
  { id: '4', name: 'Omni Entertain', slug: 'omni-entertain', category: 'Giải trí' },
  { id: '5', name: 'Omni Cine', slug: 'omni-cine', category: 'Điện ảnh' },
  { id: '6', name: 'Omni Drama', slug: 'omni-drama', category: 'Phim truyện' },
  { id: '7', name: 'Omni News', slug: 'omni-news', category: 'Tin tức' },
  { id: '8', name: 'Omni Music', slug: 'omni-music', category: 'Âm nhạc' },
  { id: '9', name: 'Omni Kids', slug: 'omni-kids', category: 'Thiếu nhi' },
  { id: '10', name: 'Omni Tech', slug: 'omni-tech', category: 'Công nghệ' },
  { id: '11', name: 'Omni Food', slug: 'omni-food', category: 'Ẩm thực' },
  { id: '12', name: 'Omni Discovery', slug: 'omni-discovery', category: 'Khám phá' },
];

const mockPrograms: EPGProgram[] = [
  // Omni Sport 1
  { id: 'p1', title: 'Bản tin thể thao sáng', startTime: '2026-09-24T06:00:00', endTime: '2026-09-24T06:30:00', channelId: '1', channelName: 'Omni Sport 1', channelSlug: 'omni-sport-1', status: 'ENDED' },
  { id: 'p2', title: 'Premier League Highlights', startTime: '2026-09-24T06:30:00', endTime: '2026-09-24T07:30:00', channelId: '1', channelName: 'Omni Sport 1', channelSlug: 'omni-sport-1', status: 'ENDED' },
  { id: 'p3', title: 'Champions League - Liverpool vs Man City', startTime: '2026-09-24T07:30:00', endTime: '2026-09-24T09:30:00', channelId: '1', channelName: 'Omni Sport 1', channelSlug: 'omni-sport-1', status: 'LIVE', category: 'Bóng đá' },
  { id: 'p4', title: 'Phân tích sau trận', startTime: '2026-09-24T09:30:00', endTime: '2026-09-24T10:30:00', channelId: '1', channelName: 'Omni Sport 1', channelSlug: 'omni-sport-1', status: 'SCHEDULED' },
  { id: 'p5', title: 'Tennis Grand Slam', startTime: '2026-09-24T10:30:00', endTime: '2026-09-24T13:00:00', channelId: '1', channelName: 'Omni Sport 1', channelSlug: 'omni-sport-1', status: 'SCHEDULED' },
  { id: 'p6', title: 'Bản tin thể thao trưa', startTime: '2026-09-24T13:00:00', endTime: '2026-09-24T13:30:00', channelId: '1', channelName: 'Omni Sport 1', channelSlug: 'omni-sport-1', status: 'SCHEDULED' },
  { id: 'p7', title: 'NBA Finals 2026', startTime: '2026-09-24T13:30:00', endTime: '2026-09-24T16:00:00', channelId: '1', channelName: 'Omni Sport 1', channelSlug: 'omni-sport-1', status: 'SCHEDULED' },
  { id: 'p8', title: 'F1 Grand Prix', startTime: '2026-09-24T16:00:00', endTime: '2026-09-24T18:00:00', channelId: '1', channelName: 'Omni Sport 1', channelSlug: 'omni-sport-1', status: 'SCHEDULED' },
  { id: 'p9', title: 'Bản tin thể thao tối', startTime: '2026-09-24T18:00:00', endTime: '2026-09-24T18:30:00', channelId: '1', channelName: 'Omni Sport 1', channelSlug: 'omni-sport-1', status: 'SCHEDULED' },
  { id: 'p10', title: 'La Liga - Real Madrid vs Barcelona', startTime: '2026-09-24T18:30:00', endTime: '2026-09-24T21:00:00', channelId: '1', channelName: 'Omni Sport 1', channelSlug: 'omni-sport-1', status: 'SCHEDULED' },
  
  // Omni Show
  { id: 'p11', title: 'Sáng tạo không giới hạn', startTime: '2026-09-24T07:00:00', endTime: '2026-09-24T09:00:00', channelId: '3', channelName: 'Omni Show', channelSlug: 'omni-show', status: 'ENDED' },
  { id: 'p12', title: 'Hát cho cuộc sống', startTime: '2026-09-24T09:00:00', endTime: '2026-09-24T11:00:00', channelId: '3', channelName: 'Omni Show', channelSlug: 'omni-show', status: 'LIVE', category: 'Ca nhạc' },
  { id: 'p13', title: 'Nấu ăn với sao', startTime: '2026-09-24T11:00:00', endTime: '2026-09-24T12:30:00', channelId: '3', channelName: 'Omni Show', channelSlug: 'omni-show', status: 'SCHEDULED' },
  { id: 'p14', title: 'Phim truyền hình: Đại gia gân', startTime: '2026-09-24T12:30:00', endTime: '2026-09-24T14:00:00', channelId: '3', channelName: 'Omni Show', channelSlug: 'omni-show', status: 'SCHEDULED' },
  { id: 'p15', title: 'Sao nói gì?', startTime: '2026-09-24T14:00:00', endTime: '2026-09-24T15:30:00', channelId: '3', channelName: 'Omni Show', channelSlug: 'omni-show', status: 'SCHEDULED' },
  { id: 'p16', title: 'Giải trí 24h', startTime: '2026-09-24T15:30:00', endTime: '2026-09-24T17:00:00', channelId: '3', channelName: 'Omni Show', channelSlug: 'omni-show', status: 'SCHEDULED' },
  { id: 'p17', title: 'Siêu mẫu Việt', startTime: '2026-09-24T17:00:00', endTime: '2026-09-24T19:00:00', channelId: '3', channelName: 'Omni Show', channelSlug: 'omni-show', status: 'SCHEDULED' },
  { id: 'p18', title: 'Gặp nhau cuối tuần', startTime: '2026-09-24T19:00:00', endTime: '2026-09-24T21:00:00', channelId: '3', channelName: 'Omni Show', channelSlug: 'omni-show', status: 'SCHEDULED' },
  
  // Omni Cine
  { id: 'p19', title: 'Phim hoạt hình: Doraemon', startTime: '2026-09-24T06:00:00', endTime: '2026-09-24T07:30:00', channelId: '5', channelName: 'Omni Cine', channelSlug: 'omni-cine', status: 'ENDED' },
  { id: 'p20', title: 'Phim hành động: Avengers Endgame', startTime: '2026-09-24T07:30:00', endTime: '2026-09-24T10:00:00', channelId: '5', channelName: 'Omni Cine', channelSlug: 'omni-cine', status: 'LIVE', category: 'Hành động' },
  { id: 'p21', title: 'Phim kinh dị: The Conjuring', startTime: '2026-09-24T10:00:00', endTime: '2026-09-24T12:00:00', channelId: '5', channelName: 'Omni Cine', channelSlug: 'omni-cine', status: 'SCHEDULED' },
  { id: 'p22', title: 'Phim tâm lý: Inception', startTime: '2026-09-24T12:00:00', endTime: '2026-09-24T14:30:00', channelId: '5', channelName: 'Omni Cine', channelSlug: 'omni-cine', status: 'SCHEDULED' },
];

export function EPGGrid({ 
  programs = mockPrograms, 
  channels = mockChannels,
  onProgramClick 
}: EPGGridProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [zoom, setZoom] = useState(1); // 0.5 = zoom out, 1 = normal, 2 = zoom in
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');

  // Generate hours array (24 hours)
  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i);
  }, []);

  // Filter programs based on selected date and filter
  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const programDate = parseISO(program.startTime);
      const isSameDaySelected = isSameDay(programDate, selectedDate);
      
      if (!isSameDaySelected) return false;
      
      if (filter === 'live') return program.status === 'LIVE';
      if (filter === 'upcoming') return program.status === 'SCHEDULED';
      
      return true;
    });
  }, [programs, selectedDate, filter]);

  // Calculate program position and width
  const getProgramStyle = useCallback((program: EPGProgram) => {
    const start = parseISO(program.startTime);
    const end = parseISO(program.endTime);
    
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const durationMinutes = endMinutes - startMinutes;
    
    const hourWidth = 120 * zoom; // Base width per hour
    const left = (startMinutes / 60) * hourWidth;
    const width = (durationMinutes / 60) * hourWidth;
    
    return { left: `${left}px`, width: `${Math.max(width, 60)}px` };
  }, [zoom]);

  // Navigation functions
  const goToPreviousDay = () => setSelectedDate(addDays(selectedDate, -1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => {
    setSelectedDate(new Date());
    setCurrentHour(new Date().getHours());
  };

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
          {/* Filter */}
          <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
            {(['all', 'live', 'upcoming'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'text-dark-400 hover:text-white'
                )}
              >
                {f === 'all' ? 'Tất cả' : f === 'live' ? 'Đang phát' : 'Sắp phát'}
              </button>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-white"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-sm text-dark-400">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-white"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* EPG Grid Container */}
      <Card className="flex-1 overflow-hidden glass-card">
        <div className="flex h-full">
          {/* Channel Column */}
          <div className="w-48 flex-shrink-0 border-r border-dark-700 bg-dark-900/50">
            {/* Header */}
            <div className="h-12 border-b border-dark-700 flex items-center px-4">
              <span className="text-sm font-medium text-dark-400">Kênh</span>
            </div>
            {/* Channel List */}
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 48px)' }}>
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="h-20 border-b border-dark-800 flex items-center gap-3 px-4 hover:bg-dark-800/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-dark-700">
                    <ChannelLogo 
                      slug={channel.slug}
                      name={channel.name}
                      category={channel.category}
                      size="sm"
                      className="rounded-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{channel.name}</p>
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
                      isSameDay(selectedDate, new Date()) && currentHour === hour && 'bg-primary-500/20'
                    )}
                    style={{ width: `${120 * zoom}px` }}
                  >
                    <span className={cn(
                      'text-xs font-medium',
                      isSameDay(selectedDate, new Date()) && currentHour === hour ? 'text-primary-400' : 'text-dark-400'
                    )}>
                      {format(addHours(startOfDay(selectedDate), hour), 'HH:mm')}
                    </span>
                  </div>
                ))}
                {/* Current Time Indicator */}
                {isSameDay(selectedDate, new Date()) && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                    style={{ left: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * 120 * zoom}px` }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 -mt-1 -ml-1 absolute" />
                  </div>
                )}
              </div>

              {/* Program Grid */}
              <div className="relative" style={{ height: `${channels.length * 80}px` }}>
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
                  const channelPrograms = filteredPrograms.filter(p => p.channelId === channel.id);
                  
                  return (
                    <div
                      key={channel.id}
                      className="absolute left-0 right-0 border-b border-dark-800"
                      style={{ 
                        top: `${channelIndex * 80}px`, 
                        height: '80px' 
                      }}
                    >
                      {/* Row Background for current time */}
                      {isSameDay(selectedDate, new Date()) && (
                        <div
                          className="absolute top-0 bottom-0 bg-primary-500/5"
                          style={{ 
                            left: `${(currentHour * 60 / 60) * 120 * zoom}px`,
                            width: `${((60 - new Date().getMinutes()) / 60) * 120 * zoom}px`
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
                              program.status === 'LIVE' && 'ring-2 ring-red-500 shadow-glow-live',
                              program.status === 'ENDED' && 'opacity-60',
                              program.status === 'SCHEDULED' && 'bg-dark-700 hover:bg-dark-600'
                            )}
                            style={{ 
                              left, 
                              width,
                              backgroundColor: program.status === 'LIVE' ? '#dc2626' : undefined
                            }}
                          >
                            <div className="h-full p-2 flex flex-col">
                              <div className="flex items-center gap-1 mb-1">
                                {program.status === 'LIVE' && <LiveBadge size="sm" />}
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
                                {format(parseISO(program.startTime), 'HH:mm')} - {format(parseISO(program.endTime), 'HH:mm')}
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
      </Card>
    </div>
  );
}

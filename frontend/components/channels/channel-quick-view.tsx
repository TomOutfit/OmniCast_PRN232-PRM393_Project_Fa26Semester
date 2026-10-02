'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Play, Clock, Tv, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { LiveBadge } from '@/components/ui/live-badge';
import { fetchEpgDay } from '@/lib/api/programs';
import type { Channel } from '@/types';

interface UpcomingProgram {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  thumbnailUrl?: string | null;
  durationMinutes: number;
}

interface ChannelQuickViewProps {
  channel: Channel;
  onClose: () => void;
}

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

function formatHHmm(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/**
 * Quick-view drawer shown when a channel card is clicked (B2).
 * Calls the new `/programs/epg/day` endpoint and lists the next
 * few programs so users can preview without navigating away.
 */
export function ChannelQuickView({ channel, onClose }: ChannelQuickViewProps) {
  const [programs, setPrograms] = useState<UpcomingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch upcoming programs (today) for this channel
  // Try the new /epg/day endpoint first, fallback to /live-events if needed.
  const fetchPrograms = async () => {
    try {
      const todayYmd = new Date().toISOString().slice(0, 10);
      const body = await fetchEpgDay({ date: todayYmd, channelIds: [channel.id] });
      const ch = (body.channels ?? []).find(
        (c: any) => c.channelId === channel.id,
      );
      return (ch?.programs ?? []) as UpcomingProgram[];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPrograms()
      .then((list) => {
        if (cancelled) return;
        setPrograms(list.slice(0, 6));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(String(err?.message ?? err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-dark-950 border-l border-dark-800 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-dark-800 sticky top-0 bg-dark-950 z-10">
          <ChannelLogo
            slug={channel.slug}
            logoUrl={channel.logoUrl}
            name={channel.name}
            category={channel.category}
            size="md"
            className="rounded-xl flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">
              {channel.name}
            </h2>
            <p className="text-sm text-dark-400">
              {CATEGORY_LABELS[channel.category] || channel.category}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-dark-800 text-dark-400 hover:text-white"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        {channel.description && (
          <p className="px-6 py-4 text-sm text-dark-300 border-b border-dark-800">
            {channel.description}
          </p>
        )}

        {/* Upcoming programs */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              Lịch phát sóng hôm nay
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-dark-400 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Đang tải lịch phát sóng…</span>
            </div>
          ) : error ? (
            <p className="text-sm text-error-400 py-4">{error}</p>
          ) : programs.length === 0 ? (
            <div className="text-center py-8 text-dark-400">
              <Tv className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chưa có lịch phát sóng hôm nay.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {programs.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg bg-dark-900 border border-dark-800 hover:border-primary-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white line-clamp-2">
                      {p.title}
                    </p>
                    {p.status === 'LIVE' && <LiveBadge />}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
                    <span>
                      {formatHHmm(p.startTime)} – {formatHHmm(p.endTime)}
                    </span>
                    <span>·</span>
                    <span>{p.durationMinutes} phút</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="sticky bottom-0 bg-dark-950 border-t border-dark-800 px-6 py-4 flex gap-3">
          <Link href={`/channels/${channel.slug}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Xem trang kênh
            </Button>
          </Link>
          <Link href={`/channels/${channel.slug}`} className="flex-1">
            <Button className="w-full">
              <Play className="w-4 h-4 mr-2" />
              Xem ngay
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

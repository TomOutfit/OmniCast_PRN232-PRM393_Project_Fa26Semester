'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Eye,
  Share2,
  Play,
  Calendar,
  Clock,
  ChevronRight,
  Verified,
  Tv,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LiveBadge } from '@/components/ui/live-badge';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { FollowButton } from '@/components/channels/follow-button';
import {
  useChannelBySlug,
} from '@/lib/hooks/useChannels';
import { useLiveNow, useLiveEvents } from '@/lib/hooks/usePrograms';
import type { Channel } from '@/types';

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
};

export default function ChannelDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const { data: channel, isLoading, error } = useChannelBySlug(slug);
  const { data: liveEvents } = useLiveNow();
  const { data: scheduleData } = useLiveEvents({ channelId: channel?.id, limit: 50 });
  const liveEvent = useMemo(() => {
    if (!channel || !liveEvents) return null;
    const list = Array.isArray(liveEvents) ? liveEvents : (liveEvents as any)?.data ?? [];
    return list.find((e: any) => e.channelId === channel.id) ?? null;
  }, [channel, liveEvents]);

  const todayEvents = useMemo(() => {
    if (!scheduleData?.data || !channel) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return scheduleData.data
      .filter((e) => {
        const at = new Date(e.scheduledAt);
        return at >= today && at < tomorrow;
      })
      .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
  }, [scheduleData, channel]);

  if (isLoading) {
    return (
      <Center>
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </Center>
    );
  }

  if (error || !channel) {
    return (
      <Center>
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-white">Không tìm thấy kênh.</p>
        <Button asChild className="mt-4">
          <Link href="/channels">Về danh sách kênh</Link>
        </Button>
      </Center>
    );
  }

  const bannerColor = channel.bannerColor || 'from-primary-600 to-primary-800';

  return (
    <div className="min-h-[80vh]">
      {/* Banner Header */}
      <div className={`bg-gradient-to-r ${bannerColor} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="max-w-7xl mx-auto px-4 py-12 relative">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <ChannelLogo
              slug={channel.slug}
              logoUrl={channel.logoUrl}
              name={channel.name}
              category={channel.category}
              size="xl"
              className="rounded-2xl shadow-2xl"
            />

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {channel.name}
                </h1>
                {channel.isVerified && (
                  <Verified className="w-6 h-6 text-primary-400" />
                )}
                {liveEvent && <LiveBadge size="lg" />}
              </div>
              {channel.tagline && (
                <p className="text-lg text-white/80 mb-4">{channel.tagline}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                <span className="flex items-center gap-1">
                  <Tv className="w-4 h-4" />
                  {CATEGORY_LABELS[channel.category] || channel.category}
                </span>
                {channel.region && <span>{channel.region}</span>}
                {channel.language && <span>{channel.language}</span>}
                {channel.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Tham gia {format(parseISO(channel.createdAt), 'MMMM yyyy', { locale: vi })}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <FollowButton channelId={channel.id} variant="solid" />
              <ShareButton channel={channel} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Current/Live Program */}
            {liveEvent && (
              <Card className="overflow-hidden glass-card">
                <div className="bg-gradient-to-r from-red-600/20 to-red-900/20 p-4 border-b border-dark-700">
                  <div className="flex items-center gap-2 text-red-400">
                    <LiveBadge />
                    <span className="text-sm font-medium">Đang phát sóng</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link href={`/programs/${liveEvent.id}`} className="group">
                        <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors mb-2">
                          {liveEvent.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-4 text-sm text-dark-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(parseISO(liveEvent.scheduledAt), 'HH:mm')}
                          {liveEvent.endedAt &&
                            ` - ${format(parseISO(liveEvent.endedAt), 'HH:mm')}`}
                        </span>
                      </div>
                    </div>
                    <Button asChild size="lg" className="gap-2">
                      <Link href={`/programs/${liveEvent.id}`}>
                        <Play className="w-5 h-5" />
                        Xem ngay
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* About Channel */}
            <Card className="p-6 glass-card">
              <h2 className="text-xl font-bold text-white mb-4">Giới thiệu</h2>
              <p className="text-dark-300 leading-relaxed">
                {channel.description || 'Kênh này chưa cập nhật mô tả.'}
              </p>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Users className="w-6 h-6 mx-auto mb-2 text-primary-400" />}
                value={formatCompact(channel.followerCount)}
                label="Người theo dõi"
              />
              <StatCard
                icon={<Eye className="w-6 h-6 mx-auto mb-2 text-accent-cyan" />}
                value={formatCompact(channel.totalViews)}
                label="Lượt xem"
              />
              <StatCard
                icon={<Tv className="w-6 h-6 mx-auto mb-2 text-purple-400" />}
                value={String(channel.totalVideos ?? 0)}
                label="Video"
              />
              <StatCard
                icon={<Calendar className="w-6 h-6 mx-auto mb-2 text-accent-gold" />}
                value={String(todayEvents.length)}
                label="Lịch hôm nay"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700">
                <h2 className="text-lg font-bold text-white">Lịch phát sóng hôm nay</h2>
              </div>
              <div className="divide-y divide-dark-700 max-h-[600px] overflow-y-auto">
                {liveEvent && (
                  <div className="p-4 bg-primary-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <LiveBadge size="sm" />
                      <span className="text-xs text-primary-400 font-medium">HIỆN TẠI</span>
                    </div>
                    <Link href={`/programs/${liveEvent.id}`} className="group">
                      <h4 className="font-medium text-white group-hover:text-primary-400 transition-colors">
                        {liveEvent.title}
                      </h4>
                    </Link>
                  </div>
                )}

                {todayEvents
                  .filter((e) => e.id !== liveEvent?.id)
                  .map((program) => (
                    <div key={program.id} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                        <span className="text-xs text-dark-400 font-medium">
                          {format(parseISO(program.scheduledAt), 'HH:mm')}
                        </span>
                      </div>
                      <Link href={`/programs/${program.id}`} className="group">
                        <h4 className="font-medium text-white group-hover:text-primary-400 transition-colors line-clamp-2">
                          {program.title}
                        </h4>
                      </Link>
                      {program.duration && (
                        <p className="text-xs text-dark-500 mt-1">
                          {program.duration} phút
                        </p>
                      )}
                    </div>
                  ))}

                {todayEvents.length === 0 && !liveEvent && (
                  <div className="p-6 text-center text-dark-400 text-sm">
                    Chưa có lịch phát sóng cho hôm nay.
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-dark-700">
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link href="/epg">
                    Xem lịch phát sóng
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <Card className="p-4 text-center glass-card">
      {icon}
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-dark-400">{label}</div>
    </Card>
  );
}

function ShareButton({ channel }: { channel: Channel }) {
  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: channel.name, url });
      } catch {
        /* canceled */
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      alert('Đã sao chép liên kết vào bộ nhớ tạm');
    }
  };

  return (
    <Button
      variant="outline"
      className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2"
      onClick={handleShare}
    >
      <Share2 className="w-4 h-4" />
      Chia sẻ
    </Button>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center flex-col px-4 text-center">
      {children}
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

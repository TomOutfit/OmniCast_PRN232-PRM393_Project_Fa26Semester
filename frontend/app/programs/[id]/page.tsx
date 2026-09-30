'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Play,
  Clock,
  Eye,
  ThumbsUp,
  Share2,
  Calendar,
  Tv,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LiveBadge, UpcomingBadge } from '@/components/ui/live-badge';
import { AiBadge } from '@/components/ai/ai-badge';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { VideoPlayer } from '@/components/programs/video-player';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useLiveEventById, useLiveEvents } from '@/lib/hooks/usePrograms';
import { useChannelBySlug } from '@/lib/hooks/useChannels';
import { CommentsSection } from '@/components/programs/comments-section';
import { ReactionsBar } from '@/components/programs/reactions-bar';
import { useT } from '@/lib/i18n/i18n-provider';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const QUALITY_LABELS: Record<string, string> = {
  SD_480P: '480p',
  HD_720P: '720p',
  FULL_HD_1080P: '1080p',
  QHD_1440P: '1440p',
  UHD_4K: '4K',
  AUTO: 'Tự động',
};

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const { user, isLoading: authLoading } = useAuth();
  const id = params?.id ?? '';

  const { data: program, isLoading, error } = useLiveEventById(id);
  const { data: channelData } = useChannelBySlug(program?.channel?.slug ?? '');

  // Fetch related programs in the same channel
  const { data: relatedData } = useLiveEvents({
    channelId: program?.channelId,
    limit: 6,
  });

  const relatedPrograms =
    relatedData?.data?.filter((e) => e.id !== id).slice(0, 4) ?? [];

  const isRecording = id?.startsWith('rec-') || program?.contentSource === 'UPLOADED';
  const useRecording = isRecording;

  // If ID looks like a recording id and program is null, no extra fallback for now

  if (isLoading || authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-white mb-4">Không tìm thấy chương trình.</p>
        <Button asChild>
          <Link href="/epg">Về lịch phát sóng</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]">
      {/* Video Player Section */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto px-0 md:px-4">
          <VideoPlayer
            src={
              program.streamUrl ||
              program.embedCode ||
              program.externalUrl ||
              ''
            }
            poster={program.thumbnailUrl || undefined}
            type="hls"
            className="rounded-none md:rounded-xl"
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Program Info */}
            <div>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {program.status === 'LIVE' ? (
                  <LiveBadge size="lg" />
                ) : program.status === 'SCHEDULED' ? (
                  <UpcomingBadge />
                ) : (
                  <span className="px-3 py-1 rounded bg-dark-600 text-dark-300 text-sm">
                    {program.status === 'ENDED'
                      ? 'Đã kết thúc'
                      : 'Theo yêu cầu'}
                  </span>
                )}
                <span className="px-2 py-1 rounded bg-dark-700 text-dark-300 text-sm">
                  {QUALITY_LABELS[program.quality] ?? program.quality}
                </span>
                {program.language && (
                  <span className="px-2 py-1 rounded bg-dark-700 text-dark-300 text-sm">
                    {program.language}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {program.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-dark-400 mb-6">
                {program.channel && (
                  <Link
                    href={`/channels/${program.channel.slug}`}
                    className="flex items-center gap-2 hover:text-primary-400 transition-colors"
                  >
                    <ChannelLogo
                      slug={program.channel.slug}
                      logoUrl={program.channel.logoUrl}
                      name={program.channel.name}
                      category={channelData?.category}
                      size="sm"
                    />
                    <span>{program.channel.name}</span>
                  </Link>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(parseISO(program.scheduledAt), 'dd/MM/yyyy', {
                    locale: vi,
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(parseISO(program.scheduledAt), 'HH:mm')}
                  {program.endedAt &&
                    ` - ${format(parseISO(program.endedAt), 'HH:mm')}`}
                  {program.duration && ` (${program.duration} phút)`}
                </span>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <span className="flex items-center gap-1.5 text-dark-300">
                  <Eye className="w-4 h-4" />
                  {formatCompact(program.viewerCount)} lượt xem
                </span>
                <span className="flex items-center gap-1.5 text-dark-300">
                  <ThumbsUp className="w-4 h-4" />
                  {formatCompact(program.likeCount)}
                </span>
                <span className="flex items-center gap-1.5 text-dark-300">
                  <Share2 className="w-4 h-4" />
                  {formatCompact(program.shareCount)}
                </span>
              </div>
            </div>

            {/* Reactions Bar */}
            <Card className="p-6 glass-card">
              <h2 className="text-lg font-bold text-white mb-3">Thả cảm xúc</h2>
              <ReactionsBar recordingId={program.id} />
            </Card>

            {/* Description */}
            <Card className="p-6 glass-card">
              <h2 className="text-lg font-bold text-white mb-3">Mô tả</h2>
              <p className="text-dark-300 leading-relaxed">
                {program.description || 'Chưa có mô tả.'}
              </p>

              {program.tags && program.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-dark-700">
                  {program.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-dark-700 text-dark-300 text-sm hover:bg-dark-600 cursor-pointer transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {/* Comments */}
            <CommentsSection recordingId={program.id} />

            {/* Channel Info */}
            {program.channel && (
              <Card className="p-4 glass-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-lg font-bold text-white">
                      {program.channel.name[0]}
                    </div>
                    <div>
                      <Link
                        href={`/channels/${program.channel.slug}`}
                        className="font-semibold text-white hover:text-primary-400 transition-colors"
                      >
                        {program.channel.name}
                      </Link>
                      <p className="text-sm text-dark-400">
                        {program.status === 'LIVE'
                          ? `Đang phát sóng • ${program.viewerCount.toLocaleString()} đang xem`
                          : 'Kênh truyền hình'}
                      </p>
                    </div>
                  </div>
                  <Button asChild>
                    <Link href={`/channels/${program.channel.slug}`}>
                      Xem kênh
                    </Link>
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Related Programs */}
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700">
                <h3 className="font-bold text-white">Chương trình liên quan</h3>
              </div>
              <div className="divide-y divide-dark-700">
                {relatedPrograms.length === 0 ? (
                  <div className="p-4 text-sm text-dark-400 text-center">
                    Chưa có chương trình liên quan.
                  </div>
                ) : (
                  relatedPrograms.map((item) => (
                    <Link
                      key={item.id}
                      href={`/programs/${item.id}`}
                      className="flex items-center gap-3 p-4 hover:bg-dark-800/50 transition-colors"
                    >
                      <div className="w-16 h-10 rounded bg-dark-700 flex items-center justify-center flex-shrink-0">
                        <Play className="w-4 h-4 text-dark-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-dark-500">
                          {format(parseISO(item.scheduledAt), 'HH:mm')} •{' '}
                          {item.duration ?? '?'} phút
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

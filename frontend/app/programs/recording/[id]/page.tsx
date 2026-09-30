'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { VideoPlayer } from '@/components/programs/video-player';
import { SaveToWatchlistButton } from '@/components/programs/save-to-watchlist-button';
import { ShareButton } from '@/components/programs/share-button';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  useRecordingById,
  useRecordings,
  useSimilarRecordings,
} from '@/lib/hooks/usePrograms';
import { useChannelBySlug } from '@/lib/hooks/useChannels';
import { bumpRecordingShare, bumpRecordingView } from '@/lib/api/social';

const QUALITY_LABELS: Record<string, string> = {
  SD_480P: '480p',
  HD_720P: '720p',
  FULL_HD_1080P: '1080p',
  QHD_1440P: '1440p',
  UHD_4K: '4K',
  AUTO: 'Tự động',
};

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '?';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} phút`;
}

function formatViewCount(n?: number | string | bigint): string {
  if (n == null) return '0';
  const v = typeof n === 'bigint' ? Number(n) : Number(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export default function RecordingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const { data: recording, isLoading, error } = useRecordingById(id);
  const { data: channelData } = useChannelBySlug(recording?.channel?.slug ?? '');

  // Backend `/recordings/:id/similar` — falls back to same-channel
  // recordings of any category when the same-category bucket is empty.
  const { data: similarData } = useSimilarRecordings(
    recording?.id,
    6,
  );
  const related = useMemo(() => {
    if (Array.isArray(similarData)) {
      return similarData.filter((r) => r.id !== id).slice(0, 4);
    }
    return [];
  }, [similarData, id]);

  // Bump the view counter exactly once per page mount.
  useEffect(() => {
    if (!recording?.id) return;
    const seenKey = `oc_viewed_recording_${recording.id}`;
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(seenKey)) {
      return;
    }
    bumpRecordingView(recording.id)
      .then(() => {
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(seenKey, '1');
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-white mb-4">Không tìm thấy video.</p>
        <Button asChild>
          <Link href="/recordings">Về thư viện VOD</Link>
        </Button>
      </div>
    );
  }

  // Choose a playable source
  const playerSrc =
    recording.videoUrl ||
    recording.externalUrl ||
    (recording as any).embedCode ||
    '';

  return (
    <div className="min-h-[80vh]">
      {/* Video Player Section */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto px-0 md:px-4">
          <VideoPlayer
            src={playerSrc}
            poster={recording.thumbnailUrl || undefined}
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
                <span className="px-3 py-1 rounded bg-primary-500/20 text-primary-300 text-sm font-medium">
                  VOD
                </span>
                <span className="px-2 py-1 rounded bg-dark-700 text-dark-300 text-sm">
                  {QUALITY_LABELS[recording.quality] ?? recording.quality}
                </span>
                {recording.language && (
                  <span className="px-2 py-1 rounded bg-dark-700 text-dark-300 text-sm">
                    {recording.language}
                  </span>
                )}
                {recording.isAgeRestricted && (
                  <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-sm font-medium">
                    18+
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {recording.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-dark-400 mb-6">
                {recording.channel && (
                  <Link
                    href={`/channels/${recording.channel.slug}`}
                    className="flex items-center gap-2 hover:text-primary-400 transition-colors"
                  >
                    <ChannelLogo
                      slug={recording.channel.slug}
                      logoUrl={recording.channel.logoUrl}
                      name={recording.channel.name}
                      category={channelData?.category}
                      size="sm"
                    />
                    <span>{recording.channel.name}</span>
                  </Link>
                )}
                {recording.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(recording.publishedAt), 'dd/MM/yyyy', {
                      locale: vi,
                    })}
                  </span>
                )}
                {recording.duration > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(recording.duration)}
                  </span>
                )}
              </div>

              {/* Stats + Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <span className="flex items-center gap-1.5 text-dark-300">
                    <Eye className="w-4 h-4" />
                    {formatViewCount(recording.viewCount)} lượt xem
                  </span>
                  <span className="flex items-center gap-1.5 text-dark-300">
                    <ThumbsUp className="w-4 h-4" />
                    {formatViewCount(recording.likeCount)}
                  </span>
                  <ShareButton
                    url={`/programs/recording/${recording.id}`}
                    title={recording.title}
                    description={recording.description ?? undefined}
                    variant="stat"
                    count={recording.shareCount}
                    onCount={() => bumpRecordingShare(recording.id)}
                  />
                </div>
                <SaveToWatchlistButton
                  programId={recording.id}
                  channelId={recording.channelId}
                />
              </div>
            </div>

            {/* Description */}
            <Card className="p-6 glass-card">
              <h2 className="text-lg font-bold text-white mb-3">Mô tả</h2>
              <p className="text-dark-300 leading-relaxed whitespace-pre-line">
                {recording.description || 'Chưa có mô tả.'}
              </p>

              {recording.tags && recording.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-dark-700">
                  {recording.tags.map((tag: string) => (
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

            {/* Source info */}
            {(recording as any).externalPlatform && (
              <Card className="p-6 glass-card">
                <h2 className="text-lg font-bold text-white mb-3">Nguồn</h2>
                <p className="text-sm text-dark-400">
                  Nội dung được cung cấp bởi{' '}
                  <span className="text-primary-400 font-medium">
                    {(recording as any).externalPlatform}
                  </span>
                  {(recording as any).externalId && (
                    <>
                      {' '}
                      · ID:{' '}
                      <code className="text-dark-300 text-xs">
                        {(recording as any).externalId}
                      </code>
                    </>
                  )}
                </p>
              </Card>
            )}

            {/* Channel Info */}
            {recording.channel && (
              <Card className="p-4 glass-card">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <ChannelLogo
                      slug={recording.channel.slug}
                      logoUrl={recording.channel.logoUrl}
                      name={recording.channel.name}
                      category={recording.channel.category}
                      size="md"
                      className="flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/channels/${recording.channel.slug}`}
                        className="font-semibold text-white hover:text-primary-400 transition-colors truncate block"
                      >
                        {recording.channel.name}
                      </Link>
                      <p className="text-sm text-dark-400">Kênh truyền hình</p>
                    </div>
                  </div>
                  <Button asChild className="flex-shrink-0">
                    <Link href={`/channels/${recording.channel.slug}`}>
                      Xem kênh
                    </Link>
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Related Recordings */}
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                <h3 className="font-bold text-white">Video liên quan</h3>
                {recording.channel && (
                  <Link
                    href={`/channels/${recording.channel.slug}`}
                    className="text-xs text-primary-400 hover:underline flex items-center gap-1"
                  >
                    Xem tất cả
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <div className="divide-y divide-dark-700">
                {related.length === 0 ? (
                  <div className="p-4 text-sm text-dark-400 text-center">
                    Chưa có video liên quan.
                  </div>
                ) : (
                  related.map((item: any) => (
                    <Link
                      key={item.id}
                      href={`/programs/recording/${item.id}`}
                      className="flex gap-3 p-4 hover:bg-dark-800/50 transition-colors"
                    >
                      <div className="relative w-32 aspect-video rounded bg-dark-700 flex-shrink-0 overflow-hidden">
                        {item.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-6 h-6 text-dark-500" />
                          </div>
                        )}
                        {item.duration > 0 && (
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px]">
                            {formatDuration(item.duration)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white line-clamp-2">
                          {item.title}
                        </p>
                        <p className="text-xs text-dark-500 mt-1">
                          {item.channel?.name} · {formatViewCount(item.viewCount)} lượt xem
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

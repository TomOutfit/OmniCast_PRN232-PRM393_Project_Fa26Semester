'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { VideoPlayer } from '@/components/programs/video-player';
import type { VideoPlayerProps } from '@/components/programs/video-player';
import { VERIFIED_FALLBACK_STREAMS } from '@/lib/utils';
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

  // ── Local upload (demo) ───────────────────────────────────────────────────
  // Lets a presenter pick a video file from their machine — e.g. one they
  // downloaded from a previous stream or rendered offline — and play it back
  // immediately through the same VOD player. The file is exposed to <video>
  // through a `blob:` URL so no backend round-trip is required.
  const [localVideo, setLocalVideo] = useState<{
    url: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  /** Tracks the current blob URL so we can revoke it and free memory. */
  const localUrlRef = useRef<string | null>(null);

  // Revoke the blob URL on unmount to avoid leaking the file's memory.
  useEffect(() => {
    return () => {
      if (localUrlRef.current) {
        URL.revokeObjectURL(localUrlRef.current);
        localUrlRef.current = null;
      }
    };
  }, []);

  const handleLocalFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    // Revoke the previous blob URL before creating a new one.
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    const url = URL.createObjectURL(file);
    localUrlRef.current = url;
    setLocalVideo({
      url,
      name: file.name,
      size: file.size,
      type: file.type || 'video/mp4',
    });
  }, []);

  const clearLocalFile = useCallback(() => {
    if (localUrlRef.current) {
      URL.revokeObjectURL(localUrlRef.current);
      localUrlRef.current = null;
    }
    setLocalVideo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleLocalFile(e.target.files?.[0]);
    },
    [handleLocalFile],
  );

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="min-h-[80vh] flex flex-col">
        {/* Fallback demo player — surfaces the local-upload bar so the
            presenter can still prove the round-trip on stage even if the
            API is unreachable or the recording ID does not exist. */}
        <div className="bg-black">
          <div className="max-w-7xl mx-auto px-0 md:px-4">
            <VideoPlayer
              src={localVideo?.url || VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4}
              type="mp4"
              fallbackSrc={VERIFIED_FALLBACK_STREAMS.CLOUDINARY_DEMO_MP4}
              className="rounded-none md:rounded-xl"
              sourceAttribution={
                localVideo
                  ? `${localVideo.name} · Tệp cục bộ (${formatBytes(localVideo.size)})`
                  : 'Demo VOD — Big Buck Bunny 720p (Creative Commons)'
              }
            />
          </div>

          <div className="bg-gradient-to-b from-[#0c1019] to-black border-b border-[#162338]">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] font-mono font-black uppercase tracking-wider">
                  Demo VOD — Download rồi upload lại hệ thống
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                className="hidden"
                aria-label="Chọn file video từ máy"
              />

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#0f1a2c] hover:bg-[#152339] border-[#1b2b42] text-cyan-300"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Chọn file MP4/WebM từ máy
              </Button>

              {localVideo && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearLocalFile}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Bỏ chọn
                </Button>
              )}

              <div className="flex-1" />

              {localVideo && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                  <Play className="w-3 h-3 fill-current" />
                  <span className="truncate max-w-[180px]">{localVideo.name}</span>
                  <span className="text-emerald-500/60">·</span>
                  <span>{formatBytes(localVideo.size)}</span>
                  <span className="text-emerald-500/60">·</span>
                  <span>{localVideo.type.replace('video/', '').toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
          <p className="text-white mb-1 font-bold">Đang dùng bản demo offline</p>
          <p className="text-slate-400 text-xs mb-4 max-w-md text-center">
            Hệ thống không tìm thấy video theo yêu cầu, nhưng bạn vẫn có thể chọn file MP4/WebM đã tải về từ máy để phát thử.
          </p>
          <Button asChild variant="outline">
            <Link href="/recordings">Về thư viện VOD</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Choose a playable source + detect its type explicitly.
  // Explicit `type` beats auto-detection so Cloudinary transformation
  // URLs (no .mp4 suffix) still play as mp4 rather than defaulting to HLS.
  //
  // A locally-selected file (`blob:` URL) always wins — that is the
  // "download to your machine, then load it back into the system" demo
  // path and it must not be shadowed by a stale remote URL.
  const rawDbUrl = recording.videoUrl;
  const safeDbUrl =
    rawDbUrl &&
    (rawDbUrl.startsWith('blob:') ||
      rawDbUrl.includes('omnicast-api.vercel.app/uploads/'))
      ? (recording as any).fallbackUrl || VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4
      : rawDbUrl;

  const playerSrc =
    localVideo?.url ||
    safeDbUrl ||
    ((recording as any).externalPlatform === 'YOUTUBE' && (recording as any).externalId
      ? `https://www.youtube.com/watch?v=${(recording as any).externalId}`
      : null) ||
    recording.externalUrl ||
    (recording as any).embedCode ||
    VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4;

  // Determine player type: YouTube/Twitch → iframe, else MP4.
  // Cloudinary video upload URLs do NOT end in .mp4 when format
  // transformations are applied, so we also check for the Cloudinary
  // hostname as a reliable MP4 indicator.
  const isCloudinary =
    !!playerSrc &&
    !localVideo &&
    (/res\.cloudinary\.com/i.test(playerSrc) ||
      /cloudinary\.com/i.test(playerSrc));
  const isYouTube =
    !!playerSrc &&
    !localVideo &&
    (/youtube\.com|youtu\.be/i.test(playerSrc));
  const isTwitch =
    !!playerSrc &&
    !localVideo &&
    (/twitch\.tv/i.test(playerSrc));
  const isIframe = isYouTube || isTwitch;

  const playerType: VideoPlayerProps['type'] = isIframe
    ? 'iframe'
    : 'mp4';

  return (
    <div className="min-h-[80vh]">
      {/* Video Player Section */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto px-0 md:px-4">
          <VideoPlayer
            src={playerSrc}
            type={playerType}
            fallbackSrc={
              localVideo
                ? undefined
                : (recording as any).fallbackUrl ||
                  VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4
            }
            poster={recording.thumbnailUrl || undefined}
            className="rounded-none md:rounded-xl"
            sourceAttribution={
              localVideo
                ? `${localVideo.name} · Tệp cục bộ (${formatBytes(localVideo.size)})`
                : (recording as any).sourceAttribution || undefined
            }
          />
        </div>

        {/* Demo Upload Bar — lets the presenter prove the "download → re-upload" VOD flow
            on stage without leaving the page. */}
        <div className="bg-gradient-to-b from-[#0c1019] to-black border-b border-[#162338]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono font-black uppercase tracking-wider">
                Demo VOD — Download rồi upload lại hệ thống
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInput}
              className="hidden"
              aria-label="Chọn file video từ máy"
            />

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#0f1a2c] hover:bg-[#152339] border-[#1b2b42] text-cyan-300"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Chọn file MP4/WebM từ máy
            </Button>

            {localVideo && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearLocalFile}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Bỏ chọn
              </Button>
            )}

            <div className="flex-1" />

            {localVideo && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                <Play className="w-3 h-3 fill-current" />
                <span className="truncate max-w-[180px]">{localVideo.name}</span>
                <span className="text-emerald-500/60">·</span>
                <span>{formatBytes(localVideo.size)}</span>
                <span className="text-emerald-500/60">·</span>
                <span>{localVideo.type.replace('video/', '').toUpperCase()}</span>
              </div>
            )}
          </div>
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

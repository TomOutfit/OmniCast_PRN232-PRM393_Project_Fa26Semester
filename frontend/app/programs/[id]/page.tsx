'use client';

import { useMemo, useEffect } from 'react';
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
import { SaveToWatchlistButton } from '@/components/programs/save-to-watchlist-button';
import { ShareButton } from '@/components/programs/share-button';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  useLiveEventById,
  useLiveEvents,
  useRecordingById,
  useRecordings,
} from '@/lib/hooks/usePrograms';
import { useChannelBySlug } from '@/lib/hooks/useChannels';
import { CommentsSection } from '@/components/programs/comments-section';
import { ReactionsBar } from '@/components/programs/reactions-bar';
import { useT } from '@/lib/i18n/i18n-provider';
import { useAuth } from '@/lib/auth-context';
import { bumpLiveEventShare, bumpLiveEventView, bumpRecordingShare, bumpRecordingView } from '@/lib/api/social';
import { cn } from '@/lib/utils';
import { calculateLiveSeekOffset, isChannelPremium } from '@/lib/constants/channel-tiers';

const QUALITY_LABELS: Record<string, string> = {
  SD_480P: '480p',
  HD_720P: '720p',
  FULL_HD_1080P: '1080p',
  QHD_1440P: '1440p',
  UHD_4K: '4K',
  AUTO: 'Tự động',
};

const DEFAULT_PROGRAM_STREAMS: Record<string, string> = {
  'sport-1':     'https://www.youtube.com/embed/live_stream?channel=UCblfuW_4rakIf2h6aqANefA', // Red Bull
  'sport-2':     'https://www.youtube.com/embed/live_stream?channel=UC0R3-zRpeIVUnavcRTPWzZA', // F1
  'esports':     'https://www.youtube.com/embed/live_stream?channel=UCvqRdlKsE5Q8mf8YXbdIJLw', // LoL Esports
  'cine':        'https://www.youtube.com/embed/live_stream?channel=UCi8e0iOVk1fEOogdfu4YgfA', // Rotten Tomatoes
  'movies':      'https://www.youtube.com/embed/live_stream?channel=UCi8e0iOVk1fEOogdfu4YgfA',
  'drama':       'https://www.youtube.com/embed/live_stream?channel=UCWOA1ZGywLbqmigxE4Qlvuw', // Netflix
  'show':        'https://www.youtube.com/embed/live_stream?channel=UC8-Th83bH_thdKZDJCrn88g', // The Tonight Show
  'entertain':   'https://www.youtube.com/embed/live_stream?channel=UCRijo3ddMTht_IHyNSNXpNQ', // Dude Perfect
  'news':        'https://www.youtube.com/embed/live_stream?channel=UC16niRr50-MSBwiO3YDb3RA', // BBC News
  'business':    'https://www.youtube.com/embed/live_stream?channel=UCvJJ_dzjViJCoLf5uKUTwoA', // CNBC
  'music':       'https://www.youtube.com/embed/live_stream?channel=UCSJ4gkVC6NrvII8umztf0Ow', // Lofi Girl
  'kids':        'https://www.youtube.com/embed/live_stream?channel=UCXVCgDuD_QCkI7gTKU7-tpg', // Nat Geo Kids
  'tech':        'https://www.youtube.com/embed/live_stream?channel=UCBJycsmduvYEL83R_U4JriQ', // Marques Brownlee
  'discovery':   'https://www.youtube.com/embed/live_stream?channel=UCpVm7bg6pXKo1Pr6k5kxG9A', // Nat Geo
  'food':        'https://www.youtube.com/embed/live_stream?channel=UCJFp8uSYCjXOMnkUyb3CQ3Q', // Tasty
  'podcast':     'https://www.youtube.com/embed/live_stream?channel=UCAuUUnT6oDeKwE6v1NGQxug', // TED
  'audiobook':   'https://www.youtube.com/embed/live_stream?channel=UCf099SXtegD4kv9-M3GIgnw', // Greatest AudioBooks
  'academy':     'https://www.youtube.com/embed/live_stream?channel=UCX6b17PVsYBQ0ip5gyeme-Q', // CrashCourse
  'skill-lab':   'https://www.youtube.com/embed/live_stream?channel=UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
  'wellness':    'https://www.youtube.com/embed/live_stream?channel=UCFKE7WVJfvaHW5q283SxchA', // Yoga With Adriene
  'fashion':     'https://www.youtube.com/embed/live_stream?channel=UCRXiA3h1no_PFkb1JCP0yMA', // Vogue
  'travel-vn':   'https://www.youtube.com/embed/live_stream?channel=UCZE88kYvCKUKjM-G0uc8Duw', // Khoai Lang Thang
  'travel-world':'https://www.youtube.com/embed/live_stream?channel=UCGaOvAFinZ7BCN_FDmw74fQ', // Expedia
  'art-design':  'https://www.youtube.com/embed/live_stream?channel=UClM2LuQ1q5WEc23462tQzBg', // Proko
  'health':      'https://www.youtube.com/embed/live_stream?channel=UC0QHWhjbe5fGJEPz3sVb6nw', // Doctor Mike
  'indie-games': 'https://www.youtube.com/embed/live_stream?channel=UCKy1dAqELo0zrOtPkf0eTMw', // IGN
};

const FALLBACK_STREAM = 'https://www.youtube.com/embed/live_stream?channel=UC8butISFwT-Wl7EV0hUK0BQ';

function formatCompact(n: number | string | bigint | undefined): string {
  if (n == null) return '0';
  const v = typeof n === 'bigint' ? Number(n) : Number(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '?';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} phút`;
}

/**
 * Smart dispatcher for /programs/[id].
 *
 * LiveEvent IDs in seed look like UUIDs and ingest IDs are also UUIDs.
 * Recording IDs in seed start with `rec_` and ingest IDs are MD5 UUIDs.
 *
 * Heuristic:
 *   - If the ID matches `rec_*` → it's a Recording.
 *   - Else try LiveEvent first (faster query, smaller payload).
 *   - If LiveEvent 404s, fall back to Recording.
 */
export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();

  // Fast path: explicit Recording ID prefix.
  const looksLikeRecordingId =
    id.startsWith('rec_') || id.startsWith('rec-') || id.startsWith('recording/');

  const liveQuery = useLiveEventById(looksLikeRecordingId ? undefined : id);
  const recQuery = useRecordingById(looksLikeRecordingId ? id : undefined);

  const useRecording = looksLikeRecordingId || (liveQuery.isError && !recQuery.isError);

  if (liveQuery.isLoading || recQuery.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (useRecording) {
    if (recQuery.error || !recQuery.data) {
      return (
        <NotFoundBlock
          message="Không tìm thấy video."
          backHref="/recordings"
          backLabel="Về thư viện VOD"
        />
      );
    }
    return <RecordingView recording={recQuery.data} />;
  }

  if (liveQuery.error || !liveQuery.data) {
    // Fallback: try recording once before declaring not found
    if (!recQuery.isFetched && !recQuery.isError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      );
    }
    if (recQuery.data) {
      return <RecordingView recording={recQuery.data} />;
    }
    return (
      <NotFoundBlock
        message="Không tìm thấy chương trình."
        backHref="/epg"
        backLabel="Về lịch phát sóng"
      />
    );
  }

  return <LiveEventView program={liveQuery.data} />;
}

function NotFoundBlock({
  message,
  backHref,
  backLabel,
}: {
  message: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
      <p className="text-white mb-4">{message}</p>
      <Button asChild>
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </div>
  );
}

// ============================================================
// LIVE EVENT VIEW (legacy)
// ============================================================
function LiveEventView({ program }: { program: any }) {
  const t = useT();
  const { user, isLoading: authLoading } = useAuth();
  const { data: channelData } = useChannelBySlug(program.channel?.slug ?? '');

  const { data: relatedData } = useLiveEvents({
    channelId: program.channelId,
    limit: 6,
  });

  const relatedPrograms =
    relatedData?.data?.filter((e: any) => e.id !== program.id).slice(0, 4) ?? [];

  useEffect(() => {
    if (program?.id) {
      bumpLiveEventView(program.id).catch(() => {});
    }
  }, [program?.id]);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
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
              (program.externalPlatform === 'YOUTUBE' && program.externalId
                ? `https://www.youtube.com/watch?v=${program.externalId}`
                : null) ||
              program.embedCode ||
              program.externalUrl ||
              (program.channel?.slug ? DEFAULT_PROGRAM_STREAMS[program.channel.slug] : undefined) ||
              FALLBACK_STREAM
            }
            poster={program.thumbnailUrl || undefined}
            autoPlay={true}
            type="hls"
            className="rounded-none md:rounded-xl"
            initialSeekSeconds={calculateLiveSeekOffset(program.scheduledAt, program.duration)}
            isPremium={isChannelPremium(program.channel?.slug)}
            channelName={program.channel?.name || program.title}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {program.status === 'LIVE' ? (
                  <LiveBadge size="lg" />
                ) : program.status === 'SCHEDULED' ? (
                  <UpcomingBadge />
                ) : (
                  <span className="px-3 py-1 rounded bg-dark-600 text-dark-300 text-sm">
                    {program.status === 'ENDED' ? 'Đã kết thúc' : 'Theo yêu cầu'}
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
                  {format(parseISO(program.scheduledAt), 'dd/MM/yyyy', { locale: vi })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(parseISO(program.scheduledAt), 'HH:mm')}
                  {program.endedAt && ` - ${format(parseISO(program.endedAt), 'HH:mm')}`}
                  {program.duration && ` (${program.duration} phút)`}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <span className="flex items-center gap-1.5 text-dark-300">
                    <Eye className="w-4 h-4" />
                    {formatCompact(program.viewerCount)} lượt xem
                  </span>
                  <span className="flex items-center gap-1.5 text-dark-300">
                    <ThumbsUp className="w-4 h-4" />
                    {formatCompact(program.likeCount)}
                  </span>
                  <ShareButton
                    url={`/programs/${program.id}`}
                    title={program.title}
                    description={program.description ?? undefined}
                    variant="stat"
                    count={program.shareCount}
                    onCount={() => bumpLiveEventShare(program.id)}
                  />
                </div>
                <SaveToWatchlistButton
                  programId={program.id}
                  channelId={program.channelId}
                />
              </div>
            </div>

            <Card className="p-6 glass-card">
              <h2 className="text-lg font-bold text-white mb-3">Thả cảm xúc</h2>
              <ReactionsBar targetId={program.id} kind="liveEvent" />
            </Card>

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

            <CommentsSection targetId={program.id} kind="liveEvent" />

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
                    <Link href={`/channels/${program.channel.slug}`}>Xem kênh</Link>
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
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
                  relatedPrograms.map((item: any) => (
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
                          {format(parseISO(item.scheduledAt), 'HH:mm')} • {item.duration ?? '?'} phút
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

// ============================================================
// RECORDING VIEW (new)
// ============================================================
function RecordingView({ recording }: { recording: any }) {
  const { data: channelData } = useChannelBySlug(recording.channel?.slug ?? '');

  const { data: relatedData } = useRecordings({
    channelId: recording.channelId,
    limit: 6,
  });
  const related = useMemo(() => {
    const list =
      Array.isArray((relatedData as any)?.data)
        ? (relatedData as any).data
        : Array.isArray(relatedData)
          ? relatedData
          : [];
    return list.filter((r: any) => r.id !== recording.id).slice(0, 4);
  }, [relatedData, recording.id]);

  const playerSrc =
    recording.videoUrl ||
    (recording.externalPlatform === 'YOUTUBE' && recording.externalId
      ? `https://www.youtube.com/watch?v=${recording.externalId}`
      : null) ||
    recording.externalUrl ||
    recording.embedCode ||
    (recording.channel?.slug ? DEFAULT_PROGRAM_STREAMS[recording.channel.slug] : undefined) ||
    FALLBACK_STREAM;

  useEffect(() => {
    if (recording?.id) {
      bumpRecordingView(recording.id).catch(() => {});
    }
  }, [recording?.id]);

  return (
    <div className="min-h-[80vh]">
      <div className="bg-black">
        <div className="max-w-7xl mx-auto px-0 md:px-4">
          <VideoPlayer
            src={playerSrc}
            poster={recording.thumbnailUrl || undefined}
            autoPlay={true}
            type="hls"
            className="rounded-none md:rounded-xl"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
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
                    {format(parseISO(recording.publishedAt), 'dd/MM/yyyy', { locale: vi })}
                  </span>
                )}
                {recording.duration > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(recording.duration)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <span className="flex items-center gap-1.5 text-dark-300">
                    <Eye className="w-4 h-4" />
                    {formatCompact(recording.viewCount)} lượt xem
                  </span>
                  <span className="flex items-center gap-1.5 text-dark-300">
                    <ThumbsUp className="w-4 h-4" />
                    {formatCompact(recording.likeCount)}
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

            <Card className="p-6 glass-card">
              <h2 className="text-lg font-bold text-white mb-3">Thả cảm xúc</h2>
              <ReactionsBar targetId={recording.id} kind="recording" />
            </Card>

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

            <CommentsSection targetId={recording.id} kind="recording" />

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
                    <Link href={`/channels/${recording.channel.slug}`}>Xem kênh</Link>
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700">
                <h3 className="font-bold text-white">Video liên quan</h3>
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
                        <p className="text-sm font-medium text-white line-clamp-2">{item.title}</p>
                        <p className="text-xs text-dark-500 mt-1">
                          {item.channel?.name} · {formatCompact(item.viewCount)} lượt xem
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

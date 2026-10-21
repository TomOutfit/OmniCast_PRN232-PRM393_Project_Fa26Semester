/* eslint-disable @next/next/no-img-element */
// ============================================================
// OmniCast - Live Stream Watch Page (/live/[id])
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Radio, Users, Share2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { VideoPlayer } from '@/components/programs/video-player';
import { JoinLobbyCard } from '@/components/live/join-lobby-card';
import { LiveChatPanel } from '@/components/live/live-chat-panel';
import { fetchLiveInteraction, LiveEventInteractionSnapshot } from '@/lib/api/live';
import { useLiveSession } from '@/lib/hooks/useLiveSession';

export default function LiveWatchPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
  const [snapshot, setSnapshot] = useState<LiveEventInteractionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchLiveInteraction(eventId);
        if (mounted) {
          setSnapshot(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.message || err.message || 'Không thể tải sự kiện phát trực tiếp.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  const liveSession = useLiveSession(
    hasJoinedLobby ? eventId : null,
    snapshot
      ? {
          comments: snapshot.comments,
          reactions: snapshot.reactions,
          viewerCount: snapshot.viewerCount,
        }
      : undefined,
  );

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Đã sao chép liên kết phát trực tiếp vào clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-cyan-400">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">
          Đang kết nối phòng phát sóng...
        </p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="mx-auto my-16 max-w-md rounded-2xl border border-rose-500/30 bg-slate-900/90 p-8 text-center backdrop-blur-xl">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="mt-4 text-xl font-bold text-white">
          Không tìm thấy luồng phát
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {error || 'Sự kiện phát trực tiếp này có thể đã kết thúc hoặc không tồn tại.'}
        </p>
        <button
          onClick={() => router.push('/channels')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về danh sách kênh</span>
        </button>
      </div>
    );
  }

  // Pre-roll Join Lobby confirmation
  if (!hasJoinedLobby) {
    return (
      <div className="container mx-auto px-4 py-8">
        <JoinLobbyCard
          eventId={eventId}
          title={snapshot.title}
          description={snapshot.description}
          thumbnailUrl={snapshot.thumbnailUrl}
          channel={snapshot.channel}
          viewerCount={liveSession.viewerCount || snapshot.viewerCount}
          onJoin={() => setHasJoinedLobby(true)}
        />
      </div>
    );
  }

  // Calculate live seek offset so viewers tuning in midway watch the right broadcast timeline
  const initialSeekSeconds = snapshot.startedAt
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(snapshot.startedAt).getTime()) / 1000),
      )
    : 0;

  const currentStreamUrl =
    snapshot.streamUrl ||
    'https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_25fps.mp4';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
              title="Quay lại"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-black tracking-wider text-rose-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <Radio className="h-3.5 w-3.5" />
              <span>LIVE</span>
            </div>
            <h1 className="text-lg font-bold text-white line-clamp-1">
              {snapshot.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300">
              <Users className="h-4 w-4 text-cyan-400" />
              <span className="font-bold text-white">
                {liveSession.viewerCount || snapshot.viewerCount}
              </span>
              <span>đang xem</span>
            </div>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Chia sẻ</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Player on left, Realtime Chat on right */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Video Stream Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-2xl">
              <VideoPlayer
                src={currentStreamUrl}
                poster={snapshot.thumbnailUrl || undefined}
                autoPlay={true}
                channelSlug={snapshot.channel?.slug}
                channelName={snapshot.channel?.name}
                initialSeekSeconds={initialSeekSeconds}
                className="aspect-video w-full"
              />
            </div>

            {/* Program & Channel Meta */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {snapshot.channel?.logoUrl ? (
                  <img
                    src={snapshot.channel.logoUrl}
                    alt={snapshot.channel.name}
                    className="h-10 w-10 rounded-full object-cover border border-cyan-500/30"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 font-bold text-cyan-400">
                    {snapshot.channel?.name.slice(0, 1) || 'C'}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-white">
                    {snapshot.channel?.name || 'Kênh OmniCast'}
                  </h2>
                  <span className="text-xs text-cyan-400">
                    Kênh phát chính thức
                  </span>
                </div>
              </div>

              {snapshot.description && (
                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  {snapshot.description}
                </p>
              )}
            </div>
          </div>

          {/* Realtime 2-Way Chat Panel */}
          <div className="h-[600px] lg:h-auto lg:min-h-[580px]">
            <LiveChatPanel
              eventId={eventId}
              messages={liveSession.messages}
              reactions={liveSession.reactions}
              latestReaction={liveSession.latestReaction}
              broadcastMessage={liveSession.broadcastMessage}
              onSendMessage={liveSession.sendMessage}
              onSendReaction={liveSession.sendReaction}
              onDeleteMessage={liveSession.deleteMessage}
              onDismissAnnouncement={liveSession.dismissAnnouncement}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
// ============================================================
// OmniCast - Live Stream Continuous Broadcast Room (/live/[id])
// Themed Continuous Lounges by Channel Genre with Zero-Glitch Reactions
// ============================================================

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Radio,
  Users,
  Share2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Tv,
  Film,
  Music,
  Baby,
  Mic,
  Trophy,
  ChevronRight,
  Layers,
  MessageSquare,
  Play,
  Info,
  Clock,
  ShieldCheck,
  Volume2,
  Maximize2,
  Eye,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { VideoPlayer } from '@/components/programs/video-player';
import { JoinLobbyCard } from '@/components/live/join-lobby-card';
import { LiveChatPanel } from '@/components/live/live-chat-panel';
import { fetchLiveInteraction, LiveEventInteractionSnapshot, switchLiveEventProgram } from '@/lib/api/live';
import { fetchLiveNow, fetchRecordings } from '@/lib/api/programs';
import { useLiveSession } from '@/lib/hooks/useLiveSession';
import { useAuth } from '@/lib/auth-context';
import type { LiveEvent, Recording } from '@/types';

// ── Room Genre Theme Profiles ──────────────────────────────────────────────
interface RoomThemeProfile {
  title: string;
  badge: string;
  slogan: string;
  categoryLabel: string;
  glow: string;
  secondaryGlow: string;
  borderAccent: string;
  textAccent: string;
  bgAccent: string;
  ringAccent: string;
  icon: React.ElementType;
  perks: string[];
}

function resolveRoomTheme(
  category?: string | null,
  channelName?: string | null,
  eventTitle?: string | null,
): RoomThemeProfile {
  const normCat = (category || '').toUpperCase();
  const normName = (channelName || '').toLowerCase();
  const normTitle = (eventTitle || '').toLowerCase();

  // 1. KIDS
  if (
    normCat === 'KIDS' ||
    normName.includes('kid') ||
    normTitle.includes('cừu vui vẻ') ||
    normTitle.includes('hoạt hình')
  ) {
    return {
      title: 'Căn Phòng Thiếu Nhi & Gia Đình',
      badge: '🎪 PHÒNG THIẾU NHI 24/7',
      slogan: 'Không gian hoạt hình vui nhộn & phiêu lưu kỳ thú phát sóng liên tục cho bé',
      categoryLabel: 'Thiếu nhi & Gia đình',
      glow: 'rgba(245, 158, 11, 0.28)',
      secondaryGlow: 'rgba(6, 182, 212, 0.25)',
      borderAccent: 'border-amber-400/40',
      textAccent: 'text-amber-300',
      bgAccent: 'bg-amber-500/10',
      ringAccent: 'ring-amber-400/40',
      icon: Baby,
      perks: [
        'Chuỗi tập hoạt hình phát liên tục 24/7',
        'Nội dung tuyển chọn an toàn tuyệt đối cho bé',
        'Âm lượng chuẩn hóa, bảo vệ thính giác',
        'Hình ảnh sống động độ phân giải cao',
      ],
    };
  }

  // 2. PODCAST & AUDIOBOOK
  if (
    normCat === 'PODCAST' ||
    normName.includes('audiobook') ||
    normName.includes('podcast') ||
    normTitle.includes('podcast')
  ) {
    return {
      title: 'Studio Đối Thoại & Podcast Chuyên Sâu',
      badge: '🎙️ PODCAST STUDIO 24/7',
      slogan: 'Không gian đối thoại lắng đọng, audiobook và những góc nhìn truyền cảm hứng',
      categoryLabel: 'Podcast & Audio',
      glow: 'rgba(217, 119, 6, 0.32)',
      secondaryGlow: 'rgba(234, 88, 12, 0.22)',
      borderAccent: 'border-amber-500/40',
      textAccent: 'text-amber-400',
      bgAccent: 'bg-amber-600/10',
      ringAccent: 'ring-amber-500/40',
      icon: Mic,
      perks: [
        'Chất lượng giọng nói chuẩn phòng thu Acoustic',
        'Dòng chảy âm thanh thư giãn liên tục',
        'Trọn bộ các tập chuyên mục không ngắt quãng',
        'Tương tác trực tiếp cùng diễn giả & thính giả',
      ],
    };
  }

  // 3. MUSIC
  if (
    normCat === 'MUSIC' ||
    normName.includes('music') ||
    normTitle.includes('sân khấu') ||
    normTitle.includes('anh tài') ||
    normTitle.includes('liveshow')
  ) {
    return {
      title: 'Sân Khấu Live Stage & Âm Nhạc Lossless',
      badge: '🎵 LIVE STAGE CONCERT',
      slogan: 'Sân khấu âm nhạc lossless đỉnh cao, liveshow và hòa âm ánh sáng rực rỡ',
      categoryLabel: 'Âm nhạc & Trình diễn',
      glow: 'rgba(192, 38, 211, 0.32)',
      secondaryGlow: 'rgba(124, 58, 237, 0.25)',
      borderAccent: 'border-fuchsia-400/40',
      textAccent: 'text-fuchsia-300',
      bgAccent: 'bg-fuchsia-500/10',
      ringAccent: 'ring-fuchsia-400/40',
      icon: Music,
      perks: [
        'Âm thanh Spatial Hi-Fi trung thực',
        'Sân khấu trình diễn 60fps chuẩn phòng hòa nhạc',
        'Visualizer ánh sáng đồng điệu theo giai điệu',
        'Không gian kết nối người hâm mộ thời gian thực',
      ],
    };
  }

  // 4. EDUCATION & ACADEMY
  if (
    normCat === 'EDUCATION' ||
    normName.includes('academy') ||
    normTitle.includes('khám phá') ||
    normTitle.includes('khoa học')
  ) {
    return {
      title: 'Phòng Sáng Tạo & Học Thuật Tinh Hoa',
      badge: '🎓 SÂN KHẤU HỌC THUẬT',
      slogan: 'Không gian biểu diễn nghệ thuật, bài giảng và sáng tạo kiến thức tinh hoa',
      categoryLabel: 'Học thuật & Trình diễn',
      glow: 'rgba(16, 185, 129, 0.3)',
      secondaryGlow: 'rgba(14, 165, 233, 0.22)',
      borderAccent: 'border-emerald-400/40',
      textAccent: 'text-emerald-300',
      bgAccent: 'bg-emerald-500/10',
      ringAccent: 'ring-emerald-400/40',
      icon: Sparkles,
      perks: [
        'Nội dung giáo dục & trình diễn có bản quyền',
        'Lịch phát liên tục các số chuyên đề',
        'Trình chiếu tài liệu và hỏi đáp đồng bộ',
        'Chất lượng hình ảnh bài giảng 1080p Ultra',
      ],
    };
  }

  // 5. SPORTS
  if (
    normCat === 'SPORTS' ||
    normName.includes('sport') ||
    normTitle.includes('bóng đá') ||
    normTitle.includes('thể thao')
  ) {
    return {
      title: 'Đấu Trường Thể Thao Live Non-Stop',
      badge: '⚡ ĐẤU TRƯỜNG THỂ THAO',
      slogan: 'Kịch tính từng giây cùng những pha bóng đỉnh cao và giải đấu nảy lửa',
      categoryLabel: 'Thể thao & Tranh tài',
      glow: 'rgba(34, 197, 94, 0.32)',
      secondaryGlow: 'rgba(239, 68, 68, 0.22)',
      borderAccent: 'border-emerald-400/40',
      textAccent: 'text-emerald-400',
      bgAccent: 'bg-emerald-500/10',
      ringAccent: 'ring-emerald-400/40',
      icon: Trophy,
      perks: [
        'Độ trễ truyền phát siêu thấp Ultra-low Latency',
        'Bình luận chuyên sâu tiếng Việt thời gian thực',
        'Highlight tình huống cập nhật liên tục',
        'Thống kê trận đấu đồng bộ từng giây',
      ],
    };
  }

  // 6. CINE & DRAMA
  if (
    normCat === 'CINE' ||
    normCat === 'DRAMA' ||
    normName.includes('cine') ||
    normName.includes('drama') ||
    normTitle.includes('phim') ||
    normTitle.includes('trailer')
  ) {
    return {
      title: 'Rạp Chiếu Phim Obsidian Theater',
      badge: '🎬 RẠP CHIẾU TRỰC TUYẾN',
      slogan: 'Suất chiếu phim bộ và điện ảnh liên tục với không gian rạp tại gia',
      categoryLabel: 'Điện ảnh & Phim truyện',
      glow: 'rgba(225, 29, 72, 0.28)',
      secondaryGlow: 'rgba(139, 92, 246, 0.22)',
      borderAccent: 'border-rose-400/40',
      textAccent: 'text-rose-300',
      bgAccent: 'bg-rose-500/10',
      ringAccent: 'ring-rose-400/40',
      icon: Film,
      perks: [
        'Màu sắc điện ảnh DCI-P3 chuẩn Hollywood',
        'Âm thanh vòm Dolby Audio đa kênh',
        'Tự động nối tiếp tập tiếp theo 24/7',
        'Chế độ Cinema Mode tắt đèn tập trung',
      ],
    };
  }

  // 7. DEFAULT BROADCAST LOUNGE
  return {
    title: 'Phòng Phát Sóng OmniCast Studio',
    badge: '📡 PHÒNG PHÁT SÓNG 24/7',
    slogan: 'Trải nghiệm truyền hình đa kênh liên tục thế hệ mới với độ ổn định cao',
    categoryLabel: 'Kênh Phát Sóng Trực Tiếp',
    glow: 'rgba(6, 182, 212, 0.28)',
    secondaryGlow: 'rgba(99, 102, 241, 0.22)',
    borderAccent: 'border-cyan-400/40',
    textAccent: 'text-cyan-300',
    bgAccent: 'bg-cyan-500/10',
    ringAccent: 'ring-cyan-400/40',
    icon: Tv,
    perks: [
      'Phát sóng liên tục không gián đoạn 24/7',
      'Đồng bộ đa thiết bị Web & Di động tức thì',
      'Tự động tối ưu băng thông mạng',
      'Tương tác hai chiều mượt mà',
    ],
  };
}

// Reaction emoji mapping for floating particles
const REACTION_EMOJIS: Record<string, string> = {
  HEART: '❤️',
  FIRE: '🔥',
  CLAP: '👏',
  PARTY: '🎉',
};

interface FloatingParticle {
  id: string;
  emoji: string;
  xOffset: number;
}

export default function LiveWatchPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
  const [snapshot, setSnapshot] = useState<LiveEventInteractionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Other continuous rooms and lineup state
  const [activeRooms, setActiveRooms] = useState<LiveEvent[]>([]);
  const [channelLineup, setChannelLineup] = useState<Recording[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'lineup' | 'specs'>('chat');
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [isSwitchingProgram, setIsSwitchingProgram] = useState(false);

  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN';

  // Load primary event interaction
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

  // Load other active rooms and channel lineup in the background
  useEffect(() => {
    let mounted = true;
    async function loadRoomsAndLineup() {
      try {
        const liveNowList = await fetchLiveNow().catch(() => []);
        if (mounted && Array.isArray(liveNowList)) {
          setActiveRooms(liveNowList);
        }

        if (snapshot?.channel?.id) {
          const recs = await fetchRecordings({
            channelId: snapshot.channel.id,
            limit: 8,
          }).catch(() => null);
          if (mounted && recs?.data) {
            setChannelLineup(recs.data);
          }
        }
      } catch {
        // Non-critical background metadata fetch
      }
    }

    if (snapshot) {
      loadRoomsAndLineup();
    }
    return () => {
      mounted = false;
    };
  }, [snapshot]);

  // Live session realtime hook
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

  // Spawn isolated floating emoji particles without touching video playback
  const spawnParticle = useCallback((type: string) => {
    const emoji = REACTION_EMOJIS[type] || '✨';
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const xOffset = Math.floor(Math.random() * 80) - 40; // -40px to +40px drift

    setFloatingParticles((prev) => [...prev.slice(-12), { id, emoji, xOffset }]);

    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== id));
    }, 1800);
  }, []);

  // When a socket reaction arrives, spawn a particle
  useEffect(() => {
    if (liveSession.latestReaction) {
      spawnParticle(liveSession.latestReaction);
    }
  }, [liveSession.latestReaction, spawnParticle]);

  // Handle user reaction click
  const handleUserReaction = useCallback(
    (type: string) => {
      spawnParticle(type);
      liveSession.sendReaction(type);
    },
    [liveSession, spawnParticle],
  );

  // Listen for real-time program change (triggered by Admin/Staff switching the episode)
  useEffect(() => {
    if (liveSession.programChange) {
      const pc = liveSession.programChange;
      setSnapshot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          title: pc.title,
          streamUrl: pc.streamUrl,
          description: pc.description || prev.description,
        };
      });
      toast.info(`Chương trình đã chuyển sang: "${pc.title}"`, {
        description: 'Đài phát sóng vừa cập nhật tập phát sóng tiếp theo.',
        icon: '📺',
      });
    }
  }, [liveSession.programChange]);

  // Admin / Staff switches the active program on the fly
  const handleSwitchProgram = async (recording: Recording) => {
    if (!isStaffOrAdmin) {
      toast.error('Bạn không có quyền chuyển chương trình. Chỉ Admin/Staff mới có thể điều phối.');
      return;
    }
    try {
      setIsSwitchingProgram(true);
      await switchLiveEventProgram(eventId, recording.id);
      setSnapshot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          title: recording.title,
          streamUrl: recording.videoUrl || prev.streamUrl,
          description: recording.description || prev.description,
        };
      });
      toast.success('Đã chuyển phát tiếp thành công!', {
        description: `Đang phát "${recording.title}" trên kênh ${snapshot?.channel?.name || ''}.`,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể chuyển chương trình.');
    } finally {
      setIsSwitchingProgram(false);
    }
  };

  // Memoize initial seek strictly per event to prevent any playback rewinds
  const initialSeekSeconds = useMemo(() => {
    if (!snapshot?.startedAt) return 0;
    const startTime = new Date(snapshot.startedAt).getTime();
    if (isNaN(startTime)) return 0;
    return Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.eventId, snapshot?.startedAt]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Đã sao chép liên kết phòng phát sóng vào clipboard!');
    }
  };

  const theme = useMemo(() => {
    return resolveRoomTheme(
      snapshot?.channel?.category,
      snapshot?.channel?.name,
      snapshot?.title,
    );
  }, [snapshot?.channel?.category, snapshot?.channel?.name, snapshot?.title]);

  const currentStreamUrl = useMemo(() => {
    return (
      snapshot?.streamUrl ||
      'https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_25fps.mp4'
    );
  }, [snapshot?.streamUrl]);

  if (loading) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center gap-4 bg-slate-950 text-cyan-400">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Đang kết nối vào không gian phát sóng liên tục…
        </p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="mx-auto my-16 max-w-md rounded-2xl border border-rose-500/30 bg-slate-900/90 p-8 text-center backdrop-blur-xl">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="mt-4 text-xl font-bold text-white">
          Không tìm thấy phòng phát sóng
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {error || 'Sự kiện này có thể đã kết thúc hoặc chuyển sang căn phòng khác.'}
        </p>
        <button
          onClick={() => router.push('/channels')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về danh sách kênh phát sóng</span>
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
          viewerCount={liveSession.viewerCount}
          onJoin={() => setHasJoinedLobby(true)}
        />
      </div>
    );
  }

  const ThemeIcon = theme.icon;

  return (
    <div className="relative min-h-screen bg-[#070b12] text-slate-100 selection:bg-cyan-500/30">
      {/* ── Atmospheric Ambient Backdrop (Themed Ambilight Glow) ──────────────── */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle at 40% 18%, ${theme.glow} 0%, ${theme.secondaryGlow} 35%, transparent 70%)`,
          opacity: isCinemaMode ? 0.35 : 0.85,
        }}
      />

      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* ── Room Header Bar ────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3.5 backdrop-blur-md">
          {/* Left: Back & Dedicated Room Identification */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            {/* Room Genre Badge */}
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-black tracking-wide transition-all shadow-sm ${theme.borderAccent} ${theme.bgAccent} ${theme.textAccent}`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <ThemeIcon className="h-3.5 w-3.5" />
              <span>{theme.badge}</span>
            </div>

            {/* Current Program Title */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                Đang phát:
              </span>
              <h1 className="text-sm md:text-base font-bold text-white line-clamp-1 max-w-xs md:max-w-md lg:max-w-xl">
                {snapshot.title}
              </h1>
            </div>
          </div>

          {/* Right: Live Viewers, Mode Toggles, Share */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-300">
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-bold text-white">{liveSession.viewerCount}</span>
              <span className="hidden sm:inline">khán giả</span>
            </div>

            {isStaffOrAdmin && (
              <Link
                href={`/studio/live?channel=${snapshot.channel?.slug || ''}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-950/60 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500 hover:text-black transition shadow-sm"
                title="Mở Studio để điều phối hoặc phát file từ máy"
              >
                <Radio className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                <span className="hidden sm:inline">Live Studio</span>
              </Link>
            )}

            <button
              onClick={() => setIsCinemaMode((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                isCinemaMode
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title="Chế độ rạp chiếu"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">
                {isCinemaMode ? 'Thường' : 'Rạp chiếu'}
              </span>
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chia sẻ</span>
            </button>
          </div>
        </div>

        {/* ── Continuous Broadcast Shelf (Other Active Rooms On-Air) ───────── */}
        {activeRooms.length > 0 && (
          <div className="mb-5 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Radio className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                <span>Các căn phòng phát sóng liên tục (On-Air)</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Nhấp để chuyển phòng phát tức thì
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
              {activeRooms.map((room) => {
                const isCurrent = room.id === eventId;
                const roomCat = room.channel?.category || 'SHOW';
                const roomTheme = resolveRoomTheme(roomCat, room.channel?.name, room.title);

                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      if (!isCurrent) router.push(`/live/${room.id}`);
                    }}
                    className={`group relative flex shrink-0 items-center gap-3 rounded-xl border px-3.5 py-2 text-left transition-all ${
                      isCurrent
                        ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400 shadow-md'
                        : 'border-slate-800/90 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/80'
                    }`}
                  >
                    {room.channel?.logoUrl ? (
                      <img
                        src={room.channel.logoUrl}
                        alt={room.channel.name}
                        className="h-8 w-8 shrink-0 rounded-full object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-cyan-400">
                        {room.channel?.name?.slice(0, 1) || 'O'}
                      </div>
                    )}

                    <div className="flex flex-col max-w-[170px] sm:max-w-[210px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold uppercase ${roomTheme.textAccent}`}
                        >
                          {room.channel?.name || 'Kênh OmniCast'}
                        </span>
                        {isCurrent && (
                          <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-black text-rose-400">
                            HIỆN TẠI
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-white truncate">
                        {room.title}
                      </span>
                    </div>

                    <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 transition" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Main Layout: Player Stage on Left, Audience Lounge on Right ── */}
        <div
          className={`grid grid-cols-1 gap-6 transition-all duration-300 ${
            isCinemaMode ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
          }`}
        >
          {/* ── Left Column: Video Stage & Dedicated Room Info ────────── */}
          <div
            className={`space-y-4 ${
              isCinemaMode ? 'lg:col-span-3' : 'lg:col-span-2'
            }`}
          >
            {/* Player Container with Glow Halo and Floating Reactions Overlay */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-black shadow-2xl">
              {/* Diffuse Ambient Ambilight behind player */}
              <div
                className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl filter blur-xl opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${theme.glow}, ${theme.secondaryGlow})`,
                }}
              />

              <VideoPlayer
                src={currentStreamUrl}
                poster={snapshot.thumbnailUrl || undefined}
                autoPlay={true}
                channelSlug={snapshot.channel?.slug}
                channelName={snapshot.channel?.name}
                initialSeekSeconds={initialSeekSeconds}
                className="aspect-video w-full"
              />

              {/* Floating Reaction Emojis Canvas */}
              <div className="pointer-events-none absolute bottom-4 right-6 z-30 flex flex-col items-center">
                {floatingParticles.map((particle) => (
                  <span
                    key={particle.id}
                    style={{
                      transform: `translateX(${particle.xOffset}px)`,
                    }}
                    className="absolute bottom-2 select-none text-3xl filter drop-shadow-lg animate-float-burst"
                  >
                    {particle.emoji}
                  </span>
                ))}
              </div>
            </div>

            {/* Room & Channel Specifications Card */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {snapshot.channel?.logoUrl ? (
                    <img
                      src={snapshot.channel.logoUrl}
                      alt={snapshot.channel.name}
                      className={`h-12 w-12 rounded-full object-cover border-2 shadow-md ${theme.borderAccent}`}
                    />
                  ) : (
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full font-bold text-base border-2 shadow-md ${theme.borderAccent} ${theme.bgAccent} ${theme.textAccent}`}
                    >
                      {snapshot.channel?.name?.slice(0, 1) || 'C'}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">
                        {snapshot.channel?.name || 'Kênh OmniCast'}
                      </h2>
                      <ShieldCheck className="h-4 w-4 text-cyan-400" />
                    </div>
                    <p className="text-xs text-slate-400">{theme.slogan}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-[11px] font-mono text-slate-400">
                    1080p 60fps
                  </span>
                  <span className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-[11px] font-mono text-slate-400">
                    SPATIAL HI-FI
                  </span>
                  <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                    24/7 NON-STOP
                  </span>
                </div>
              </div>

              {snapshot.description && (
                <p className="mt-3.5 text-xs md:text-sm leading-relaxed text-slate-300/90 border-t border-slate-800/60 pt-3">
                  {snapshot.description}
                </p>
              )}

              {/* Dedicated Perks Chips */}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800/60 pt-3">
                {theme.perks.map((perk, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800/90 bg-slate-950/50 px-2.5 py-1 text-[11px] text-slate-300"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Column: Dedicated Multi-Tab Audience Lounge ─────── */}
          <div className="flex flex-col h-[650px] lg:h-auto lg:min-h-[640px] rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-2xl backdrop-blur-md overflow-hidden">
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/70 p-1.5">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  activeTab === 'chat'
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                <span>Trò chuyện</span>
              </button>

              <button
                onClick={() => setActiveTab('lineup')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  activeTab === 'lineup'
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="h-3.5 w-3.5 text-amber-400" />
                <span>Lịch liên tục</span>
                {channelLineup.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-300">
                    {channelLineup.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('specs')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  activeTab === 'specs'
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Info className="h-3.5 w-3.5 text-emerald-400" />
                <span>Chi tiết phòng</span>
              </button>
            </div>

            {/* Tab 1: Realtime Live Chat & Isolated Reaction Bar */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col h-full">
                <LiveChatPanel
                  eventId={eventId}
                  messages={liveSession.messages}
                  reactions={liveSession.reactions}
                  latestReaction={liveSession.latestReaction}
                  broadcastMessage={liveSession.broadcastMessage}
                  onSendMessage={liveSession.sendMessage}
                  onSendReaction={handleUserReaction}
                  onDeleteMessage={liveSession.deleteMessage}
                  onDismissAnnouncement={liveSession.dismissAnnouncement}
                />
              </div>
            )}

            {/* Tab 2: Continuous Program Lineup (EPG & Queued Episodes) */}
            {activeTab === 'lineup' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                    </span>
                    <span>ĐANG PHÁT TRỰC TIẾP TRONG PHÒNG NÀY</span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-white line-clamp-1">
                    {snapshot.title}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-cyan-400" />
                    <span>Tự động phát liên tục • Không ngắt quãng</span>
                  </p>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Các tập & Chương trình nối tiếp
                    </h5>
                    {isStaffOrAdmin && (
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                        Chế độ Điều Phối (Admin/Staff)
                      </span>
                    )}
                  </div>

                  {/* Role-based Guidance Box */}
                  {isStaffOrAdmin ? (
                    <div className="mb-3 rounded-xl border border-purple-500/40 bg-purple-950/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-purple-400" />
                          <span className="text-xs font-black text-purple-200 uppercase tracking-wide">
                            QUYỀN ĐIỀU PHỐI HOST / ADMIN
                          </span>
                        </div>
                        <Link
                          href={`/studio/live?channel=${snapshot.channel?.slug || ''}`}
                          className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 hover:bg-purple-500 hover:text-black transition"
                          title="Vào Studio phát sóng"
                        >
                          <Radio className="h-3 w-3" />
                          <span>Live Studio ↗</span>
                        </Link>
                      </div>
                      <p className="mt-1 text-[11px] text-purple-300/80 leading-relaxed">
                        Bạn có quyền chọn ngay chương trình tiếp theo bên dưới để phát sóng lập tức cho toàn bộ người xem trong phòng.
                      </p>
                    </div>
                  ) : (
                    <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 text-[11px] text-slate-400 flex items-center gap-2">
                      <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      <span>Chế độ Khán giả: Thưởng thức chương trình nối tiếp 24/7 và tương tác bình luận, thả cảm xúc cùng cộng đồng.</span>
                    </div>
                  )}

                  {channelLineup.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Đang đồng bộ danh sách chương trình nối tiếp của kênh…
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {channelLineup.map((item, idx) => {
                        const isCurrentPlaying =
                          item.title === snapshot.title ||
                          item.videoUrl === snapshot.streamUrl;

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 rounded-xl border p-2.5 transition ${
                              isCurrentPlaying
                                ? 'border-cyan-500/50 bg-cyan-950/30'
                                : 'border-slate-800/80 bg-slate-950/50 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-400">
                              #{idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h6 className="text-xs font-semibold text-white truncate">
                                {item.title}
                              </h6>
                              <span className="text-[11px] text-slate-500">
                                {item.duration ? `${Math.round(item.duration / 60)} phút` : 'Tập tiếp theo'}
                              </span>
                            </div>

                            {isCurrentPlaying ? (
                              <span className="shrink-0 rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-black text-cyan-300 ring-1 ring-cyan-400/40 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                ĐANG PHÁT
                              </span>
                            ) : isStaffOrAdmin ? (
                              <button
                                onClick={() => handleSwitchProgram(item)}
                                disabled={isSwitchingProgram}
                                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 text-[11px] font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
                                title="Chuyển phát ngay chương trình này"
                              >
                                {isSwitchingProgram ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Play className="h-3 w-3 fill-current" />
                                )}
                                <span>Phát tiếp ngay</span>
                              </button>
                            ) : (
                              <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                                Nối tiếp
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Dedicated Room Specs & Audience Experience Guide */}
            {activeTab === 'specs' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 text-xs">
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">
                    {theme.title}
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    {theme.slogan}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                    Thông số phòng phát sóng
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-slate-400">
                    <div>
                      <span className="block text-[10px] text-slate-500">Thể loại</span>
                      <span className="font-medium text-white">{theme.categoryLabel}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">Độ phân giải</span>
                      <span className="font-medium text-white">Full HD 1080p</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">Tốc độ khung hình</span>
                      <span className="font-medium text-white">60 FPS Ultra</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">Âm thanh</span>
                      <span className="font-medium text-white">Spatial Surround</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] block mb-2">
                    Đặc quyền phòng khán giả
                  </span>
                  <ul className="space-y-2 text-slate-300">
                    {theme.perks.map((p, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

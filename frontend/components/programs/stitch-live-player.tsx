'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Tv,
  Share2,
  Heart,
  Cast,
  Send,
  Sparkles,
  BarChart3,
  MessageSquare,
  Vote,
  Layers,
  Radio,
  Clock,
  Zap,
  CheckCircle2,
  Flame,
  Trophy,
  Smile,
  Shield,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLiveNow, useLiveEvents } from '@/lib/hooks/usePrograms';
import { useChannels } from '@/lib/hooks/useChannels';
import { useComments, useCreateComment, useLiveEventReactions, useToggleLiveEventReaction } from '@/lib/hooks/useSocial';
import type { LiveEvent, Channel } from '@/types';

interface FloatingReaction {
  id: number;
  emoji: string;
  x: number;
}

export interface StitchLivePlayerProps {
  initialEvent?: LiveEvent;
  channelId?: string;
}

export function StitchLivePlayer({ initialEvent, channelId }: StitchLivePlayerProps = {}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [activeCamIndex, setActiveCamIndex] = useState<number>(0);
  const [commentaryTrack, setCommentaryTrack] = useState('TV 1 (Quang Huy & Anh Ngọc)');
  const [resolution, setResolution] = useState('4K UHD 60FPS');
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'stats' | 'mvp'>('chat');
  
  // DVR Scrubber simulation
  const [scrubberPos, setScrubberPos] = useState(94); // 94% = -00:11:18 Time-shift
  const [isLiveHead, setIsLiveHead] = useState(false);

  // Dynamic API Hooks
  const { data: liveNowEvents } = useLiveNow();
  const { data: channelsData } = useChannels({ limit: 50 });

  // Resolve active event from API or prop
  const activeEvent: LiveEvent | undefined = useMemo(() => {
    if (initialEvent) return initialEvent;
    if (channelId && liveNowEvents && liveNowEvents.length > 0) {
      const match = liveNowEvents.find((e) => e.channelId === channelId);
      if (match) return match;
    }
    if (liveNowEvents && liveNowEvents.length > 0) {
      return liveNowEvents[0];
    }
    return undefined;
  }, [initialEvent, channelId, liveNowEvents]);

  // Real Social Reactions & Comments
  const { data: reactionSummary } = useLiveEventReactions(activeEvent?.id);
  const toggleReactionMutation = useToggleLiveEventReaction(activeEvent?.id || '');
  const { data: commentsData } = useComments(activeEvent?.id, 1, 25);
  const createCommentMutation = useCreateComment(activeEvent?.id || '');

  // Likes & Shares & Cast
  const [likeCount, setLikeCount] = useState(148200);
  const [hasLiked, setHasLiked] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);
  const [castingDevice, setCastingDevice] = useState<string | null>(null);

  // Live Chat state
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'Trần Hoàng',
      badge: 'VIP MEMBER',
      badgeColor: 'from-amber-400 to-yellow-500',
      time: '03:46',
      avatarBg: 'bg-cyan-600',
      text: 'Pha cứu thua không tưởng của Courtois!! Man City ép sân nghẹt thở quá 🔥 ⚽',
    },
    {
      id: 2,
      sender: 'Lê Khánh',
      badge: '',
      badgeColor: '',
      time: '03:47',
      avatarBg: 'bg-purple-600',
      text: 'Foden trận này đá cánh hay nhất mùa rồi. Góc cam Tactical xem rõ vị trí chạy chỗ đã man.',
    },
    {
      id: 3,
      sender: 'Văn Minh',
      badge: 'MOD',
      badgeColor: 'from-red-500 to-pink-600',
      time: '03:47',
      avatarBg: 'bg-red-600',
      text: 'Đề nghị các bạn giữ lịch sự trong box chat nhé. Chuẩn bị có hiệp phụ!',
    },
    {
      id: 4,
      sender: 'An Nguyên',
      badge: '',
      badgeColor: '',
      time: '03:48',
      avatarBg: 'bg-emerald-600',
      text: 'Chất lượng 4K mượt đét không giật lag tí nào, âm thanh sân Wembley nghe như đang ngồi khán đài luôn ấy ❤️',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // MVP Vote state
  const [selectedMvp, setSelectedMvp] = useState<string | null>(null);
  const [mvpVotes, setMvpVotes] = useState({
    vini: 42,
    debruyne: 35,
    bellingham: 15,
    haaland: 8,
  });

  const triggerReaction = (emoji: string) => {
    const newReaction: FloatingReaction = {
      id: Date.now() + Math.random(),
      emoji,
      x: Math.random() * 80 + 10,
    };
    setReactions((prev) => [...prev.slice(-15), newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 1400);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    const content = chatInput.trim();
    const newMsg = {
      id: Date.now(),
      sender: 'Bạn',
      badge: 'VIP MEMBER',
      badgeColor: 'from-amber-400 to-yellow-500',
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      avatarBg: 'bg-cyan-500',
      text: content,
    };
    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    if (activeEvent?.id) {
      try {
        await createCommentMutation.mutateAsync({ content });
      } catch (err) {
        // Optimistic UI retains the message
      }
    }
  };

  const handleToggleLike = async () => {
    if (hasLiked) {
      setLikeCount((c) => Math.max(0, c - 1));
      setHasLiked(false);
    } else {
      setLikeCount((c) => c + 1);
      setHasLiked(true);
      triggerReaction('❤️');
      if (activeEvent?.id) {
        try {
          await toggleReactionMutation.mutateAsync('HEART');
        } catch (err) {
          // Optimistic
        }
      }
    }
  };

  // Multi-Cam Angles derived from dynamic channels or fallback
  const multiCamList = useMemo(() => {
    if (channelsData?.data && channelsData.data.length > 0) {
      return channelsData.data.slice(0, 4).map((ch, i) => ({
        key: ch.id,
        label: i === 0 ? `Main (${ch.name})` : i === 1 ? `Spider-Cam (${ch.name})` : `Góc Cam #${i + 1} (${ch.name})`,
        channel: ch,
      }));
    }
    return [
      { key: 'main', label: 'Main Broadcast' },
      { key: 'spider', label: 'Tactical Spider-Cam' },
      { key: 'vini', label: 'Vinicius Jr Cam' },
      { key: 'haaland', label: 'Haaland Cam' },
    ];
  }, [channelsData]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  const handleMvpVote = (candidate: 'vini' | 'debruyne' | 'bellingham' | 'haaland') => {
    if (selectedMvp) return;
    setSelectedMvp(candidate);
    setMvpVotes((prev) => ({
      ...prev,
      [candidate]: prev[candidate] + 1,
    }));
    triggerReaction('🏆');
  };

  // Context-aware match type detection
  const isEsports = useMemo(() => {
    const t = (activeEvent?.title || '').toLowerCase();
    const c = ((activeEvent as any)?.category || '').toLowerCase();
    return c.includes('game') || c.includes('gaming') || c.includes('esport') || t.includes('huyền thoại') || t.includes('esports') || t.includes('lol');
  }, [activeEvent]);

  const isFootball = useMemo(() => {
    const t = (activeEvent?.title || '').toLowerCase();
    return !isEsports && (t.includes(' vs ') || t.includes('champions league') || t.includes('ucl') || t.includes('real madrid') || t.includes('man city'));
  }, [activeEvent, isEsports]);

  // Clean Camera Angle Controls
  const cameraAngles = [
    { key: 'main', label: 'Góc Toàn Cảnh' },
    { key: 'tactical', label: 'Góc Chiến Thuật' },
    { key: 'player', label: 'Góc Cận Cảnh' },
    { key: 'directors', label: 'Góc Đạo Diễn' },
  ];

  return (
    <div className={cn('w-full transition-all duration-300', isCinemaMode ? 'bg-[#04060a] p-4' : '')}>
      {/* ── Main Grid: Player Container (Left) + Interactive Box (Right) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column (8 cols): Video Player & Match Info */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* High-Tech Broadcast Player Viewport */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#05080e] border border-[#1a273b] shadow-[0_20px_50px_rgba(0,0,0,0.8)] group">
            
            {/* Ambient Broadcast Arena Visual Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#06101e] via-[#091527] to-[#040810] flex items-center justify-center overflow-hidden">
              {/* Animated Cyber Spotlight Rays */}
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(#00f2fe15_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

              {/* Stage Visual Graphics */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,254,0.2)]">
                  {isPlaying ? (
                    <Tv className="w-8 h-8 text-cyan-400 animate-pulse" />
                  ) : (
                    <Play className="w-8 h-8 text-cyan-400 fill-current ml-1" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                    4K ULTRA HD 60FPS • DOLBY ATMOS 5.1
                  </span>
                  <h3 className="text-base md:text-lg font-black text-white mt-2 max-w-lg leading-snug">
                    {activeEvent?.title || 'OmniCast 4K Live Broadcast Stream'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Đang phát sóng trực tiếp • {activeEvent?.channel?.name || 'OmniCast Satellite Direct'}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Live Broadcast HUD */}
            <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-3 pointer-events-none">
              
              {/* Channel & Live Badge */}
              <div className="flex items-center gap-2 bg-[#05080ecc]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-[11px] font-black text-white tracking-wider">
                  {activeEvent?.channel?.name || 'OMNICAST 4K'}
                </span>
                <span className="text-[9px] font-black uppercase text-red-400 bg-red-950/90 px-1.5 py-0.5 rounded border border-red-800">
                  LIVE
                </span>
              </div>

              {/* Context-Aware Scoreboard / Status Widget */}
              {isFootball ? (
                <div className="flex items-center bg-[#070c14ee]/90 backdrop-blur-md border border-[#1e2e47] rounded-xl px-3 py-1 shadow-2xl">
                  <div className="flex items-center gap-2 text-xs font-black">
                    <span className="text-white">RMA</span>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 font-mono text-xs font-black shadow-[0_0_8px_rgba(0,242,254,0.3)]">
                      2 : 2
                    </div>
                    <span className="text-sky-400">MCI</span>
                  </div>
                  <div className="ml-2 pl-2 border-l border-[#1f2f45] text-left font-mono">
                    <div className="text-[10px] text-amber-400 font-bold">78:42</div>
                  </div>
                </div>
              ) : isEsports ? (
                <div className="flex items-center bg-[#070c14ee]/90 backdrop-blur-md border border-[#1e2e47] rounded-xl px-3 py-1 shadow-2xl">
                  <div className="flex items-center gap-2 text-xs font-black font-mono">
                    <span className="text-cyan-400 font-bold">BO5 • VÁN 3</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-amber-400 font-bold">34:12</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center bg-[#070c14ee]/90 backdrop-blur-md border border-[#1e2e47] rounded-xl px-3 py-1 text-[10px] font-mono text-cyan-300 font-bold">
                  <span>BITRATE 34.8 Mbps // LATENCY 0.4s</span>
                </div>
              )}
            </div>

            {/* Bottom Floating Multi-Cam Selectors */}
            <div className="absolute bottom-16 left-3 z-20 flex flex-wrap items-center gap-1.5">
              {cameraAngles.map((cam, idx) => (
                <button
                  key={cam.key}
                  onClick={() => setActiveCamIndex(idx)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md transition-all cursor-pointer',
                    activeCamIndex === idx
                      ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,242,254,0.6)] font-black'
                      : 'bg-black/75 hover:bg-black/90 text-slate-300 border border-white/10'
                  )}
                >
                  {cam.label}
                </button>
              ))}
            </div>

            {/* Bottom DVR Scrubber & Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-3 py-2.5 bg-gradient-to-t from-[#05080e] via-[#05080e]/95 to-transparent flex flex-col gap-2">
              
              {/* Time-Shift Scrubber Bar */}
              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-300">
                <span className="text-cyan-400 font-bold whitespace-nowrap">
                  {scrubberPos < 98 ? '-00:11:18 (TIME-SHIFT)' : 'LIVE'}
                </span>
                
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const newPos = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                    setScrubberPos(newPos);
                    setIsLiveHead(newPos >= 95);
                  }}
                  className="relative flex-1 h-1.5 bg-[#1b283d] rounded-full cursor-pointer group/bar overflow-visible"
                >
                  {/* Buffer / Progress */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full shadow-[0_0_8px_#00f2fe]"
                    style={{ width: `${scrubberPos}%` }}
                  />
                  {/* Thumb Indicator */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-cyan-400 shadow-[0_0_8px_#00f2fe]"
                    style={{ left: `${scrubberPos}%` }}
                  />
                </div>

                {/* Sống / Live Head Button */}
                <button
                  onClick={() => {
                    setScrubberPos(100);
                    setIsLiveHead(true);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider transition-all cursor-pointer',
                    scrubberPos >= 95
                      ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse'
                      : 'bg-[#182638] text-slate-400 hover:text-white'
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  LIVE HEAD
                </button>
              </div>

              {/* Player Bottom Control Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Left Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,242,254,0.4)] transition-all cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>

                  <button
                    onClick={() => setScrubberPos((p) => Math.max(0, p - 5))}
                    className="p-1 rounded-md bg-[#142032] hover:bg-[#1e2f4a] text-slate-300 hover:text-cyan-400 transition-colors"
                    title="Lùi 10 giây"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setScrubberPos((p) => Math.min(100, p + 5))}
                    className="p-1 rounded-md bg-[#142032] hover:bg-[#1e2f4a] text-slate-300 hover:text-cyan-400 transition-colors"
                    title="Tiến 10 giây"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1.5 ml-1">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-slate-400 hover:text-white"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(Number(e.target.value));
                        setIsMuted(false);
                      }}
                      className="w-14 h-1 bg-[#1b283d] accent-cyan-400 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-1.5">
                  {/* Commentary Track */}
                  <select
                    value={commentaryTrack}
                    onChange={(e) => setCommentaryTrack(e.target.value)}
                    className="bg-[#121c2c] border border-[#20314a] text-slate-200 text-[10px] font-semibold rounded-lg px-2 py-0.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="TV 1 (Quang Huy & Anh Ngọc)">🎙 TV 1 (Tiếng Việt)</option>
                    <option value="English Commentary">🎙 English Commentary</option>
                    <option value="Stadium Ambient Audio">🎙 Âm thanh sân khấu (Direct)</option>
                  </select>

                  {/* Resolution Selector */}
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="bg-[#121c2c] border border-[#20314a] text-cyan-400 font-mono text-[10px] font-extrabold rounded-lg px-2 py-0.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="4K UHD 60FPS">4K UHD</option>
                    <option value="1080p60 FHD">1080p60</option>
                    <option value="720p60 HD">720p60</option>
                  </select>

                  {/* Cinema Mode */}
                  <button
                    onClick={() => setIsCinemaMode(!isCinemaMode)}
                    className={cn(
                      'p-1.5 rounded-lg text-[10px] font-bold transition-all',
                      isCinemaMode
                        ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(0,242,254,0.4)]'
                        : 'bg-[#142032] hover:bg-[#1e2f4a] text-slate-300'
                    )}
                    title="Chế độ rạp chiếu"
                  >
                    <Tv className="w-3.5 h-3.5" />
                  </button>

                  {/* Fullscreen button */}
                  <button
                    onClick={() => {
                      if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen?.();
                      } else {
                        document.exitFullscreen?.();
                      }
                    }}
                    className="p-1.5 rounded-lg bg-[#142032] hover:bg-[#1e2f4a] text-slate-300 hover:text-white"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>



          {/* Program Title, Description & Action Row */}
          <div className="p-5 rounded-2xl bg-[#0b1320] border border-[#16253c] shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]">
                  {(activeEvent as any)?.category || (activeEvent?.channel as any)?.category || 'ĐỘC QUYỀN TRUYỀN HÌNH'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {activeEvent?.channel?.name ? `Kênh: ${activeEvent.channel.name} • ` : ''}
                  {activeEvent?.viewerCount ? `${(Number(activeEvent.viewerCount)).toLocaleString()} Khán giả` : '86,214 Khán giả trực tuyến'}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-snug">
                {activeEvent?.title || 'Chung Kết UEFA Champions League 2024/25: Real Madrid CF vs Manchester City'}
              </h1>
              <p className="text-xs text-slate-400 line-clamp-2">
                {activeEvent?.description || 'Trực tiếp chất lượng 4K HDR cùng hệ thống âm thanh vòm Dolby Atmos với 16 góc máy độc quyền từ OmniCast Sports Network.'}
              </p>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#121e30] hover:bg-[#1a2b45] border border-[#223554] text-xs font-bold text-slate-200 hover:text-cyan-400 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                Chia sẻ
              </button>

              <button
                onClick={handleToggleLike}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all',
                  hasLiked
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                    : 'bg-[#121e30] hover:bg-[#1a2b45] border-[#223554] text-slate-200 hover:text-red-400'
                )}
              >
                <Heart className={cn('w-3.5 h-3.5', hasLiked ? 'fill-red-400' : '')} />
                {(likeCount / 1000).toFixed(1)}K
              </button>

              <button
                onClick={() => setShowCastModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black shadow-[0_0_15px_rgba(0,242,254,0.3)] cursor-pointer"
              >
                <Cast className="w-3.5 h-3.5" />
                Phát lên TV
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Live Interactive Panel (Chat / Stats / MVP) */}
        <div className="lg:col-span-4 flex flex-col h-[580px] rounded-2xl bg-[#0b1320] border border-[#16253c] shadow-2xl overflow-hidden">
          
          {/* Header Tabs */}
          <div className="flex items-center border-b border-[#182840] bg-[#070d17]">
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                'flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors',
                activeTab === 'chat'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Live Chat
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                12.4K
              </span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={cn(
                'flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors',
                activeTab === 'stats'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Thống Kê
            </button>

            <button
              onClick={() => setActiveTab('mvp')}
              className={cn(
                'flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors',
                activeTab === 'mvp'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              <Vote className="w-3.5 h-3.5" />
              Bình Chọn MVP
            </button>
          </div>

          {/* Tab 1: Live Chat */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
              
              {/* Floating Emoji Particles Layer */}
              <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                {reactions.map((r) => (
                  <span
                    key={r.id}
                    className="absolute bottom-16 text-2xl animate-reaction-float"
                    style={{ left: `${r.x}%` }}
                  >
                    {r.emoji}
                  </span>
                ))}
              </div>

              {/* Pinned Broadcast Notice */}
              <div className="p-2.5 bg-gradient-to-r from-cyan-950/50 to-blue-950/50 border-b border-[#1c2e48] flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping flex-shrink-0" />
                <p className="text-[11px] text-cyan-200 truncate">
                  <strong>OmniBot:</strong> Chào mừng 124,000 người xem cùng theo dõi trận chung kết!
                </p>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                {messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-2.5 group">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0', m.avatarBg)}>
                      {m.sender[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">{m.sender}</span>
                        {m.badge && (
                          <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.2 rounded text-black bg-gradient-to-r', m.badgeColor)}>
                            {m.badge}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono ml-auto">{m.time}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 break-words leading-relaxed">
                        {m.text}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {/* Live Interactive Reaction Buttons (Stitch 1:1) */}
              <div className="p-2 border-t border-[#16253c] bg-[#070e1a] flex items-center justify-around gap-1">
                {[
                  { label: 'Sút', emoji: '⚽' },
                  { label: 'Cháy', emoji: '🔥' },
                  { label: 'Tuyệt', emoji: '👏' },
                  { label: 'Đau tim', emoji: '😱' },
                  { label: 'Cup', emoji: '🏆' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => triggerReaction(item.emoji)}
                    className="flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-[#0e1929] hover:bg-[#182942] border border-[#1f3350] hover:border-cyan-500/50 text-[10px] font-bold text-slate-300 hover:text-cyan-400 transition-transform active:scale-95 cursor-pointer"
                  >
                    <span className="text-base leading-none">{item.emoji}</span>
                    <span className="mt-0.5 text-[9px]">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#182840] bg-[#070c16] flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Bình luận về trận đấu..."
                  className="flex-1 bg-[#101b2c] border border-[#203452] focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,242,254,0.4)] transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Live Match Stats */}
          {activeTab === 'stats' && (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="text-center font-bold text-sm text-cyan-300 mb-2">
                THỐNG KÊ TRỰC TIẾP (OPTA DATA)
              </div>
              
              {[
                { label: 'Kiểm soát bóng (Possession)', rma: '48%', mci: '52%', rmaVal: 48 },
                { label: 'Số cú sút (Total Shots)', rma: '14', mci: '16', rmaVal: 46 },
                { label: 'Sút trúng đích (On Target)', rma: '6', mci: '7', rmaVal: 46 },
                { label: 'Bàn thắng kỳ vọng (xG)', rma: '2.14', mci: '2.31', rmaVal: 48 },
                { label: 'Phạt góc (Corners)', rma: '5', mci: '8', rmaVal: 38 },
                { label: 'Phạm lỗi (Fouls)', rma: '11', mci: '9', rmaVal: 55 },
              ].map((stat, i) => (
                <div key={i} className="space-y-1 bg-[#070e1a] p-2.5 rounded-xl border border-[#16253c]">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-white">{stat.rma}</span>
                    <span className="text-slate-400 font-normal">{stat.label}</span>
                    <span className="text-sky-400">{stat.mci}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1b2b42] rounded-full overflow-hidden flex">
                    <div className="bg-cyan-400 h-full" style={{ width: `${stat.rmaVal}%` }} />
                    <div className="bg-sky-500 h-full flex-1" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: MVP Vote Poll */}
          {activeTab === 'mvp' && (
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              <div className="text-center font-bold text-sm text-amber-300">
                BÌNH CHỌN CẦU THỦ XUẤT SẮC NHẤT (MVP)
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Bình chọn kết thúc khi trọng tài thổi còi mãn cuộc trận đấu.
              </p>

              {[
                { key: 'vini', name: 'Vinicius Jr', team: 'Real Madrid', pct: mvpVotes.vini },
                { key: 'debruyne', name: 'Kevin De Bruyne', team: 'Man City', pct: mvpVotes.debruyne },
                { key: 'bellingham', name: 'Jude Bellingham', team: 'Real Madrid', pct: mvpVotes.bellingham },
                { key: 'haaland', name: 'Erling Haaland', team: 'Man City', pct: mvpVotes.haaland },
              ].map((c) => (
                <button
                  key={c.key}
                  disabled={!!selectedMvp}
                  onClick={() => handleMvpVote(c.key as any)}
                  className={cn(
                    'w-full p-3 rounded-xl border text-left transition-all relative overflow-hidden',
                    selectedMvp === c.key
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                      : 'bg-[#070e1a] hover:bg-[#122033] border-[#16253c]'
                  )}
                >
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-cyan-500/10 transition-all duration-500"
                    style={{ width: `${c.pct}%` }}
                  />
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.team}</div>
                    </div>
                    <div className="text-sm font-black text-cyan-400 font-mono">
                      {c.pct}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Share Toast Notification ─────────────────────────────────── */}
      {showShareToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#09121f] border border-cyan-400 text-cyan-200 text-xs font-bold shadow-[0_0_25px_rgba(0,242,254,0.3)] flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>Đã sao chép liên kết trực tiếp vào bộ nhớ tạm!</span>
        </div>
      )}

      {/* ── Cyber Cast to TV Modal ───────────────────────────────────── */}
      {showCastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-[#0a111c] border border-[#1b2f4a] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#162338]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Cast className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Phát Lên Thiết Bị TV</h3>
                  <p className="text-[11px] text-slate-400">Google Cast • Apple AirPlay • Smart TV DLNA</p>
                </div>
              </div>
              <button
                onClick={() => setShowCastModal(false)}
                className="p-1.5 rounded-lg bg-[#101b2a] hover:bg-[#18283e] text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-2.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                THIẾT BỊ KHẢ DỤNG TRONG MẠNG WI-FI:
              </span>
              {[
                { name: 'Samsung Neo QLED 4K 65" (Living Room)', type: 'Smart TV • 4K HDR', icon: '📺' },
                { name: 'Apple TV 4K (Bedroom Studio)', type: 'AirPlay 2 • Dolby Atmos', icon: '🍎' },
                { name: 'Chromecast with Google TV', type: 'Google Cast Ultra', icon: '📡' },
              ].map((device, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCastingDevice(device.name);
                    setTimeout(() => {
                      setShowCastModal(false);
                      setShowShareToast(true);
                    }, 800);
                  }}
                  className={cn(
                    'w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all group',
                    castingDevice === device.name
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200'
                      : 'bg-[#0e1726] hover:bg-[#142236] border-[#1a2b42] text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{device.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300">{device.name}</div>
                      <div className="text-[10px] text-slate-400">{device.type}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-cyan-400 group-hover:underline">
                    {castingDevice === device.name ? 'Đang phát...' : 'Kết nối →'}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-500 text-center pt-2">
              Tự động truyền tải luồng Ultra HD 4K 60FPS không nén qua giao thức DLNA/AirPlay.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

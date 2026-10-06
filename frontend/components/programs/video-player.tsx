'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Loader2, AlertTriangle, Crown, QrCode, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  type?: 'hls' | 'mp4' | 'webm' | 'iframe';
  autoPlay?: boolean;
  className?: string;
  onError?: (e: unknown) => void;
  initialSeekSeconds?: number;
  isPremium?: boolean;
  channelName?: string;
}

declare global {
  interface Window {
    Hls?: any;
  }
}

const VIP_STORAGE_KEY = 'omnicast.isVipUser';

/**
 * High-End Broadcast Video Player
 * Supports HLS / MP4 with Client-Side Live Seek Stitching & VIP Paywall Overlay.
 */
export function VideoPlayer({
  src,
  poster,
  type,
  autoPlay = false,
  className,
  onError,
  initialSeekSeconds = 0,
  isPremium = false,
  channelName = 'Kênh Premium',
}: VideoPlayerProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seekDone, setSeekDone] = useState(false);

  // Check VIP status: Admin & Staff always bypass; or localStorage VIP demo pass
  const [isVip, setIsVip] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(VIP_STORAGE_KEY);
      return stored === 'true';
    }
    return false;
  });

  const hasAccess = !isPremium || isVip || user?.role === 'ADMIN' || user?.role === 'STAFF';

  const resolvedType: NonNullable<VideoPlayerProps['type']> =
    type ?? detectType(src);

  // Apply Client-Side Live Seek
  const applySeek = () => {
    const video = videoRef.current;
    if (!video || seekDone || initialSeekSeconds <= 0) return;
    try {
      if (video.duration && initialSeekSeconds < video.duration) {
        video.currentTime = initialSeekSeconds;
        setSeekDone(true);
      } else if (video.seekable && video.seekable.length > 0) {
        video.currentTime = initialSeekSeconds;
        setSeekDone(true);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (resolvedType === 'iframe' || !hasAccess) return;
    const video = videoRef.current;
    if (!video) return;

    if (resolvedType !== 'hls') {
      video.src = src;
      return;
    }

    const canNative = video.canPlayType('application/vnd.apple.mpegurl');
    if (canNative) {
      video.src = src;
      return;
    }

    let hls: any;
    let cancelled = false;

    const loadHlsJs = async () => {
      if (window.Hls) {
        attach();
        return;
      }
      try {
        await injectScript(
          'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js',
        );
        if (!cancelled) attach();
      } catch (err) {
        setError('Không thể tải trình phát video');
        onError?.(err);
      }
    };

    const attach = () => {
      if (!window.Hls || !video) return;
      if (window.Hls.isSupported()) {
        hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          if (initialSeekSeconds > 0) {
            applySeek();
          }
          if (autoPlay && hasAccess) {
            video.play().catch(() => {});
          }
        });
        hls.on(window.Hls.Events.ERROR, (_event: unknown, data: any) => {
          if (data?.fatal) {
            setError('Lỗi kết nối luồng phát video');
            onError?.(data);
          }
        });
      } else {
        setError('Trình duyệt không hỗ trợ HLS');
      }
    };

    loadHlsJs();

    return () => {
      cancelled = true;
      try {
        hls?.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [src, resolvedType, onError, hasAccess, autoPlay]);

  // Activate Demo VIP subscription on 1 click
  const handleActivateVipDemo = () => {
    try {
      window.localStorage.setItem(VIP_STORAGE_KEY, 'true');
      setIsVip(true);
      toast.success('Đã kích hoạt gói OmniPass VIP!', {
        description: 'Bạn đã mở khóa toàn bộ 25 kênh phát sóng 4K chất lượng cao.',
      });
    } catch {
      setIsVip(true);
    }
  };

  if (resolvedType === 'iframe') {
    const embedSrc = getEmbedUrl(src);
    return (
      <div className={cn('player-container relative w-full aspect-video bg-black overflow-hidden', className)}>
        <iframe
          src={embedSrc}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="Live stream"
        />
      </div>
    );
  }

  // VIP Paywall Overlay Block
  if (!hasAccess) {
    return (
      <div className={cn('relative w-full aspect-video rounded-2xl overflow-hidden studio-glass-card flex flex-col items-center justify-center p-6 text-center shadow-2xl border border-amber-500/30', className)}>
        {poster && (
          <img
            src={poster}
            alt=""
            className="absolute inset-0 w-full h-full object-cover filter blur-xl scale-110 opacity-30 -z-10"
          />
        )}
        
        {/* Subtle Ambient Golden Glow */}
        <div className="absolute -top-24 w-72 h-72 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-md flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-[#0c101d] flex items-center justify-center">
              <Crown className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40">
              GÓI THUÊ BAO OMNIPASS VIP 4K
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white font-display">
              {channelName}
            </h3>
            <p className="text-xs text-slate-300">
              Kênh này thuộc nhóm 20 kênh bản quyền Premium độ phân giải 4K HDR. Vui lòng nâng cấp gói thuê bao để thưởng thức.
            </p>
          </div>

          {/* Mock QR Code Payment Simulation */}
          <div className="p-3 rounded-2xl bg-[#090f1d]/90 border border-white/[0.08] flex items-center gap-4 text-left shadow-inner">
            <div className="w-16 h-16 rounded-xl bg-white p-1 flex items-center justify-center flex-shrink-0">
              <QrCode className="w-14 h-14 text-slate-900" />
            </div>
            <div className="text-xs font-mono">
              <span className="block font-bold text-amber-300 text-sm">Gói Tháng: 99.000đ</span>
              <span className="block text-[11px] text-slate-400">Quét mã VNPAY / MoMo</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                Mở khóa ngay 25 kênh
              </span>
            </div>
          </div>

          {/* Quick 1-Click Action for Review 1 Demo */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-1">
            <button
              type="button"
              onClick={handleActivateVipDemo}
              className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_10px_25px_-5px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>KÍCH HOẠT VIP DEMO</span>
            </button>

            <Link
              href="/channels/sport-1"
              className="w-full sm:w-auto h-11 px-4 rounded-xl bg-[#0e1726]/80 hover:bg-[#142238] border border-white/[0.1] text-xs font-mono font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Xem 5 Kênh Free</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!src) {
    return (
      <div className={cn('player-container relative w-full aspect-video bg-gradient-to-br from-slate-950 via-[#0a121e] to-slate-900 flex flex-col items-center justify-center text-center p-6 border border-slate-800 rounded-2xl', className)}>
        {poster && (
          <img
            src={poster}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20 -z-10"
          />
        )}
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(0,242,254,0.15)]">
          <Play className="w-6 h-6 text-cyan-400 ml-0.5" />
        </div>
        <p className="text-sm font-bold text-white">Luồng phát đang chuẩn bị phát sóng</p>
        <p className="text-xs text-slate-400 mt-1">Vui lòng theo dõi khung giờ phát sóng theo lịch EPG</p>
      </div>
    );
  }

  return (
    <div className={cn('player-container group relative w-full aspect-video bg-black overflow-hidden', className)}>
      {!playing && !loading && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setLoading(true);
            setPlaying(true);
            const video = videoRef.current;
            if (video) {
              if (initialSeekSeconds > 0) {
                applySeek();
              }
              video.play().catch((err) => {
                setError('Không thể phát video');
                setLoading(false);
                setPlaying(false);
                onError?.(err);
              });
            }
          }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors"
          aria-label="Phát video"
        >
          {poster && (
            <img
              src={poster}
              alt=""
              className="absolute inset-0 w-full h-full object-cover -z-10"
            />
          )}
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/90 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,254,0.5)] transition-transform group-hover:scale-105">
            <Play className="w-7 h-7 text-black fill-black ml-1" />
          </div>
        </button>
      )}

      {loading && !playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-center px-6 gap-2">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
          <p className="text-white text-sm font-medium">{error}</p>
        </div>
      )}

      <video
        ref={videoRef}
        poster={poster}
        controls={playing || autoPlay}
        autoPlay={autoPlay}
        muted={autoPlay}
        playsInline
        preload="metadata"
        className="w-full h-full bg-black object-contain"
        onLoadedMetadata={() => {
          if (initialSeekSeconds > 0) {
            applySeek();
          }
        }}
        onPlaying={() => {
          setLoading(false);
          setPlaying(true);
        }}
        onWaiting={() => setLoading(true)}
        onError={() => {
          setError('Video bị lỗi hoặc URL không khả dụng');
          setLoading(false);
        }}
      />
    </div>
  );
}

function getEmbedUrl(url: string): string {
  if (!url) return url;
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1`;
  }
  const twitchMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
  if (twitchMatch && twitchMatch[1]) {
    const parent = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${parent}&autoplay=true`;
  }
  return url;
}

function detectType(url: string): NonNullable<VideoPlayerProps['type']> {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return 'hls';
  if (lower.includes('.mp4')) return 'mp4';
  if (lower.includes('.webm')) return 'webm';
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com') || lower.includes('twitch.tv') || lower.includes('<iframe'))
    return 'iframe';
  return 'hls';
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-src="${src}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Script failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.addEventListener('load', () => {
      s.dataset.loaded = 'true';
      resolve();
    });
    s.addEventListener('error', () => reject(new Error('Script failed')));
    document.head.appendChild(s);
  });
}

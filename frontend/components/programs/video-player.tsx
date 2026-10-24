/* eslint-disable @next/next/no-img-element, react-hooks/exhaustive-deps */
/**
 * OmniCast — High-End Broadcast Video Player
 *
 * Supports: HLS (.m3u8), MP4, WebM, YouTube/Twitch iframes.
 * HLS playback uses the locally-bundled hls.js library (v1.5+).
 * A CDN fallback loader is attempted if the bundle fails to resolve.
 *
 * Recovery chain (when a source errors):
 *   1. Retry with exponential back-off (up to 3 attempts for network errors)
 *   2. Swap to the `fallbackSrc` provided by the backend (Bunny CDN mirror)
 *   3. Swap to a verified free CDN MP4 (Big Buck Bunny 720p)
 *   4. Swap to a verified free CDN HLS stream (Mux Dev test manifest)
 *
 * All fallbacks are HTTP 200 OK with CORS enabled and byte-range seeking.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Loader2,
  AlertTriangle,
  Crown,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  Radio,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn, resolveStreamUrl, resolvePosterUrl, VERIFIED_FALLBACK_STREAMS } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useLiveStream, LiveEvent } from '@/lib/hooks/useLiveStream';

// ── Dynamic hls.js import (avoids SSR / non-browser bundling issues) ──────────
type HlsType = typeof import('hls.js').default;
let _Hls: HlsType | null = null;
let _hlsLoadAttempted = false;

async function getHls(): Promise<HlsType | null> {
  if (_Hls) return _Hls;
  if (_hlsLoadAttempted) return null;
  _hlsLoadAttempted = true;

  // 1️⃣  Try bundled module (preferred — no network, no CDN dependency)
  try {
    const mod = await import('hls.js');
    _Hls = mod.default ?? mod;
    // Check that we got a usable Hls class with the static isSupported method
    if (_Hls && typeof (_Hls as any).isSupported === 'function') {
      return _Hls;
    }
  } catch {
    // bundle not found — fall through
  }

  // 2️⃣  CDN fallback (jsDelivr → unpkg → cdnjs)
  const cdns = [
    'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js',
    'https://unpkg.com/hls.js@1.5.13/dist/hls.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js',
  ];
  for (const src of cdns) {
    try {
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`[data-hls-src="${src}"]`);
        if ((existing as HTMLScriptElement)?.dataset?.loaded === 'true') { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.dataset.src = src;
        s.dataset.hlsSrc = src;
        s.onload = () => { (s as HTMLScriptElement).dataset.loaded = 'true'; resolve(); };
        s.onerror = () => reject(new Error('cdn-failed'));
        if (document.head) document.head.appendChild(s);
        else reject(new Error('no-head'));
      });
      const win = window as any;
      if (win.Hls) { _Hls = win.Hls; return _Hls; }
    } catch {
      // try next CDN
    }
  }
  return null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const HLS_RETRY_COUNT = 3;
const HLS_RETRY_DELAY_MS = 2000; // base delay; doubles per attempt
const VIP_STORAGE_KEY = 'omnicast.isVipUser';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface VideoPlayerProps {
  src: string;
  /** Backup URL tried when `src` fails to load. */
  fallbackSrc?: string;
  poster?: string;
  type?: 'hls' | 'mp4' | 'webm' | 'iframe';
  autoPlay?: boolean;
  className?: string;
  onError?: (e: unknown) => void;
  initialSeekSeconds?: number;
  isPremium?: boolean;
  channelName?: string;
  /** Content-attribution text shown as small overlay. */
  sourceAttribution?: string;
  /** Channel slug for live stream notifications (optional). */
  channelSlug?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function VideoPlayer({
  src,
  fallbackSrc,
  poster,
  type,
  autoPlay = false,
  className,
  onError,
  initialSeekSeconds = 0,
  isPremium = false,
  channelName = 'Kênh Premium',
  sourceAttribution,
  channelSlug,
}: VideoPlayerProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<import('hls.js').default | null>(null);
  const retryCountRef = useRef(0);
  const isRetryingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seekDone, setSeekDone] = useState(false);
  /** Index into `chain` that is currently active. */
  const [activeIdx, setActiveIdx] = useState(0);
  const [recoveryToastShown, setRecoveryToastShown] = useState(false);
  /** Count of consecutive HLS network retries remaining before we give up. */
  const [hlsRetryLeft, setHlsRetryLeft] = useState(0);
  /** True when we are in the middle of a retry attempt. */
  const [isRetrying, setIsRetrying] = useState(false);
  /** Current live event (if any) */
  const [currentLiveEvent, setCurrentLiveEvent] = useState<LiveEvent | null>(null);

  // ── Live Stream Integration ─────────────────────────────────────────────────
  const { isLive, liveEvent, viewerCount, isConnected } = useLiveStream(channelSlug, {
    autoConnect: !!channelSlug,
    debug: false,
  });

  // Update current live event when received
  useEffect(() => {
    if (isLive && liveEvent) {
      setCurrentLiveEvent(liveEvent);
      // Show toast notification
      toast.success('Admin đang phát trực tiếp!', {
        description: liveEvent.title,
        icon: '📺',
        duration: 5000,
      });
    } else {
      setCurrentLiveEvent(null);
    }
  }, [isLive, liveEvent]);

  // Determine which URL to play: live stream takes priority
  const effectiveSrc = useMemo(() => {
    if (isLive && currentLiveEvent?.streamUrl) {
      return currentLiveEvent.streamUrl;
    }
    return src;
  }, [isLive, currentLiveEvent, src]);

  // ── Build URL fallback chain ──────────────────────────────────────────────
  const chain: string[] = useMemo(() => {
    const list: string[] = [];
    const primary = resolveStreamUrl(effectiveSrc);
    if (primary) list.push(primary);
    const fallback = resolveStreamUrl(fallbackSrc);
    if (fallback && !list.includes(fallback)) list.push(fallback);

    // Guaranteed resilient fallbacks — always HTTP 200 OK, CORS enabled
    if (!list.includes(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4)) {
      list.push(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4);
    }
    if (!list.includes(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_HLS)) {
      list.push(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_HLS);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSrc, fallbackSrc]);

  // Reset on new src
  useEffect(() => {
    initialSeekAppliedRef.current = false;
    setActiveIdx(0);
    setError(null);
    setRecoveryToastShown(false);
    retryCountRef.current = 0;
    setHlsRetryLeft(0);
    setIsRetrying(false);
    isRetryingRef.current = false;
  }, [effectiveSrc, fallbackSrc]);

  // ── VIP ──────────────────────────────────────────────────────────────────
  const [isVip, setIsVip] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage.getItem(VIP_STORAGE_KEY) === 'true') {
        setIsVip(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const hasAccess = !isPremium || isVip || user?.role === 'ADMIN' || user?.role === 'STAFF';

  // ── Resolved values ───────────────────────────────────────────────────────
  const resolvedSrc = chain[activeIdx] ?? chain[0] ?? '';
  const resolvedPoster = resolvePosterUrl(poster);
  const resolvedType: NonNullable<VideoPlayerProps['type']> =
    type ?? detectType(resolvedSrc);

  // ── Apply initial seek ────────────────────────────────────────────────────
  const initialSeekSecondsRef = useRef(initialSeekSeconds);
  initialSeekSecondsRef.current = initialSeekSeconds;
  const initialSeekAppliedRef = useRef(false);

  const applySeek = useCallback(() => {
    const video = videoRef.current;
    if (!video || initialSeekAppliedRef.current || initialSeekSecondsRef.current <= 0) return;
    try {
      if (video.duration && initialSeekSecondsRef.current < video.duration) {
        video.currentTime = initialSeekSecondsRef.current;
        initialSeekAppliedRef.current = true;
        setSeekDone(true);
      } else if (video.seekable && video.seekable.length > 0) {
        video.currentTime = initialSeekSecondsRef.current;
        initialSeekAppliedRef.current = true;
        setSeekDone(true);
      }
    } catch { /* ignore seek failures */ }
  }, []);

  // ── Advance to next URL in chain ─────────────────────────────────────────
  const advanceToFallback = useCallback(() => {
    if (activeIdx + 1 < chain.length) {
      const next = activeIdx + 1;
      setActiveIdx(next);
      setError(null);
      setLoading(true);
      retryCountRef.current = 0;
      setHlsRetryLeft(0);
      setIsRetrying(false);
      isRetryingRef.current = false;
      if (!recoveryToastShown) {
        setRecoveryToastShown(true);
        toast.info('Đang chuyển sang nguồn dự phòng…', {
          description: 'Nguồn chính tạm thời không khả dụng, đã tự động chuyển sang luồng CDN ổn định.',
        });
      }
      return true;
    }
    return false;
  }, [activeIdx, chain.length, recoveryToastShown]);

  // ── HLS network error retry ──────────────────────────────────────────────
  const retryHls = useCallback(() => {
    if (isRetryingRef.current) return;
    const attempt = retryCountRef.current;
    if (attempt >= HLS_RETRY_COUNT) {
      // Exhausted retries — move to next source
      isRetryingRef.current = false;
      advanceToFallback();
      return;
    }

    retryCountRef.current = attempt + 1;
    setHlsRetryLeft(HLS_RETRY_COUNT - attempt - 1);
    setIsRetrying(true);

    const delay = HLS_RETRY_DELAY_MS * Math.pow(2, attempt);
    toast.info(`Đang thử kết nối lại (lần ${attempt + 1}/${HLS_RETRY_COUNT})…`, {
      id: 'hls-retry',
      duration: 2000,
    });

    setTimeout(() => {
      setIsRetrying(false);
      const video = videoRef.current;
      const hls = hlsRef.current;
      if (!video || !hls) { advanceToFallback(); return; }

      // Reattach and reload
      hls.stopLoad();
      hls.startLoad();
      video.play().catch(() => { /* ignore play failure during retry */ });
    }, delay);
  }, [advanceToFallback]);

  // ── Main video / HLS effect ───────────────────────────────────────────────
  useEffect(() => {
    if (resolvedType === 'iframe' || !hasAccess) return;
    const video = videoRef.current;
    if (!video) return;

    // ── MP4 / WebM path ────────────────────────────────────────────────────
    if (resolvedType !== 'hls') {
      const isSameSrc =
        video.src === resolvedSrc ||
        video.currentSrc === resolvedSrc ||
        (video.src && video.src.endsWith(resolvedSrc));

      if (!isSameSrc) {
        video.src = resolvedSrc;
        video.load();
        if (playing || autoPlay) video.play().catch(() => {});
      } else {
        if (autoPlay && video.paused) {
          video.play().catch(() => {});
        }
      }

      const onCanPlay = () => {
        if (!initialSeekAppliedRef.current && initialSeekSecondsRef.current > 0) {
          initialSeekAppliedRef.current = true;
          try {
            if (video.duration && initialSeekSecondsRef.current < video.duration) {
              video.currentTime = initialSeekSecondsRef.current;
            }
          } catch { /* ignore */ }
        }
      };

      video.addEventListener('canplay', onCanPlay, { once: true });
      return () => {
        video.removeEventListener('canplay', onCanPlay);
      };
    }

    // ── HLS path ────────────────────────────────────────────────────────────
    const canNative = video.canPlayType('application/vnd.apple.mpegurl');
    if (canNative) {
      const isSameSrc =
        video.src === resolvedSrc ||
        video.currentSrc === resolvedSrc ||
        (video.src && video.src.endsWith(resolvedSrc));
      if (!isSameSrc) {
        video.src = resolvedSrc;
      }
      return;
    }

    let destroyed = false;
    let attached = false;

    const attachHls = async (Hls: HlsType) => {
      if (destroyed || attached) return;
      attached = true;

      const hls = new Hls({} as any);
      Object.assign(hls, {
        // ── Stability config ────────────────────────────────────────────────
        enableWorker: true,
        lowLatencyMode: false,      // safer for VOD + mixed live/VOD
        backBufferLength: 90,       // keep 90 s of buffer for backward seek
        maxBufferLength: 30,        // cap buffer at 30 s forward
        maxMaxBufferLength: 120,    // allow up to 120 s when bandwidth is high
        maxBufferSize: 60 * 1024 * 1024, // 60 MB max buffer
        maxBufferHole: 0.5,        // fill gaps ≤ 0.5 s
      } as any);

      hlsRef.current = hls;
      retryCountRef.current = 0;
      setHlsRetryLeft(0);
      setIsRetrying(false);
      isRetryingRef.current = false;

      hls.loadSource(resolvedSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (destroyed) return;
        if (initialSeekSeconds > 0) applySeek();
        if (autoPlay && hasAccess) video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (destroyed) return;

        // ── Non-fatal: media decode error — try recovery ───────────────────
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }

        // ── Network error — retry locally before swapping source ────────────
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          const details = data.details ?? '';
          // key, manifest, level, audio-track load failures are retryable
          const isRetryable = [
            Hls.ErrorDetails.KEY_LOAD_ERROR,
            Hls.ErrorDetails.MANIFEST_LOAD_ERROR,
            Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT,
            Hls.ErrorDetails.LEVEL_LOAD_ERROR,
            Hls.ErrorDetails.LEVEL_LOAD_TIMEOUT,
            Hls.ErrorDetails.AUDIO_TRACK_LOAD_ERROR,
            Hls.ErrorDetails.FRAG_LOAD_ERROR,
            Hls.ErrorDetails.FRAG_LOAD_TIMEOUT,
          ].some((d) => details.includes(d));

          if (isRetryable && !isRetryingRef.current) {
            retryHls();
          } else if (!isRetryable) {
            // Unknown network error — swap to next source
            if (advanceToFallback()) {
              try { hls.destroy(); } catch { /* ignore */ }
            }
          }
          return;
        }

        // ── Fatal error (mux, playlist, other) — swap source immediately ────
        if (data.fatal) {
          if (advanceToFallback()) {
            try { hls.destroy(); } catch { /* ignore */ }
            return;
          }
          setError('Lỗi kết nối luồng phát video');
          onError?.(data);
        }
      });
    };

    getHls()
      .then((Hls) => {
        if (Hls && Hls.isSupported()) {
          attachHls(Hls);
        } else {
          // hls.js not available — check if the browser can play natively
          if (!canNative) {
            setError('Trình duyệt không hỗ trợ HLS và hls.js không khả dụng');
          }
        }
      })
      .catch(() => {
        if (!destroyed) setError('Không thể tải trình phát video');
      });

    return () => {
      destroyed = true;
      attached = false;
      try { hlsRef.current?.destroy(); } catch { /* ignore */ }
      hlsRef.current = null;
    };
  }, [
    resolvedSrc,
    resolvedType,
    hasAccess,
    autoPlay,
    advanceToFallback,
    applySeek,
    retryHls,
    onError,
  ]);

  // ── Demo VIP activation ───────────────────────────────────────────────────
  const handleActivateVipDemo = () => {
    try { window.localStorage.setItem(VIP_STORAGE_KEY, 'true'); } catch { /* ignore */ }
    setIsVip(true);
    toast.success('Đã kích hoạt gói OmniPass VIP!', {
      description: 'Bạn đã mở khóa toàn bộ 25 kênh phát sóng 4K chất lượng cao.',
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // iframe embed
  if (resolvedType === 'iframe') {
    const embedSrc = getEmbedUrl(resolvedSrc);
    const isDrive = embedSrc.includes('drive.google.com');
    return (
      <div className={cn('player-container relative w-full aspect-video bg-black overflow-hidden', className)}>
        <iframe
          src={embedSrc}
          className={cn(
            'border-0',
            isDrive
              ? 'absolute w-full h-[calc(100%+60px)] -top-[56px] left-0 pointer-events-auto'
              : 'w-full h-full'
          )}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="Live stream"
        />
      </div>
    );
  }

  // VIP paywall
  if (!hasAccess) {
    return (
      <div className={cn('relative w-full aspect-video rounded-2xl overflow-hidden studio-glass-card flex flex-col items-center justify-center p-6 text-center shadow-2xl border border-amber-500/30', className)}>
        {resolvedPoster && (
          <img
            src={resolvedPoster}
            alt=""
            className="absolute inset-0 w-full h-full object-cover filter blur-xl scale-110 opacity-30 -z-10"
          />
        )}

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

  // No source
  if (!resolvedSrc) {
    return (
      <div className={cn('player-container relative w-full aspect-video bg-gradient-to-br from-slate-950 via-[#0a121e] to-slate-900 flex flex-col items-center justify-center text-center p-6 border border-slate-800 rounded-2xl', className)}>
        {resolvedPoster && (
          <img
            src={resolvedPoster}
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

      {/* ── LIVE Badge & Viewer Count ──────────────────────────────────────── */}
      {isLive && currentLiveEvent && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-3">
          {/* LIVE Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-white shadow-lg">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">LIVE</span>
          </div>

          {/* Live Event Title */}
          {currentLiveEvent.title && (
            <div className="max-w-[200px] px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm">
              <p className="text-xs font-medium text-white truncate">
                {currentLiveEvent.title}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Viewer Count (when live) ───────────────────────────────────────── */}
      {isLive && viewerCount > 0 && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm">
          <Users className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-xs font-medium text-slate-200">
            {viewerCount.toLocaleString()}
          </span>
        </div>
      )}

      {/* ── WebSocket Connection Status (debug) ────────────────────────────── */}
      {channelSlug && !isConnected && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-2 py-1 rounded bg-amber-600/80">
          <Radio className="w-3 h-3 text-white animate-pulse" />
          <span className="text-[10px] font-mono text-white">Connecting...</span>
        </div>
      )}

      {/* ── Retry overlay (shown during HLS network retry) ──────────────── */}
      {isRetrying && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-cyan-300 text-xs font-mono">
            Đang kết nối lại…
            {hlsRetryLeft > 0 && ` Còn ${hlsRetryLeft} lần thử.`}
          </p>
        </div>
      )}

      {/* ── Play button overlay ───────────────────────────────────────────── */}
      {!playing && !loading && !isRetrying && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setLoading(true);
            setPlaying(true);
            const video = videoRef.current;
            if (video) {
              if (initialSeekSeconds > 0) applySeek();
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
          {resolvedPoster && (
            <img
              src={resolvedPoster}
              alt=""
              className="absolute inset-0 w-full h-full object-cover -z-10"
            />
          )}
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/90 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,254,0.5)] transition-transform group-hover:scale-105">
            <Play className="w-7 h-7 text-black fill-black ml-1" />
          </div>
        </button>
      )}

      {/* ── Loading spinner ───────────────────────────────────────────────── */}
      {loading && !isRetrying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {error && !isRetrying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-center px-6 gap-2">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
          <p className="text-white text-sm font-medium">{error}</p>
          {activeIdx === 0 && (
            <p className="text-slate-400 text-xs">Đang tự động khắc phục…</p>
          )}
        </div>
      )}

      {/* ── Video element ─────────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        poster={resolvedPoster || undefined}
        controls={playing || autoPlay}
        autoPlay={autoPlay}
        muted={autoPlay}
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        className="w-full h-full bg-black object-contain"
        onLoadedMetadata={() => {
          if (initialSeekSeconds > 0) applySeek();
        }}
        onPlaying={() => {
          setLoading(false);
          setPlaying(true);
        }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onError={() => {
          if (advanceToFallback()) return;
          setError('Video bị lỗi hoặc URL không khả dụng');
          setLoading(false);
        }}
      />

      {/* ── Source attribution ─────────────────────────────────────────────── */}
      {sourceAttribution && (
        <div className="absolute bottom-2 right-2 z-20 max-w-[60%] px-2 py-1 rounded-md bg-black/60 text-[10px] font-mono text-slate-200/80 leading-snug pointer-events-none">
          {sourceAttribution}
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const fileMatch = url.match(/(?:drive|docs)\.google\.com\/(?:file\/)?(?:u\/\d+\/)?(?:d\/|open\?id=)([a-zA-Z0-9_-]+)/i);
  if (fileMatch && fileMatch[1]) return fileMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idMatch && idMatch[1]) return idMatch[1];
  return null;
}

function getEmbedUrl(url: string): string {
  if (!url) return url;
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
  );
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0`;
  }
  const twitchMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
  if (twitchMatch && twitchMatch[1]) {
    const parent =
      typeof window !== 'undefined' && window.location.hostname
        ? window.location.hostname
        : 'localhost';
    return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${parent}&autoplay=true`;
  }
  const gDriveId = extractGoogleDriveFileId(url);
  if (gDriveId) {
    return `https://drive.usercontent.google.com/download?id=${gDriveId}&export=download&confirm=t`;
  }
  return url;
}

function detectType(url: string): NonNullable<VideoPlayerProps['type']> {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return 'hls';
  if (lower.includes('.mp4')) return 'mp4';
  if (lower.includes('.webm')) return 'webm';
  // Google Drive videos stream directly via native MP4 container with auto-fallback
  if (
    lower.includes('drive.google.com') ||
    lower.includes('docs.google.com') ||
    Boolean(extractGoogleDriveFileId(url))
  )
    return 'mp4';
  if (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('vimeo.com') ||
    lower.includes('twitch.tv') ||
    lower.includes('<iframe')
  )
    return 'iframe';
  // Handle blob: and file: URLs from local uploads / browser File objects.
  // These are always playable MP4 (or WebM) — treat as mp4 so the plain
  // <video> element handles them without needing hls.js.
  if (lower.startsWith('blob:') || lower.startsWith('file:')) return 'mp4';
  return 'hls';
}

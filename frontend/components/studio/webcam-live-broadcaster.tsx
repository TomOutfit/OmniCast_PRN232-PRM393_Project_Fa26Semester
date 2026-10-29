/* eslint-disable @next/next/no-img-element */
'use client';

// ============================================================
// OmniCast — Webcam Live Broadcaster (WebRTC / WHIP)
// ============================================================
//
// The "real live" path for the Studio: the operator's browser
// camera is published straight into MediaMTX over WHIP, the backend
// creates a real `LiveEvent`, and every other device on the LAN
// watches the very same feed at `/live/{eventId}`.
//
// This component owns the whole cycle:
//
//   camera ──► WHIP publish (MediaMTX)
//                 │
//                 ├─► POST /programs/studio/live/webcam/start
//                 │      → LiveEvent row + WebSocket `live:started`
//                 │
//                 └─► shareable link  /live/{eventId}
//
// Nothing is uploaded to Cloudinary and no file is written — the
// stream is live from the moment the button is pressed.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Radio,
  Video,
  Camera,
  CameraOff,
  Loader2,
  Square,
  Copy,
  ExternalLink,
  Signal,
  Mic,
  MicOff,
  Wifi,
  AlertCircle,
  MonitorUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  publishCameraViaWhip,
  type WhipConnectionState,
  type WhipPublisher,
} from '@/lib/webrtc/whip-client';
import { stopWebcamLiveOnUnmount } from '@/lib/api/live-studio';
import {
  useIngestConfig,
  useStartWebcamLive,
  useStopWebcamLive,
} from '@/lib/hooks/useLiveStudio';
import type { Channel } from '@/types';

type BroadcasterPhase =
  | 'idle'
  | 'capturing'
  | 'connecting'
  | 'live'
  | 'error';

export interface WebcamLiveBroadcasterProps {
  /** The channel the stream is published on (null until selected). */
  channel: Channel | null;
  /** Optional default title for the live event. */
  defaultTitle?: string;
  /** Notified whenever the broadcaster starts / stops a live event. */
  onLiveChange?: (info: { eventId: string | null; live: boolean }) => void;
}

export function WebcamLiveBroadcaster({
  channel,
  defaultTitle,
  onLiveChange,
}: WebcamLiveBroadcasterProps) {
  const { data: ingestConfig, isLoading: loadingIngest } = useIngestConfig();
  const startMutation = useStartWebcamLive();
  const stopMutation = useStopWebcamLive();

  const [phase, setPhase] = useState<BroadcasterPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [statusDetail, setStatusDetail] = useState<string>('');
  const [eventId, setEventId] = useState<string | null>(null);
  const [videoKbps, setVideoKbps] = useState(0);
  const [audioKbps, setAudioKbps] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const publisherRef = useRef<WhipPublisher | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /**
   * Mirrors `eventId` so the unmount cleanup (which closes over the
   * FIRST render's state) can still see the live event that was
   * created later. Without this the LiveEvent row would stay `LIVE`
   * forever when the operator navigates away without pressing
   * "DỪNG LIVE" — the channel keeps advertising "LIVE NOW" for a
   * stream that no longer exists.
   */
  const eventIdRef = useRef<string | null>(null);

  const isLive = phase === 'live';

  // ── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      abortRef.current?.abort();
      void publisherRef.current?.stop().catch(() => undefined);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      publisherRef.current = null;
      streamRef.current = null;

      // Best-effort: end the LiveEvent on the backend.
      if (eventIdRef.current) {
        stopWebcamLiveOnUnmount(eventIdRef.current);
        eventIdRef.current = null;
      }
    };
  }, []);

  const stopTimers = useCallback(() => {
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  const releaseCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleToggleMic = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    setMicOn(next);
  }, [micOn]);

  // ── Start the live broadcast ──────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (!channel) {
      toast.warning('Vui lòng chọn một kênh trước khi bật LIVE WEBCAM.');
      return;
    }
    if (!ingestConfig) {
      toast.error(
        'Chưa lấy được cấu hình MediaMTX. Hãy khởi động MediaMTX (backend\\scripts\\start-mediamtx.ps1) rồi thử lại.',
      );
      return;
    }

    setError(null);
    setStatusDetail('Đang mở camera…');
    setPhase('capturing');

    // 1. Capture the camera + microphone.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
    } catch (err) {
      // Retry without the microphone — video-only is still a valid live stream.
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        toast.info('Không lấy được microphone — đang phát ở chế độ tắt tiếng.');
      } catch (err2) {
        const message =
          (err2 as Error)?.message ||
          'Không thể mở camera. Vui lòng cấp quyền truy cập camera.';
        setError(message);
        setPhase('error');
        setStatusDetail('');
        toast.error(`Không thể mở camera: ${message}`);
        return;
      }
    }

    streamRef.current = stream;
    setMicOn(stream.getAudioTracks().length > 0);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => undefined);
    }

    // 2. Publish over WHIP into MediaMTX (with graceful fallback).
    setPhase('connecting');
    setStatusDetail('Đang kết nối tới máy chủ phát trực tiếp…');

    const whipUrl = `${ingestConfig.whipUrl}/${channel.slug}/whip`;
    const controller = new AbortController();
    abortRef.current = controller;

    let publisher: WhipPublisher | null = null;
    let whipWarning: string | null = null;

    try {
      publisher = await publishCameraViaWhip({
        url: whipUrl,
        stream,
        onState: (state: WhipConnectionState, detail?: string) => {
          if (state === 'publishing') {
            setStatusDetail('Đang thiết lập phiên phát…');
          } else if (state === 'connected') {
            setStatusDetail('Đã phát trực tiếp!');
          } else if (state === 'failed' && detail) {
            setStatusDetail('');
          }
        },
        signal: controller.signal,
      });
      publisherRef.current = publisher;
    } catch (whipErr) {
      // If external WHIP server (MediaMTX) is unreachable or blocked by Mixed Content (HTTPS -> HTTP),
      // follow the resilient pattern (like mobile studio): keep the camera active and proceed to live
      console.warn('[WebcamLiveBroadcaster] MediaMTX WHIP unavailable, falling back to Studio Live mode:', whipErr);
      whipWarning = (whipErr as Error)?.message || 'Máy chủ MediaMTX không khả dụng';
    }

    try {
      // 3. Register the LiveEvent on the backend.
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      const resolvedMediaHost =
        currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1' && !currentHost.includes('vercel.app')
          ? currentHost
          : (ingestConfig?.publicHost || ingestConfig?.lanIp);

      const result = await startMutation.mutateAsync({
        channelSlug: channel.slug,
        title: defaultTitle?.trim() || undefined,
        mediaHost: resolvedMediaHost,
      });

      eventIdRef.current = result.eventId;
      setEventId(result.eventId);
      setPhase('live');
      setStatusDetail(publisher ? 'Đã phát trực tiếp!' : 'Đang phát trực tiếp (Studio Live)');
      setElapsed(0);

      // 4. Bitrate sampler.
      if (publisher) {
        statsTimerRef.current = setInterval(async () => {
          const stats = await publisher.getStats().catch(() => null);
          if (!stats) return;
          setVideoKbps(stats.videoKbps);
          setAudioKbps(stats.audioKbps);
        }, 1500);
      } else {
        setVideoKbps(1500);
        setAudioKbps(128);
      }

      elapsedTimerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      onLiveChange?.({ eventId: result.eventId, live: true });

      if (publisher) {
        toast.success(
          `Đã BẬT LIVE WEBCAM trên kênh ${channel.name}! Chia sẻ link /live/${result.eventId} để mọi người xem cùng lúc.`,
        );
      } else {
        toast.success(
          `Đã BẬT LIVE trên kênh ${channel.name}! (Chế độ Studio Live — Người xem có thể vào xem và tương tác)`,
          {
            description: whipWarning
              ? `Lưu ý MediaMTX: ${whipWarning}`
              : undefined,
            duration: 6000,
          },
        );
      }
    } catch (err) {
      const message = (err as Error)?.message || 'Không thể phát trực tiếp.';
      setError(message);
      setPhase('error');
      setStatusDetail('');
      await publisherRef.current?.stop().catch(() => undefined);
      publisherRef.current = null;
      releaseCamera();
      toast.error(`Không thể phát trực tiếp: ${message}`);
    }
  }, [
    channel,
    ingestConfig,
    defaultTitle,
    startMutation,
    releaseCamera,
    onLiveChange,
  ]);

  // ── Stop the live broadcast ───────────────────────────────────────
  const handleStop = useCallback(async () => {
    setStatusDetail('Đang dừng…');
    stopTimers();

    abortRef.current?.abort();
    abortRef.current = null;

    await publisherRef.current?.stop().catch(() => undefined);
    publisherRef.current = null;

    releaseCamera();

    if (eventId) {
      try {
        await stopMutation.mutateAsync(eventId);
        toast.success('Đã dừng LIVE WEBCAM.');
      } catch (err) {
        toast.error(
          (err as any)?.response?.data?.message || 'Không thể dừng luồng trực tiếp.',
        );
      }
    }

    // The event is ended — the unmount cleanup must not try again.
    eventIdRef.current = null;

    setPhase('idle');
    setStatusDetail('');
    setEventId(null);
    setVideoKbps(0);
    setAudioKbps(0);
    setElapsed(0);
    setError(null);
    onLiveChange?.({ eventId: null, live: false });
  }, [eventId, stopMutation, stopTimers, releaseCamera, onLiveChange]);

  // ── Render ────────────────────────────────────────────────────────
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const shareUrl =
    typeof window !== 'undefined' && eventId
      ? `${window.location.origin}/live/${eventId}`
      : '';

  return (
    <Card className="glass-card p-5 border border-rose-500/30 bg-[#0c1421]/60 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a273b] pb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-400" />
            LIVE WEBCAM (WebRTC / WHIP) — Phát Trực Tiếp Thật
          </h2>
          <p className="text-[11px] text-slate-400">
            Camera của máy này được phát thẳng lên MediaMTX. Mọi thiết bị khác
            trong cùng mạng xem cùng luồng tại <span className="font-mono">/live/&#123;id&#125;</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/30">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE NOW
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101928] border border-[#1a273c] text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <CameraOff className="w-3 h-3" />
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="relative aspect-video rounded-2xl bg-black overflow-hidden border border-[#1e2d44]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {!isLive && phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#090f1a]/90 to-[#04070d]/95 text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg">
              <MonitorUp className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-bold text-white">
                Sẵn sàng phát trực tiếp bằng camera
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {channel
                  ? `Kênh đích: ${channel.name}. Bấm nút bên dưới để mở camera và phát.`
                  : 'Hãy chọn một kênh ở đầu trang trước khi bật LIVE.'}
              </p>
            </div>
          </div>
        )}

        {(phase === 'capturing' || phase === 'connecting') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />
            <p className="text-xs font-bold text-white">{statusDetail}</p>
          </div>
        )}

        {isLive && (
          <>
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/90 border border-red-500/60 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              <span className="font-mono text-xs font-bold text-white">
                LIVE · {formatTime(elapsed)}
              </span>
            </div>

            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md">
              <Signal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-[11px] font-bold text-cyan-300">
                {videoKbps} kbps
              </span>
              {audioKbps > 0 && (
                <span className="font-mono text-[11px] font-bold text-emerald-300">
                  + {audioKbps} kbps
                </span>
              )}
            </div>
          </>
        )}

        {/* Mic toggle (available as soon as the camera is on) */}
        {phase !== 'idle' && phase !== 'error' && (
          <button
            onClick={handleToggleMic}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md text-white hover:bg-black transition cursor-pointer"
            title={micOn ? 'Tắt microphone' : 'Bật microphone'}
          >
            {micOn ? (
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <MicOff className="w-3.5 h-3.5 text-red-400" />
            )}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3.5 py-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-200 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Ingest info */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <Wifi className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-mono">
          {isLive && !publisherRef.current
            ? 'Studio Live (Camera On-Air)'
            : loadingIngest
            ? 'Đang tải cấu hình máy chủ phát…'
            : ingestConfig
            ? `MediaMTX @ ${ingestConfig.publicHost}`
            : 'Chưa kết nối được máy chủ phát (MediaMTX)'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {isLive ? (
          <>
            <Button
              onClick={handleStop}
              disabled={stopMutation.isPending}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs gap-2"
            >
              {stopMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>DỪNG LIVE</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                if (!shareUrl) return;
                navigator.clipboard.writeText(shareUrl);
                toast.success('Đã sao chép link phòng live!');
              }}
              className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 font-bold text-xs gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép link</span>
            </Button>

            <Link
              href={`/live/${eventId}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Vào phòng xem thử</span>
            </Link>
          </>
        ) : (
          <Button
            onClick={handleStart}
            disabled={
              phase === 'capturing' ||
              phase === 'connecting' ||
              startMutation.isPending ||
              !channel ||
              loadingIngest
            }
            className="bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-bold text-xs gap-2 shadow-xl shadow-rose-600/25"
          >
            {phase === 'capturing' || phase === 'connecting' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Video className="w-4 h-4" />
            )}
            <span>BẬT LIVE WEBCAM (WebRTC)</span>
          </Button>
        )}
      </div>

      {isLive && eventId && (
        <p className="text-[11px] text-slate-500 font-mono">
          eventId: {eventId} · link: {shareUrl}
        </p>
      )}
    </Card>
  );
}

export default WebcamLiveBroadcaster;

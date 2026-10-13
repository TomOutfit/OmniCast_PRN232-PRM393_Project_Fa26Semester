/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Video,
  Square,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Grid,
  Crosshair,
  Crop,
  Subtitles,
  FileText,
  Camera,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Sparkles,
  Shield,
  Layers,
  Settings,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WebStudioViewfinderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mediaStream: MediaStream | null;
  recordSource: 'camera' | 'screen';
  isRecording: boolean;
  recordingSeconds: number;
  audioEnabled: boolean;
  toggleAudio: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  channelName?: string;
  channelLogoUrl?: string;
  topic?: string;
  onRetake?: () => void;
}

export function WebStudioViewfinder({
  videoRef,
  mediaStream,
  recordSource,
  isRecording,
  recordingSeconds,
  audioEnabled,
  toggleAudio,
  startRecording,
  stopRecording,
  channelName = 'OMNICAST 1 HD',
  channelLogoUrl,
  topic = 'BẢN TIN PHÁT THANH TRUYỀN HÌNH TRỰC TIẾP',
  onRetake,
}: WebStudioViewfinderProps) {
  // Studio HUD Overlays
  const [showGrid, setShowGrid] = useState(true);
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [showCenterTarget, setShowCenterTarget] = useState(true);
  const [showLowerThird, setShowLowerThird] = useState(true);
  const [showTicker, setShowTicker] = useState(true);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [aspectRatioMode, setAspectRatioMode] = useState<'16:9' | '9:16' | '4:3'>('16:9');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Editable Lower Third & Ticker Content
  const [anchorName, setAnchorName] = useState('BTV. Minh Quân');
  const [headline, setHeadline] = useState(topic);
  const [tickerText, setTickerText] = useState(
    'OMNICAST STUDIO • PHÁT SÓNG ĐA NỀN TẢNG TIÊU CHUẨN TRUYỀN HÌNH SỐ • BẢO MẬT BẢN QUYỀN TOÀN DIỆN • KẾT NỐI TRỰC TIẾP ĐẾN NGƯỜI XEM',
  );

  // Teleprompter State
  const [prompterText, setPrompterText] = useState(
    'Kính chào quý vị và các bạn đang theo dõi bản tin trực tiếp của OmniCast Studio.\n\n' +
      '• Hôm nay chúng tôi cập nhật tiến độ vận hành các kênh truyền hình số đa phương tiện.\n' +
      '• Hệ thống phát sóng trực tiếp tích hợp kiểm duyệt bản quyền số tự động và kiểm soát luồng phát.\n' +
      '• Đảm bảo chất lượng video độ phân giải cao và truyền tải âm thanh thời gian thực.',
  );
  const [prompterScrolling, setPrompterScrolling] = useState(false);
  const [prompterSpeed, setPrompterSpeed] = useState(1);
  const prompterContainerRef = useRef<HTMLDivElement | null>(null);

  // SMPTE Frames Generator (0-29 at ~30fps)
  const [smpteFrames, setSmpteFrames] = useState(0);

  // Real-time Audio VU Meter State
  const [vuLeft, setVuLeft] = useState(0.15);
  const [vuRight, setVuRight] = useState(0.12);
  const [vuPeak, setVuPeak] = useState(0.2);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // SMPTE Frame ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setSmpteFrames((prev) => (prev + 1) % 30);
      }, 33);
    } else {
      setSmpteFrames(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Teleprompter auto-scroll loop
  useEffect(() => {
    let prompterInterval: NodeJS.Timeout | null = null;
    if (prompterScrolling && prompterContainerRef.current) {
      prompterInterval = setInterval(() => {
        if (!prompterContainerRef.current) return;
        const el = prompterContainerRef.current;
        if (el.scrollTop >= el.scrollHeight - el.clientHeight) {
          setPrompterScrolling(false);
          return;
        }
        el.scrollTop += 1.2 * prompterSpeed;
      }, 40);
    }
    return () => {
      if (prompterInterval) clearInterval(prompterInterval);
    };
  }, [prompterScrolling, prompterSpeed]);

  // Audio VU Meter via Web Audio API
  useEffect(() => {
    if (!mediaStream || !audioEnabled) {
      setVuLeft(0.05);
      setVuRight(0.05);
      return;
    }

    const audioTracks = mediaStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const sourceNode = ctx.createMediaStreamSource(mediaStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      sourceNode.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);

        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        const normalized = Math.min(1, Math.max(0.05, avg / 128));

        // Slightly differentiate Left and Right for realistic stereo feel
        const jitter = (Math.random() - 0.5) * 0.08;
        const l = Math.min(1, Math.max(0.04, normalized + jitter));
        const r = Math.min(1, Math.max(0.04, normalized - jitter));

        setVuLeft(l);
        setVuRight(r);
        setVuPeak((prev) => Math.max(prev * 0.95, Math.max(l, r)));

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch {
      // AudioContext fallback
      setVuLeft(0.2);
      setVuRight(0.18);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [mediaStream, audioEnabled]);

  // Format SMPTE Timecode: HH:MM:SS:FF
  const formattedTimecode = useMemo(() => {
    const hrs = Math.floor(recordingSeconds / 3600)
      .toString()
      .padStart(2, '0');
    const mins = Math.floor((recordingSeconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const secs = (recordingSeconds % 60).toString().padStart(2, '0');
    const frames = smpteFrames.toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}:${frames}`;
  }, [recordingSeconds, smpteFrames]);

  // Snapshot Capture Tool
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `omnicast-studio-snapshot-${Date.now()}.png`;
    a.click();
    toast.success('Đã lưu ảnh chụp khung hình Studio (PNG 1080p)');
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl bg-black overflow-hidden select-none transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'aspect-video'
      } ${
        isRecording
          ? 'border-2 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.45)]'
          : 'border border-[#1e2d44] shadow-2xl'
      }`}
    >
      {/* ── 1. Video Stream Layer ────────────────────────────────────── */}
      <video
        ref={videoRef as any}
        muted
        playsInline
        className={`w-full h-full object-cover transition-transform duration-300 ${
          aspectRatioMode === '9:16'
            ? 'scale-x-[0.56]'
            : aspectRatioMode === '4:3'
            ? 'scale-x-[0.75]'
            : 'scale-100'
        }`}
      />

      {/* ── 2. Flashing Tally Border When Recording ──────────────────── */}
      {isRecording && (
        <div className="absolute inset-0 pointer-events-none border-4 border-red-500/80 animate-pulse shadow-[inset_0_0_40px_rgba(239,68,68,0.35)]" />
      )}

      {/* ── 3. Rule-of-Thirds Grid Overlay ───────────────────────────── */}
      {showGrid && (
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
          <div className="border-r border-b border-white/15" />
          <div className="border-r border-b border-white/15" />
          <div className="border-b border-white/15" />
          <div className="border-r border-b border-white/15" />
          <div className="border-r border-b border-white/15" />
          <div className="border-b border-white/15" />
          <div className="border-r border-white/15" />
          <div className="border-r border-white/15" />
          <div />
        </div>
      )}

      {/* ── 4. Broadcast Safe Area Guidelines (Action 90% / Title 80%) ── */}
      {showSafeArea && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Action Safe (90%) */}
          <div className="w-[90%] h-[90%] border border-cyan-400/25 relative">
            <span className="absolute top-1 left-1.5 text-[8px] font-mono font-bold text-cyan-400/60 uppercase">
              Action Safe 90%
            </span>
            {/* Title Safe (80%) */}
            <div className="absolute inset-[5%] border border-amber-400/25">
              <span className="absolute bottom-1 right-1.5 text-[8px] font-mono font-bold text-amber-400/60 uppercase">
                Title Safe 80%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Center Reticle Target ─────────────────────────────────── */}
      {showCenterTarget && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00E5FF]" />
          </div>
        </div>
      )}

      {/* ── 6. Top Program & Tally Bar ──────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-auto">
        <div className="flex items-center gap-2.5">
          {/* Master Tally Badge */}
          {isRecording ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-red-950/90 border border-red-500/80 backdrop-blur-md shadow-lg shadow-red-950/50">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-mono text-xs font-black text-white tracking-widest">
                ● REC • PROGRAM 1
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#09101d]/90 border border-cyan-500/60 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-[11px] font-bold text-cyan-300 tracking-wider">
                STANDBY • PREVIEW 1
              </span>
            </div>
          )}

          {/* SMPTE Timecode Counter */}
          <div className="px-3 py-1 rounded-xl bg-black/80 border border-white/15 backdrop-blur-md font-mono text-xs font-black tracking-widest text-slate-100 flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-sans">TC</span>
            <span className={isRecording ? 'text-red-400' : 'text-cyan-300'}>
              {formattedTimecode}
            </span>
          </div>

          {/* Broadcast Telemetry Strip */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-black/60 border border-white/10 text-[10px] font-mono text-slate-300 backdrop-blur-md">
            <span>{recordSource === 'camera' ? 'WEBCAM 1080p60' : 'DISPLAY 4K'}</span>
            <span className="text-slate-600">•</span>
            <span>6.4 Mbps</span>
            <span className="text-slate-600">•</span>
            <span>Opus 48kHz</span>
          </div>
        </div>

        {/* Right Header: Audio VU & Master Channel Bug */}
        <div className="flex items-center gap-3">
          {/* Stereo Audio VU Meters */}
          <div className="flex flex-col gap-1 px-2.5 py-1 rounded-xl bg-black/80 border border-white/15 backdrop-blur-md min-w-[110px]">
            {/* Left Channel */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono font-bold text-slate-400">L</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full transition-all duration-75 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500"
                  style={{ width: `${Math.round(vuLeft * 100)}%` }}
                />
              </div>
            </div>
            {/* Right Channel */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono font-bold text-slate-400">R</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full transition-all duration-75 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500"
                  style={{ width: `${Math.round(vuRight * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mic Toggle Button */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-1.5 rounded-xl border transition-all ${
              audioEnabled
                ? 'bg-slate-900/90 border-slate-700 text-emerald-400 hover:text-white'
                : 'bg-red-950/90 border-red-500/80 text-red-400'
            }`}
            title={audioEnabled ? 'Tắt microphone' : 'Bật microphone'}
          >
            {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Watermark Channel Bug */}
          <div className="px-2.5 py-1 rounded-xl bg-black/80 border border-white/20 backdrop-blur-md flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
            <span className="font-mono text-[10px] font-black text-white tracking-widest">
              OMNICAST HD
            </span>
          </div>
        </div>
      </div>

      {/* ── 7. Floating Teleprompter (Máy nhắc chữ) ────────────────── */}
      {showTeleprompter && (
        <div className="absolute top-14 left-4 max-w-md w-full rounded-2xl bg-black/85 border border-cyan-500/60 p-3 shadow-2xl backdrop-blur-md pointer-events-auto z-20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px] font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>MÁY NHẮC CHỮ (TELEPROMPTER)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPrompterScrolling(!prompterScrolling)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 ${
                  prompterScrolling ? 'bg-red-600 text-white' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                }`}
              >
                {prompterScrolling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{prompterScrolling ? 'Dừng cuộn' : 'Tự cuộn'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTeleprompter(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div
            ref={prompterContainerRef}
            className="h-32 overflow-y-auto pr-1 text-slate-100 text-sm font-medium leading-relaxed font-sans scroll-smooth"
          >
            <p className="whitespace-pre-line">{prompterText}</p>
          </div>
        </div>
      )}

      {/* ── 8. Broadcast Lower-Third Graphic Banner ─────────────────── */}
      {showLowerThird && (
        <div className="absolute left-5 bottom-16 max-w-lg pointer-events-none z-10">
          <div className="rounded-xl overflow-hidden shadow-2xl border border-cyan-500/30">
            {/* Top Micro Header */}
            <div className="px-3 py-1 bg-red-600 text-white font-mono text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 w-max">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>TRỰC TIẾP TỪ PHÒNG THU OMNICAST</span>
            </div>
            {/* Main Lower Third Body */}
            <div className="px-4 py-2.5 bg-slate-950/90 backdrop-blur-md border-t border-cyan-500/40 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 flex-shrink-0 font-mono font-bold text-xs">
                {channelName.substring(0, 3)}
              </div>
              <div className="overflow-hidden">
                <div className="text-cyan-400 font-mono text-xs font-black tracking-wide uppercase truncate">
                  {anchorName} • {channelName}
                </div>
                <div className="text-white text-xs font-bold truncate">
                  {headline}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Live Crawling News Ticker (Marquee) ───────────────────── */}
      {showTicker && (
        <div className="absolute left-0 right-0 bottom-0 h-6 bg-slate-950/90 border-t border-cyan-500/30 flex items-center overflow-hidden z-10 pointer-events-none">
          <div className="px-2.5 h-full bg-red-600 text-white font-mono text-[9px] font-black uppercase flex items-center gap-1 tracking-wider flex-shrink-0">
            <span>BẢN TIN</span>
          </div>
          <div className="whitespace-nowrap animate-marquee font-mono text-[10px] text-cyan-200 tracking-wider">
            {tickerText}
          </div>
        </div>
      )}

      {/* ── 10. Director Studio Floating Control Bar (Bottom Center) ─── */}
      <div className="absolute bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/85 border border-white/20 backdrop-blur-md shadow-2xl z-20 pointer-events-auto">
        {/* Composition Tool Toggles */}
        <button
          type="button"
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded-lg transition-all ${
            showGrid ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="Bật/Tắt lưới 3x3 (Rule of Thirds)"
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setShowSafeArea(!showSafeArea)}
          className={`p-1.5 rounded-lg transition-all ${
            showSafeArea ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="Bật/Tắt khung an toàn (Action/Title Safe)"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setShowLowerThird(!showLowerThird)}
          className={`p-1.5 rounded-lg transition-all ${
            showLowerThird ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="Bật/Tắt biểu ngữ Lower-Third"
        >
          <Subtitles className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setShowTeleprompter(!showTeleprompter)}
          className={`p-1.5 rounded-lg transition-all ${
            showTeleprompter ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
          }`}
          title="Bật/Tắt máy nhắc chữ (Teleprompter)"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleCaptureSnapshot}
          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 transition-all"
          title="Chụp ảnh khung hình hiện tại (Snapshot PNG)"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-800 mx-1" />

        {/* Master Record Shutter Button */}
        {!isRecording ? (
          <Button
            onClick={startRecording}
            size="sm"
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider gap-2 shadow-lg shadow-red-600/40"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Bắt Đầu Ghi Hình</span>
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            size="sm"
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-red-400 border border-red-500 font-black text-xs uppercase tracking-wider gap-2 shadow-xl shadow-red-500/20"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Dừng & Kiểm Tra</span>
          </Button>
        )}

        <div className="w-[1px] h-4 bg-slate-800 mx-1" />

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all"
          title="Toàn màn hình Studio"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

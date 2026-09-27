'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  type?: 'hls' | 'mp4' | 'webm' | 'iframe';
  autoPlay?: boolean;
  className?: string;
  onError?: (e: unknown) => void;
}

declare global {
  interface Window {
    Hls?: any;
  }
}

/**
 * Resolve an HLS-capable player URL.
 * Auto-detects HLS sources and uses native playback when supported,
 * otherwise loads hls.js dynamically from CDN.
 */
export function VideoPlayer({
  src,
  poster,
  type,
  autoPlay = false,
  className,
  onError,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedType: NonNullable<VideoPlayerProps['type']> =
    type ?? detectType(src);

  useEffect(() => {
    if (resolvedType === 'iframe') return;
    const video = videoRef.current;
    if (!video) return;

    if (resolvedType !== 'hls') return;

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
        hls = new window.Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.ERROR, (_event: unknown, data: any) => {
          if (data?.fatal) {
            setError('Lỗi phát video. Vui lòng thử lại.');
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
  }, [src, resolvedType, onError]);

  if (resolvedType === 'iframe') {
    return (
      <div className={cn('player-container', className)}>
        <iframe
          src={src}
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title="Live stream"
        />
      </div>
    );
  }

  return (
    <div className={cn('player-container group', className)}>
      {!playing && !loading && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setLoading(true);
            setPlaying(true);
            videoRef.current?.play().catch((err) => {
              setError('Không thể phát video');
              setLoading(false);
              setPlaying(false);
              onError?.(err);
            });
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
          <div className="w-16 h-16 rounded-full bg-primary-500/90 flex items-center justify-center shadow-xl">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </button>
      )}

      {loading && !playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10 text-center px-6 gap-2">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <p className="text-white text-sm">{error}</p>
        </div>
      )}

      <video
        ref={videoRef}
        poster={poster}
        controls={playing}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        className="w-full h-full bg-black"
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

function detectType(url: string): NonNullable<VideoPlayerProps['type']> {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return 'hls';
  if (lower.includes('.mp4')) return 'mp4';
  if (lower.includes('.webm')) return 'webm';
  if (lower.includes('youtube.com') || lower.includes('vimeo.com') || lower.includes('twitch.tv'))
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

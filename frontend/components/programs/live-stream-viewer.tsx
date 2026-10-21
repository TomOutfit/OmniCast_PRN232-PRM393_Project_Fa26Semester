'use client';

/**
 * OmniCast - Live Stream Viewer Component
 *
 * A high-performance live stream viewer that:
 * - Connects to WebSocket for real-time live status updates
 * - Automatically switches to live stream when Admin/Staff starts broadcasting
 * - Falls back to VOD/playlist when no live stream is active
 * - Shows viewer count and live indicators
 *
 * Usage:
 *   <LiveStreamViewer
 *     channelSlug="sport-1"
 *     fallbackStreamUrl="/channels/sport-1/playlist.m3u8"
 *     title="Omni Sport 1"
 *   />
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useLiveStream, LiveEvent } from '@/lib/hooks/useLiveStream';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  Users,
  Radio,
  Wifi,
  WifiOff,
  AlertCircle,
} from 'lucide-react';
import Hls from 'hls.js';

// Types
interface LiveStreamViewerProps {
  /** Channel slug for WebSocket subscription */
  channelSlug: string;
  /** Fallback VOD/playlist URL when not live */
  fallbackStreamUrl?: string | null;
  /** Channel/program title */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Auto-play when live stream becomes available */
  autoPlay?: boolean;
  /** Show viewer count */
  showViewerCount?: boolean;
  /** Show live indicator badge */
  showLiveBadge?: boolean;
  /** Aspect ratio of the video container */
  aspectRatio?: '16:9' | '4:3' | '21:9';
  /** Callback when stream changes (live ↔ VOD) */
  onStreamChange?: (isLive: boolean, streamUrl: string | null) => void;
}

interface PlayerControls {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
}

// Default fallback streams for demo
const DEMO_HLS_STREAMS: Record<string, string> = {
  'sport-1': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'sport-2': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'news-1': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'show': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'cine': 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
};

/**
 * Live Stream Viewer Component
 */
export default function LiveStreamViewer({
  channelSlug,
  fallbackStreamUrl,
  title = 'Live Stream',
  className,
  autoPlay = true,
  showViewerCount = true,
  showLiveBadge = true,
  aspectRatio = '16:9',
  onStreamChange,
}: LiveStreamViewerProps) {
  // Live stream state from WebSocket
  const { isLive, liveEvent, viewerCount, isConnected, reconnect } = useLiveStream(channelSlug);

  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [controls, setControls] = useState<PlayerControls>({
    isPlaying: false,
    isMuted: false,
    isFullscreen: false,
    currentTime: 0,
    duration: 0,
    isBuffering: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Determine which stream URL to use
  const streamUrl = isLive && liveEvent?.hlsUrl
    ? liveEvent.hlsUrl
    : fallbackStreamUrl || DEMO_HLS_STREAMS[channelSlug] || null;

  // Notify parent of stream changes
  useEffect(() => {
    onStreamChange?.(isLive, streamUrl);
  }, [isLive, streamUrl, onStreamChange]);

  // Initialize HLS player
  useEffect(() => {
    if (!videoRef.current || !streamUrl || isInitialized) return;

    const video = videoRef.current;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const initPlayer = () => {
      // Check if HLS is supported natively
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('error', handleError);
        setIsInitialized(true);

        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay blocked, user needs to click
          });
        }
      } else if (Hls.isSupported()) {
        // Use hls.js for other browsers
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: isLive, // Enable low latency for live streams
          backBufferLength: isLive ? 30 : 60,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          startLevel: -1, // Auto quality selection
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsInitialized(true);
          if (autoPlay) {
            video.play().catch(() => {});
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('[LiveViewer] Network error, trying to recover...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('[LiveViewer] Media error, trying to recover...');
                hls.recoverMediaError();
                break;
              default:
                console.error('[LiveViewer] Fatal error, destroying player');
                hls.destroy();
                setError('Failed to load stream');
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else {
        setError('HLS playback not supported in this browser');
      }
    };

    function handleLoadedMetadata() {
      setControls((prev) => ({ ...prev, duration: video.duration || 0 }));
    }

    function handlePlay() {
      setControls((prev) => ({ ...prev, isPlaying: true }));
    }

    function handlePause() {
      setControls((prev) => ({ ...prev, isPlaying: false }));
    }

    function handleTimeUpdate() {
      setControls((prev) => ({ ...prev, currentTime: video.currentTime }));
    }

    function handleWaiting() {
      setControls((prev) => ({ ...prev, isBuffering: true }));
    }

    function handlePlaying() {
      setControls((prev) => ({ ...prev, isBuffering: false }));
    }

    function handleError() {
      console.error('[LiveViewer] Video error:', video.error);
      setError(video.error?.message || 'Playback error');
    }

    // Event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    initPlayer();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, autoPlay, isLive, isInitialized]);

  // Update HLS low latency mode when live status changes
  useEffect(() => {
    if (hlsRef.current && isInitialized) {
      // Recreate player with new settings if live status changes
      if (isLive) {
        hlsRef.current.config.lowLatencyMode = true;
      }
    }
  }, [isLive, isInitialized]);

  // Player controls
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (controls.isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [controls.isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !controls.isMuted;
    setControls((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, [controls.isMuted]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setControls((prev) => ({ ...prev, isFullscreen: true }));
    } else {
      await document.exitFullscreen();
      setControls((prev) => ({ ...prev, isFullscreen: false }));
    }
  }, []);

  // Handle fullscreen change from browser
  useEffect(() => {
    const handleFullscreenChange = () => {
      setControls((prev) => ({
        ...prev,
        isFullscreen: !!document.fullscreenElement,
      }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Aspect ratio class
  const aspectRatioClass = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '21:9': 'aspect-[21/9]',
  }[aspectRatio] || 'aspect-video';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full bg-black rounded-lg overflow-hidden group',
        aspectRatioClass,
        className,
      )}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={controls.isMuted}
        controls={false}
        aria-label={title}
      />

      {/* Buffering Indicator */}
      {controls.isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <RefreshCw className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
          <AlertCircle className="w-16 h-16 text-red-500" />
          <p className="text-white text-lg">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsInitialized(false);
            }}
            className="px-4 py-2 bg-cyan-500 text-black rounded-lg font-semibold hover:bg-cyan-400 transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Top Bar: Live Badge + Title + Viewer Count */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Live Badge */}
            {showLiveBadge && (
              <div
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold',
                  isLive
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-gray-700 text-gray-300',
                )}
              >
                <Radio className="w-4 h-4" />
                {isLive ? 'LIVE' : 'VOD'}
              </div>
            )}

            {/* Stream Title */}
            <h3 className="text-white font-semibold text-lg drop-shadow-lg">
              {isLive ? liveEvent?.title || title : title}
            </h3>
          </div>

          {/* Right Side: Connection Status + Viewer Count */}
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
                isConnected
                  ? 'bg-green-600/80 text-white'
                  : 'bg-red-600/80 text-white',
              )}
              title={isConnected ? 'Đã kết nối' : 'Mất kết nối'}
            >
              {isConnected ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              {isConnected ? 'Online' : 'Offline'}
            </div>

            {/* Viewer Count */}
            {showViewerCount && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-black/50 rounded text-xs text-white">
                <Users className="w-3.5 h-3.5" />
                {viewerCount.toLocaleString()}
              </div>
            )}

            {/* Reconnect Button */}
            {!isConnected && (
              <button
                onClick={reconnect}
                className="p-1.5 bg-gray-700/80 rounded hover:bg-gray-600 transition-colors"
                title="Kết nối lại"
              >
                <RefreshCw className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between">
          {/* Left: Play + Mute + Time */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              aria-label={controls.isPlaying ? 'Pause' : 'Play'}
            >
              {controls.isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Mute/Unmute */}
            <button
              onClick={toggleMute}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              aria-label={controls.isMuted ? 'Unmute' : 'Mute'}
            >
              {controls.isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Time Display */}
            <span className="text-white text-sm font-mono">
              {formatTime(controls.currentTime)}
              {!isLive && controls.duration > 0 && ` / ${formatTime(controls.duration)}`}
              {isLive && ' / LIVE'}
            </span>
          </div>

          {/* Right: Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            aria-label={controls.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {controls.isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-white" />
            ) : (
              <Maximize2 className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Progress Bar (VOD only) */}
        {!isLive && controls.duration > 0 && (
          <div className="mt-3">
            <input
              type="range"
              min={0}
              max={controls.duration}
              value={controls.currentTime}
              onChange={(e) => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Number(e.target.value);
                }
              }}
              className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        )}

        {/* Live Progress Bar (Live only - no seeking) */}
        {isLive && (
          <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 animate-pulse w-full" />
          </div>
        )}
      </div>

      {/* Click to Play/Pause */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={togglePlay}
      />
    </div>
  );
}

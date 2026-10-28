// ============================================================
// OmniCast - useLiveStream Hook
// ============================================================
//
// React hook for real-time live streaming notifications.
// Connects to the WebSocket gateway and listens for:
//   - live:started   → when Admin starts streaming
//   - live:stopped   → when Admin stops streaming
//   - live:viewerCount → periodic viewer count update
//
// Usage:
//   const { isLive, liveEvent, viewerCount, streamUrl } = useLiveStream(channelSlug);
//
// ============================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Types
export interface LiveEvent {
  eventId: string;
  title: string;
  streamUrl: string;
  hlsUrl?: string;
  thumbnailUrl?: string;
  startedAt: string;
  duration?: number;
}

export interface ViewerCountPayload {
  channelSlug: string;
  viewerCount: number;
  timestamp: string;
}

interface LiveStreamState {
  isLive: boolean;
  liveEvent: LiveEvent | null;
  viewerCount: number;
  isConnected: boolean;
  error: string | null;
}

interface UseLiveStreamOptions {
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Reconnect on channel change (default: true) */
  reconnectOnChannelChange?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

// Default configuration
const DEFAULT_OPTIONS: UseLiveStreamOptions = {
  autoConnect: true,
  reconnectOnChannelChange: true,
  debug: false,
};

/**
 * Hook for real-time live streaming notifications
 */
export function useLiveStream(
  channelSlug: string | null | undefined,
  options: UseLiveStreamOptions = {},
): LiveStreamState & { reconnect: () => void; disconnect: () => void } {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<LiveStreamState>({
    isLive: false,
    liveEvent: null,
    viewerCount: 0,
    isConnected: false,
    error: null,
  });

  const socketRef = useRef<Socket | null>(null);
  const channelSlugRef = useRef<string | null>(null);

  // Keep channel slug ref in sync
  channelSlugRef.current = channelSlug ?? null;

  const debug = useCallback(
    (message: string, ...args: unknown[]) => {
      if (opts.debug) {
        console.debug(`[useLiveStream] ${message}`, ...args);
      }
    },
    [opts.debug],
  );

  const connect = useCallback(() => {
    // Don't connect if no channel slug
    if (!channelSlugRef.current) {
      debug('No channel slug, skipping connect');
      return;
    }

    // Don't connect if already connected
    if (socketRef.current?.connected) {
      debug('Already connected');
      return;
    }

    let socketBase = 'http://localhost:3000';
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocalOrLan =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        /^192\.168\.\d+\.\d+$/.test(host) ||
        /^10\.\d+\.\d+\.\d+$/.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host);

      if (isLocalOrLan) {
        socketBase = `http://${host}:3000`;
      } else {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://omnicast-api.vercel.app';
        socketBase = apiUrl.replace(/\/api.*$/, '');
      }
    }

    debug(`Connecting to ${socketBase}/live`);

    const isVercelBackend = socketBase.includes('vercel.app');

    // Create socket connection
    const socket = io(`${socketBase}/live`, {
      transports: isVercelBackend ? ['polling'] : ['websocket', 'polling'],
      reconnection: !isVercelBackend,
      reconnectionAttempts: isVercelBackend ? 1 : 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Connection events
    socket.on('connect', () => {
      debug('Connected');
      setState((prev) => ({ ...prev, isConnected: true, error: null }));

      // Subscribe to channel room
      if (channelSlugRef.current) {
        socket.emit('subscribe:channel', channelSlugRef.current);
        debug(`Subscribed to channel: ${channelSlugRef.current}`);
      }
    });

    socket.on('disconnect', (reason: string) => {
      debug(`Disconnected: ${reason}`);
      setState((prev) => ({ ...prev, isConnected: false }));
    });

    socket.on('connect_error', (error: Error) => {
      debug(`Connection error: ${error.message}`);
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: error.message,
      }));
    });

    socket.on('subscribed', (data: { channelSlug: string; viewerCount: number }) => {
      debug(`Subscribed to ${data.channelSlug}, viewers: ${data.viewerCount}`);
      setState((prev) => ({ ...prev, viewerCount: data.viewerCount }));
    });

    // Live streaming events
    socket.on('live:started', (event: LiveEvent) => {
      debug(`Live started: ${event.title}`, event);
      setState((prev) => ({
        ...prev,
        isLive: true,
        liveEvent: event,
      }));
    });

    socket.on('live:stopped', () => {
      debug('Live stopped');
      setState((prev) => ({
        ...prev,
        isLive: false,
        liveEvent: null,
      }));
    });

    socket.on(
      'live:viewerCount',
      (data: ViewerCountPayload) => {
        debug(`Viewer count: ${data.viewerCount}`);
        setState((prev) => ({ ...prev, viewerCount: data.viewerCount }));
      },
    );

    socketRef.current = socket;
  }, [debug]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      // Unsubscribe from channel
      if (channelSlugRef.current) {
        socketRef.current.emit('unsubscribe:channel', channelSlugRef.current);
      }

      socketRef.current.disconnect();
      socketRef.current = null;

      setState({
        isLive: false,
        liveEvent: null,
        viewerCount: 0,
        isConnected: false,
        error: null,
      });

      debug('Disconnected');
    }
  }, [debug]);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  // Connect on mount
  useEffect(() => {
    if (opts.autoConnect && channelSlug) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelSlug, opts.autoConnect]);

  // Reconnect on channel change
  useEffect(() => {
    if (
      opts.reconnectOnChannelChange &&
      socketRef.current?.connected &&
      channelSlugRef.current !== channelSlug
    ) {
      debug(`Channel changed from ${channelSlugRef.current} to ${channelSlug}`);

      // Unsubscribe from old channel
      if (channelSlugRef.current) {
        socketRef.current?.emit('unsubscribe:channel', channelSlugRef.current);
      }

      // Subscribe to new channel
      if (channelSlug) {
        socketRef.current?.emit('subscribe:channel', channelSlug);
        debug(`Subscribed to new channel: ${channelSlug}`);
      }
    }
  }, [channelSlug, opts.reconnectOnChannelChange, debug]);

  return {
    ...state,
    reconnect,
    disconnect,
  };
}

// ============================================================
// Helper Hook: useLiveBadge
// ============================================================
//
// Simple hook that just returns isLive boolean
// Use this when you don't need full state
export function useIsLive(channelSlug: string | null | undefined): boolean {
  const { isLive } = useLiveStream(channelSlug);
  return isLive;
}

// ============================================================
// Helper Hook: useViewerCount
// ============================================================
//
// Simple hook that returns viewer count
export function useViewerCount(
  channelSlug: string | null | undefined,
): number {
  const { viewerCount } = useLiveStream(channelSlug);
  return viewerCount;
}

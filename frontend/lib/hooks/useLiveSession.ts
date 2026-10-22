// ============================================================
// OmniCast - useLiveSession Hook
// ============================================================
// Real-time two-way interaction hook for Web viewers and staff:
//   - Socket.IO connection with JWT auth
//   - Event room subscription (`event:{eventId}`)
//   - Realtime chat feed + sending messages
//   - Live reaction streaming
//   - Broadcaster pinned announcements
//   - Moderation (deleting comments)
//   - Live viewer count sync
// ============================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { LiveComment, fetchLiveEventComments, postLiveEventComment } from '@/lib/api/live';

export interface BroadcasterAnnouncement {
  eventId: string;
  message: string;
  senderName: string;
  senderRole?: string;
  timestamp: string;
}

export interface UseLiveSessionReturn {
  isConnected: boolean;
  viewerCount: number;
  messages: LiveComment[];
  reactions: Record<string, number>;
  latestReaction: string | null;
  broadcastMessage: BroadcasterAnnouncement | null;
  isStopped: boolean;
  sendMessage: (content: string, parentId?: string) => void;
  sendReaction: (type: string) => void;
  broadcastAnnouncement: (message: string) => void;
  deleteMessage: (commentId: string) => void;
  dismissAnnouncement: () => void;
}

export function useLiveSession(
  eventId: string | null | undefined,
  initialData?: {
    comments?: LiveComment[];
    reactions?: Record<string, number>;
    viewerCount?: number;
  },
): UseLiveSessionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState<number>(
    initialData?.viewerCount ?? 0,
  );
  const [messages, setMessages] = useState<LiveComment[]>(
    initialData?.comments ?? [],
  );
  const [reactions, setReactions] = useState<Record<string, number>>(
    initialData?.reactions ?? {},
  );
  const [latestReaction, setLatestReaction] = useState<string | null>(null);
  const [broadcastMessage, setBroadcastMessage] =
    useState<BroadcasterAnnouncement | null>(null);
  const [isStopped, setIsStopped] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const eventIdRef = useRef<string | null>(eventId ?? null);
  eventIdRef.current = eventId ?? null;

  // Sync initialData if provided and not yet populated
  useEffect(() => {
    if (initialData?.comments && messages.length === 0) {
      setMessages(initialData.comments);
    }
    if (initialData?.reactions && Object.keys(reactions).length === 0) {
      setReactions(initialData.reactions);
    }
    if (initialData?.viewerCount && viewerCount === 0) {
      setViewerCount(initialData.viewerCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  useEffect(() => {
    if (!eventId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    let socketBase = 'http://localhost:3000';
    try {
      const parsed = new URL(apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`);
      socketBase = `${parsed.protocol}//${parsed.host}`;
    } catch {
      socketBase = apiUrl.replace(/\/api.*$/, '');
    }

    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('access_token') ||
          localStorage.getItem('omnicast_token') ||
          localStorage.getItem('accessToken')
        : null;

    const socket = io(`${socketBase}/live`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      auth: token ? { token } : {},
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe:event', { eventId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on(
      'subscribed:event',
      (ack: { data?: { viewerCount?: number } }) => {
        if (ack?.data?.viewerCount !== undefined) {
          setViewerCount(ack.data.viewerCount);
        }
      },
    );

    socket.on(
      'live:chat:new',
      (payload: { eventId: string; comment: LiveComment }) => {
        if (payload.eventId === eventId && payload.comment) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.comment.id)) return prev;
            const tempIdx = prev.findIndex(
              (m) => m.id.startsWith('temp-') && m.content === payload.comment.content,
            );
            if (tempIdx !== -1) {
              const updated = [...prev];
              updated[tempIdx] = payload.comment;
              return updated;
            }
            return [payload.comment, ...prev];
          });
        }
      },
    );

    socket.on(
      'live:reaction:new',
      (payload: {
        eventId: string;
        type: string;
        counts?: Record<string, number>;
      }) => {
        if (payload.eventId === eventId) {
          setLatestReaction(payload.type);
          if (payload.counts) {
            setReactions(payload.counts);
          } else {
            setReactions((prev) => ({
              ...prev,
              [payload.type]: (prev[payload.type] || 0) + 1,
            }));
          }
          // Reset latest reaction particle trigger after 1.5s
          setTimeout(() => setLatestReaction(null), 1500);
        }
      },
    );

    socket.on('broadcaster:message', (payload: BroadcasterAnnouncement) => {
      if (payload.eventId === eventId) {
        setBroadcastMessage(payload);
      }
    });

    socket.on(
      'chat:deleted',
      (payload: { eventId: string; commentId: string }) => {
        if (payload.eventId === eventId) {
          setMessages((prev) =>
            prev.filter((m) => m.id !== payload.commentId),
          );
        }
      },
    );

    socket.on(
      'live:viewerCount',
      (payload: { eventId: string; viewerCount: number }) => {
        if (payload.eventId === eventId) {
          setViewerCount(payload.viewerCount);
        }
      },
    );

    socket.on('live:stopped', (payload: { eventId: string }) => {
      if (payload.eventId === eventId) {
        setIsStopped(true);
      }
    });

    // Periodic background sync fallback (only runs if socket is disconnected or every 10s)
    const pollInterval = setInterval(async () => {
      if (socketRef.current?.connected) return; // Skip polling when realtime WebSocket is active
      try {
        const res = await fetchLiveEventComments(eventId, { page: 1, limit: 30 });
        if (res?.data && Array.isArray(res.data)) {
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            let hasNew = false;
            for (const item of res.data) {
              if (!map.has(item.id)) {
                map.set(item.id, item);
                hasNew = true;
              }
            }
            if (!hasNew) return prev;
            return Array.from(map.values()).sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
          });
        }
      } catch (_) {
        // Silently ignore background poll errors
      }
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      socket.emit('unsubscribe:event', { eventId });
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [eventId]);

  const sendMessage = useCallback(
    async (content: string, parentId?: string) => {
      const trimmed = content.trim();
      if (!eventIdRef.current || !trimmed) return;
      const currentEventId = eventIdRef.current;

      // 0ms Optimistic UI: Immediately render comment in UI
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const optimisticComment: LiveComment = {
        id: tempId,
        content: trimmed,
        createdAt: new Date().toISOString(),
        user: {
          id: 'me',
          fullName: 'OmniCast Studio',
          avatarUrl: null,
          role: 'HOST',
        },
        parentId,
      };
      setMessages((prev) => [optimisticComment, ...prev]);

      if (socketRef.current?.connected) {
        socketRef.current.emit('live:chat', {
          eventId: currentEventId,
          content: trimmed,
          parentId,
        });
      } else {
        // Fallback to REST API if socket is not connected
        try {
          const newComment = await postLiveEventComment(
            currentEventId,
            trimmed,
            parentId,
          );
          if (newComment) {
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === tempId);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = newComment;
                return updated;
              }
              if (prev.some((m) => m.id === newComment.id)) return prev;
              return [newComment, ...prev];
            });
          }
        } catch (err) {
          console.error('[LiveSession] Failed to post comment via REST fallback:', err);
        }
      }
    },
    [],
  );

  const sendReaction = useCallback((type: string) => {
    if (!eventIdRef.current) return;
    // 0ms instant UI reaction update
    setReactions((prev) => ({
      ...prev,
      [type]: (prev[type] || 0) + 1,
    }));
    setLatestReaction(type);
    setTimeout(() => setLatestReaction(null), 1500);

    if (socketRef.current?.connected) {
      socketRef.current.emit('live:reaction', {
        eventId: eventIdRef.current,
        type,
      });
    }
  }, []);

  const broadcastAnnouncement = useCallback((message: string) => {
    if (!socketRef.current || !eventIdRef.current || !message.trim()) return;
    socketRef.current.emit('broadcaster:message', {
      eventId: eventIdRef.current,
      message: message.trim(),
    });
  }, []);

  const deleteMessage = useCallback((commentId: string) => {
    if (!socketRef.current || !eventIdRef.current) return;
    socketRef.current.emit('chat:delete', {
      eventId: eventIdRef.current,
      commentId,
    });
  }, []);

  const dismissAnnouncement = useCallback(() => {
    setBroadcastMessage(null);
  }, []);

  return {
    isConnected,
    viewerCount,
    messages,
    reactions,
    latestReaction,
    broadcastMessage,
    isStopped,
    sendMessage,
    sendReaction,
    broadcastAnnouncement,
    deleteMessage,
    dismissAnnouncement,
  };
}

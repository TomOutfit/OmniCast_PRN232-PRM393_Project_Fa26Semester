'use client';

// ============================================================
// OmniCast - Notification Bell w/ Real API
// ------------------------------------------------------------
// Reads from /me/notifications + /me/notifications/unread-count
// via React Query (30s polling). Optimistic mark-as-read.
// Maps Notification.type to an icon so the UI can adapt to
// any new types the backend introduces (graceful fallback).
// ============================================================

import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Tv,
  Radio,
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  Sparkles,
  Check,
  Trash2,
  Loader2,
  Megaphone,
  Video,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  notificationsKeys,
} from '@/lib/hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/lib/api/notifications';

// ── Icon lookup with graceful fallback ────────────────────────────
const TYPE_ICONS: Record<string, LucideIcon> = {
  NEW_FOLLOWER: UserPlus,
  NEW_VIDEO: Video,
  LIVE_START: Radio,
  LIVE_ENDED: Tv,
  COMMENT_REPLY: MessageCircle,
  COMMENT_MENTION: AtSign,
  REACTION: Heart,
  SYSTEM_ANNOUNCEMENT: Megaphone,
};

function iconFor(type: string): LucideIcon {
  return TYPE_ICONS[type] ?? Sparkles;
}

/** "5m", "2h", "3d" — best-effort, falls back to ISO date. */
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  // Don't even fire the requests until we know the user is signed in.
  const enabled = !authLoading && isAuthenticated;

  const { data: unread } = useUnreadCount({ enabled });
  const { data: list, isLoading, isFetching } = useNotifications(
    { limit: 20, filter },
    { enabled },
  );

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  const unreadCount = unread?.unreadCount ?? 0;
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);
  const items = list?.items ?? [];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Refresh both queries when the popover opens — guarantees fresh data.
  useEffect(() => {
    if (!open || !enabled) return;
    qc.invalidateQueries({ queryKey: notificationsKeys.lists() });
    qc.invalidateQueries({ queryKey: notificationsKeys.unread() });
  }, [open, enabled, qc]);

  const handleClickItem = (n: NotificationItem) => {
    if (!n.isRead) markRead.mutate(n.id);
  };

  if (!isAuthenticated) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
        className={cn(
          'relative p-1.5 sm:p-2 rounded-lg border transition-colors',
          unreadCount > 0
            ? 'bg-[#0e1726] border-amber-500/40 text-amber-300 hover:bg-[#152339]'
            : 'bg-[#0e1726] border-[#1b2b42] text-slate-300 hover:text-white hover:bg-[#152339]',
        )}
      >
        <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full',
              'bg-red-500 text-white text-[9px] font-black',
              'flex items-center justify-center',
              'ring-2 ring-[#070b12]',
            )}
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Hộp thư thông báo"
          className={cn(
            'absolute right-0 mt-2 w-80 max-w-[calc(100vw-1rem)]',
            'rounded-xl border border-[#1e2d44] bg-[#0c1421]',
            'p-1.5 shadow-2xl z-50',
            'animate-in fade-in slide-in-from-top-2 duration-150',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a273b]">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white">Thông báo</h3>
              {isFetching && (
                <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="w-3 h-3" />
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[#1a273b]">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors',
                  filter === f
                    ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                {f === 'all' ? 'Tất cả' : `Chưa đọc (${unreadCount})`}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang tải...
              </div>
            ) : items.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                </p>
              </div>
            ) : (
              <ul>
                {items.map((n) => {
                  const Icon = iconFor(n.type);
                  const Wrapper: any = n.actionUrl ? Link : 'button';
                  const wrapperProps = n.actionUrl
                    ? { href: n.actionUrl, onClick: () => handleClickItem(n) }
                    : { onClick: () => handleClickItem(n), type: 'button' as const };
                  return (
                    <li key={n.id}>
                      <Wrapper
                        {...wrapperProps}
                        className={cn(
                          'w-full text-left flex items-start gap-2.5 px-3 py-2 rounded-lg',
                          'hover:bg-[#152339] transition-colors group',
                          !n.isRead && 'bg-cyan-950/15',
                        )}
                      >
                        {/* Icon / actor avatar */}
                        {n.actorAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={n.actorAvatarUrl}
                            alt={n.actorName ?? ''}
                            className="flex-shrink-0 w-7 h-7 rounded-full object-cover border border-[#1e2d44]"
                          />
                        ) : (
                          <div
                            className={cn(
                              'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
                              n.isRead
                                ? 'bg-[#0e1726] border border-[#1b2b42] text-slate-400'
                                : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300',
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-[11px] leading-snug truncate',
                              n.isRead ? 'text-slate-300' : 'text-white font-semibold',
                            )}
                          >
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                              {n.message}
                            </p>
                          )}
                          <p className="text-[9px] text-slate-600 mt-0.5">
                            {timeAgo(n.createdAt)} trước
                          </p>
                        </div>

                        <span className="flex-shrink-0 flex items-center gap-1">
                          {!n.isRead && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                              aria-label="Chưa đọc"
                            />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              remove.mutate(n.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-red-400 transition-all"
                            aria-label="Xóa thông báo"
                            tabIndex={-1}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      </Wrapper>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-[#1a273b] mt-1 pt-1">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block w-full px-3 py-2 text-[11px] font-bold text-slate-400 hover:text-white text-center"
            >
              Xem tất cả thông báo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

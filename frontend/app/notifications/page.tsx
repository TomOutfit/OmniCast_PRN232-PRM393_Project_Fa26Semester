// ============================================================
// OmniCast - Notifications Center Page
// ============================================================
// Full-page notification inbox:
//   - Filter by All / Unread
//   - Mark all as read with single click
//   - One-click deep link to Live events, VODs, channels
//   - Delete notification
// ============================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  ArrowLeft,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '@/lib/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/lib/api/notifications';

const TYPE_ICONS: Record<string, LucideIcon> = {
  NEW_FOLLOWER: UserPlus,
  NEW_VIDEO: Video,
  LIVE_START: Radio,
  LIVE_STARTED: Radio,
  LIVE_ENDED: Tv,
  COMMENT_REPLY: MessageCircle,
  COMMENT_MENTION: AtSign,
  REACTION: Heart,
  SYSTEM_ANNOUNCEMENT: Megaphone,
};

function iconFor(type: string): LucideIcon {
  return TYPE_ICONS[type] ?? Sparkles;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} giây trước`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 24);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

export default function NotificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const enabled = !authLoading && isAuthenticated;
  const { data: unread } = useUnreadCount({ enabled });
  const { data: list, isLoading, isFetching } = useNotifications(
    { limit: 50, filter },
    { enabled },
  );

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  const unreadCount = unread?.unreadCount ?? 0;
  const items = list?.items ?? [];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070b12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070b12] text-white flex items-center justify-center p-4">
        <Card className="glass-card max-w-md w-full p-8 text-center space-y-4 border border-[#1b2b42] bg-[#0c1421]">
          <Bell className="w-12 h-12 text-slate-500 mx-auto" />
          <h2 className="text-lg font-bold">Vui lòng đăng nhập</h2>
          <p className="text-xs text-slate-400">
            Bạn cần đăng nhập để xem thông báo về các buổi livestream, video mới và phản hồi bình luận.
          </p>
          <Link href="/login">
            <Button className="w-full bg-cyan-600 hover:bg-cyan-500 font-bold text-xs mt-2">
              Đăng nhập ngay
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b12]/50 backdrop-blur-[1px] text-white pb-20 selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* 3D Navigation & Header */}
        <div className="p-6 rounded-3xl card-3d-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-l from-cyan-500/15 to-transparent blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <Link
              href="/"
              className="p-2.5 rounded-2xl bg-[#0e1726]/90 border border-cyan-500/30 text-slate-400 hover:text-white hover:bg-[#152339] shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight flex items-center gap-2.5">
                <span>Trung Tâm Thông Báo</span>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 text-xs font-mono font-black shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                    {unreadCount} chưa đọc
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-300/80 mt-1">
                Cập nhật hoạt động livestream, bình luận và nội dung mới từ các kênh bạn theo dõi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            {unreadCount > 0 && (
              <Button
                variant="cyber3d"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đánh dấu tất cả đã đọc</span>
              </Button>
            )}
          </div>
        </div>

        {/* 3D Filter Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#080d17]/85 border border-white/[0.08] backdrop-blur-xl shadow-lg w-fit">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
              filter === 'all'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-black shadow-[0_0_12px_rgba(0,242,254,0.4)] scale-105'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]',
            )}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              filter === 'unread'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-black shadow-[0_0_12px_rgba(0,242,254,0.4)] scale-105'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]',
            )}
          >
            <span>Chưa đọc</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-mono font-black shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-mono">Đang tải danh sách thông báo...</p>
          </div>
        ) : items.length === 0 ? (
          <Card className="glass-card p-12 text-center space-y-3 border border-[#1b2b42] bg-[#0c1421]/60">
            <Bell className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">
              {filter === 'unread' ? 'Không có thông báo chưa đọc nào' : 'Bạn chưa có thông báo nào'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Khi các kênh bạn theo dõi bắt đầu livestream hoặc có người phản hồi bình luận của bạn, thông báo sẽ hiển thị tại đây.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const Icon = iconFor(n.type);
              const destination = n.actionUrl || (n.eventId ? `/live/${n.eventId}` : undefined);

              const content = (
                <div
                  className={cn(
                    'p-4 rounded-xl border transition-all flex items-start justify-between gap-4 group',
                    n.isRead
                      ? 'bg-[#0c1421]/60 border-[#162338] text-slate-300 hover:bg-[#101b2c]'
                      : 'bg-gradient-to-r from-[#0d1c33] to-[#0c1524] border-cyan-500/30 text-white shadow-md shadow-cyan-950/20',
                  )}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border',
                        n.isRead
                          ? 'bg-[#142033] border-[#1e2f47] text-slate-400'
                          : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={cn(
                            'text-xs leading-snug',
                            n.isRead ? 'font-semibold text-slate-200' : 'font-bold text-white',
                          )}
                        >
                          {n.title}
                        </h4>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                        )}
                      </div>
                      {n.message && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 font-mono">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markRead.mutate(n.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-all"
                        title="Đánh dấu đã đọc"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        remove.mutate(n.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all opacity-0 group-hover:opacity-100"
                      title="Xóa thông báo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );

              if (destination) {
                return (
                  <Link
                    key={n.id}
                    href={destination}
                    onClick={() => {
                      if (!n.isRead) markRead.mutate(n.id);
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                );
              }

              return <div key={n.id}>{content}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

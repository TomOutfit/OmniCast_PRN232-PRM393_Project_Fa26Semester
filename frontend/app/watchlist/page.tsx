'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import {
  Clock,
  Play,
  Loader2,
  Bookmark,
  Tv,
  Trash2,
  Radio,
  Calendar,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Page3DHero } from '@/components/three/Page3DHero';
import { ChannelCardTilt } from '@/components/three';
import type { WatchlistItem3D } from '@/components/three/scenes/WatchlistScene3D';

interface Program {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  status: string;
  scheduledAt: string;
  duration: number | null;
  channel: { id: string; name: string; slug: string; logoUrl: string | null };
}

interface WatchlistItem {
  id: string;
  programId: string;
  channelId: string | null;
  note: string | null;
  addedAt: string;
  updatedAt: string;
  program: Program;
}

interface GroupedWatchlist {
  upcoming: WatchlistItem[];
  live: WatchlistItem[];
  past: WatchlistItem[];
}

type TabKey = 'live' | 'upcoming' | 'past';

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export default function WatchlistPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('live');
  const [data, setData] = useState<GroupedWatchlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void loadWatchlist();
  }, [isAuthenticated]);

  async function loadWatchlist() {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<GroupedWatchlist>('/me/watchlist/grouped');
      setData(res.data);
    } catch (err: any) {
      setError(err?.message ?? 'Không thể tải danh sách yêu thích');
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(id: string) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        upcoming: (prev.upcoming || []).filter((i) => i.id !== id),
        live: (prev.live || []).filter((i) => i.id !== id),
        past: (prev.past || []).filter((i) => i.id !== id),
      };
    });
    try {
      await apiClient.delete(`/me/watchlist/${id}`);
    } catch (err) {
      void loadWatchlist();
    }
  }

  const items = data ? data[activeTab] || [] : [];

  // 3D watchlist items from current tab
  const watchlist3D: WatchlistItem3D[] = items.slice(0, 6).map((it) => ({
    id: it.id,
    title: it.program?.title || 'Chương trình',
    channel: it.program?.channel?.name || 'OmniCast',
    scheduledAt: it.program?.scheduledAt
      ? new Date(it.program.scheduledAt).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        })
      : undefined,
    status: activeTab,
  }));

  return (
    <div className="min-h-screen bg-[#070b12]/50 backdrop-blur-[1px] text-slate-100 pb-6 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 3D Watchlist Card Stack Hero */}
      {isAuthenticated && items.length > 0 && (
        <Page3DHero variant="watchlist" watchlistItems={watchlist3D} height={400} />
      )}

      <div className="px-4 lg:px-6 space-y-6">
        
        {/* ── Page Header ───────────────────────────────────────────── */}
        <div className="p-6 md:p-8 rounded-3xl card-3d-surface flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-40 bg-gradient-to-l from-cyan-500/10 to-transparent blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00f2fe]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                PERSONAL CLOUD BOOKMARKS // SYNCED 24/7
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3 font-display">
              <Bookmark className="w-7 h-7 text-cyan-400 fill-cyan-400/20 drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]" />
              Danh Sách Xem Sau & Yêu Thích
            </h1>
            <p className="text-xs text-slate-300/80 mt-1 max-w-xl leading-relaxed">
              Quản lý các sự kiện trực tiếp, phim truyện và lịch phát sóng đã lưu để nhận thông báo tự động trước giờ lên sóng trên hệ sinh thái 3D OmniCast.
            </p>
          </div>
        </div>

        {/* ── Navigation Tabs ────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#080d17]/85 border border-white/[0.08] backdrop-blur-xl shadow-lg">
          {[
            { key: 'live', label: 'Đang LIVE', count: data?.live?.length ?? 0, icon: Radio },
            { key: 'upcoming', label: 'Sắp Tới', count: data?.upcoming?.length ?? 0, icon: Calendar },
            { key: 'past', label: 'Đã Phát (Catch-Up)', count: data?.past?.length ?? 0, icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_0_15px_rgba(0,242,254,0.45)] font-black scale-105'
                    : 'bg-[#0e1625]/90 hover:bg-[#152338] text-slate-300 border border-[#1b2b42] hover:border-cyan-500/30'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded text-[10px] font-mono',
                    isSelected ? 'bg-black/20 text-black' : 'bg-[#152339] text-cyan-300'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Content Grid ───────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl bg-[#0b1320] border border-[#16253c]" />
            ))}
          </div>
        ) : !isAuthenticated ? (
          <div className="text-center py-16 rounded-3xl card-3d-surface max-w-lg mx-auto p-8">
            <Bookmark className="w-12 h-12 text-cyan-400 mx-auto mb-3 drop-shadow-[0_0_10px_rgba(0,242,254,0.6)]" />
            <h3 className="text-lg font-black text-white mb-1 font-display">Đăng nhập để xem danh sách lưu</h3>
            <p className="text-xs text-slate-400 mb-6">Lưu lại các chương trình truyền hình yêu thích để xem lại bất cứ lúc nào.</p>
            <Link href="/login">
              <Button variant="cyber3d" className="px-8">
                Đăng nhập ngay
              </Button>
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 rounded-3xl card-3d-surface max-w-lg mx-auto p-8">
            <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-black text-white mb-1 font-display">Chưa có chương trình nào trong mục này</h3>
            <p className="text-xs text-slate-400 mb-6">Bạn có thể bấm biểu tượng Lưu / Bookmark ở trang Lịch EPG hoặc Chi tiết kênh.</p>
            <Link href="/epg">
              <Button variant="cyber3d" className="px-8">
                Khám phá lịch phát sóng EPG
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => {
              const program = item.program;
              const channel = program?.channel;
              const targetProgramId = item.programId || program?.id;
              return (
                <ChannelCardTilt key={item.id} intensity={12} className="h-full">
                  <div className="group rounded-2xl card-3d-surface p-5 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-extrabold text-cyan-400 uppercase font-mono truncate">
                          {channel?.name || 'OmniCast Network'}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Xóa khỏi danh sách"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h3 className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug font-display">
                        {program?.title || 'Chương trình phát sóng'}
                      </h3>

                      {program?.scheduledAt && (
                        <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>{formatDateTime(program.scheduledAt)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10">
                      <Link
                        href={targetProgramId ? `/programs/${targetProgramId}` : `/channels/${channel?.slug || 'sport-1'}`}
                        className="btn-3d-cyan w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Xem Ngay
                      </Link>
                    </div>
                  </div>
                </ChannelCardTilt>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

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
import { cn } from '@/lib/utils';

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

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 py-6 px-4 lg:px-6">
      <div className="max-w-[1680px] mx-auto space-y-6">
        
        {/* ── Page Header ───────────────────────────────────────────── */}
        <div className="p-6 rounded-3xl bg-[#090f1a] border border-[#162338] shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                PERSONAL CLOUD BOOKMARKS // SYNCED 24/7
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Bookmark className="w-6 h-6 text-cyan-400 fill-cyan-400/20" />
              Danh Sách Xem Sau & Yêu Thích
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Quản lý các sự kiện trực tiếp, phim truyện và lịch phát sóng đã lưu để nhận thông báo tự động trước giờ lên sóng.
            </p>
          </div>
        </div>

        {/* ── Navigation Tabs ────────────────────────────────────────── */}
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#080d17] border border-[#142033]">
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
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                  isSelected
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,242,254,0.4)] font-black'
                    : 'bg-[#0e1625] hover:bg-[#152338] text-slate-300 border border-[#1b2b42]'
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
              <div key={i} className="h-56 rounded-2xl bg-[#0b1320] border border-[#16253c] animate-pulse" />
            ))}
          </div>
        ) : !isAuthenticated ? (
          <div className="text-center py-16 rounded-3xl bg-[#090f1a] border border-[#162338]">
            <Bookmark className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Đăng nhập để xem danh sách lưu</h3>
            <p className="text-xs text-slate-400 mb-4">Lưu lại các chương trình truyền hình yêu thích để xem lại bất cứ lúc nào.</p>
            <Link href="/login">
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs px-6">
                Đăng nhập ngay
              </Button>
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-[#090f1a] border border-[#162338]">
            <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Chưa có chương trình nào trong mục này</h3>
            <p className="text-xs text-slate-400 mb-4">Bạn có thể bấm biểu tượng Lưu / Bookmark ở trang Lịch EPG hoặc Chi tiết kênh.</p>
            <Link href="/epg">
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs px-6">
                Khám phá lịch phát sóng EPG
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((item) => {
              const program = item.program;
              const channel = program?.channel;
              const targetProgramId = item.programId || program?.id;
              return (
                <div
                  key={item.id}
                  className="group rounded-2xl bg-[#0b1320] hover:bg-[#0f1a2c] border border-[#16253c] hover:border-cyan-500/50 p-4 shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase truncate">
                        {channel?.name || 'OmniCast Network'}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Xóa khỏi danh sách"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                      {program?.title || 'Chương trình phát sóng'}
                    </h3>

                    {program?.scheduledAt && (
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatDateTime(program.scheduledAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5">
                    <Link
                      href={targetProgramId ? `/programs/${targetProgramId}` : `/channels/${channel?.slug || 'sport-1'}`}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(0,242,254,0.3)] transition-transform hover:scale-102"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Xem Ngay
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

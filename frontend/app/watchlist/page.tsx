'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api';
import {
  Clock,
  Play,
  Loader2,
  Bookmark,
  Tv,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LiveBadge } from '@/components/ui/live-badge';

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

type TabKey = 'upcoming' | 'live' | 'past';

const TAB_LABELS: Record<TabKey, string> = {
  upcoming: 'Sắp tới',
  live: 'Đang LIVE',
  past: 'Đã phát',
};

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
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
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
      const res = await apiClient.get<GroupedWatchlist>(
        '/me/watchlist/grouped',
      );
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
        upcoming: prev.upcoming.filter((i) => i.id !== id),
        live: prev.live.filter((i) => i.id !== id),
        past: prev.past.filter((i) => i.id !== id),
      };
    });
    try {
      await apiClient.delete(`/me/watchlist/${id}`);
    } catch {
      await loadWatchlist();
    }
  }

  if (authLoading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Bookmark className="w-12 h-12 mx-auto mb-4 text-dark-500" />
        <h2 className="text-xl font-bold text-white mb-2">
          Đăng nhập để xem danh sách yêu thích
        </h2>
        <p className="text-dark-400 mb-6">
          Danh sách của bạn được đồng bộ giữa Web, Mobile và thiết bị khác.
        </p>
        <Link href="/login">
          <Button>Đăng nhập</Button>
        </Link>
      </div>
    );
  }

  const counts = data
    ? {
        upcoming: data.upcoming.length,
        live: data.live.length,
        past: data.past.length,
      }
    : { upcoming: 0, live: 0, past: 0 };

  const activeItems = data ? data[activeTab] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">
        Danh sách yêu thích
      </h1>
      <p className="text-dark-400 mb-6">
        Các chương trình bạn đã lưu — đồng bộ giữa Mobile và Web.
      </p>

      <div className="flex gap-2 border-b border-dark-700 mb-6">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-primary-400 text-white'
                : 'border-transparent text-dark-400 hover:text-white'
            }`}
          >
            {TAB_LABELS[key]}
            {counts[key] > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-dark-800 text-dark-300">
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">
          {error}
          <div className="mt-4">
            <Button variant="outline" onClick={() => loadWatchlist()}>
              Thử lại
            </Button>
          </div>
        </div>
      ) : activeItems.length === 0 ? (
        <EmptyState
          tab={activeTab}
          onNavigate={() => {
            window.location.href = '/epg';
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeItems.map((item) => (
            <WatchlistCard
              key={item.id}
              item={item}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistCard({
  item,
  onRemove,
}: {
  item: WatchlistItem;
  onRemove: () => void;
}) {
  return (
    <Card className="group glass-card overflow-hidden relative">
      <Link
        href={`/programs/${item.programId}`}
        className="block"
      >
        <div className="relative aspect-video bg-dark-900">
          {item.program.thumbnailUrl ? (
            <img
              src={item.program.thumbnailUrl}
              alt={item.program.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Tv className="w-10 h-10 text-dark-600" />
            </div>
          )}
          {item.program.status === 'LIVE' && (
            <div className="absolute top-2 left-2">
              <LiveBadge size="sm" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
            {item.program.channel.logoUrl && (
              <img
                src={item.program.channel.logoUrl}
                alt={item.program.channel.name}
                className="w-6 h-6 rounded-full border border-white/20"
              />
            )}
            <span className="text-xs text-white truncate">
              {item.program.channel.name}
            </span>
          </div>
        </div>
      </Link>

      <div className="p-3">
        <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-primary-400">
          {item.program.title}
        </h3>
        <div className="flex items-center justify-between mt-2 text-xs text-dark-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDateTime(item.program.scheduledAt)}
          </span>
        </div>
        <div className="flex gap-2 mt-3">
          <Link href={`/programs/${item.programId}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full">
              <Play className="w-3 h-3 mr-1" />
              Xem
            </Button>
          </Link>
          <button
            onClick={onRemove}
            className="px-2 py-1 text-dark-400 hover:text-red-400 transition-colors"
            aria-label="Bỏ yêu thích"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({
  tab,
  onNavigate,
}: {
  tab: TabKey;
  onNavigate: () => void;
}) {
  const messages: Record<TabKey, { title: string; hint: string }> = {
    upcoming: {
      title: 'Chưa có chương trình sắp tới',
      hint: 'Lưu các chương trình yêu thích để nhận nhắc nhở trước khi phát sóng.',
    },
    live: {
      title: 'Hiện không có chương trình đang LIVE',
      hint: 'Khi một chương trình bắt đầu live, nó sẽ xuất hiện ở đây.',
    },
    past: {
      title: 'Chưa xem chương trình nào đã phát',
      hint: 'Các chương trình đã phát sóng sẽ được lưu tại đây để xem lại.',
    },
  };
  const m = messages[tab];

  return (
    <div className="text-center py-20 rounded-2xl border border-dashed border-dark-700">
      <Bookmark className="w-12 h-12 mx-auto mb-4 text-dark-500 opacity-50" />
      <h3 className="text-lg font-semibold text-white mb-2">{m.title}</h3>
      <p className="text-sm text-dark-400 mb-6 max-w-md mx-auto">{m.hint}</p>
      {tab === 'upcoming' && (
        <Button onClick={onNavigate}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Khám phá EPG
        </Button>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Clock,
  Eye,
  Search,
  Loader2,
  Filter,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { useRecordings } from '@/lib/hooks/usePrograms';
import type { Recording, LiveCategory } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  SPORTS: 'Thể thao',
  SHOW: 'Show',
  ENTERTAINMENT: 'Giải trí',
  CINE: 'Điện ảnh',
  DRAMA: 'Phim truyện',
  NEWS: 'Tin tức',
  MUSIC: 'Âm nhạc',
  KIDS: 'Thiếu nhi',
  TECH: 'Công nghệ',
  FOOD: 'Ẩm thực',
  DOCUMENTARY: 'Khám phá',
  EDUCATION: 'Giáo dục',
  GAMING: 'Trò chơi',
  PODCAST: 'Podcast',
  LIFESTYLE: 'Phong cách sống',
  TRAVEL: 'Du lịch',
  ART: 'Nghệ thuật',
  BUSINESS: 'Kinh doanh',
  HEALTH: 'Sức khỏe',
};

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} phút`;
}

function formatViewCount(n?: number | string | bigint): string {
  if (n == null) return '0';
  const v = typeof n === 'bigint' ? Number(n) : Number(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export default function RecordingsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LiveCategory | ''>('');
  const [page, setPage] = useState(1);

  // Reset page when filter changes
  // (handled via key in query is overkill; just use effect semantics by reading the same state)
  const { data, isLoading, isFetching } = useRecordings({
    isFeatured: false,
    category: selectedCategory || undefined,
    search: search || undefined,
    limit: 24,
    page,
  });

  const recordings = useMemo<Recording[]>(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any).data)) return (data as any).data;
    return [];
  }, [data]);

  const meta = (data as any)?.meta ?? { page: 1, totalPages: 1, total: 0 };

  // Featured recordings (latest + isFeatured), shown at top
  const { data: featuredData } = useRecordings({
    isFeatured: true,
    limit: 6,
    page: 1,
  });
  const featured = useMemo<Recording[]>(() => {
    if (!featuredData) return [];
    if (Array.isArray(featuredData)) return featuredData;
    if (Array.isArray((featuredData as any).data)) return (featuredData as any).data;
    return [];
  }, [featuredData]);

  return (
    <div className="min-h-[80vh]">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-2">Thư viện VOD</h1>
          <p className="text-dark-400">
            Xem lại các chương trình, podcast và video đã phát sóng trên OmniCast
          </p>
        </div>
      </div>

      {/* Featured strip */}
      {featured.length > 0 && !selectedCategory && !search && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent-gold" />
            Nội dung nổi bật
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.slice(0, 3).map((r) => (
              <FeaturedCard key={r.id} recording={r} />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-dark-950 border-b border-dark-800 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
              <Filter className="w-4 h-4 text-dark-400 flex-shrink-0" />
              <Button
                variant={selectedCategory === '' ? 'default' : 'outline'}
                size="sm"
                className="whitespace-nowrap"
                onClick={() => {
                  setSelectedCategory('');
                  setPage(1);
                }}
              >
                Tất cả
              </Button>
              {(Object.keys(CATEGORY_LABELS) as LiveCategory[]).map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setPage(1);
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </Button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              <Input
                type="search"
                placeholder="Tìm kiếm VOD..."
                className="pl-10 bg-dark-900 border-dark-700"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                  aria-label="Xóa"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-dark-400">
            {isFetching && isLoading
              ? 'Đang tải...'
              : `${meta.total ?? recordings.length} kết quả${
                  selectedCategory ? ` cho ${CATEGORY_LABELS[selectedCategory]}` : ''
                }${search ? ` cho "${search}"` : ''}`}
          </p>
          <p className="text-xs text-dark-500">
            Trang {meta.page ?? 1} / {meta.totalPages ?? 1}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-dark-700">
            <Search className="w-12 h-12 mx-auto mb-4 text-dark-500 opacity-50" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Không tìm thấy VOD phù hợp
            </h3>
            <p className="text-sm text-dark-400 mb-6 max-w-md mx-auto">
              Thử đổi bộ lọc hoặc từ khóa khác.
            </p>
            {(selectedCategory || search) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory('');
                  setSearch('');
                  setPage(1);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Xóa bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recordings.map((r) => (
                <RecordingCard key={r.id} recording={r} />
              ))}
            </div>

            {/* Pagination */}
            {(meta.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(meta.page ?? 1) <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trước
                </Button>
                <span className="text-sm text-dark-400">
                  Trang {meta.page ?? 1} / {meta.totalPages ?? 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(meta.page ?? 1) >= (meta.totalPages ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RecordingCard({ recording }: { recording: Recording }) {
  const durationLabel = formatDuration(recording.duration);
  return (
    <Link href={`/programs/recording/${recording.id}`}>
      <Card className="group overflow-hidden glass-card hover:border-primary-500/50 transition-all h-full flex flex-col">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-dark-800 overflow-hidden">
          {recording.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recording.thumbnailUrl}
              alt={recording.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-12 h-12 text-dark-600" />
            </div>
          )}

          {/* Duration badge */}
          {durationLabel && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {durationLabel}
            </div>
          )}

          {/* Featured badge */}
          {recording.isFeatured && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-accent-gold/90 text-dark-900 text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Nổi bật
            </div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
            <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
              <Play className="w-6 h-6 text-white fill-current" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-primary-400 transition-colors mb-2">
            {recording.title}
          </h3>

          {recording.channel && (
            <div className="flex items-center gap-2 mb-2">
              <ChannelLogo
                slug={recording.channel.slug}
                logoUrl={recording.channel.logoUrl}
                name={recording.channel.name}
                category={recording.channel.category}
                size="sm"
                className="rounded flex-shrink-0"
              />
              <span className="text-xs text-dark-400 truncate">
                {recording.channel.name}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-dark-500 mt-auto">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatViewCount(recording.viewCount)}
            </span>
            {recording.category && (
              <span className="px-1.5 py-0.5 rounded bg-dark-700 text-dark-300">
                {CATEGORY_LABELS[recording.category] || recording.category}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function FeaturedCard({ recording }: { recording: Recording }) {
  return (
    <Link href={`/programs/recording/${recording.id}`}>
      <Card className="group overflow-hidden glass-card hover:border-primary-500/50 transition-all h-full">
        <div className="flex flex-col sm:flex-row">
          <div className="relative sm:w-2/5 aspect-video sm:aspect-auto bg-dark-800 flex-shrink-0">
            {recording.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={recording.thumbnailUrl}
                alt={recording.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-12 h-12 text-dark-600" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
                <Play className="w-6 h-6 text-white fill-current" />
              </div>
            </div>
          </div>
          <div className="p-4 flex-1">
            <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-primary-400 transition-colors mb-2">
              {recording.title}
            </h3>
            {recording.description && (
              <p className="text-sm text-dark-400 line-clamp-2 mb-3">
                {recording.description}
              </p>
            )}
            {recording.channel && (
              <p className="text-xs text-dark-500">
                {recording.channel.name}
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

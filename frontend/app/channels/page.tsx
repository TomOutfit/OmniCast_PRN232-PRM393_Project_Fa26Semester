'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Eye, TrendingUp, Search, Loader2, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LiveBadge } from '@/components/ui/live-badge';
import { Input } from '@/components/ui/input';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { ChannelQuickView } from '@/components/channels/channel-quick-view';
import { ChannelSkeleton } from '@/components/channels/channel-skeleton';
import { useChannels, useChannelCategories } from '@/lib/hooks/useChannels';
import { useLiveNow } from '@/lib/hooks/usePrograms';
import type { Channel, LiveCategory } from '@/types';
import type { CategorySummary } from '@/lib/api/channels';

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

const ALL_CATEGORIES = ['Tất cả', ...Object.values(CATEGORY_LABELS)];

export default function ChannelsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategoryLabel, setSelectedCategoryLabel] =
    useState<string>('Tất cả');
  const [quickViewChannel, setQuickViewChannel] = useState<Channel | null>(null);

  const selectedCategoryCode = useMemo(() => {
    if (selectedCategoryLabel === 'Tất cả') return undefined;
    const entry = Object.entries(CATEGORY_LABELS).find(
      ([, label]) => label === selectedCategoryLabel,
    );
    return entry?.[0] as LiveCategory | undefined;
  }, [selectedCategoryLabel]);

  const { data, isLoading } = useChannels({
    isActive: true,
    category: selectedCategoryCode,
    search: search || undefined,
    limit: 100,
  });

  const { data: categoriesData } = useChannelCategories();
  const { data: liveEvents } = useLiveNow();

  const channels = useMemo<Channel[]>(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray((data as any).data)) return (data as any).data;
    if (Array.isArray((data as any).items)) return (data as any).items;
    return [];
  }, [data]);

  const liveList = Array.isArray(liveEvents) ? liveEvents : (liveEvents as any)?.data ?? [];
  const liveChannelIds = new Set(
    liveList.map((e: any) => e.channelId),
  );

  const categoriesList = useMemo<Array<{ code: string; label: string; count: number }>>(() => {
    const list: CategorySummary[] = Array.isArray(categoriesData) ? categoriesData : (categoriesData as any)?.data ?? [];
    return list.map((c) => ({
      code: c.category,
      label: CATEGORY_LABELS[c.category as LiveCategory] || c.category,
      count: c.count ?? (c as any)._count ?? 0,
    }));
  }, [categoriesData]);

  const isFiltered = selectedCategoryLabel !== 'Tất cả' || !!search;
  const featured = channels.filter((c) => c.isFeatured);
  const others = channels.filter((c) => !c.isFeatured);

  const handleOpenQuickView = (c: Channel) => {
    setQuickViewChannel(c);
  };

  return (
    <div className="min-h-[80vh]">
      {/* Page Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-2">Danh sách kênh</h1>
          <p className="text-dark-400">
            Khám phá và theo dõi các kênh truyền hình yêu thích của bạn
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-950 border-b border-dark-800 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
              <Button
                variant={selectedCategoryLabel === 'Tất cả' ? 'default' : 'outline'}
                size="sm"
                className="whitespace-nowrap"
                onClick={() => setSelectedCategoryLabel('Tất cả')}
              >
                Tất cả
              </Button>
              {categoriesList.map((cat) => (
                <Button
                  key={cat.code}
                  variant={selectedCategoryLabel === cat.label ? 'default' : 'outline'}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => setSelectedCategoryLabel(cat.label)}
                >
                  {cat.label} ({cat.count})
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              <Input
                type="search"
                placeholder="Tìm kiếm kênh..."
                className="pl-10 bg-dark-900 border-dark-700"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Channels Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <ChannelSkeleton />
        ) : channels.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-dark-700">
            <Search className="w-12 h-12 mx-auto mb-4 text-dark-500 opacity-50" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Không tìm thấy kênh phù hợp
            </h3>
            <p className="text-sm text-dark-400 mb-6 max-w-md mx-auto">
              Thử thay đổi bộ lọc, hoặc yêu cầu thêm kênh mới.
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Yêu cầu thêm kênh
            </Button>
          </div>
        ) : isFiltered ? (
          /* Filtered View */
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center justify-between">
              <span>
                {selectedCategoryLabel !== 'Tất cả' ? `Kênh ${selectedCategoryLabel}` : 'Kết quả tìm kiếm'}
              </span>
              <span className="text-sm font-normal text-dark-400">
                {channels.length} kênh
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {channels.map((channel) => (
                <Link key={channel.id} href={`/channels/${channel.slug}`}>
                  <Card className="group p-6 glass-card hover:border-primary-500/50 transition-all duration-300 hover:shadow-glow h-full flex flex-col justify-between">
                    <div className="flex items-start gap-4">
                      <ChannelLogo
                        slug={channel.slug}
                        logoUrl={channel.logoUrl}
                        name={channel.name}
                        category={channel.category}
                        size="lg"
                        className="rounded-xl flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
                            {channel.name}
                          </h3>
                          {channel.isVerified && (
                            <span className="text-primary-400 flex-shrink-0">
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-dark-400 mb-3">
                          {CATEGORY_LABELS[channel.category] || channel.category}
                        </p>
                        <p className="text-sm text-dark-300 line-clamp-2">
                          {channel.description || 'Chưa có mô tả.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-dark-700">
                      <div className="flex items-center gap-1.5 text-sm text-dark-400">
                        <Users className="w-4 h-4" />
                        <span>{formatCompact(channel.followerCount)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-dark-400">
                        <Eye className="w-4 h-4" />
                        <span>{formatCompact(channel.totalViews)} lượt xem</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          /* All Channels View */
          <>
            {/* Featured Section */}
            {featured.length > 0 && (
              <div className="mb-12">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent-gold" />
                  Kênh nổi bật
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featured.map((channel) => (
                    <Link key={channel.id} href={`/channels/${channel.slug}`}>
                      <Card className="group p-6 glass-card hover:border-primary-500/50 transition-all duration-300 hover:shadow-glow h-full flex flex-col justify-between">
                        <div className="flex items-start gap-4">
                          <ChannelLogo
                            slug={channel.slug}
                            logoUrl={channel.logoUrl}
                            name={channel.name}
                            category={channel.category}
                            size="lg"
                            className="rounded-xl flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
                                {channel.name}
                              </h3>
                              {channel.isVerified && (
                                <span className="text-primary-400 flex-shrink-0">
                                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-dark-400 mb-3">
                              {CATEGORY_LABELS[channel.category] || channel.category}
                            </p>
                            <p className="text-sm text-dark-300 line-clamp-2">
                              {channel.description || 'Chưa có mô tả.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-dark-700">
                          <div className="flex items-center gap-1.5 text-sm text-dark-400">
                            <Users className="w-4 h-4" />
                            <span>{formatCompact(channel.followerCount)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-dark-400">
                            <Eye className="w-4 h-4" />
                            <span>{formatCompact(channel.totalViews)} lượt xem</span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Other Channels */}
            {others.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Tất cả kênh</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {others.map((channel) => {
                    const isLive = liveChannelIds.has(channel.id);
                    return (
                      <Link
                        key={channel.id}
                        href={`/channels/${channel.slug}`}
                        className="group"
                      >
                        <Card className="p-4 glass-card hover:border-primary-500/50 transition-all">
                          <div className="relative aspect-square mb-3">
                            <ChannelLogo
                              slug={channel.slug}
                              logoUrl={channel.logoUrl}
                              name={channel.name}
                              category={channel.category}
                              size="xl"
                              className="w-full h-full rounded-xl"
                            />
                            {isLive && (
                              <div className="absolute top-2 right-2">
                                <LiveBadge size="sm" />
                              </div>
                            )}
                            {/* Quick-view button (B2) */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenQuickView(channel);
                              }}
                              className="absolute bottom-2 right-2 p-1.5 rounded-full bg-dark-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-500"
                              aria-label={`Xem nhanh ${channel.name}`}
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <h3 className="text-sm font-medium text-white truncate group-hover:text-primary-400 transition-colors">
                            {channel.name}
                          </h3>
                          <p className="text-xs text-dark-500">
                            {CATEGORY_LABELS[channel.category] || channel.category}
                          </p>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick view drawer (B2) */}
      {quickViewChannel && (
        <ChannelQuickView
          channel={quickViewChannel}
          onClose={() => setQuickViewChannel(null)}
        />
      )}
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  Tv,
  Play,
  Clock,
  Calendar,
  ChevronDown,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LiveBadge } from '@/components/ui/live-badge';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useSearch } from '@/lib/hooks/useSearch';
import type { LiveCategory } from '@/types';
import { CATEGORY_LIST } from '@/lib/constants/categories';
import { searchTypeSchema, searchSortSchema } from '@/lib/validators/search';
import { LIMITS } from '@/lib/constants/limits';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Liên quan nhất' },
  { value: 'recent', label: 'Mới nhất' },
  { value: 'popular', label: 'Lượt xem cao nhất' },
] as const;

type SearchType = 'all' | 'channels' | 'programs';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LiveCategory | ''>('');
  const [selectedSort, setSelectedSort] = useState<string>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Validate query before triggering the API call (avoids spam & 400 errors).
  useEffect(() => {
    if (!debouncedQuery) {
      setValidationError(null);
      return;
    }
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < LIMITS.SEARCH_QUERY_MIN) {
      setValidationError(
        `Từ khóa phải có ít nhất ${LIMITS.SEARCH_QUERY_MIN} ký tự`,
      );
      return;
    }
    if (trimmed.length > LIMITS.SEARCH_QUERY_MAX) {
      setValidationError(
        `Từ khóa tối đa ${LIMITS.SEARCH_QUERY_MAX} ký tự`,
      );
      return;
    }
    setValidationError(null);
  }, [debouncedQuery]);

  const isQueryValid =
    !!debouncedQuery &&
    debouncedQuery.trim().length >= LIMITS.SEARCH_QUERY_MIN &&
    debouncedQuery.trim().length <= LIMITS.SEARCH_QUERY_MAX;

  const { data, isLoading } = useSearch(
    isQueryValid
      ? {
          query: debouncedQuery.trim(),
          // parse to guarantee only allowed values reach the API.
          type: searchTypeSchema.parse(searchType === 'programs' ? 'all' : searchType),
          category: selectedCategory || undefined,
          sortBy: searchSortSchema.parse(selectedSort),
        }
      : { query: '' },
    { enabled: isQueryValid },
  );

  const channels = useMemo(() => data?.channels ?? [], [data?.channels]);
  const liveEvents = useMemo(() => data?.liveEvents ?? [], [data?.liveEvents]);
  const recordings = useMemo(() => data?.recordings ?? [], [data?.recordings]);
  const total = data?.totalResults ?? 0;
  const liveChannelIds = useMemo(
    () => new Set(liveEvents.map((e) => e.channelId)),
    [liveEvents],
  );

  const activeFiltersCount = selectedCategory ? 1 : 0;

  const clearFilters = () => setSelectedCategory('');

  return (
    <div className="min-h-[80vh]">
      {/* Search Header */}
      <div className="bg-dark-900 border-b border-dark-800 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm chương trình, kênh..."
                maxLength={LIMITS.SEARCH_QUERY_MAX}
                className="pl-12 h-12 bg-dark-800 border-dark-700 text-lg"
                aria-invalid={!!validationError}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 gap-2"
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Bộ lọc
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="h-12 px-4 bg-dark-800 border border-dark-700 rounded-lg text-white appearance-none cursor-pointer pr-10"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 pointer-events-none" />
            </div>
          </div>

          {/* Validation error */}
          {validationError && (
            <p className="mt-2 text-sm text-amber-400" role="alert">
              {validationError}
            </p>
          )}

          {/* Search Type Tabs */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {(
              [
                { value: 'all', label: 'Tất cả', count: total },
                {
                  value: 'programs',
                  label: 'Chương trình',
                  count: liveEvents.length + recordings.length,
                },
                { value: 'channels', label: 'Kênh', count: channels.length },
              ] as { value: SearchType; label: string; count: number }[]
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSearchType(tab.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchType === tab.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-800 text-dark-400 hover:text-white'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-dark-800 rounded-xl border border-dark-700 animate-slide-down">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Filter */}
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Thể loại</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedCategory === ''
                          ? 'bg-primary-600 text-white'
                          : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                    >
                      Tất cả
                    </button>
                    {CATEGORY_LIST.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          selectedCategory === cat.value
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className="mt-4 pt-4 border-t border-dark-700 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Xóa bộ lọc
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!debouncedQuery || debouncedQuery.trim().length < LIMITS.SEARCH_QUERY_MIN ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto mb-4 text-dark-600" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nhập từ khóa để tìm kiếm
            </h3>
            <p className="text-dark-400">
              Tối thiểu {LIMITS.SEARCH_QUERY_MIN} ký tự — tìm kiếm kênh, chương trình và nội dung trên OmniCast
            </p>
          </div>
        ) : validationError ? null : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
          </div>
        ) : total === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto mb-4 text-dark-600" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Không tìm thấy kết quả
            </h3>
            <p className="text-dark-400 mb-6">
              Thử thay đổi từ khóa hoặc bộ lọc tìm kiếm
            </p>
            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-dark-400 mb-6">
              Tìm thấy <span className="text-white font-medium">{total}</span> kết
              quả cho &ldquo;{debouncedQuery}&rdquo;
            </p>

            {/* Programs Results */}
            {(searchType === 'all' || searchType === 'programs') &&
              liveEvents.length > 0 && (
                <div className="mb-10">
                  <h2 className="text-xl font-bold text-white mb-4">
                    Chương trình đang phát
                  </h2>
                  <div className="space-y-4">
                    {liveEvents.map((program) => (
                      <Link key={program.id} href={`/programs/${program.id}`}>
                        <Card className="group p-4 glass-card hover:border-primary-500/50 transition-all">
                          <div className="flex gap-4">
                            <div className="relative w-48 h-28 rounded-lg bg-dark-700 flex-shrink-0 overflow-hidden">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="w-10 h-10 text-dark-600" />
                              </div>
                              {program.status === 'LIVE' && (
                                <div className="absolute top-2 left-2">
                                  <LiveBadge size="sm" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors mb-1">
                                {program.title}
                              </h3>
                              <p className="text-sm text-dark-400 mb-2 line-clamp-2">
                                {program.description || ''}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-dark-500">
                                <span className="flex items-center gap-1">
                                  <Tv className="w-4 h-4" />
                                  {program.channel?.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {format(
                                    parseISO(program.scheduledAt),
                                    'dd/MM/yyyy',
                                    { locale: vi },
                                  )}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {format(
                                    parseISO(program.scheduledAt),
                                    'HH:mm',
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="hidden md:flex flex-col items-end justify-center text-sm text-dark-400">
                              <span>
                                {formatCompact(program.viewerCount)} lượt xem
                              </span>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            {/* Channels Results */}
            {(searchType === 'all' || searchType === 'channels') &&
              channels.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">Kênh</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {channels.map((channel) => (
                      <Link
                        key={channel.id}
                        href={`/channels/${channel.slug}`}
                      >
                        <Card className="group p-4 glass-card hover:border-primary-500/50 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <ChannelLogo
                                slug={channel.slug}
                                logoUrl={channel.logoUrl}
                                name={channel.name}
                                category={channel.category}
                                size="lg"
                                className="rounded-xl"
                              />
                              {liveChannelIds.has(channel.id) && (
                                <div className="absolute -top-1 -right-1">
                                  <LiveBadge size="sm" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
                                {channel.name}
                              </h3>
                              <p className="text-sm text-dark-400">
                                {channel.category}
                              </p>
                              <p className="text-sm text-dark-500">
                                {formatCompact(channel.followerCount)} người theo
                                dõi
                              </p>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}
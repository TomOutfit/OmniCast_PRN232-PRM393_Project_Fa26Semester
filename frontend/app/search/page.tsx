'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  X, 
  Tv, 
  Play, 
  Clock, 
  Calendar,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LiveBadge } from '@/components/ui/live-badge';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// Mock search results
const mockChannels = [
  { id: '1', name: 'Omni Sport 1', slug: 'omni-sport-1', category: 'Thể thao', isLive: true, followerCount: 1250000 },
  { id: '3', name: 'Omni Show', slug: 'omni-show', category: 'Giải trí', isLive: true, followerCount: 2100000 },
  { id: '6', name: 'Omni Drama', slug: 'omni-drama', category: 'Phim truyện', isLive: true, followerCount: 2800000 },
];

const mockPrograms = [
  { id: 'p3', title: 'Champions League - Liverpool vs Man City', slug: 'liverpool-vs-man-city', category: 'Bóng đá', channel: 'Omni Sport 1', status: 'LIVE', scheduledAt: '2026-09-24T07:30:00', viewerCount: 2450000 },
  { id: 'p20', title: 'Avengers Endgame', slug: 'avengers-endgame', category: 'Phim hành động', channel: 'Omni Cine', status: 'LIVE', scheduledAt: '2026-09-24T07:30:00', viewerCount: 1850000 },
  { id: 'p12', title: 'Hát cho cuộc sống', slug: 'hat-cho-cuoc-song', category: 'Ca nhạc', channel: 'Omni Show', status: 'LIVE', scheduledAt: '2026-09-24T09:00:00', viewerCount: 980000 },
];

const categories = ['Tất cả', 'Thể thao', 'Giải trí', 'Điện ảnh', 'Phim truyện', 'Tin tức', 'Âm nhạc', 'Thiếu nhi'];
const durations = ['Tất cả', 'Dưới 30 phút', '30-60 phút', '1-2 giờ', 'Trên 2 giờ'];
const sortOptions = ['Liên quan nhất', 'Mới nhất', 'Lượt xem cao nhất', 'Thời gian phát gần nhất'];

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('bóng đá');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedDuration, setSelectedDuration] = useState('Tất cả');
  const [selectedSort, setSelectedSort] = useState('Liên quan nhất');
  const [showFilters, setShowFilters] = useState(false);
  const [searchType, setSearchType] = useState<'all' | 'programs' | 'channels'>('all');

  const activeFiltersCount = [
    selectedCategory !== 'Tất cả',
    selectedDuration !== 'Tất cả',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCategory('Tất cả');
    setSelectedDuration('Tất cả');
  };

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
                className="pl-12 h-12 bg-dark-800 border-dark-700 text-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
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
                {sortOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 pointer-events-none" />
            </div>
          </div>

          {/* Search Type Tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { value: 'all', label: 'Tất cả', count: 6 },
              { value: 'programs', label: 'Chương trình', count: 3 },
              { value: 'channels', label: 'Kênh', count: 3 },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSearchType(tab.value as typeof searchType)}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Category Filter */}
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Thể loại</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          selectedCategory === cat
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Filter */}
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Thời lượng</h3>
                  <div className="flex flex-wrap gap-2">
                    {durations.map((dur) => (
                      <button
                        key={dur}
                        onClick={() => setSelectedDuration(dur)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          selectedDuration === dur
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                        }`}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Trạng thái</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Tất cả', 'Đang phát', 'Sắp phát', 'Theo yêu cầu'].map((status) => (
                      <button
                        key={status}
                        className="px-3 py-1.5 rounded-full text-sm bg-dark-700 text-dark-300 hover:bg-dark-600 transition-colors"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <div className="mt-4 pt-4 border-t border-dark-700 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-400 hover:text-red-300">
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
        {/* Results Count */}
        <p className="text-dark-400 mb-6">
          Tìm thấy <span className="text-white font-medium">6</span> kết quả cho "{searchQuery}"
        </p>

        {/* Programs Results */}
        {(searchType === 'all' || searchType === 'programs') && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">Chương trình</h2>
            <div className="space-y-4">
              {mockPrograms.map((program) => (
                <Link key={program.id} href={`/programs/${program.id}`}>
                  <Card className="group p-4 glass-card hover:border-primary-500/50 transition-all">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="relative w-48 h-28 rounded-lg bg-dark-700 flex-shrink-0 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-10 h-10 text-dark-600" />
                        </div>
                        {program.status === 'LIVE' && (
                          <div className="absolute top-2 left-2">
                            <LiveBadge size="sm" />
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white">
                          {program.status === 'LIVE' ? 'Trực tiếp' : '2h 30m'}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors mb-1">
                          {program.title}
                        </h3>
                        <p className="text-sm text-dark-400 mb-2">{program.category}</p>
                        <div className="flex items-center gap-4 text-sm text-dark-500">
                          <span className="flex items-center gap-1">
                            <Tv className="w-4 h-4" />
                            {program.channel}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(parseISO(program.scheduledAt), 'dd/MM/yyyy', { locale: vi })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(parseISO(program.scheduledAt), 'HH:mm')}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="hidden md:flex flex-col items-end justify-center text-sm text-dark-400">
                        <span>{(program.viewerCount / 1000000).toFixed(1)}M lượt xem</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Channels Results */}
        {(searchType === 'all' || searchType === 'channels') && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Kênh</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockChannels.map((channel) => (
                <Link key={channel.id} href={`/channels/${channel.slug}`}>
                  <Card className="group p-4 glass-card hover:border-primary-500/50 transition-all">
                    <div className="flex items-center gap-4">
                      {/* Logo */}
                      <div className="relative">
                        <ChannelLogo 
                          slug={channel.slug}
                          name={channel.name}
                          category={getCategoryCode(channel.category)}
                          size="lg"
                          className="rounded-xl"
                        />
                        {channel.isLive && (
                          <div className="absolute -top-1 -right-1">
                            <LiveBadge size="sm" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
                          {channel.name}
                        </h3>
                        <p className="text-sm text-dark-400">{channel.category}</p>
                        <p className="text-sm text-dark-500">
                          {(channel.followerCount / 1000000).toFixed(1)}M người theo dõi
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State (show when no results) */}
        {false && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto mb-4 text-dark-600" />
            <h3 className="text-xl font-semibold text-white mb-2">Không tìm thấy kết quả</h3>
            <p className="text-dark-400 mb-6">
              Thử thay đổi từ khóa hoặc bộ lọc tìm kiếm
            </p>
            <Button variant="outline">Xóa bộ lọc</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Map category display name to code
function getCategoryCode(category: string): string {
  const map: Record<string, string> = {
    'Thể thao': 'SPORTS',
    'Giải trí': 'ENTERTAINMENT',
    'Điện ảnh': 'CINE',
    'Phim truyện': 'DRAMA',
    'Tin tức': 'NEWS',
    'Âm nhạc': 'MUSIC',
    'Thiếu nhi': 'KIDS',
    'Công nghệ': 'TECH',
    'Ẩm thực': 'FOOD',
    'Giáo dục': 'EDUCATION',
    'Show': 'SHOW',
  };
  return map[category] || category;
}

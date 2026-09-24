import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, Eye, TrendingUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LiveBadge } from '@/components/ui/live-badge';
import { Input } from '@/components/ui/input';
import { ChannelLogo } from '@/components/ui/channel-logo';

// Mock data - in real app, fetch from API
const channels = [
  {
    id: '1',
    name: 'Omni Sport 1',
    slug: 'omni-sport-1',
    description: 'Kênh thể thao hàng đầu với các giải đấu quốc tế',
    category: 'Thể thao',
    categoryCode: 'SPORTS',
    logoUrl: null,
    followerCount: 1250000,
    totalViews: 89000000,
    isLive: true,
    isVerified: true,
    isFeatured: true,
  },
  {
    id: '2',
    name: 'Omni Sport 2',
    slug: 'omni-sport-2',
    description: 'Cập nhật tin thể thao nóng hổi 24/7',
    category: 'Thể thao',
    categoryCode: 'SPORTS',
    logoUrl: null,
    followerCount: 890000,
    totalViews: 45000000,
    isLive: false,
    isVerified: true,
    isFeatured: false,
  },
  {
    id: '3',
    name: 'Omni Show',
    slug: 'omni-show',
    description: 'Giải trí đỉnh cao với các show truyền hình hot nhất',
    category: 'Giải trí',
    categoryCode: 'SHOW',
    logoUrl: null,
    followerCount: 2100000,
    totalViews: 156000000,
    isLive: true,
    isVerified: true,
    isFeatured: true,
  },
  {
    id: '4',
    name: 'Omni Entertain',
    slug: 'omni-entertain',
    description: 'Kênh giải trí tổng hợp cho mọi lứa tuổi',
    category: 'Giải trí',
    categoryCode: 'ENTERTAINMENT',
    logoUrl: null,
    followerCount: 1560000,
    totalViews: 98000000,
    isLive: false,
    isVerified: true,
    isFeatured: false,
  },
  {
    id: '5',
    name: 'Omni Cine',
    slug: 'omni-cine',
    description: 'Thưởng thức những bộ phim hay nhất Hollywood & Việt Nam',
    category: 'Điện ảnh',
    categoryCode: 'CINE',
    logoUrl: null,
    followerCount: 3200000,
    totalViews: 245000000,
    isLive: false,
    isVerified: true,
    isFeatured: true,
  },
  {
    id: '6',
    name: 'Omni Drama',
    slug: 'omni-drama',
    description: 'Phim truyện Việt Nam & Hàn Quốc cập nhật liên tục',
    category: 'Phim truyện',
    categoryCode: 'DRAMA',
    logoUrl: null,
    followerCount: 2800000,
    totalViews: 198000000,
    isLive: true,
    isVerified: true,
    isFeatured: false,
  },
  {
    id: '7',
    name: 'Omni News',
    slug: 'omni-news',
    description: 'Tin tức cập nhật 24/7 từ khắp nơi trên thế giới',
    category: 'Tin tức',
    categoryCode: 'NEWS',
    logoUrl: null,
    followerCount: 4500000,
    totalViews: 412000000,
    isLive: true,
    isVerified: true,
    isFeatured: true,
  },
  {
    id: '8',
    name: 'Omni Music',
    slug: 'omni-music',
    description: 'Không gian âm nhạc trực tiếp, concert và bảng xếp hạng Top Hits',
    category: 'Âm nhạc',
    categoryCode: 'MUSIC',
    logoUrl: null,
    followerCount: 3100000,
    totalViews: 280000000,
    isLive: true,
    isVerified: true,
    isFeatured: true,
  },
  {
    id: '9',
    name: 'Omni Kids',
    slug: 'omni-kids',
    description: 'Kênh thiếu nhi với hoạt hình 3D và chương trình giáo dục',
    category: 'Thiếu nhi',
    categoryCode: 'KIDS',
    logoUrl: null,
    followerCount: 1800000,
    totalViews: 134000000,
    isLive: false,
    isVerified: true,
    isFeatured: false,
  },
  {
    id: '10',
    name: 'Omni Tech',
    slug: 'omni-tech',
    description: 'Kênh công nghệ, AI, livestream unbox sản phẩm và sự kiện công nghệ',
    category: 'Công nghệ',
    categoryCode: 'TECH',
    logoUrl: null,
    followerCount: 2200000,
    totalViews: 175000000,
    isLive: true,
    isVerified: true,
    isFeatured: true,
  },
  {
    id: '11',
    name: 'Omni Food',
    slug: 'omni-food',
    description: 'Ẩm thực đường phố 3 miền, công thức nấu ăn cùng MasterChef',
    category: 'Ẩm thực',
    categoryCode: 'FOOD',
    logoUrl: null,
    followerCount: 1650000,
    totalViews: 120000000,
    isLive: false,
    isVerified: true,
    isFeatured: false,
  },
  {
    id: '12',
    name: 'Omni Discovery',
    slug: 'omni-discovery',
    description: 'Phim tài liệu thiên nhiên hoang dã và thám hiểm thế giới kỳ vĩ',
    category: 'Khám phá',
    categoryCode: 'DOCUMENTARY',
    logoUrl: null,
    followerCount: 1950000,
    totalViews: 145000000,
    isLive: true,
    isVerified: true,
    isFeatured: false,
  },
];

const categories = ['Tất cả', 'Thể thao', 'Giải trí', 'Điện ảnh', 'Phim truyện', 'Tin tức', 'Âm nhạc', 'Thiếu nhi', 'Công nghệ', 'Ẩm thực', 'Khám phá'];

export const metadata: Metadata = {
  title: 'Danh sách kênh',
  description: 'Khám phá tất cả các kênh truyền hình trên OmniCast',
};

export default function ChannelsPage() {
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
              {categories.map((category, index) => (
                <Button
                  key={category}
                  variant={index === 0 ? 'default' : 'outline'}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {category}
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
              />
            </div>
          </div>
        </div>
      </div>

      {/* Channels Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Featured Section */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent-gold" />
            Kênh nổi bật
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.filter(c => c.isFeatured).map((channel) => (
              <Link key={channel.id} href={`/channels/${channel.slug}`}>
                <Card className="group p-6 glass-card hover:border-primary-500/50 transition-all duration-300 hover:shadow-glow">
                  <div className="flex items-start gap-4">
                    {/* Channel Logo */}
                    <ChannelLogo
                      slug={channel.slug}
                      name={channel.name}
                      category={channel.categoryCode}
                      size="lg"
                      className="rounded-xl"
                    />

                    {/* Channel Info */}
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
                      <p className="text-sm text-dark-400 mb-3">{channel.category}</p>
                      <p className="text-sm text-dark-300 line-clamp-2">{channel.description}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-dark-700">
                    <div className="flex items-center gap-1.5 text-sm text-dark-400">
                      <Users className="w-4 h-4" />
                      <span>{(channel.followerCount / 1000000).toFixed(1)}M</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-dark-400">
                      <Eye className="w-4 h-4" />
                      <span>{(channel.totalViews / 1000000).toFixed(0)}M lượt xem</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* All Channels */}
        <div>
          <h2 className="text-xl font-bold text-white mb-6">Tất cả kênh</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {channels.map((channel) => (
              <Link key={channel.id} href={`/channels/${channel.slug}`} className="group">
                <Card className="p-4 glass-card hover:border-primary-500/50 transition-all">
                  <div className="relative aspect-square mb-3">
                    <ChannelLogo
                      slug={channel.slug}
                      name={channel.name}
                      category={channel.categoryCode}
                      size="xl"
                      className="w-full h-full rounded-xl"
                    />
                    {channel.isLive && (
                      <div className="absolute top-2 right-2">
                        <LiveBadge size="sm" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-white truncate group-hover:text-primary-400 transition-colors">
                    {channel.name}
                  </h3>
                  <p className="text-xs text-dark-500">{channel.category}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

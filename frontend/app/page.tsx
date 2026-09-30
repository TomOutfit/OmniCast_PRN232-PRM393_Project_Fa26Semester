'use client';

import Link from 'next/link';
import {
  Tv,
  Radio,
  Search,
  Play,
  Users,
  Shield,
  Zap,
  ChevronRight,
  Star,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { LiveBadge } from '@/components/ui/live-badge';
import { useChannels } from '@/lib/hooks/useChannels';
import { useLiveNow, useRecordings } from '@/lib/hooks/usePrograms';

const features = [
  {
    icon: Tv,
    title: 'EPG Grid 24h',
    description:
      'Lịch phát sóng chi tiết 24 giờ với khả năng xem nhanh chương trình đang phát',
  },
  {
    icon: Radio,
    title: 'Live Streaming',
    description:
      'Phát sóng trực tiếp chất lượng cao với độ trễ thấp và độ ổn định cao',
  },
  {
    icon: Search,
    title: 'Tìm kiếm thông minh',
    description:
      'Tìm kiếm nhanh chóng với bộ lọc theo thể loại, thời gian và kênh',
  },
  {
    icon: Users,
    title: 'Cộng đồng',
    description:
      'Kết nối với những người yêu thích cùng nội dung, bình luận và chia sẻ',
  },
  {
    icon: Shield,
    title: 'An toàn & Bảo mật',
    description:
      'Nội dung được kiểm duyệt kỹ lưỡng, phân loại độ tuổi rõ ràng',
  },
  {
    icon: Zap,
    title: 'AI Curator',
    description:
      'Trợ lý AI thẩm định nội dung thông minh, đề xuất thời gian phát sóng tối ưu',
  },
];

export default function HomePage() {
  const { data: featuredData, isLoading: loadingChannels } = useChannels({
    isFeatured: true,
    isActive: true,
    limit: 12,
  });
  const { data: liveEvents, isLoading: loadingLive } = useLiveNow();
  const { data: recordingsData, isLoading: loadingRecordings } = useRecordings({
    isFeatured: true,
    limit: 12,
    page: 1,
  });

  const channels = Array.isArray(featuredData) ? featuredData : (featuredData?.data ?? []);
  const liveList = Array.isArray(liveEvents) ? liveEvents : (liveEvents as any)?.data ?? [];
  const recordings = Array.isArray(recordingsData)
    ? recordingsData
    : (recordingsData as any)?.data ?? [];
  const liveChannelIds = new Set(
    liveList.map((e: any) => e.channelId),
  );

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-dark-800/80 border border-dark-700 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
            <span className="text-sm text-dark-300">Live Broadcasting Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance">
            <span className="gradient-text">OmniCast</span>
            <br />
            <span className="text-white">Broadcast Intelligence</span>
          </h1>

          <p className="text-xl text-dark-300 max-w-3xl mx-auto mb-10">
            Hệ thống quản lý lịch phát sóng EPG thông minh, phát sóng trực tiếp
            và nền tảng truyền thông doanh nghiệp hàng đầu Việt Nam
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/epg">
                <Play className="mr-2 h-5 w-5" />
                Xem lịch phát sóng
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href="/register">
                Đăng ký ngay
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
            <StatBox label="Kênh truyền hình" value={String(channels.length || 12) + '+'} />
            <StatBox
              label="Chương trình/ngày"
              value={(liveList?.length ?? 0) > 0 ? `${(liveList?.length ?? 0) * 5}+` : '100+'}
            />
            <StatBox
              label="Video VOD"
              value={`${recordings.length || 1080}+`}
            />
            <StatBox
              label="Tổng người theo dõi"
              value={`${formatCompact(
                channels.reduce((sum, c) => sum + c.followerCount, 0),
              )}+`}
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-dark-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Tính năng nổi bật
            </h2>
            <p className="text-dark-300 max-w-2xl mx-auto">
              OmniCast cung cấp giải pháp toàn diện cho việc quản lý và phát
              sóng nội dung truyền hình
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="p-6 glass-card hover:border-primary-500/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-dark-400">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Live Channels Preview */}
      <section className="py-24 bg-dark-950">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white">Kênh nổi bật</h2>
              <p className="text-dark-400">Theo dõi các kênh yêu thích của bạn</p>
            </div>
            <Button asChild variant="ghost">
              <Link href="/channels">
                Xem tất cả
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loadingChannels || loadingLive ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-16 text-dark-400">
              Chưa có kênh nổi bật nào.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {channels.map((channel) => {
                const isLive = liveChannelIds.has(channel.id);
                return (
                  <Link
                    key={channel.id}
                    href={`/channels/${channel.slug}`}
                    className="group"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-dark-800 border border-dark-700 group-hover:border-primary-500 transition-colors p-3">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ChannelLogo
                          slug={channel.slug}
                          logoUrl={channel.logoUrl}
                          name={channel.name}
                          category={channel.category}
                          size="lg"
                          className="rounded-xl"
                        />
                      </div>
                      {isLive && (
                        <div className="absolute top-2 right-2">
                          <LiveBadge size="sm" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-white truncate group-hover:text-primary-400 transition-colors">
                      {channel.name}
                    </p>
                    <p className="text-xs text-dark-500">{channel.category}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Featured Recordings Section */}
      <section className="py-24 bg-dark-950 border-t border-dark-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white">VOD nổi bật</h2>
              <p className="text-dark-400">
                Xem lại các chương trình, podcast và video đã phát sóng
              </p>
            </div>
            <Button asChild variant="ghost">
              <Link href="/recordings">
                Xem tất cả
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loadingRecordings ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-16 text-dark-400">
              Chưa có VOD nổi bật nào.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recordings.slice(0, 8).map((rec: any) => (
                <Link
                  key={rec.id}
                  href={`/programs/recording/${rec.id}`}
                  className="group"
                >
                  <Card className="overflow-hidden glass-card hover:border-primary-500/50 transition-all h-full">
                    <div className="relative aspect-video bg-dark-800 overflow-hidden">
                      {rec.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rec.thumbnailUrl}
                          alt={rec.title}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-10 h-10 text-dark-600" />
                        </div>
                      )}
                      {rec.duration > 0 && (
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-xs">
                          {Math.floor(rec.duration / 60)}m
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-current" />
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-primary-400 transition-colors">
                        {rec.title}
                      </h3>
                      {rec.channel && (
                        <p className="text-xs text-dark-500 mt-1 truncate">
                          {rec.channel.name}
                        </p>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary-600 to-primary-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Star className="w-12 h-12 mx-auto mb-6 text-accent-gold" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Sẵn sàng trải nghiệm?
          </h2>
          <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
            Tham gia cùng hàng triệu người xem trên OmniCast ngay hôm nay và
            khám phá thế giới giải trí không giới hạn
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-lg px-8"
            >
              <Link href="/register">Bắt đầu miễn phí</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary-700"
            >
              <Link href="/login">Đăng nhập</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-white mb-1">{value}</div>
      <div className="text-dark-400 text-sm">{label}</div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

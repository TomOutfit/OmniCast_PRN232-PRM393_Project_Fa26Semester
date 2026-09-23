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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HomePage() {
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
            {[
              { label: 'Kênh truyền hình', value: '12+' },
              { label: 'Chương trình/ngày', value: '100+' },
              { label: 'Người xem', value: '1M+' },
              { label: 'Độ khả dụng', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-dark-400 text-sm">{stat.label}</div>
              </div>
            ))}
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

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {channels.map((channel) => (
              <Link
                key={channel.id}
                href={`/channels/${channel.slug}`}
                className="group"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-dark-800 border border-dark-700 group-hover:border-primary-500 transition-colors">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Tv className="w-12 h-12 text-dark-600" />
                  </div>
                  {channel.isLive && (
                    <div className="absolute top-2 right-2">
                      <span className="badge-live">Live</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium text-white truncate group-hover:text-primary-400 transition-colors">
                  {channel.name}
                </p>
                <p className="text-xs text-dark-500">{channel.category}</p>
              </Link>
            ))}
          </div>
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
              <Link href="/contact">Liên hệ</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

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

const channels = [
  { id: '1', name: 'Omni Sport 1', slug: 'omni-sport-1', category: 'Thể thao', isLive: true },
  { id: '2', name: 'Omni Sport 2', slug: 'omni-sport-2', category: 'Thể thao', isLive: false },
  { id: '3', name: 'Omni Show', slug: 'omni-show', category: 'Giải trí', isLive: true },
  { id: '4', name: 'Omni Entertain', slug: 'omni-entertain', category: 'Giải trí', isLive: false },
  { id: '5', name: 'Omni Cine', slug: 'omni-cine', category: 'Điện ảnh', isLive: false },
  { id: '6', name: 'Omni Drama', slug: 'omni-drama', category: 'Phim truyện', isLive: true },
];

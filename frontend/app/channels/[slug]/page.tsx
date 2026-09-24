import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  Tv, 
  Users, 
  Eye, 
  Bell, 
  BellOff,
  Share2, 
  Play,
  Calendar,
  Clock,
  ChevronRight,
  Verified,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LiveBadge } from '@/components/ui/live-badge';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// Mock data - in real app, fetch from API using params.slug
// Mock data for all 12 OmniCast unified channels
const channelData: Record<string, any> = {
  'omni-sport-1': {
    id: '1',
    name: 'Omni Sport 1',
    slug: 'omni-sport-1',
    description: 'Kênh thể thao đỉnh cao số 1 OmniCast - Trực tiếp các giải bóng đá vô địch quốc gia, cúp châu Âu, Tennis Grand Slam và bình luận chuyên sâu trước - sau trận đấu.',
    category: 'Thể thao',
    tagline: 'Đỉnh Cao Thể Thao Thế Giới',
    bannerColor: 'from-red-600 to-red-950',
    followerCount: 1250000,
    totalViews: 89000000,
    subscriberCount: 890000,
    isVerified: true,
    isLive: true,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-01-15',
    currentProgram: {
      id: 'p3',
      title: 'Champions League - Liverpool vs Man City',
      startTime: '2026-09-24T07:30:00',
      endTime: '2026-09-24T09:30:00',
      status: 'LIVE',
    },
    upcomingPrograms: [
      { id: 'p4', title: 'Phân tích sau trận', startTime: '2026-09-24T09:30:00', endTime: '2026-09-24T10:30:00', status: 'SCHEDULED' },
      { id: 'p5', title: 'Tennis Grand Slam', startTime: '2026-09-24T10:30:00', endTime: '2026-09-24T13:00:00', status: 'SCHEDULED' },
    ],
  },
  'omni-sport-2': {
    id: '2',
    name: 'Omni Sport 2',
    slug: 'omni-sport-2',
    description: 'Kênh thể thao tốc độ và đối kháng - Trực tiếp giải đua xe F1, MotoGP, võ thuật tổng hợp MMA/UFC, Boxing đỉnh cao và thể thao mạo hiểm X-Games.',
    category: 'Thể thao',
    tagline: 'Bứt Phá Mọi Giới Hạn Tốc Độ',
    bannerColor: 'from-orange-600 to-amber-950',
    followerCount: 890000,
    totalViews: 45000000,
    subscriberCount: 620000,
    isVerified: true,
    isLive: false,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-01-16',
    currentProgram: {
      id: 'p2-1',
      title: 'F1 Grand Prix - Qualifying Round',
      startTime: '2026-09-24T14:00:00',
      endTime: '2026-09-24T16:00:00',
      status: 'SCHEDULED',
    },
    upcomingPrograms: [
      { id: 'p2-2', title: 'UFC Fight Night Highlights', startTime: '2026-09-24T16:00:00', endTime: '2026-09-24T18:00:00', status: 'SCHEDULED' },
    ],
  },
  'omni-show': {
    id: '3',
    name: 'Omni Show',
    slug: 'omni-show',
    description: 'Kênh truyền hình thực tế & talkshow độc quyền - Gameshow tương tác trực tiếp, phỏng vấn ngôi sao hàng đầu, thảm đỏ và hậu trường showbiz hấp dẫn.',
    category: 'Giải trí',
    tagline: 'Sân Khấu Showbiz & Truyền Hình Thực Tế',
    bannerColor: 'from-purple-600 to-violet-950',
    followerCount: 2100000,
    totalViews: 156000000,
    subscriberCount: 1500000,
    isVerified: true,
    isLive: true,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-01-20',
    currentProgram: {
      id: 'p12',
      title: 'Hát cho cuộc sống',
      startTime: '2026-09-24T09:00:00',
      endTime: '2026-09-24T11:00:00',
      status: 'LIVE',
    },
    upcomingPrograms: [
      { id: 'p13', title: 'Nấu ăn với sao', startTime: '2026-09-24T11:00:00', endTime: '2026-09-24T12:30:00', status: 'SCHEDULED' },
    ],
  },
  'omni-entertain': {
    id: '4',
    name: 'Omni Entertain',
    slug: 'omni-entertain',
    description: 'Thế giới giải trí không giới hạn - Hài kịch độc thoại, sân khấu kịch tương tác, chương trình ảo thuật và các khoảnh khắc viral hài hước nhất.',
    category: 'Giải trí',
    tagline: 'Giải Trí Bùng Nổ Mọi Lúc Mọi Nơi',
    bannerColor: 'from-pink-600 to-rose-950',
    followerCount: 1560000,
    totalViews: 98000000,
    subscriberCount: 1100000,
    isVerified: true,
    isLive: false,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-01-22',
    currentProgram: {
      id: 'p4-1',
      title: 'Hài kịch cuối tuần',
      startTime: '2026-09-24T19:00:00',
      endTime: '2026-09-24T20:30:00',
      status: 'SCHEDULED',
    },
    upcomingPrograms: [],
  },
  'omni-cine': {
    id: '5',
    name: 'Omni Cine',
    slug: 'omni-cine',
    description: 'Kênh điện ảnh chất lượng 4K - Công chiếu phim ngắn độc quyền, liên hoan phim indie, phân tích điện ảnh chuyên sâu và trailer bom tấn.',
    category: 'Điện ảnh',
    tagline: 'Điện Ảnh 4K & Trải Nghiệm Màn Ảnh Lớn',
    bannerColor: 'from-amber-600 to-yellow-950',
    followerCount: 3200000,
    totalViews: 245000000,
    subscriberCount: 2300000,
    isVerified: true,
    isLive: false,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-01-10',
    currentProgram: {
      id: 'p20',
      title: 'Avengers: Endgame (4K HDR)',
      startTime: '2026-09-24T20:00:00',
      endTime: '2026-09-24T23:00:00',
      status: 'SCHEDULED',
    },
    upcomingPrograms: [],
  },
  'omni-drama': {
    id: '6',
    name: 'Omni Drama',
    slug: 'omni-drama',
    description: 'Kênh phim bộ dài tập & web-drama - Tuyển tập những series phim tâm lý xã hội, tình cảm, hình sự kịch tính được sản xuất độc quyền cho OmniCast.',
    category: 'Phim truyện',
    tagline: 'Những Câu Chuyện Chạm Đến Cảm Xúc',
    bannerColor: 'from-rose-600 to-red-950',
    followerCount: 2800000,
    totalViews: 198000000,
    subscriberCount: 1900000,
    isVerified: true,
    isLive: true,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-01-12',
    currentProgram: {
      id: 'p6-1',
      title: 'Hương Vị Cuộc Sống - Tập 45',
      startTime: '2026-09-24T19:30:00',
      endTime: '2026-09-24T20:30:00',
      status: 'LIVE',
    },
    upcomingPrograms: [],
  },
  'omni-news': {
    id: '7',
    name: 'Omni News',
    slug: 'omni-news',
    description: 'Tin tức chuyển động số 24/7 - Cập nhật dòng chảy sự kiện thời sự, kinh tế tài chính, phân tích thị trường và xu hướng công nghệ toàn cầu liên tục.',
    category: 'Tin tức',
    tagline: 'Thông Tin Nhanh Chóng, Chính Xác 24/7',
    bannerColor: 'from-blue-600 to-cyan-950',
    followerCount: 4500000,
    totalViews: 412000000,
    subscriberCount: 3800000,
    isVerified: true,
    isLive: true,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-01-05',
    currentProgram: {
      id: 'p7-1',
      title: 'Thời Sự Toàn Cầu 24h',
      startTime: '2026-09-24T20:00:00',
      endTime: '2026-09-24T21:00:00',
      status: 'LIVE',
    },
    upcomingPrograms: [],
  },
  'omni-music': {
    id: '8',
    name: 'Omni Music',
    slug: 'omni-music',
    description: 'Không gian âm nhạc trực tiếp - Trực tiếp live concert, acoustic lounge, bảng xếp hạng Top Hits V-Pop & Quốc tế, phát hành MV độc quyền.',
    category: 'Âm nhạc',
    tagline: 'Giai Điệu Kết Nối Triệu Trái Tim',
    bannerColor: 'from-purple-600 to-fuchsia-950',
    followerCount: 3100000,
    totalViews: 280000000,
    subscriberCount: 2200000,
    isVerified: true,
    isLive: true,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-01-18',
    currentProgram: {
      id: 'p8-1',
      title: 'Top Hits Countdown Live',
      startTime: '2026-09-24T20:30:00',
      endTime: '2026-09-24T22:00:00',
      status: 'LIVE',
    },
    upcomingPrograms: [],
  },
  'omni-kids': {
    id: '9',
    name: 'Omni Kids',
    slug: 'omni-kids',
    description: 'Thế giới tuổi thơ diệu kỳ - Phim hoạt hình 3D, chương trình khoa học vui, ca nhạc thiếu nhi và bài học tiếng Anh tương tác bổ ích.',
    category: 'Thiếu nhi',
    tagline: 'Khám Phá, Vui Chơi Và Học Hỏi Cùng Bé',
    bannerColor: 'from-lime-600 to-green-950',
    followerCount: 1800000,
    totalViews: 134000000,
    subscriberCount: 1200000,
    isVerified: true,
    isLive: false,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-01-25',
    currentProgram: {
      id: 'p9-1',
      title: 'Thế giới hoạt hình 3D',
      startTime: '2026-09-24T17:00:00',
      endTime: '2026-09-24T18:30:00',
      status: 'SCHEDULED',
    },
    upcomingPrograms: [],
  },
  'omni-tech': {
    id: '10',
    name: 'Omni Tech',
    slug: 'omni-tech',
    description: 'Kênh công nghệ & trí tuệ nhân tạo - Livestream unbox sản phẩm mới, sự kiện công nghệ Apple/Google/Meta, lập trình viên và workshop AI 2026.',
    category: 'Công nghệ',
    tagline: 'Khám Phá Kỷ Nguyên Công Nghệ Tương Lai',
    bannerColor: 'from-cyan-600 to-emerald-950',
    followerCount: 2200000,
    totalViews: 175000000,
    subscriberCount: 1600000,
    isVerified: true,
    isLive: true,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-02-01',
    currentProgram: {
      id: 'p10-1',
      title: 'AI Summit 2026 Keynote & Demo',
      startTime: '2026-09-24T19:00:00',
      endTime: '2026-09-24T21:00:00',
      status: 'LIVE',
    },
    upcomingPrograms: [],
  },
  'omni-food': {
    id: '11',
    name: 'Omni Food',
    slug: 'omni-food',
    description: 'Hương vị ẩm thực & phong cách sống - Livestream nấu ăn cùng MasterChef, food tour ẩm thực đường phố 3 miền và bí quyết pha chế đồ uống.',
    category: 'Ẩm thực',
    tagline: 'Hành Trình Đánh Thức Vị Giác',
    bannerColor: 'from-orange-600 to-amber-950',
    followerCount: 1650000,
    totalViews: 120000000,
    subscriberCount: 1100000,
    isVerified: true,
    isLive: false,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-02-05',
    currentProgram: {
      id: 'p11-1',
      title: 'Bếp Trưởng Đường Phố: Tour Ẩm Thực Hà Nội',
      startTime: '2026-09-24T18:00:00',
      endTime: '2026-09-24T19:30:00',
      status: 'SCHEDULED',
    },
    upcomingPrograms: [],
  },
  'omni-discovery': {
    id: '12',
    name: 'Omni Discovery',
    slug: 'omni-discovery',
    description: 'Kênh khám phá thế giới & du lịch trải nghiệm - Phim tài liệu thiên nhiên hoang dã, thám hiểm văn hóa bản địa và các kỳ quan hùng vĩ của hành tinh.',
    category: 'Khám phá',
    tagline: 'Mở Rộng Tầm Nhìn Đến Mọi Miền Đất Nước',
    bannerColor: 'from-teal-600 to-cyan-950',
    followerCount: 1950000,
    totalViews: 145000000,
    subscriberCount: 1400000,
    isVerified: true,
    isLive: true,
    region: 'Việt Nam',
    language: 'Tiếng Việt',
    createdAt: '2024-02-10',
    currentProgram: {
      id: 'p12-1',
      title: 'Hành Tinh Xanh: Kỳ Quan Đáy Đại Dương',
      startTime: '2026-09-24T20:00:00',
      endTime: '2026-09-24T21:30:00',
      status: 'LIVE',
    },
    upcomingPrograms: [],
  },
};

interface ChannelPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: ChannelPageProps): Promise<Metadata> {
  const channel = channelData[params.slug];
  if (!channel) return { title: 'Kênh không tìm thấy' };
  
  return {
    title: channel.name,
    description: channel.description,
  };
}

export default function ChannelDetailPage({ params }: ChannelPageProps) {
  const channel = channelData[params.slug];
  
  if (!channel) {
    notFound();
  }

  return (
    <div className="min-h-[80vh]">
      {/* Banner Header */}
      <div className={`bg-gradient-to-r ${channel.bannerColor} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="max-w-7xl mx-auto px-4 py-12 relative">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Channel Logo */}
            <ChannelLogo
              slug={channel.slug}
              name={channel.name}
              size="xl"
              className="rounded-2xl shadow-2xl"
            />

            {/* Channel Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white">{channel.name}</h1>
                {channel.isVerified && (
                  <Verified className="w-6 h-6 text-primary-400" />
                )}
                {channel.isLive && <LiveBadge size="lg" />}
              </div>
              <p className="text-lg text-white/80 mb-4">{channel.tagline}</p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                <span className="flex items-center gap-1">
                  <Tv className="w-4 h-4" />
                  {channel.category}
                </span>
                <span>{channel.region}</span>
                <span>{channel.language}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Tham gia {format(parseISO(channel.createdAt), 'MMMM yyyy', { locale: vi })}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2">
                <Bell className="w-4 h-4" />
                Theo dõi
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2">
                <Share2 className="w-4 h-4" />
                Chia sẻ
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Current/Live Program */}
            {channel.isLive && channel.currentProgram && (
              <Card className="overflow-hidden glass-card">
                <div className="bg-gradient-to-r from-red-600/20 to-red-900/20 p-4 border-b border-dark-700">
                  <div className="flex items-center gap-2 text-red-400">
                    <LiveBadge />
                    <span className="text-sm font-medium">Đang phát sóng</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link href={`/programs/${channel.currentProgram.id}`} className="group">
                        <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors mb-2">
                          {channel.currentProgram.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-4 text-sm text-dark-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(parseISO(channel.currentProgram.startTime), 'HH:mm')} - {format(parseISO(channel.currentProgram.endTime), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                    <Button asChild size="lg" className="gap-2">
                      <Link href={`/programs/${channel.currentProgram.id}`}>
                        <Play className="w-5 h-5" />
                        Xem ngay
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* About Channel */}
            <Card className="p-6 glass-card">
              <h2 className="text-xl font-bold text-white mb-4">Giới thiệu</h2>
              <p className="text-dark-300 leading-relaxed">{channel.description}</p>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center glass-card">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary-400" />
                <div className="text-2xl font-bold text-white">{(channel.followerCount / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-dark-400">Người theo dõi</div>
              </Card>
              <Card className="p-4 text-center glass-card">
                <Eye className="w-6 h-6 mx-auto mb-2 text-accent-cyan" />
                <div className="text-2xl font-bold text-white">{(channel.totalViews / 1000000).toFixed(0)}M</div>
                <div className="text-sm text-dark-400">Lượt xem</div>
              </Card>
              <Card className="p-4 text-center glass-card">
                <Bell className="w-6 h-6 mx-auto mb-2 text-accent-gold" />
                <div className="text-2xl font-bold text-white">{(channel.subscriberCount / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-dark-400">Người đăng ký</div>
              </Card>
              <Card className="p-4 text-center glass-card">
                <Tv className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold text-white">{channel.upcomingPrograms.length + 1}</div>
                <div className="text-sm text-dark-400">Chương trình/ngày</div>
              </Card>
            </div>
          </div>

          {/* Sidebar - Upcoming Programs */}
          <div className="lg:col-span-1">
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700">
                <h2 className="text-lg font-bold text-white">Lịch phát sóng hôm nay</h2>
              </div>
              <div className="divide-y divide-dark-700">
                {/* Current/Live Program */}
                {channel.currentProgram && (
                  <div className="p-4 bg-primary-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <LiveBadge size="sm" />
                      <span className="text-xs text-primary-400 font-medium">HIỆN TẠI</span>
                    </div>
                    <Link href={`/programs/${channel.currentProgram.id}`} className="group">
                      <h4 className="font-medium text-white group-hover:text-primary-400 transition-colors">
                        {channel.currentProgram.title}
                      </h4>
                    </Link>
                    <p className="text-xs text-dark-400 mt-1">
                      {format(parseISO(channel.currentProgram.startTime), 'HH:mm')} - {format(parseISO(channel.currentProgram.endTime), 'HH:mm')}
                    </p>
                  </div>
                )}

                {/* Upcoming Programs */}
                {channel.upcomingPrograms.map((program: any, index: number) => (
                  <div key={program.id} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                      <span className="text-xs text-dark-400 font-medium">
                        {index === 0 ? 'TIẾP THEO' : `LÚC ${format(parseISO(program.startTime), 'HH:mm')}`}
                      </span>
                    </div>
                    <Link href={`/programs/${program.id}`} className="group">
                      <h4 className="font-medium text-white group-hover:text-primary-400 transition-colors">
                        {program.title}
                      </h4>
                    </Link>
                    <p className="text-xs text-dark-500 mt-1">
                      {format(parseISO(program.startTime), 'HH:mm')} - {format(parseISO(program.endTime), 'HH:mm')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-dark-700">
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link href="/epg">
                    Xem lịch phát sóng
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

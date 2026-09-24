import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  Play, 
  Clock, 
  Eye, 
  ThumbsUp, 
  MessageCircle, 
  Share2,
  Calendar,
  Tv,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Volume2,
  Settings,
  Maximize
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LiveBadge, UpcomingBadge } from '@/components/ui/live-badge';
import { AiBadge } from '@/components/ai/ai-badge';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Mock data - in real app, fetch from API
const programData: Record<string, any> = {
  'p3': {
    id: 'p3',
    title: 'Champions League - Liverpool vs Man City',
    description: 'Trận đấu đỉnh cao giữa hai gã khổng lồ của bóng đá Anh. Liverpool với lối chơi pressing tốc độ cao sẽ đối đầu với Manchester City của Pep Guardiola với lối kiểm soát bóng điêu luyện. Đây hứa hẹn là một trận cầu không thể bỏ lỡ với những pha bóng đẹp mắt và bàn thắng hấp dẫn.',
    thumbnailUrl: null,
    status: 'LIVE',
    scheduledAt: '2026-09-24T07:30:00',
    startedAt: '2026-09-24T07:35:00',
    duration: 120,
    viewerCount: 2450000,
    peakViewers: 3200000,
    likeCount: 45000,
    commentCount: 12500,
    shareCount: 8900,
    language: 'Tiếng Việt',
    quality: 'FULL_HD_1080P',
    tags: ['Bóng đá', 'Premier League', 'Champions League', 'Liverpool', 'Man City'],
    channel: {
      id: '1',
      name: 'Omni Sport 1',
      slug: 'omni-sport-1',
      category: 'SPORTS',
    },
    aiReport: {
      broadcastSuitability: 'PRIME_TIME',
      suggestedTimeSlot: '19:00 - 21:30 (Tối thứ 7)',
      targetAudienceVibe: 'Gia đình, Fan thể thao, Gen Z yêu bóng đá',
      riskWarnings: null,
      sentimentAnalysis: {
        overallSentiment: 'positive',
        hypeLevel: 'high',
        audienceEngagement: 92,
      },
      complianceAssessment: {
        isAgeRestricted: false,
        ageRating: 'PG',
        flaggedContent: [],
        recommendedBroadcastWindow: 'EVENING',
      },
      aiModelVersion: '2.4.1',
      processingTimeMs: 234,
    },
  },
  'p20': {
    id: 'p20',
    title: 'Avengers Endgame',
    description: 'Sau sự kiện hủy diệt của Thanos, các siêu anh hùng còn lại cùng nhau tìm cách đảo ngược hậu quả và mang lại những người đã mất trở lại trong màn chung kết hoành tráng của Vũ trụ Điện ảnh Marvel.',
    thumbnailUrl: null,
    status: 'LIVE',
    scheduledAt: '2026-09-24T07:30:00',
    startedAt: '2026-09-24T07:35:00',
    duration: 180,
    viewerCount: 1850000,
    peakViewers: 2100000,
    likeCount: 78000,
    commentCount: 23400,
    shareCount: 15600,
    language: 'Tiếng Việt',
    quality: 'FULL_HD_1080P',
    tags: ['Phim', 'Hành động', 'Marvel', 'Siêu anh hùng'],
    channel: {
      id: '5',
      name: 'Omni Cine',
      slug: 'omni-cine',
      category: 'CINE',
    },
    aiReport: {
      broadcastSuitability: 'STANDARD',
      suggestedTimeSlot: '20:00 - 23:00 (Cuối tuần)',
      targetAudienceVibe: 'Gen Y, Gen Z, Gia đình có con trên 13 tuổi',
      riskWarnings: 'Có cảnh bạo lực nhẹ - phù hợp T13+',
      sentimentAnalysis: {
        overallSentiment: 'positive',
        hypeLevel: 'high',
        audienceEngagement: 88,
      },
      complianceAssessment: {
        isAgeRestricted: false,
        ageRating: 'T13',
        flaggedContent: ['Bạo lực nhẹ', 'Hành động'],
        recommendedBroadcastWindow: 'EVENING',
      },
      aiModelVersion: '2.4.1',
      processingTimeMs: 198,
    },
  },
};

interface ProgramPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ProgramPageProps): Promise<Metadata> {
  const program = programData[params.id];
  if (!program) return { title: 'Chương trình không tìm thấy' };
  
  return {
    title: program.title,
    description: program.description,
  };
}

export default function ProgramDetailPage({ params }: ProgramPageProps) {
  const program = programData[params.id];
  
  if (!program) {
    notFound();
  }

  const qualityLabels: Record<string, string> = {
    SD_480P: '480p',
    HD_720P: '720p',
    FULL_HD_1080P: '1080p',
    QHD_1440P: '1440p',
    UHD_4K: '4K',
    AUTO: 'Tự động',
  };

  return (
    <div className="min-h-[80vh]">
      {/* Video Player Section */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto">
          {/* Player */}
          <div className="relative aspect-video bg-dark-900">
            {/* Placeholder for actual video player */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-primary-500 hover:scale-110 transition-all shadow-glow">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
                <p className="text-white/60">Nhấn để phát video</p>
                {program.status === 'LIVE' && (
                  <div className="mt-4">
                    <LiveBadge size="lg" />
                  </div>
                )}
              </div>
            </div>

            {/* Player Controls Overlay (visual only) */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between text-white text-sm">
                <div className="flex items-center gap-4">
                  <button className="hover:text-primary-400 transition-colors">
                    <Volume2 className="w-5 h-5" />
                  </button>
                  <span>{format(parseISO(program.startedAt || program.scheduledAt), 'HH:mm:ss')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <button className="hover:text-primary-400 transition-colors">
                    <Settings className="w-5 h-5" />
                  </button>
                  <button className="hover:text-primary-400 transition-colors">
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Program Info */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                {program.status === 'LIVE' ? (
                  <LiveBadge size="lg" />
                ) : program.status === 'SCHEDULED' ? (
                  <UpcomingBadge />
                ) : (
                  <span className="px-3 py-1 rounded bg-dark-600 text-dark-300 text-sm">
                    {program.status === 'ENDED' ? 'Đã kết thúc' : 'Theo yêu cầu'}
                  </span>
                )}
                <span className="px-2 py-1 rounded bg-dark-700 text-dark-300 text-sm">
                  {qualityLabels[program.quality]}
                </span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {program.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-dark-400 mb-6">
                <Link href={`/channels/${program.channel.slug}`} className="flex items-center gap-2 hover:text-primary-400 transition-colors">
                  <ChannelLogo 
                    slug={program.channel.slug}
                    name={program.channel.name}
                    category={program.channel.category}
                    size="sm"
                  />
                  <span>{program.channel.name}</span>
                </Link>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(parseISO(program.scheduledAt), 'dd/MM/yyyy', { locale: vi })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(parseISO(program.scheduledAt), 'HH:mm')} - {format(parseISO(program.startedAt || program.scheduledAt), 'HH:mm')} ({program.duration} phút)
                </span>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <span className="flex items-center gap-1.5 text-dark-300">
                  <Eye className="w-4 h-4" />
                  {(program.viewerCount / 1000000).toFixed(1)}M lượt xem
                </span>
                <span className="flex items-center gap-1.5 text-dark-300">
                  <ThumbsUp className="w-4 h-4" />
                  {(program.likeCount / 1000).toFixed(0)}K
                </span>
                <span className="flex items-center gap-1.5 text-dark-300">
                  <MessageCircle className="w-4 h-4" />
                  {(program.commentCount / 1000).toFixed(1)}K bình luận
                </span>
                <span className="flex items-center gap-1.5 text-dark-300">
                  <Share2 className="w-4 h-4" />
                  {(program.shareCount / 1000).toFixed(1)}K chia sẻ
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="gap-2">
                <ThumbsUp className="w-5 h-5" />
                Thích
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <Bookmark className="w-5 h-5" />
                Lưu
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <Share2 className="w-5 h-5" />
                Chia sẻ
              </Button>
            </div>

            {/* Description */}
            <Card className="p-6 glass-card">
              <h2 className="text-lg font-bold text-white mb-3">Mô tả</h2>
              <p className="text-dark-300 leading-relaxed">{program.description}</p>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-dark-700">
                {program.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-dark-700 text-dark-300 text-sm hover:bg-dark-600 cursor-pointer transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>

            {/* Viewer Info */}
            <Card className="p-4 glass-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-lg font-bold text-white">
                    {program.channel.name[0]}
                  </div>
                  <div>
                    <Link href={`/channels/${program.channel.slug}`} className="font-semibold text-white hover:text-primary-400 transition-colors">
                      {program.channel.name}
                    </Link>
                    <p className="text-sm text-dark-400">
                      Đang phát sóng • {program.viewerCount.toLocaleString()} đang xem
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/channels/${program.channel.slug}`}>Xem kênh</Link>
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* AI Curator Report */}
            {program.aiReport && (
              <AiBadge report={program.aiReport} />
            )}

            {/* Related Programs */}
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700">
                <h3 className="font-bold text-white">Chương trình liên quan</h3>
              </div>
              <div className="divide-y divide-dark-700">
                {[
                  { title: 'Phân tích sau trận', time: '09:30 - 10:30' },
                  { title: 'Tennis Grand Slam', time: '10:30 - 13:00' },
                  { title: 'Bản tin thể thao trưa', time: '13:00 - 13:30' },
                  { title: 'NBA Finals 2026', time: '13:30 - 16:00' },
                ].map((item, i) => (
                  <Link key={i} href="#" className="flex items-center gap-3 p-4 hover:bg-dark-800/50 transition-colors">
                    <div className="w-16 h-10 rounded bg-dark-700 flex items-center justify-center">
                      <Play className="w-4 h-4 text-dark-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
                      <p className="text-xs text-dark-500">{item.time}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

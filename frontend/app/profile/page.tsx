import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Edit,
  Camera,
  Tv,
  Eye,
  Clock,
  ThumbsUp,
  Bookmark,
  Settings,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// Mock user data - in real app, fetch from session
interface ViewerStats {
  totalWatchTime: number;
  favoriteChannels: number;
  totalLikes: number;
  totalComments: number;
}

interface StaffStats extends ViewerStats {
  programsReviewed: number;
  aiReportsGenerated: number;
}

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  role: 'VIEWER' | 'STAFF' | 'ADMIN' | 'GUEST';
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string;
  createdAt: string;
  stats: ViewerStats | StaffStats;
  recentActivity: Array<{ id: number; type: string; title: string; time: string }>;
  favoriteChannels: Array<{ id: string; name: string; slug: string; category: string }>;
}

const mockUser: UserProfile = {
  id: '1',
  fullName: 'Nguyễn Văn A',
  email: 'nguyen.van.a@email.com',
  avatarUrl: null,
  bio: 'Yêu thích thể thao, đặc biệt là bóng đá. Theo dõi OmniCast để cập nhật tin tức nóng hổi mỗi ngày!',
  role: 'VIEWER',
  isActive: true,
  emailVerified: true,
  lastLoginAt: '2026-09-24T10:30:00',
  createdAt: '2024-01-15',
  stats: {
    totalWatchTime: 245,
    favoriteChannels: 5,
    totalLikes: 128,
    totalComments: 45,
  },
  recentActivity: [
    { id: 1, type: 'watch', title: 'Champions League - Liverpool vs Man City', time: '2 giờ trước' },
    { id: 2, type: 'like', title: 'Thích: Hát cho cuộc sống', time: '5 giờ trước' },
    { id: 3, type: 'comment', title: 'Bình luận: Siêu phẩm!', time: '1 ngày trước' },
    { id: 4, type: 'follow', title: 'Theo dõi: Omni Sport 1', time: '2 ngày trước' },
  ],
  favoriteChannels: [
    { id: '1', name: 'Omni Sport 1', slug: 'omni-sport-1', category: 'Thể thao' },
    { id: '3', name: 'Omni Show', slug: 'omni-show', category: 'Giải trí' },
    { id: '5', name: 'Omni Cine', slug: 'omni-cine', category: 'Điện ảnh' },
  ],
};

const mockStaffUser: UserProfile = {
  ...mockUser,
  fullName: 'Trần Thị B',
  email: 'tran.thi.b@omnicast.tv',
  role: 'STAFF',
  bio: 'Nhân viên content tại OmniCast. Chuyên quản lý và đánh giá nội dung.',
  stats: {
    totalWatchTime: 0,
    favoriteChannels: 3,
    totalLikes: 0,
    totalComments: 0,
    programsReviewed: 156,
    aiReportsGenerated: 234,
  } as StaffStats,
};

const mockAdminUser: UserProfile = {
  ...mockUser,
  fullName: 'Admin User',
  email: 'admin@omnicast.tv',
  role: 'ADMIN',
  bio: 'Quản trị viên hệ thống OmniCast.',
};

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân',
  description: 'Quản lý thông tin và hoạt động của bạn',
};

interface ProfilePageProps {
  searchParams: { role?: string };
}

export default function ProfilePage({ searchParams }: ProfilePageProps) {
  const requestedRole = searchParams.role || 'VIEWER';
  
  let user = mockUser;
  if (requestedRole === 'STAFF') user = mockStaffUser;
  if (requestedRole === 'ADMIN') user = mockAdminUser;

  const roleColors: Record<string, { bg: string; text: string; label: string }> = {
    ADMIN: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Quản trị viên' },
    STAFF: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Nhân viên' },
    VIEWER: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Người xem' },
    GUEST: { bg: 'bg-dark-600/50', text: 'text-dark-400', label: 'Khách' },
  };

  const roleConfig = roleColors[user.role];

  return (
    <div className="min-h-[80vh]">
      {/* Profile Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-cyan flex items-center justify-center text-4xl md:text-5xl font-bold text-white">
                {user.fullName[0]}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-500 transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{user.fullName}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleConfig.bg} ${roleConfig.text}`}>
                  {roleConfig.label}
                </span>
                {user.emailVerified && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
              </div>
              <div className="flex items-center gap-4 text-dark-400 mb-4">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Tham gia {format(parseISO(user.createdAt), 'MMMM yyyy', { locale: vi })}
                </span>
              </div>
              {user.bio && (
                <p className="text-dark-300 max-w-2xl">{user.bio}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                Chỉnh sửa
              </Button>
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                Cài đặt
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            {user.role === 'VIEWER' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center glass-card">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-primary-400" />
                  <div className="text-2xl font-bold text-white">{user.stats.totalWatchTime}h</div>
                  <p className="text-sm text-dark-400">Thời gian xem</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <Tv className="w-6 h-6 mx-auto mb-2 text-accent-cyan" />
                  <div className="text-2xl font-bold text-white">{user.stats.favoriteChannels}</div>
                  <p className="text-sm text-dark-400">Kênh theo dõi</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <ThumbsUp className="w-6 h-6 mx-auto mb-2 text-accent-gold" />
                  <div className="text-2xl font-bold text-white">{user.stats.totalLikes}</div>
                  <p className="text-sm text-dark-400">Lượt thích</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <Bookmark className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                  <div className="text-2xl font-bold text-white">{user.stats.totalComments}</div>
                  <p className="text-sm text-dark-400">Bình luận</p>
                </Card>
              </div>
            )}

            {user.role === 'STAFF' && 'programsReviewed' in user.stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center glass-card">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
                  <div className="text-2xl font-bold text-white">{(user.stats as StaffStats).programsReviewed}</div>
                  <p className="text-sm text-dark-400">Đã duyệt</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <Shield className="w-6 h-6 mx-auto mb-2 text-primary-400" />
                  <div className="text-2xl font-bold text-white">{(user.stats as StaffStats).aiReportsGenerated}</div>
                  <p className="text-sm text-dark-400">AI Reports</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <Tv className="w-6 h-6 mx-auto mb-2 text-accent-cyan" />
                  <div className="text-2xl font-bold text-white">{user.stats.favoriteChannels}</div>
                  <p className="text-sm text-dark-400">Kênh quản lý</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-accent-gold" />
                  <div className="text-2xl font-bold text-white">8h</div>
                  <p className="text-sm text-dark-400">Giờ làm hôm nay</p>
                </Card>
              </div>
            )}

            {/* Recent Activity */}
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700">
                <h2 className="font-bold text-white">Hoạt động gần đây</h2>
              </div>
              <div className="divide-y divide-dark-700">
                {user.recentActivity.map((activity) => (
                  <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-dark-800/50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'watch' ? 'bg-primary-500/20 text-primary-400' :
                      activity.type === 'like' ? 'bg-accent-gold/20 text-accent-gold' :
                      activity.type === 'comment' ? 'bg-accent-cyan/20 text-accent-cyan' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {activity.type === 'watch' ? <Eye className="w-5 h-5" /> :
                       activity.type === 'like' ? <ThumbsUp className="w-5 h-5" /> :
                       activity.type === 'comment' ? <Calendar className="w-5 h-5" /> :
                       <Tv className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-white">{activity.title}</p>
                      <p className="text-sm text-dark-500 capitalize">{activity.type === 'follow' ? 'Theo dõi' : activity.type === 'watch' ? 'Đã xem' : activity.type}</p>
                    </div>
                    <span className="text-sm text-dark-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Favorite Channels */}
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                <h2 className="font-bold text-white">Kênh yêu thích</h2>
                <Link href="/channels" className="text-sm text-primary-400 hover:text-primary-300">
                  Xem tất cả
                </Link>
              </div>
              <div className="p-4 space-y-3">
                {user.favoriteChannels.map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/channels/${channel.slug}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                      <Tv className="w-5 h-5 text-dark-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{channel.name}</p>
                      <p className="text-xs text-dark-500">{channel.category}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Quick Links */}
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700">
                <h2 className="font-bold text-white">Truy cập nhanh</h2>
              </div>
              <div className="p-4 space-y-2">
                {(user.role === 'STAFF' || user.role === 'ADMIN') && (
                  <Link
                    href="/studio/curator"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-800/50 transition-colors"
                  >
                    <Shield className="w-5 h-5 text-primary-400" />
                    <span className="text-white">AI Curator Studio</span>
                    <ChevronRight className="w-4 h-4 text-dark-500 ml-auto" />
                  </Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-800/50 transition-colors"
                  >
                    <Settings className="w-5 h-5 text-accent-gold" />
                    <span className="text-white">Admin Dashboard</span>
                    <ChevronRight className="w-4 h-4 text-dark-500 ml-auto" />
                  </Link>
                )}
                <Link
                  href="/epg"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-800/50 transition-colors"
                >
                  <Calendar className="w-5 h-5 text-accent-cyan" />
                  <span className="text-white">Lịch phát sóng</span>
                  <ChevronRight className="w-4 h-4 text-dark-500 ml-auto" />
                </Link>
                <Link
                  href="/search"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-800/50 transition-colors"
                >
                  <Eye className="w-5 h-5 text-purple-400" />
                  <span className="text-white">Tìm kiếm</span>
                  <ChevronRight className="w-4 h-4 text-dark-500 ml-auto" />
                </Link>
              </div>
            </Card>

            {/* Account Status */}
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700">
                <h2 className="font-bold text-white">Tình trạng tài khoản</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-dark-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Tài khoản
                  </span>
                  <span className="text-green-400 text-sm">Hoạt động</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400 flex items-center gap-2">
                    {user.emailVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                    )}
                    Email
                  </span>
                  <span className={user.emailVerified ? 'text-green-400' : 'text-yellow-400'} text-sm>
                    {user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">Đăng nhập gần nhất</span>
                  <span className="text-dark-300 text-sm">
                    {user.lastLoginAt ? format(parseISO(user.lastLoginAt), 'dd/MM/yyyy HH:mm') : 'Chưa đăng nhập'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

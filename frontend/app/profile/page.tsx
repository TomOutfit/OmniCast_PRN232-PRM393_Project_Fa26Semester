'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Camera,
  Tv,
  Eye,
  Clock,
  ThumbsUp,
  Bookmark,
  Settings,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  X,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from '@/lib/auth-context';
import { useMe, useMyStats, useMyFollows, useUpdateMe, useChangePassword } from '@/lib/hooks/useUsers';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: user, isLoading: loadingUser } = useMe();
  const { data: stats } = useMyStats();
  const { data: follows } = useMyFollows(1, 6);
  const updateMe = useUpdateMe();
  const changePassword = useChangePassword();

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const favoriteChannels = follows?.data ?? [];

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftBio, setDraftBio] = useState('');

  useEffect(() => {
    if (user) {
      setDraftName(user.fullName ?? '');
      setDraftBio(user.bio ?? '');
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await updateMe.mutateAsync({
        fullName: draftName,
        bio: draftBio,
      });
      toast.success('Đã cập nhật hồ sơ');
      setEditing(false);
    } catch (err: any) {
      toast.error('Cập nhật thất bại', {
        description: err?.response?.data?.message || err?.message,
      });
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword,
      });
      toast.success('Đổi mật khẩu thành công', {
        description: 'Vui lòng đăng nhập lại để tiếp tục.',
      });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Force logout after password change
      setTimeout(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Đổi mật khẩu thất bại';
      setPasswordError(typeof message === 'string' ? message : 'Đổi mật khẩu thất bại');
    }
  };

  const roleColors: Record<
    string,
    { bg: string; text: string; label: string }
  > = useMemo(
    () => ({
      ADMIN: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        label: 'Quản trị viên',
      },
      STAFF: {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        label: 'Nhân viên',
      },
      VIEWER: {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        label: 'Người xem',
      },
      GUEST: { bg: 'bg-dark-600/50', text: 'text-dark-400', label: 'Khách' },
    }),
    [],
  );

  if (authLoading || loadingUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const roleConfig = roleColors[user.role] ?? roleColors.VIEWER;
  const isStaff = user.role === 'STAFF' || user.role === 'ADMIN';

  return (
    <div className="min-h-[80vh]">
      {/* Profile Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-cyan flex items-center justify-center text-4xl md:text-5xl font-bold text-white">
                {(user.fullName || user.email || 'U')[0].toUpperCase()}
              </div>
              <button
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-500 transition-colors"
                aria-label="Đổi ảnh đại diện"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 w-full">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {user.fullName}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${roleConfig.bg} ${roleConfig.text}`}
                >
                  {roleConfig.label}
                </span>
                {user.emailVerified && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
              </div>
              <div className="flex items-center gap-4 text-dark-400 mb-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </span>
                {user.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Tham gia{' '}
                    {format(parseISO(user.createdAt), 'MMMM yyyy', {
                      locale: vi,
                    })}
                  </span>
                )}
              </div>
              {user.bio && !editing && (
                <p className="text-dark-300 max-w-2xl">{user.bio}</p>
              )}
              {editing && (
                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="text-xs text-dark-400">Họ tên</label>
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="w-full mt-1 bg-dark-900/50 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-400">Giới thiệu</label>
                    <textarea
                      value={draftBio}
                      onChange={(e) => setDraftBio(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full mt-1 bg-dark-900/50 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={updateMe.isPending}
                    >
                      {updateMe.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Lưu'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        setDraftName(user.fullName ?? '');
                        setDraftBio(user.bio ?? '');
                      }}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setEditing(!editing)}
              >
                <User className="w-4 h-4" />
                {editing ? 'Đóng' : 'Chỉnh sửa'}
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
            {stats && !isStaff && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center glass-card">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-primary-400" />
                  <div className="text-2xl font-bold text-white">
                    {stats.totalWatchHours}h
                  </div>
                  <p className="text-sm text-dark-400">Thời gian xem</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <Tv className="w-6 h-6 mx-auto mb-2 text-accent-cyan" />
                  <div className="text-2xl font-bold text-white">
                    {stats.followedChannels}
                  </div>
                  <p className="text-sm text-dark-400">Kênh theo dõi</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <ThumbsUp className="w-6 h-6 mx-auto mb-2 text-accent-gold" />
                  <div className="text-2xl font-bold text-white">
                    {stats.reactionsGiven}
                  </div>
                  <p className="text-sm text-dark-400">Lượt thích</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <Bookmark className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                  <div className="text-2xl font-bold text-white">
                    {stats.commentsPosted}
                  </div>
                  <p className="text-sm text-dark-400">Bình luận</p>
                </Card>
              </div>
            )}

            {stats && isStaff && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center glass-card">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
                  <div className="text-2xl font-bold text-white">
                    {stats.programsReviewed}
                  </div>
                  <p className="text-sm text-dark-400">Chương trình quản lý</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <Shield className="w-6 h-6 mx-auto mb-2 text-primary-400" />
                  <div className="text-2xl font-bold text-white">
                    {stats.aiReportsGenerated}
                  </div>
                  <p className="text-sm text-dark-400">AI Reports</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <Tv className="w-6 h-6 mx-auto mb-2 text-accent-cyan" />
                  <div className="text-2xl font-bold text-white">
                    {stats.followedChannels}
                  </div>
                  <p className="text-sm text-dark-400">Kênh theo dõi</p>
                </Card>
                <Card className="p-4 text-center glass-card">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-accent-gold" />
                  <div className="text-2xl font-bold text-white">
                    {stats.totalWatchHours}h
                  </div>
                  <p className="text-sm text-dark-400">Thời gian xem</p>
                </Card>
              </div>
            )}

            {/* Quick Access */}
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700">
                <h2 className="font-bold text-white">Hoạt động gần đây</h2>
              </div>
              <div className="p-6 text-center text-dark-400 text-sm">
                <Eye className="w-10 h-10 mx-auto mb-3 text-dark-600" />
                <p>
                  Theo dõi các kênh và xem chương trình để thấy hoạt động của
                  bạn tại đây.
                </p>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Favorite Channels */}
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                <h2 className="font-bold text-white">Kênh đang theo dõi</h2>
                <Link
                  href="/channels"
                  className="text-sm text-primary-400 hover:text-primary-300"
                >
                  Xem tất cả
                </Link>
              </div>
              <div className="p-4 space-y-3">
                {favoriteChannels.length === 0 ? (
                  <p className="text-sm text-dark-500 text-center py-4">
                    Bạn chưa theo dõi kênh nào.
                  </p>
                ) : (
                  favoriteChannels.map((channel) => (
                    <Link
                      key={channel.id}
                      href={`/channels/${channel.slug}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800/50 transition-colors"
                    >
                      <ChannelLogo
                        slug={channel.slug}
                        logoUrl={channel.logoUrl}
                        name={channel.name}
                        category={channel.category}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {channel.name}
                        </p>
                        <p className="text-xs text-dark-500">
                          {channel.followerCount.toLocaleString()} người theo dõi
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>

            {/* Quick Links */}
            <Card className="glass-card">
              <div className="p-4 border-b border-dark-700">
                <h2 className="font-bold text-white">Truy cập nhanh</h2>
              </div>
              <div className="p-4 space-y-2">
                {isStaff && (
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
                  <span className="text-green-400 text-sm">
                    {user.isActive ? 'Hoạt động' : 'Bị khóa'}
                  </span>
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
                  <span
                    className={
                      user.emailVerified ? 'text-green-400' : 'text-yellow-400'
                    }
                    text-sm
                  >
                    {user.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">Đăng nhập gần nhất</span>
                  <span className="text-dark-300 text-sm">
                    {user.lastLoginAt
                      ? format(parseISO(user.lastLoginAt), 'dd/MM/yyyy HH:mm')
                      : 'Chưa đăng nhập'}
                  </span>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-dark-800/50 hover:bg-dark-700 text-sm text-white transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Đổi mật khẩu
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !changePassword.isPending && setShowPasswordModal(false)}
        >
          <div
            className="bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary-400" />
                Đổi mật khẩu
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-dark-400 hover:text-white"
                disabled={changePassword.isPending}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-dark-300 mb-1 block">
                  Mật khẩu hiện tại
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Nhập mật khẩu hiện tại"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-dark-300 mb-1 block">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Nhập mật khẩu mới"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                  >
                    {showNewPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-dark-300 mb-1 block">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                />
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {passwordError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                  }}
                  disabled={changePassword.isPending}
                  className="flex-1"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={
                    changePassword.isPending ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                  className="flex-1"
                >
                  {changePassword.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Đang đổi...
                    </>
                  ) : (
                    'Đổi mật khẩu'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Loader2,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useAdminUsers,
  useActivateUser,
  useDeactivateUser,
} from '@/lib/hooks/useUsers';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { UserRole } from '@/types';
import { AdminUserAnalyticsChart } from '@/components/admin/admin-user-analytics-chart';

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  STAFF: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  VIEWER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  GUEST: 'bg-dark-600/50 text-dark-400 border-dark-600',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    toast.success('Đã đăng xuất');
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      toast.error('Bạn không có quyền truy cập');
    }
  }, [authLoading, user, router]);

  const { data, isLoading } = useAdminUsers({
    page: currentPage,
    limit: itemsPerPage,
    role: selectedRole !== 'all' ? selectedRole : undefined,
  });

  const activate = useActivateUser();
  const deactivate = useDeactivateUser();

  const filteredUsers = useMemo(() => {
    const users = data?.data ?? [];
    return users.filter((u) => {
      const matchesSearch =
        !debouncedQuery ||
        u.fullName?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(debouncedQuery.toLowerCase());
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && u.isActive) ||
        (selectedStatus === 'inactive' && !u.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [data, debouncedQuery, selectedStatus]);

  const totalUsers = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivate.mutateAsync(id);
        toast.success('Đã vô hiệu hóa người dùng');
      } else {
        await activate.mutateAsync(id);
        toast.success('Đã kích hoạt người dùng');
      }
    } catch (err: any) {
      toast.error('Thao tác thất bại', {
        description: err?.response?.data?.message || err?.message,
      });
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-[80vh] relative">
      {/* 3D Cyber Ambient background glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-primary-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Page Header */}
      <div className="card-3d-surface border-b border-primary-500/20 bg-dark-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider bg-primary-500/10 text-primary-400 border border-primary-500/30">
                Security Admin
              </span>
              <span className="text-xs text-dark-400 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Directory
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Quản lý người dùng
            </h1>
            <p className="text-sm text-dark-400">
              Xem, phân quyền và kiểm soát tài khoản người dùng trên toàn hệ thống OmniCast
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-dark-700 bg-dark-800/80 hover:border-primary-500/40 text-dark-300 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Về Mission Control
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* User Growth & Demographic Analytics Telemetry */}
        <AdminUserAnalyticsChart totalUsersCount={totalUsers} />

        {/* Filters */}
        <Card className="p-5 card-3d-surface mb-6 border border-primary-500/20">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên, email..."
                className="pl-10 bg-dark-900/90 border-dark-700/80 focus:border-primary-500/60 rounded-xl text-white shadow-inner"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 bg-dark-900/90 border border-dark-700/80 focus:border-primary-500/60 rounded-xl text-white text-sm shadow-inner cursor-pointer"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
              <option value="VIEWER">Viewer</option>
              <option value="GUEST">Guest</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 bg-dark-900/90 border border-dark-700/80 focus:border-primary-500/60 rounded-xl text-white text-sm shadow-inner cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Bị khóa</option>
            </select>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="card-3d-surface overflow-hidden border border-primary-500/20">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-dark-400">
              Không tìm thấy người dùng nào phù hợp.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-950/80 border-b border-white/5">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                        Người dùng
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                        Vai trò
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                        Xác thực
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                        Đăng nhập gần nhất
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-dark-300 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-primary-500/5 transition-colors group"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                              {(user.fullName || user.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-white">
                                {user.fullName || '(Chưa có tên)'}
                              </p>
                              <p className="text-sm text-dark-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${roleColors[user.role] ?? roleColors.GUEST}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {user.isActive ? (
                            <span className="flex items-center gap-1 text-green-400 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              Hoạt động
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400 text-sm">
                              <XCircle className="w-4 h-4" />
                              Bị khóa
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {user.emailVerified ? (
                            <span className="flex items-center gap-1 text-green-400 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              Đã xác thực
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-400 text-sm">
                              <XCircle className="w-4 h-4" />
                              Chưa xác thực
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-dark-400">
                          {user.lastLoginAt
                            ? formatDate(user.lastLoginAt)
                            : 'Chưa đăng nhập'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleToggleActive(user.id, user.isActive)
                              }
                              disabled={
                                activate.isPending || deactivate.isPending
                              }
                              className={
                                user.isActive
                                  ? 'text-red-400 hover:text-red-300'
                                  : 'text-green-400 hover:text-green-300'
                              }
                            >
                              {user.isActive ? 'Khóa' : 'Mở khóa'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-white/5 flex items-center justify-between flex-wrap gap-4 bg-dark-950/40">
                <p className="text-xs text-dark-400 font-mono">
                  Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, totalUsers)} của{' '}
                  <span className="text-primary-400 font-bold">{totalUsers}</span> người dùng
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="cursor-pointer border-dark-700 bg-dark-800/80 hover:border-primary-500/40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(0, 5)
                    .map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'cyber3d' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`cursor-pointer ${currentPage === page ? 'btn-3d-cyan' : 'border-dark-700 bg-dark-800/80 hover:border-primary-500/40'}`}
                      >
                        {page}
                      </Button>
                    ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="cursor-pointer border-dark-700 bg-dark-800/80 hover:border-primary-500/40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN');
  } catch {
    return iso;
  }
}

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

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  STAFF: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  VIEWER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  GUEST: 'bg-dark-600/50 text-dark-400 border-dark-600',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
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
    <div className="min-h-[80vh]">
      {/* Page Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-white">Quản lý người dùng</h1>
          <p className="text-dark-400">
            Xem và quản lý tài khoản người dùng trên hệ thống
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="p-4 glass-card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên, email..."
                className="pl-10 bg-dark-900 border-dark-700"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white"
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
              className="px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Bị khóa</option>
            </select>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-dark-400">
              Không tìm thấy người dùng nào.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">
                        Người dùng
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">
                        Vai trò
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">
                        Xác thực
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">
                        Đăng nhập gần nhất
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-dark-800/50 transition-colors"
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
              <div className="p-4 border-t border-dark-700 flex items-center justify-between">
                <p className="text-sm text-dark-400">
                  Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, totalUsers)} của{' '}
                  {totalUsers} người dùng
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(0, 5)
                    .map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
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

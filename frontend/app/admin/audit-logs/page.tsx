'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  User,
  Tv,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuditLogs } from '@/lib/hooks/useAuditLogs';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const actionIcons: Record<string, any> = {
  USER_LOGIN: User,
  USER_REGISTER: User,
  USER_LOGIN_FAILED: User,
  USER_DEACTIVATE: User,
  USER_ACTIVATE: User,
  PERMISSION_CHANGE: Shield,
  CHANNEL_CREATE: Tv,
  CHANNEL_UPDATE: Tv,
  CHANNEL_DELETE: Tv,
  CREATE_LIVE_EVENT: Tv,
  UPDATE_LIVE_EVENT: Tv,
  DELETE_LIVE_EVENT: Tv,
  CREATE_COMMENT: Activity,
  DELETE_COMMENT: Activity,
};

const ACTION_CATEGORIES = [
  { value: 'USER', label: 'Người dùng' },
  { value: 'CHANNEL', label: 'Kênh' },
  { value: 'LIVE', label: 'Chương trình' },
  { value: 'COMMENT', label: 'Bình luận' },
];

export default function AuditLogsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      toast.error('Bạn không có quyền truy cập');
    }
  }, [authLoading, user, router]);

  const { data, isLoading } = useAuditLogs({
    page: currentPage,
    limit: itemsPerPage,
    action: selectedAction !== 'all' ? selectedAction : undefined,
  });

  const logs = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  // For simple search filter (client-side since server doesn't support free text)
  const filteredLogs = logs.filter((log) => {
    if (!debouncedQuery) return true;
    const q = debouncedQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.userEmail || '').toLowerCase().includes(q) ||
      JSON.stringify(log.newValues || {}).toLowerCase().includes(q) ||
      JSON.stringify(log.oldValues || {}).toLowerCase().includes(q)
    );
  });

  // Stats (based on current page only for simplicity, real impl would need separate endpoint)
  const successCount = logs.filter((l) =>
    [
      'USER_LOGIN',
      'CHANNEL_CREATE',
      'CREATE_LIVE_EVENT',
      'UPDATE_LIVE_EVENT',
      'CREATE_COMMENT',
    ].includes(l.action),
  ).length;
  const warningCount = logs.filter((l) =>
    ['CONTENT_FLAG', 'USER_DEACTIVATE'].includes(l.action),
  ).length;
  const errorCount = logs.filter((l) =>
    ['USER_LOGIN_FAILED', 'CHANNEL_DELETE', 'DELETE_LIVE_EVENT'].includes(l.action),
  ).length;

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
          <h1 className="text-2xl font-bold text-white">Nhật ký hoạt động</h1>
          <p className="text-dark-400">
            Theo dõi tất cả hoạt động trên hệ thống
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{successCount}</p>
                <p className="text-sm text-dark-400">Thành công (trang này)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{warningCount}</p>
                <p className="text-sm text-dark-400">Cảnh báo (trang này)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{errorCount}</p>
                <p className="text-sm text-dark-400">Lỗi (trang này)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{total}</p>
                <p className="text-sm text-dark-400">Tổng hoạt động</p>
              </div>
            </div>
          </Card>
        </div>

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
                placeholder="Tìm kiếm..."
                className="pl-10 bg-dark-900 border-dark-700"
              />
            </div>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white"
            >
              <option value="all">Tất cả hành động</option>
              {ACTION_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-dark-400">
              Không tìm thấy bản ghi nào.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">
                        Thời gian
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">
                        Hành động
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">
                        Người dùng
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">
                        Chi tiết
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {filteredLogs.map((log) => {
                      const Icon = actionIcons[log.action] || Activity;
                      const status =
                        log.action === 'USER_LOGIN_FAILED' ||
                        log.action === 'CHANNEL_DELETE' ||
                        log.action === 'DELETE_LIVE_EVENT'
                          ? 'error'
                          : log.action === 'CONTENT_FLAG' ||
                              log.action === 'USER_DEACTIVATE'
                            ? 'warning'
                            : 'success';
                      const statusColors: Record<string, string> = {
                        success: 'bg-green-500/20 text-green-400',
                        warning: 'bg-yellow-500/20 text-yellow-400',
                        error: 'bg-red-500/20 text-red-400',
                      };
                      const statusLabels: Record<string, string> = {
                        success: 'Thành công',
                        warning: 'Cảnh báo',
                        error: 'Lỗi',
                      };

                      const resource = log.entityType
                        ? `${log.entityType}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}`
                        : '-';

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-dark-800/50 transition-colors"
                        >
                          <td className="px-4 py-4 text-sm text-dark-400 whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${statusColors[status]}`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {log.action.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-dark-500">
                                  {resource}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-white">
                              {log.userEmail || 'Hệ thống'}
                            </p>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-dark-600/50 text-dark-300">
                              {log.userId ? 'Người dùng' : 'System'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-dark-400 max-w-md truncate">
                            {summarizeChanges(log.newValues) ||
                              summarizeChanges(log.oldValues) ||
                              '-'}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}
                            >
                              {statusLabels[status]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-dark-700 flex items-center justify-between">
                <p className="text-sm text-dark-400">
                  Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, total)} của {total} bản
                  ghi
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

function summarizeChanges(values: unknown): string {
  if (!values || typeof values !== 'object') return '';
  try {
    const obj = values as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return '';
    return keys
      .slice(0, 3)
      .map((k) => {
        const v = obj[k];
        if (typeof v === 'string') return `${k}: ${v.slice(0, 30)}`;
        return `${k}: ${JSON.stringify(v).slice(0, 30)}`;
      })
      .join(' • ');
  } catch {
    return '';
  }
}

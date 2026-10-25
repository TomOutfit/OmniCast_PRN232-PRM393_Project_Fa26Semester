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
  Download,
  FileSpreadsheet,
  FileJson,
  FileText,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuditLogs } from '@/lib/hooks/useAuditLogs';
import { fetchAuditLogsForExport } from '@/lib/api/audit-logs';
import {
  exportAuditLogsToExcel,
  exportAuditLogsToJson,
  exportAuditLogsToPdf,
} from '@/lib/utils/audit-export';
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
  const { user, isLoading: authLoading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    toast.success('Đã đăng xuất');
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const itemsPerPage = 15;

  const handleExport = async (format: 'excel' | 'json' | 'pdf') => {
    try {
      setIsExporting(true);
      const label = format === 'excel' ? 'Excel (.xlsx)' : format === 'pdf' ? 'PDF' : 'JSON';
      toast.info(`Đang tạo tệp ${label}...`);

      const exportData = await fetchAuditLogsForExport({
        action: selectedAction !== 'all' ? selectedAction : undefined,
        limit: 5000,
      });

      if (!exportData || exportData.length === 0) {
        toast.warning('Không có bản ghi nào để xuất');
        return;
      }

      const meta = {
        adminEmail: user?.email,
        totalRecords: exportData.length,
        selectedAction: selectedAction !== 'all' ? selectedAction : 'Tất cả',
      };

      if (format === 'excel') {
        exportAuditLogsToExcel(exportData, meta);
        toast.success(`Đã xuất ${exportData.length} bản ghi sang file Excel (.xlsx) thành công!`);
      } else if (format === 'json') {
        exportAuditLogsToJson(exportData, meta);
        toast.success(`Đã xuất ${exportData.length} bản ghi sang file JSON thành công!`);
      } else if (format === 'pdf') {
        exportAuditLogsToPdf(exportData, meta);
        toast.success(`Đã xuất báo cáo PDF chuẩn kiểm toán an toàn thành công!`);
      }
    } catch (err: any) {
      toast.error('Lỗi khi xuất tệp: ' + (err.message || 'Vui lòng thử lại'));
    } finally {
      setIsExporting(false);
    }
  };

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

  // Determine severity status dynamically from action name
  const getLogStatus = (action: string): 'error' | 'warning' | 'success' => {
    const upper = (action || '').toUpperCase();
    if (
      upper.includes('FAIL') ||
      upper.includes('ERROR') ||
      upper.includes('BLOCKED') ||
      upper.includes('DENIED') ||
      upper.includes('REJECT')
    ) {
      return 'error';
    }
    if (
      upper.includes('WARN') ||
      upper.includes('FLAG') ||
      upper.includes('SKIP') ||
      upper.includes('DELETE') ||
      upper.includes('DEACTIVATE') ||
      upper.includes('CANCEL') ||
      upper.includes('STOP')
    ) {
      return 'warning';
    }
    return 'success';
  };

  // Stats dynamically computed from currently loaded logs
  const successCount = logs.filter((l) => getLogStatus(l.action) === 'success').length;
  const warningCount = logs.filter((l) => getLogStatus(l.action) === 'warning').length;
  const errorCount = logs.filter((l) => getLogStatus(l.action) === 'error').length;

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
      {/* 3D Ambient telemetry glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none -z-10" />

      {/* Page Header */}
      <div className="card-3d-surface border-b border-primary-500/20 bg-dark-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Security Audit Engine
              </span>
              <span className="text-xs text-dark-400 flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                gRPC Stream Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              Nhật ký kiểm toán & Hoạt động
            </h1>
            <p className="text-sm text-dark-400">
              Theo dõi tất cả hành vi hệ thống và xuất báo cáo kiểm toán bảo mật (gRPC Audit Protocol)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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

            {/* Xuất Excel */}
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={() => handleExport('excel')}
              className="gap-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
              title="Xuất bảng tính Excel (.xlsx) chuẩn định dạng"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>Xuất Excel</span>
            </Button>

            {/* Xuất JSON */}
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={() => handleExport('json')}
              className="gap-2 border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
              title="Xuất dữ liệu có cấu trúc JSON"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileJson className="w-4 h-4" />
              )}
              <span>Xuất JSON</span>
            </Button>

            {/* Xuất PDF */}
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={() => handleExport('pdf')}
              className="gap-2 border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all"
              title="Xuất báo cáo PDF chuẩn kiểm toán bảo mật"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Xuất PDF</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer ml-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 card-3d-surface border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono">{successCount}</p>
                <p className="text-xs text-dark-400">Thành công (trang này)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 card-3d-surface border border-amber-500/20 hover:border-amber-500/40 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono">{warningCount}</p>
                <p className="text-xs text-dark-400">Cảnh báo (trang này)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 card-3d-surface border border-rose-500/20 hover:border-rose-500/40 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <Activity className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono">{errorCount}</p>
                <p className="text-xs text-dark-400">Lỗi (trang này)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 card-3d-surface border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white font-mono">{total}</p>
                <p className="text-xs text-dark-400">Tổng hoạt động</p>
              </div>
            </div>
          </Card>
        </div>

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
                placeholder="Tìm kiếm theo hành động, email, thông số..."
                className="pl-10 bg-dark-900/90 border-dark-700/80 focus:border-primary-500/60 rounded-xl text-white shadow-inner"
              />
            </div>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 bg-dark-900/90 border border-dark-700/80 focus:border-primary-500/60 rounded-xl text-white text-sm shadow-inner cursor-pointer"
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
        <Card className="card-3d-surface overflow-hidden border border-primary-500/20">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-dark-400">
              Không tìm thấy bản ghi nào.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-950/80 border-b border-white/5">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                        Thời gian
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                        Hành động
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                        Người dùng
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                        Chi tiết
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredLogs.map((log) => {
                      const Icon = actionIcons[log.action] || Activity;
                      const status = getLogStatus(log.action);
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
              <div className="p-4 border-t border-white/5 flex items-center justify-between flex-wrap gap-4 bg-dark-950/40">
                <p className="text-xs text-dark-400 font-mono">
                  Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, total)} của{' '}
                  <span className="text-cyan-400 font-bold">{total}</span> bản ghi
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="cursor-pointer border-dark-700 bg-dark-800/80 hover:border-cyan-500/40"
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
                        className={`cursor-pointer ${currentPage === page ? 'btn-3d-cyan' : 'border-dark-700 bg-dark-800/80 hover:border-cyan-500/40'}`}
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
                    className="cursor-pointer border-dark-700 bg-dark-800/80 hover:border-cyan-500/40"
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

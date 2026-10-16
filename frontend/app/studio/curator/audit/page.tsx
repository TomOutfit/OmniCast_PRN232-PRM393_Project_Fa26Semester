'use client';

// ============================================================
// OmniCast - AI Curator · Audit Log Viewer
// ============================================================
//
// Filters the global audit log to entries related to AI Curator
// reports — either by `entityType = AiCuratorReport` or by action
// names matching `AI_CURATION_*`. Lets a curator answer "who ran
// the model on this program, and what did they change?" without
// wading through every login event in the system.
// ============================================================

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Filter as FilterIcon,
  Loader2,
  Lock,
  ShieldCheck,
  User as UserIcon,
  ArrowLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { canViewAuditLogs } from '@/lib/guards/permissions';
import { useAuditLogs } from '@/lib/hooks/useAuditLogs';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const PAGE_SIZE = 20;

/** Action prefixes the backend emits for curator mutations. */
const AI_CURATION_ACTION_PREFIX = 'AI_CURATION_';
const ENTITY_TYPE = 'AiCuratorReport';

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả hành động' },
  { value: `${AI_CURATION_ACTION_PREFIX}CREATE`, label: 'Tạo báo cáo' },
  { value: `${AI_CURATION_ACTION_PREFIX}UPDATE`, label: 'Cập nhật báo cáo' },
  { value: `${AI_CURATION_ACTION_PREFIX}APPLY`, label: 'Áp dụng đề xuất' },
  { value: `${AI_CURATION_ACTION_PREFIX}DELETE`, label: 'Xoá báo cáo' },
];

interface AuditFilters {
  action: string;
  userId: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  page: number;
}

export default function CuratorAuditPage() {
  const { user } = useAuth();
  const canView = canViewAuditLogs(user);

  const [filters, setFilters] = useState<AuditFilters>({
    action: '',
    userId: '',
    fromDate: '',
    toDate: '',
    page: 1,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Convert YYYY-MM-DD inputs to ISO timestamps so the backend can
  // do its own range queries. Empty inputs pass through unchanged.
  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = {
      page: filters.page,
      limit: PAGE_SIZE,
      entityType: ENTITY_TYPE,
    };
    if (filters.action) params.action = filters.action;
    if (filters.userId.trim()) params.userId = filters.userId.trim();
    if (filters.fromDate) {
      params.fromDate = `${filters.fromDate}T00:00:00.000Z`;
    }
    if (filters.toDate) {
      params.toDate = `${filters.toDate}T23:59:59.999Z`;
    }
    return params;
  }, [filters]);

  const auditQuery = useAuditLogs(apiParams, { enabled: canView });
  const entries = useMemo(
    () => auditQuery.data?.data ?? [],
    [auditQuery.data],
  );
  const meta = auditQuery.data?.meta;
  const isLoading = auditQuery.isLoading || auditQuery.isFetching;

  // Build the on-screen list — the audit endpoint already filters
  // by `entityType = AiCuratorReport`, but we also keep rows whose
  // `action` starts with `AI_CURATION_` in case the backend ever
  // stops tagging the entity type.
  const filteredEntries = useMemo(() => {
    return entries.filter(
      (e) =>
        e.entityType === ENTITY_TYPE ||
        (e.action ?? '').startsWith(AI_CURATION_ACTION_PREFIX),
    );
  }, [entries]);

  const totalPages = meta?.totalPages ?? 1;

  if (!canView) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="p-10 glass-card text-center max-w-md">
          <Lock className="w-12 h-12 mx-auto mb-4 text-dark-500" />
          <h1 className="text-xl font-bold text-white mb-2">
            Không có quyền truy cập
          </h1>
          <p className="text-dark-400 text-sm">
            Audit log chỉ dành cho Biên tập viên (Staff) và Quản trị viên (Admin).
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Audit log · AI Curator
                </h1>
                <p className="text-dark-400">
                  Theo dõi mọi thao tác trên báo cáo AI Curator.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/studio/curator"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white border border-dark-700 hover:border-dark-500 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại Studio
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        {/* Filter bar */}
        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3 text-dark-300">
            <FilterIcon className="w-4 h-4" />
            <h2 className="text-sm font-bold">Bộ lọc</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-dark-500 font-mono mb-1 block">
                Hành động
              </label>
              <select
                value={filters.action}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    action: e.target.value,
                    page: 1,
                  }))
                }
                className="h-9 w-full rounded-lg border border-dark-600 bg-dark-800 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-dark-500 font-mono mb-1 block">
                User ID
              </label>
              <Input
                size="sm"
                placeholder="UUID…"
                value={filters.userId}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    userId: e.target.value,
                    page: 1,
                  }))
                }
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-dark-500 font-mono mb-1 block">
                Từ ngày
              </label>
              <Input
                size="sm"
                type="date"
                value={filters.fromDate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    fromDate: e.target.value,
                    page: 1,
                  }))
                }
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-dark-500 font-mono mb-1 block">
                Đến ngày
              </label>
              <Input
                size="sm"
                type="date"
                value={filters.toDate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    toDate: e.target.value,
                    page: 1,
                  }))
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  setFilters({
                    action: '',
                    userId: '',
                    fromDate: '',
                    toDate: '',
                    page: 1,
                  })
                }
              >
                Đặt lại
              </Button>
            </div>
          </div>
        </Card>

        {/* List */}
        <Card className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          ) : auditQuery.isError ? (
            <div className="p-10 text-center text-red-300 text-sm">
              Không thể tải audit log. Vui lòng thử lại.
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-10 text-center">
              <ShieldCheck className="w-10 h-10 mx-auto text-dark-600 mb-3" />
              <p className="text-dark-400 text-sm">
                Chưa có bản ghi audit nào khớp với bộ lọc hiện tại.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-dark-700">
              {filteredEntries.map((entry) => {
                const isOpen = !!expanded[entry.id];
                return (
                  <li key={entry.id} className="p-4">
                    <button
                      type="button"
                      className="w-full text-left flex items-start justify-between gap-3"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [entry.id]: !prev[entry.id],
                        }))
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/40 border border-amber-500/40 text-amber-200">
                            {entry.action}
                          </span>
                          {entry.entityType && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-dark-700 text-dark-300">
                              {entry.entityType}
                            </span>
                          )}
                          {entry.entityId && (
                            <span className="text-[10px] text-dark-500 font-mono">
                              #{entry.entityId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {entry.userEmail ?? entry.userId ?? 'system'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(
                              parseISO(entry.createdAt),
                              'dd/MM/yyyy HH:mm:ss',
                            )}
                          </span>
                          {entry.ipAddress && (
                            <span className="font-mono">
                              IP: {entry.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-dark-500">
                        {isOpen ? 'Ẩn diff' : 'Xem diff'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <DiffPanel
                          title="Old values"
                          data={entry.oldValues ?? null}
                        />
                        <DiffPanel
                          title="New values"
                          data={entry.newValues ?? null}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination */}
          {!isLoading && filteredEntries.length > 0 && totalPages > 1 && (
            <div className="p-3 border-t border-dark-700 flex items-center justify-between text-xs text-dark-400">
              <span>
                Trang {filters.page}/{totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFilters((p) => ({ ...p, page: 1 }))}
                  disabled={filters.page === 1}
                  aria-label="Trang đầu"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setFilters((p) => ({
                      ...p,
                      page: Math.max(1, p.page - 1),
                    }))
                  }
                  disabled={filters.page === 1}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 font-mono">{filters.page}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setFilters((p) => ({
                      ...p,
                      page: Math.min(totalPages, p.page + 1),
                    }))
                  }
                  disabled={filters.page === totalPages}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setFilters((p) => ({ ...p, page: totalPages }))
                  }
                  disabled={filters.page === totalPages}
                  aria-label="Trang cuối"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DiffPanel({
  title,
  data,
}: {
  title: string;
  data: unknown;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dark-700 bg-dark-900/50 p-3',
      )}
    >
      <h4 className="text-[10px] uppercase tracking-widest text-dark-500 font-mono mb-2">
        {title}
      </h4>
      <pre className="text-[11px] text-dark-200 whitespace-pre-wrap break-all font-mono">
        {data === null || data === undefined
          ? '∅ (không có)'
          : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
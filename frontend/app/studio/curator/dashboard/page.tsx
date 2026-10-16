'use client';

// ============================================================
// OmniCast - AI Curator Dashboard
// ============================================================
//
// Aggregate stats for the AI Curator. Shows four KPI cards, a
// hand-rolled donut chart of broadcastSuitability counts, a CSS
// bar chart of the last 7 days' report volume, and a top-flagged
// content table.
//
// We deliberately avoid pulling in chart libraries (Chart.js,
// recharts) — the page is read-only and the volumes are small
// enough that pure SVG / CSS bars are clearer and lighter.
// ============================================================

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  Clock,
  Database,
  Flag,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { canRunAiCurator } from '@/lib/guards/permissions';
import {
  useAiCuratorStats,
} from '@/lib/hooks/useAiCuratorStats';
import type { AiCuratorStatsPeriod, AiCuratorStats } from '@/lib/api/ai-curator';
import { cn } from '@/lib/utils';
import { logError } from '@/lib/utils/safe-log';
import { parseApiError } from '@/lib/errors/api-error';

const PERIODS: Array<{
  value: AiCuratorStatsPeriod;
  label: string;
}> = [
  { value: 'day', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
];

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

const DONUT_SLICES: DonutSlice[] = [
  { label: 'Giờ vàng', value: 0, color: '#facc15' }, // accent-gold
  { label: 'Phát thường', value: 0, color: '#60a5fa' }, // primary-400
  { label: 'Hạn chế', value: 0, color: '#f87171' }, // red-400
];

export default function CuratorDashboardPage() {
  const { user } = useAuth();
  const canView = canRunAiCurator(user);
  const [period, setPeriod] = useState<AiCuratorStatsPeriod>('week');

  const statsQuery = useAiCuratorStats(period, { enabled: canView });
  const stats = statsQuery.data;
  const isLoading = statsQuery.isLoading || statsQuery.isFetching;
  const isError = statsQuery.isError;
  const apiError = isError ? parseApiError(statsQuery.error) : null;

  // Build the donut data on render so empty slices collapse cleanly.
  const donutSlices = useMemo<DonutSlice[]>(() => {
    const bs = stats?.broadcastSuitability ?? {};
    return DONUT_SLICES.map((s) => {
      const key = s.label === 'Giờ vàng'
        ? 'PRIME_TIME'
        : s.label === 'Phát thường'
        ? 'STANDARD'
        : 'RESTRICTED';
      return { ...s, value: bs[key as 'PRIME_TIME' | 'STANDARD' | 'RESTRICTED'] ?? 0 };
    });
  }, [stats]);

  const donutTotal = donutSlices.reduce((acc, s) => acc + s.value, 0);
  const last7 = stats?.last7Days ?? [];
  const last7Max = last7.reduce((acc, m) => Math.max(acc, m.count), 0) || 1;
  const topFlagged = stats?.topFlaggedContent ?? [];

  // ─── Access guard ────────────────────────────────────────────────
  if (!canView) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="p-10 glass-card text-center max-w-md">
          <Lock className="w-12 h-12 mx-auto mb-4 text-dark-500" />
          <h1 className="text-xl font-bold text-white mb-2">
            Không có quyền truy cập
          </h1>
          <p className="text-dark-400 text-sm">
            Trang này chỉ dành cho Biên tập viên (Staff) và Quản trị viên (Admin).
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Thống kê AI Curator
                </h1>
                <p className="text-dark-400">
                  Tổng quan hoạt động pipeline trong{' '}
                  {PERIODS.find((p) => p.value === period)?.label.toLowerCase()}
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
              <Link
                href="/studio/curator/audit"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-amber-300 border border-amber-500/40 hover:bg-amber-500/10 transition-colors"
              >
                <Flag className="w-4 h-4" />
                Audit log
              </Link>
              <Button
                className="gap-2"
                size="sm"
                onClick={() => statsQuery.refetch()}
                disabled={statsQuery.isFetching}
              >
                <RefreshCw
                  className={cn(
                    'w-4 h-4',
                    statsQuery.isFetching && 'animate-spin',
                  )}
                />
                Làm mới
              </Button>
            </div>
          </div>

          {/* Period selector */}
          <div className="mt-6 flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-dark-500 font-mono mr-2">
              Khoảng thời gian
            </span>
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                  period === p.value
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-dark-800 border-dark-700 text-dark-300 hover:text-white hover:border-dark-500',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {isLoading && !stats ? (
          <SkeletonDashboard />
        ) : isError ? (
          <ErrorState
            message={apiError?.message ?? 'Không thể tải thống kê'}
            onRetry={() => {
              logError('[ai-curator] stats failed', apiError);
              statsQuery.refetch();
            }}
          />
        ) : !stats || (
            (stats.totalReports ?? 0) === 0 &&
            !stats.last7Days?.length &&
            !stats.broadcastSuitability
          ) ? (
          <EmptyState period={period} />
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Tổng báo cáo"
                value={stats?.totalReports ?? 0}
                icon={<Activity size={18} />}
                tone="emerald"
              />
              <KpiCard
                label="Avg engagement"
                value={`${Math.round(stats?.avgEngagement ?? 0)}%`}
                icon={<TrendingUp size={18} />}
                tone="primary"
              />
              <KpiCard
                label="Avg processing"
                value={`${Math.round(stats?.avgProcessingTimeMs ?? 0)}ms`}
                icon={<Clock size={18} />}
                tone="amber"
              />
              <KpiCard
                label="Cache hit rate"
                value={`${Math.round((stats?.cacheHitRate ?? 0) * 100)}%`}
                icon={<Database size={18} />}
                tone="cyan"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Donut chart */}
              <Card className="glass-card p-5 lg:col-span-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-accent-gold" />
                  Phân bổ suitability
                </h3>
                <Donut slices={donutSlices} total={donutTotal} />
              </Card>

              {/* Bar chart */}
              <Card className="glass-card p-5 lg:col-span-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-primary-400" />
                  Báo cáo 7 ngày qua
                </h3>
                {last7.length === 0 ? (
                  <p className="text-dark-500 text-sm">Chưa có dữ liệu.</p>
                ) : (
                  <div className="flex items-end gap-3 h-48">
                    {last7.map((d) => (
                      <div
                        key={d.date}
                        className="flex-1 flex flex-col items-center justify-end gap-2 min-w-0"
                      >
                        <div className="text-xs font-mono text-white">
                          {d.count}
                        </div>
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-400 transition-all"
                          style={{
                            height: `${Math.max(
                              4,
                              (d.count / last7Max) * 160,
                            )}px`,
                          }}
                          title={`${d.date}: ${d.count} báo cáo`}
                        />
                        <div className="text-[10px] text-dark-500 font-mono">
                          {d.date.slice(5)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Top flagged table */}
            <Card className="glass-card p-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Flag className="w-4 h-4 text-red-400" />
                Top 5 nội dung bị flag
              </h3>
              {topFlagged.length === 0 ? (
                <p className="text-dark-500 text-sm">Không có nội dung bị flag.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-widest text-dark-500 border-b border-dark-700">
                        <th className="text-left py-2 pr-4 font-mono">#</th>
                        <th className="text-left py-2 pr-4 font-mono">
                          Nhãn
                        </th>
                        <th className="text-right py-2 font-mono">Số lần</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topFlagged.slice(0, 5).map((row, i) => (
                        <tr
                          key={`${row.label}-${i}`}
                          className="border-b border-dark-700/70 last:border-b-0"
                        >
                          <td className="py-2 pr-4 text-dark-400 font-mono">
                            {i + 1}
                          </td>
                          <td className="py-2 pr-4 text-white">
                            {row.label}
                          </td>
                          <td className="py-2 text-right text-amber-300 font-bold">
                            {row.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Subcomponents
// ============================================================

const toneClasses = {
  emerald: {
    ring: 'border-emerald-500/40',
    icon: 'text-emerald-300',
    value: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
  },
  primary: {
    ring: 'border-primary-500/40',
    icon: 'text-primary-300',
    value: 'text-primary-300',
    bg: 'bg-primary-500/10',
  },
  amber: {
    ring: 'border-amber-500/40',
    icon: 'text-amber-300',
    value: 'text-amber-300',
    bg: 'bg-amber-500/10',
  },
  cyan: {
    ring: 'border-cyan-500/40',
    icon: 'text-cyan-300',
    value: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
  },
} as const;

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: keyof typeof toneClasses;
}) {
  const t = toneClasses[tone];
  return (
    <Card className={cn('glass-card p-4 border', t.ring)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-dark-400 font-mono uppercase tracking-widest">
            {label}
          </p>
          <p className={cn('text-2xl font-bold mt-1', t.value)}>{value}</p>
        </div>
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center',
            t.bg,
            t.icon,
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

/**
 * Pure-SVG donut chart for `broadcastSuitability` counts. We avoid
 * pulling in chart libraries because the data set is tiny (3
 * slices). Empty state shows a faint full circle.
 */
function Donut({ slices, total }: { slices: DonutSlice[]; total: number }) {
  const radius = 60;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <svg width="160" height="160" viewBox="0 0 160 160" aria-label="empty">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#1f2937"
            strokeWidth={stroke}
          />
        </svg>
        <p className="text-dark-500 text-sm">Chưa có báo cáo nào.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="160" height="160" viewBox="0 0 160 160" aria-label="donut">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="transparent"
          stroke="#1f2937"
          strokeWidth={stroke}
        />
        {slices.map((slice, idx) => {
          if (slice.value === 0) return null;
          const fraction = slice.value / total;
          const length = fraction * circumference;
          const dashArray = `${length} ${circumference - length}`;
          const dashOffset = -offsetAcc;
          offsetAcc += length;
          return (
            <circle
              key={idx}
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={stroke}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 80 80)"
            />
          );
        })}
        <text
          x="80"
          y="86"
          textAnchor="middle"
          fill="#fff"
          fontSize="20"
          fontWeight="700"
        >
          {total}
        </text>
      </svg>
      <ul className="w-full text-xs space-y-1.5">
        {slices.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between text-dark-300"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
            <span className="font-mono">
              {s.value} ({total ? Math.round((s.value / total) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-24 rounded-xl bg-dark-800/60 border border-dark-700"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-72 rounded-xl bg-dark-800/60 border border-dark-700" />
        <Skeleton className="h-72 rounded-xl bg-dark-800/60 border border-dark-700 lg:col-span-2" />
      </div>
      <Skeleton className="h-48 rounded-xl bg-dark-800/60 border border-dark-700" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="glass-card p-10 text-center">
      <p className="text-red-300 mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Thử lại
      </Button>
    </Card>
  );
}

function EmptyState({ period }: { period: AiCuratorStatsPeriod }) {
  return (
    <Card className="glass-card p-10 text-center">
      <Sparkles className="w-10 h-10 mx-auto text-dark-600 mb-3" />
      <p className="text-dark-300">
        Chưa có báo cáo nào trong{' '}
        {PERIODS.find((p) => p.value === period)?.label.toLowerCase()}.
      </p>
      <p className="text-dark-500 text-xs mt-1">
        Hãy quay lại Studio và chạy AI cho các chương trình đang lên sóng.
      </p>
      <div className="mt-4">
        <Link
          href="/studio/curator"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Đi tới Studio
        </Link>
      </div>
    </Card>
  );
}
'use client';

// ============================================================
// OmniCast - AI Curator Studio (Staff / Admin)
// ============================================================
//
// Three flows are wired to the backend `ai-curator` controller:
//
//   1. PREVIEW     — POST /ai-curator/analyze        (no DB write)
//   2. CURATE      — POST /ai-curator/curate         (persists a report)
//   3. APPLY       — POST /ai-curator/apply/:id      (pushes fields back)
//
// Plus history (GET /ai-curator/history/:id) so the curator can
// audit previous model runs without rerunning the pipeline.
//
// On entry the curator sees the upcoming SCHEDULED programs. Clicking
// a row loads its detail in the right panel. From there the curator
// can:
//   • Run "Phân tích" (preview / cached-curate)
//   • "Lưu báo cáo" to persist the latest analysis (forces a new
//     pipeline run by setting `forceRefresh: true`)
//   • "Áp dụng" to push selected suggestions back to the program
//   • Toggle history to view previous reports
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  FileText,
  Clock,
  Calendar,
  Loader2,
  Lock,
  Radio,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CompactUserMenu } from '@/components/layout/compact-user-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useLiveEvents, useLiveEventById } from '@/lib/hooks/usePrograms';
import { triggerIngestAll, triggerIngestYoutubeRss } from '@/lib/api/ingest';
import {
  useAnalyzeContent,
  useCurateProgram,
  useApplyCuration,
  useCurationHistory,
} from '@/lib/hooks/useAiCurator';
import {
  aiCuratorRequestSchema,
  type AiCuratorRequestInput,
} from '@/lib/validators/ai-curator';
import { STATUS_META, STATUS_LIST } from '@/lib/constants/statuses';
import { LIMITS } from '@/lib/constants/limits';
import { canRunAiCurator } from '@/lib/guards/permissions';
import { parseApiError } from '@/lib/errors/api-error';
import { logWarn, logError } from '@/lib/utils/safe-log';
import {
  toReportShape,
  resolveReportPanelState,
} from '@/lib/utils/curator-helpers';
import {
  filterCuratorRows,
  paginateRows,
  totalPages,
  type CuratorRowShape,
  type CuratorStatusFilter,
} from '@/lib/utils/curator-filters';
import type { AiCuratorReport, LiveEvent } from '@/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/i18n-provider';

import { ReportDetail } from '@/components/curator/report-detail';
import { CurateActions } from '@/components/curator/curate-actions';
import { ApplyCurationPanel } from '@/components/curator/apply-curation-panel';
import { HistorySection } from '@/components/curator/history-section';
import { ProgramContentCard } from '@/components/curator/program-content-card';

type CuratorStatus = LiveEvent['status'] | 'NEEDS_REVIEW';

interface CuratorRow extends CuratorRowShape {}

const PAGE_SIZE = 25;
const DEFAULT_LIVE_EVENTS_LIMIT = 100;

function deriveStatus(row: LiveEvent): CuratorStatus {
  if (row.status === 'SCHEDULED') return 'SCHEDULED';
  if (row.status === 'LIVE') return 'LIVE';
  if (row.status === 'ENDED') return 'ENDED';
  if (row.status === 'CANCELLED') return 'CANCELLED';
  if (row.status === 'ON_DEMAND') return 'ON_DEMAND';
  return 'NEEDS_REVIEW';
}

export default function CuratorStudioPage() {
  const { user } = useAuth();
  const canCurate = canRunAiCurator(user);
  const { t } = useI18n();

  // Live events awaiting curation — pulls all programs up to the present moment (LIVE, SCHEDULED, ENDED) sorted newest first
  const { data, isFetching, refetch } = useLiveEvents(
    { limit: DEFAULT_LIVE_EVENTS_LIMIT, sortOrder: 'desc' },
    { enabled: canCurate },
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedQuery = useLiveEventById(selectedId ?? undefined, {
    enabled: !!selectedId && canCurate,
  });

  /**
   * `reportById` is keyed by `programId` and stores the report the UI
   * currently shows for that program (preview OR persisted). We
   * persist reports server-side via `useCurateProgram`, then memoise
   * the latest result locally so the panel updates instantly.
   */
  const [reportById, setReportById] = useState<Record<string, AiCuratorReport>>(
    {},
  );

  /** Track which reports are persisted (vs transient previews). */
  const [persistedById, setPersistedById] = useState<Record<string, boolean>>(
    {},
  );

  /**
   * Track which program is currently being analyzed (preview mode).
   * Replaces the previous fragile discriminator that compared
   * `analyzeMutation.variables?.title === program.title` — two
   * programs can share a title, and preview requests only carry
   * `title`, not `programId`. Using the programId from the row
   * itself makes the per-row "analyzing" indicator reliable.
   */
  const [analyzingProgramId, setAnalyzingProgramId] = useState<string | null>(
    null,
  );

  /**
   * Ref to the right-hand report panel. We scroll it into view once a
   * report arrives so the curator doesn't have to hunt for it — the
   * layout is a 2-column grid on desktop and stacked on mobile, so
   * the panel may be off-screen either way.
   */
  const reportPanelRef = useRef<HTMLDivElement | null>(null);

  /**
   * Scroll the report panel into view when a fresh report shows up.
   * We key on the selected program id + whether a report exists so
   * the effect only fires on transitions, not on every re-render.
   */
  useEffect(() => {
    if (!selectedId) return;
    if (!reportById[selectedId]) return;
    const el = reportPanelRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId, reportById]);

  // ─── Search / filter / pagination state ─────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CuratorStatusFilter>('all');
  const [page, setPage] = useState(1);

  const rows: CuratorRow[] = useMemo(() => {
    return (data?.data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description ?? '',
      // `LiveEvent.channel` is a partial sub-object; `category` is
      // present on the list/detail payloads but may be missing for
      // channels created before the field existed — fall back to a
      // generic label instead of a hard-coded 'Chương trình' so the
      // AI prompt always sees the real genre.
      category: e.channel?.category ?? 'Chương trình',
      channelName: e.channel?.name ?? '—',
      scheduledAt: e.scheduledAt,
      status: deriveStatus(e),
      aiReport: reportById[e.id],
      thumbnailUrl: e.thumbnailUrl,
      externalUrl: e.externalUrl,
      streamUrl: e.streamUrl,
      tags: e.tags,
      duration: e.duration,
      language: e.language,
    }));
  }, [data?.data, reportById]);

  const filteredRows = useMemo(
    () => filterCuratorRows(rows, searchQuery, statusFilter),
    [rows, searchQuery, statusFilter],
  );

  // Reset to page 1 whenever the search query changes — typing
  // shouldn't strand the curator on an empty page 4.
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Reset to page 1 when a status filter removes all rows.
  useEffect(() => {
    if (filteredRows.length === 0) setPage(1);
  }, [filteredRows.length]);

  const totalFilteredPages = totalPages(filteredRows, PAGE_SIZE);
  const paginatedRows = useMemo(
    () => paginateRows(filteredRows, page, PAGE_SIZE),
    [filteredRows, page],
  );

  const selectedEvent = selectedQuery.data ?? null;

  const selectedRow = useMemo(() => {
    const base = rows.find((r) => r.id === selectedId) ?? null;
    if (!base) return null;
    if (selectedEvent && selectedEvent.id === base.id) {
      return {
        ...base,
        description: selectedEvent.description || base.description,
        thumbnailUrl: selectedEvent.thumbnailUrl || base.thumbnailUrl,
        externalUrl: selectedEvent.externalUrl || base.externalUrl,
        streamUrl: selectedEvent.streamUrl || base.streamUrl,
        tags: selectedEvent.tags?.length ? selectedEvent.tags : base.tags,
        duration: selectedEvent.duration ?? base.duration,
        language: selectedEvent.language || base.language,
      };
    }
    return base;
  }, [rows, selectedId, selectedEvent]);

  // ─── Hooks ──────────────────────────────────────────────────────
  const analyzeMutation = useAnalyzeContent();
  const curateMutation = useCurateProgram();
  const applyMutation = useApplyCuration();
  const historyQuery = useCurationHistory(selectedId ?? undefined, {
    enabled: !!selectedId && canCurate,
  });

  /**
   * True while the model is working on the program currently shown in
   * the right-hand panel. Declared here (after the mutation hooks) so
   * `analyzeMutation` is already initialised.
   */
  const isAnalyzingSelected =
    !!selectedId &&
    analyzingProgramId === selectedId &&
    analyzeMutation.isPending;

  // ─── Handlers ───────────────────────────────────────────────────
  /**
   * Mode 2 — preview / ad-hoc analysis. The server does NOT persist.
   * Use case: a curator wants a quick read before committing.
   */
  const handleAnalyze = async (row: CuratorRow) => {
    const payload: AiCuratorRequestInput = {
      title: row.title,
      description: row.description || undefined,
      channelName: row.channelName,
      scheduledAt: row.scheduledAt,
      category: row.category || undefined,
      tags: row.tags?.length ? row.tags : undefined,
      language: row.language || undefined,
      duration: row.duration,
    };
    const parsed = aiCuratorRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      logWarn('[ai-curator] validation failed', firstIssue);
      toast.warning(firstIssue?.message ?? 'Vui lòng kiểm tra dữ liệu đầu vào');
      return;
    }

    setAnalyzingProgramId(row.id);
    try {
      const report = await analyzeMutation.mutateAsync({
        title: parsed.data.title,
        description: parsed.data.description || undefined,
        channelName: parsed.data.channelName || undefined,
        scheduledAt: parsed.data.scheduledAt || undefined,
        category: parsed.data.category || undefined,
        tags: parsed.data.tags,
        language: parsed.data.language || undefined,
        duration: parsed.data.duration,
      });
      setReportById((prev) => ({ ...prev, [row.id]: report }));
      // A preview is NOT persisted — make sure the "Đã lưu" pill
      // doesn't lie.
      setPersistedById((prev) => ({ ...prev, [row.id]: false }));
      // Select the program we just analyzed so the right-hand panel
      // renders the report IMMEDIATELY. Without this the report only
      // lives in `reportById` and stays invisible until the curator
      // clicks the row again.
      setSelectedId(row.id);
      toast.success('Phân tích preview hoàn tất', {
        description: `Khung giờ đề xuất: ${report.suggestedTimeSlot}`,
      });
    } catch (rawError) {
      const api = parseApiError(rawError);
      logError('[ai-curator] preview failed', api);
      toast.error('Phân tích preview thất bại', { description: api.message });
    } finally {
      setAnalyzingProgramId(null);
    }
  };

  /**
   * Mode 1 — curate an EXISTING program. The server persists a report
   * (cached or fresh depending on `forceRefresh`). We update the
   * local cache so the panel reflects the new row.
   */
  const handleCurate = async (row: CuratorRow, forceRefresh = true) => {
    try {
      const result = await curateMutation.mutateAsync({
        programId: row.id,
        forceRefresh,
      });
      setReportById((prev) => ({ ...prev, [row.id]: toReportShape(result) }));
      setPersistedById((prev) => ({ ...prev, [row.id]: true }));
      // Same as `handleAnalyze` — surface the fresh report right away
      // instead of waiting for the curator to re-click the row.
      setSelectedId(row.id);
      toast.success(
        forceRefresh
          ? 'Đã chạy lại pipeline AI'
          : result.cached
              ? 'Đã tải báo cáo đã lưu'
              : 'Đã lưu báo cáo AI mới',
        {
          description: forceRefresh
            ? `Model: ${result.aiModelVersion} · ${result.processingTimeMs}ms`
            : `Cập nhật: ${formatDistanceToNow(new Date(result.createdAt), {
                addSuffix: true,
                locale: vi,
              })}`,
        },
      );
    } catch (rawError) {
      const api = parseApiError(rawError);
      logError('[ai-curator] curate failed', api);
      toast.error('Lưu báo cáo thất bại', { description: api.message });
    }
  };

  /**
   * Mode 3 — apply curated suggestions back to the program.
   * The user picks which fields to push (description, scheduledAt).
   * The server then invalidates `programs.list` and `programs.detail`
   * via the React Query cache so the list view re-fetches.
   */
  const handleApply = async (
    row: CuratorRow,
    fields: { description?: string; scheduledAt?: string },
  ) => {
    try {
      const res = await applyMutation.mutateAsync({
        programId: row.id,
        payload: {
          description: fields.description,
          scheduledAt: fields.scheduledAt,
          markApplied: true,
        },
      });
      toast.success('Đã áp dụng đề xuất AI', {
        description: `Cập nhật: ${res.appliedFields.join(', ')}`,
      });
      // The selected program changed server-side — refresh the row
      // we render in the left list so its `scheduledAt` /
      // `description` reflect the new state.
      refetch();
    } catch (rawError) {
      const api = parseApiError(rawError);
      logError('[ai-curator] apply failed', api);
      toast.error('Áp dụng thất bại', { description: api.message });
    }
  };

  const [isSyncingDataApi, setIsSyncingDataApi] = useState(false);

  const handleSyncDataApi = async () => {
    try {
      setIsSyncingDataApi(true);
      toast.info('Đang đồng bộ dữ liệu kho chương trình từ YouTube RSS & External APIs...');
      const res = await triggerIngestYoutubeRss();
      toast.success('Đồng bộ Data API thành công!', {
        description: `Đã nạp ${res.totalUpserted ?? res.upserted ?? res.totalIngested ?? 0} chương trình mới vào kho EPG.`,
      });
      await refetch();
    } catch (err: any) {
      toast.error('Đồng bộ thất bại', {
        description: err?.message || 'Không thể kết nối đến pipeline ingest.',
      });
    } finally {
      setIsSyncingDataApi(false);
    }
  };

  /**
   * Keyboard shortcut — ⌘/Ctrl + Enter triggers a fresh analysis
   * on the currently selected row. Bound at the document level so
   * curators don't need to focus a specific button first.
   */
  useEffect(() => {
    if (!selectedRow) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleAnalyze(selectedRow);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // handleAnalyze depends on mutations / row — including
    // selectedRow.id is enough to keep the closure fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRow?.id]);

  if (!canCurate) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="p-10 glass-card text-center max-w-md">
          <Lock className="w-12 h-12 mx-auto mb-4 text-dark-500" />
          <h1 className="text-xl font-bold text-white mb-2">
            {t('curator.accessDenied')}
          </h1>
          <p className="text-dark-400 text-sm">
            {t('curator.staffRequired')}
          </p>
        </Card>
      </div>
    );
  }

  const aiReportCount = rows.filter((r) => r.aiReport).length;
  const hasAnyData = rows.length > 0;
  const hasNoMatches = hasAnyData && filteredRows.length === 0;

  /**
   * Which branch the right-hand panel renders. A report that already
   * exists always wins over the loader so a background refetch can
   * never blank out what the curator is reading.
   */
  const panelState = resolveReportPanelState({
    hasReport: !!selectedRow?.aiReport,
    isFetching: selectedQuery.isFetching,
    isAnalyzing: isAnalyzingSelected,
  });

  return (
    <div className="min-h-[80vh]">
      {/* Page Header */}
      <div className="relative z-20 bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 min-w-[280px]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/10">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {t('curator.pageTitle')}
                </h1>
                <p className="text-dark-400 text-sm">
                  {t('curator.pageSubtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#05080e] p-1 rounded-xl border border-[#1b2b42]">
                <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black text-purple-300 bg-purple-950/60 border border-purple-500/30 shadow-sm">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span>AI Curator</span>
                </button>
                <Link
                  href="/studio/live"
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <span>Live Studio</span>
                </Link>
                <Link
                  href="/studio/curator/dashboard"
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Thống kê</span>
                </Link>
              </div>
              <div className="flex items-center gap-3 pl-1 sm:pl-2">
                <CompactUserMenu variant="purple" />
                <div className="text-right min-w-[70px] px-1">
                  <p className="text-2xl font-bold text-white leading-none">
                    {rows.filter((r) => !r.aiReport).length}
                  </p>
                  <p className="text-xs text-dark-400 mt-1 whitespace-nowrap">{t('curator.pendingCount')}</p>
                </div>
                <Button
                  variant="outline"
                  className="gap-2 shrink-0 border-purple-500/40 text-purple-300 hover:bg-purple-950/40 hover:text-purple-200"
                  onClick={handleSyncDataApi}
                  disabled={isSyncingDataApi}
                  title="Kéo dữ liệu mới nhất từ YouTube RSS & Data API vào kho EPG"
                >
                  <Zap
                    className={cn('w-4 h-4 text-purple-400', isSyncingDataApi && 'animate-spin')}
                  />
                  {isSyncingDataApi ? 'Đang nạp...' : 'Cập nhật Data API'}
                </Button>
                <Button
                  className="gap-2 shrink-0"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  <RefreshCw
                    className={cn('w-4 h-4', isFetching && 'animate-spin')}
                  />
                  Làm mới
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Program List */}
          <Card className="glass-card">
            <div className="p-4 border-b border-dark-700 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white">{t('curator.programList')}</h2>
                <span className="text-xs text-dark-500 font-mono">
                  {rows.length} chương trình · {aiReportCount} đã có AI
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="search"
                  size="sm"
                  placeholder="Tìm theo tiêu đề, mô tả hoặc kênh…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  aria-label="Tìm chương trình"
                />
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as CuratorStatusFilter)
                  }
                  className="h-8 rounded-lg border border-dark-600 bg-dark-800 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Lọc theo trạng thái"
                >
                  <option value="all">Tất cả trạng thái</option>
                  {STATUS_LIST.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="divide-y divide-dark-700 max-h-[600px] overflow-y-auto">
              {isFetching && rows.length === 0 ? (
                <div className="p-10 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                </div>
              ) : !hasAnyData ? (
                <div className="p-10 text-center">
                  <FileText className="w-10 h-10 mx-auto text-dark-600 mb-3" />
                  <p className="text-dark-400 text-sm">
                    Không có chương trình nào đang chờ phân tích.
                  </p>
                </div>
              ) : hasNoMatches ? (
                <div className="p-10 text-center">
                  <FileText className="w-10 h-10 mx-auto text-dark-600 mb-3" />
                  <p className="text-dark-400 text-sm">
                    Không tìm thấy chương trình phù hợp
                  </p>
                </div>
              ) : (
                paginatedRows.map((program) => (
                  <div
                    key={program.id}
                    onClick={() => setSelectedId(program.id)}
                    className={cn(
                      'p-4 cursor-pointer transition-colors',
                      selectedId === program.id
                        ? 'bg-primary-500/10 border-l-2 border-primary-500'
                        : 'hover:bg-dark-800/50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">
                          {program.title}
                        </h3>
                        <p className="text-sm text-dark-400 truncate">
                          {program.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-dark-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(program.scheduledAt), 'HH:mm')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(program.scheduledAt), 'dd/MM')}
                          </span>
                          <span>{program.channelName}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            STATUS_META[program.status as keyof typeof STATUS_META]
                              ?.tone.bg ?? 'bg-dark-700',
                            STATUS_META[program.status as keyof typeof STATUS_META]
                              ?.tone.text ?? 'text-dark-300',
                          )}
                        >
                          {STATUS_META[program.status as keyof typeof STATUS_META]
                            ?.label ?? program.status}
                        </span>
                        {program.aiReport ? (
                          <div className="flex items-center gap-1 text-[10px] text-purple-300 bg-purple-950/40 border border-purple-500/30 rounded px-1.5 py-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã có AI
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyze(program);
                              }}
                              disabled={
                                analyzeMutation.isPending &&
                                analyzingProgramId === program.id
                              }
                              className="gap-1"
                            >
                              <Bot className="w-3 h-3" />
                              Phân tích
                            </Button>
                            <span className="text-[10px] text-dark-500">
                              ⌘/Ctrl + Enter
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Pagination controls */}
            {hasAnyData && !hasNoMatches && totalFilteredPages > 1 && (
              <div className="p-3 border-t border-dark-700 flex items-center justify-between text-xs text-dark-400">
                <span>
                  Trang {page}/{totalFilteredPages} ·{' '}
                  {filteredRows.length} chương trình
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    aria-label="Trang đầu"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: totalFilteredPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalFilteredPages <= 5) return true;
                      // For >5 pages show first, last, current ±1
                      return (
                        p === 1 ||
                        p === totalFilteredPages ||
                        Math.abs(p - page) <= 1
                      );
                    })
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                        acc.push('ellipsis');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === 'ellipsis' ? (
                        <span
                          key={`e-${idx}`}
                          className="px-2 text-dark-500"
                          aria-hidden
                        >
                          …
                        </span>
                      ) : (
                        <Button
                          key={p}
                          size="sm"
                          variant={p === page ? 'default' : 'ghost'}
                          onClick={() => setPage(p)}
                          className="min-w-8"
                        >
                          {p}
                        </Button>
                      ),
                    )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setPage((p) => Math.min(totalFilteredPages, p + 1))
                    }
                    disabled={page === totalFilteredPages}
                    aria-label="Trang sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPage(totalFilteredPages)}
                    disabled={page === totalFilteredPages}
                    aria-label="Trang cuối"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* AI Report Panel */}
          <Card className="glass-card" ref={reportPanelRef}>
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-accent-gold" />
                {t('curator.aiReport')}
              </h2>
              {selectedRow?.aiReport && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedId(null)}
                  className="text-xs"
                >
                  Đóng
                </Button>
              )}
            </div>
            <div className="p-6">
              {selectedRow ? (
                <div className="space-y-6">
                  {/* Program Info & Content Reader */}
                  <ProgramContentCard
                    id={selectedRow.id}
                    title={selectedRow.title}
                    description={selectedRow.description}
                    category={selectedRow.category}
                    channelName={selectedRow.channelName}
                    scheduledAt={selectedRow.scheduledAt}
                    thumbnailUrl={selectedRow.thumbnailUrl}
                    externalUrl={selectedRow.externalUrl}
                    streamUrl={selectedRow.streamUrl}
                    tags={selectedRow.tags}
                    duration={selectedRow.duration}
                    language={selectedRow.language}
                    aiReport={selectedRow.aiReport}
                  />

                  {/* The detail query refetches after "Áp dụng" and
                      right after an auto-select. That refetch must NOT
                      blank out a report we already have on screen —
                      only show the loader when there is nothing to
                      show yet. The branch rule lives in
                      `resolveReportPanelState()` so it is unit-tested
                      in isolation. */}
                  {panelState === 'loading' ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 mx-auto text-primary-400 animate-spin" />
                      <p className="text-dark-400 mt-3 text-sm">
                        Đang tải chi tiết...
                      </p>
                    </div>
                  ) : panelState === 'report' ? (
                    <>
                      {/* Re-running the model on the selected program:
                          keep the previous report visible but tell the
                          curator a fresh run is in flight. */}
                      {isAnalyzingSelected && (
                        <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-primary-500/10 border border-primary-500/30">
                          <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                          <p className="text-sm text-primary-200">
                            AI đang phân tích...
                          </p>
                        </div>
                      )}

                      <ReportDetail report={selectedRow.aiReport!} />

                      <ApplyCurationPanel
                        row={{
                          id: selectedRow.id,
                          title: selectedRow.title,
                          description: selectedRow.description,
                          scheduledAt: selectedRow.scheduledAt,
                          status: selectedRow.status,
                          aiReport: selectedRow.aiReport!,
                        }}
                        onApply={(fields) => handleApply(selectedRow, fields)}
                        loading={applyMutation.isPending}
                      />

                      <CurateActions
                        row={{ id: selectedRow.id }}
                        onPreview={() => handleAnalyze(selectedRow)}
                        onCurate={() => handleCurate(selectedRow, true)}
                        analyzing={
                          analyzeMutation.isPending &&
                          analyzingProgramId === selectedRow.id
                        }
                        curating={curateMutation.isPending}
                        isPersisted={!!persistedById[selectedRow.id]}
                        confidence={selectedRow.aiReport?.confidence}
                      />

                      <HistorySection
                        history={historyQuery.data}
                        isLoading={historyQuery.isFetching}
                      />
                    </>
                  ) : panelState === 'analyzing' ? (
                    <div className="text-center py-12 space-y-4">
                      <Loader2 className="w-12 h-12 mx-auto text-primary-400 animate-spin" />
                      <p className="text-dark-400">AI đang phân tích...</p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Bot className="w-12 h-12 mx-auto text-dark-600 mb-4" />
                      <p className="text-dark-400 mb-4">
                        {t('curator.noReport')}
                      </p>
                      <Button
                        onClick={() => handleAnalyze(selectedRow)}
                        className="gap-2"
                      >
                        <Bot className="w-4 h-4" />
                        {t('curator.analyzeWithAI')}
                      </Button>
                      <p className="text-xs text-dark-500 mt-3">
                        {`Tiêu đề: ${LIMITS.AI_TITLE_MIN}–${LIMITS.AI_TITLE_MAX} ký tự`}
                      </p>
                      <p className="text-xs text-dark-500 mt-1">
                        Phím tắt: <kbd className="px-1 py-0.5 bg-dark-700 rounded text-[10px]">⌘/Ctrl + Enter</kbd>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-dark-600 mb-4" />
                  <p className="text-dark-400">
                    Chọn một chương trình để xem chi tiết
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
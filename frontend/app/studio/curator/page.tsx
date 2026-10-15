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

import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CompactUserMenu } from '@/components/layout/compact-user-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useLiveEvents, useLiveEventById } from '@/lib/hooks/usePrograms';
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
import { STATUS_META } from '@/lib/constants/statuses';
import { LIMITS } from '@/lib/constants/limits';
import { canRunAiCurator } from '@/lib/guards/permissions';
import { parseApiError } from '@/lib/errors/api-error';
import { logWarn, logError } from '@/lib/utils/safe-log';
import { toReportShape } from '@/lib/utils/curator-helpers';
import type { AiCuratorReport, LiveEvent } from '@/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/i18n-provider';

import { ReportDetail } from '@/components/curator/report-detail';
import { CurateActions } from '@/components/curator/curate-actions';
import { ApplyCurationPanel } from '@/components/curator/apply-curation-panel';
import { HistorySection } from '@/components/curator/history-section';

type CuratorStatus = LiveEvent['status'] | 'NEEDS_REVIEW';

interface CuratorRow {
  id: string;
  title: string;
  description: string;
  category: string;
  channelName: string;
  scheduledAt: string;
  status: CuratorStatus;
  aiReport?: AiCuratorReport;
}

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

  // Live events awaiting curation (status SCHEDULED + has not been AI-reviewed)
  const { data, isFetching, refetch } = useLiveEvents(
    { status: 'SCHEDULED', limit: 50 },
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

  const rows: CuratorRow[] = useMemo(() => {
    return (data?.data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description ?? '',
      // LiveEvent.channel is a partial sub-object without `category`,
      // so we fall back to a generic label when category isn't present.
      category: 'Chương trình',
      channelName: e.channel?.name ?? '—',
      scheduledAt: e.scheduledAt,
      status: deriveStatus(e),
      aiReport: reportById[e.id],
    }));
  }, [data?.data, reportById]);

  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  // ─── Hooks ──────────────────────────────────────────────────────
  const analyzeMutation = useAnalyzeContent();
  const curateMutation = useCurateProgram();
  const applyMutation = useApplyCuration();
  const historyQuery = useCurationHistory(selectedId ?? undefined, {
    enabled: !!selectedId && canCurate,
  });

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
        tags: parsed.data.tags,
        language: parsed.data.language,
      });
      setReportById((prev) => ({ ...prev, [row.id]: report }));
      // A preview is NOT persisted — make sure the "Đã lưu" pill
      // doesn't lie.
      setPersistedById((prev) => ({ ...prev, [row.id]: false }));
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

  return (
    <div className="min-h-[80vh]">
      {/* Page Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-cyan flex items-center justify-center">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {t('curator.pageTitle')}
                </h1>
                <p className="text-dark-400">
                  {t('curator.pageSubtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#05080e] p-1 rounded-xl border border-[#1b2b42] mr-2">
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
              </div>
              <CompactUserMenu variant="purple" />
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {rows.filter((r) => !r.aiReport).length}
                </p>
                <p className="text-sm text-dark-400">{t('curator.pendingCount')}</p>
              </div>
              <Button
                className="gap-2"
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Program List */}
          <Card className="glass-card">
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <h2 className="font-bold text-white">{t('curator.programList')}</h2>
              <span className="text-xs text-dark-500 font-mono">
                {rows.length} chương trình
              </span>
            </div>
            <div className="divide-y divide-dark-700 max-h-[600px] overflow-y-auto">
              {isFetching && rows.length === 0 ? (
                <div className="p-10 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                </div>
              ) : rows.length === 0 ? (
                <div className="p-10 text-center">
                  <FileText className="w-10 h-10 mx-auto text-dark-600 mb-3" />
                  <p className="text-dark-400 text-sm">
                    Không có chương trình nào đang chờ phân tích.
                  </p>
                </div>
              ) : (
                rows.map((program) => (
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
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* AI Report Panel */}
          <Card className="glass-card">
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
                  {/* Program Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {selectedRow.title}
                    </h3>
                    <p className="text-dark-400 text-sm mb-3">
                      {selectedRow.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="px-2 py-1 rounded bg-dark-700 text-dark-300">
                        {selectedRow.category}
                      </span>
                      <span className="text-dark-400">
                        {selectedRow.channelName}
                      </span>
                    </div>
                  </div>

                  {selectedQuery.isFetching ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 mx-auto text-primary-400 animate-spin" />
                      <p className="text-dark-400 mt-3 text-sm">
                        Đang tải chi tiết...
                      </p>
                    </div>
                  ) : selectedRow.aiReport ? (
                    <>
                      <ReportDetail report={selectedRow.aiReport} />

                      <ApplyCurationPanel
                        row={{
                          id: selectedRow.id,
                          title: selectedRow.title,
                          description: selectedRow.description,
                          scheduledAt: selectedRow.scheduledAt,
                          status: selectedRow.status,
                          aiReport: selectedRow.aiReport,
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
                      />

                      <HistorySection
                        history={historyQuery.data}
                        isLoading={historyQuery.isFetching}
                      />
                    </>
                  ) : (
                    <div className="text-center py-12">
                      {analyzeMutation.isPending &&
                      analyzingProgramId === selectedRow.id ? (
                        <div className="space-y-4">
                          <Loader2 className="w-12 h-12 mx-auto text-primary-400 animate-spin" />
                          <p className="text-dark-400">AI đang phân tích...</p>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
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
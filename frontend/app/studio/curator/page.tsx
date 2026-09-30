'use client';

import { useMemo, useState } from 'react';
import {
  Bot,
  FileText,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Lightbulb,
  Target,
  Shield,
  TrendingUp,
  Loader2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { useLiveEvents, useLiveEventById } from '@/lib/hooks/usePrograms';
import { useAnalyzeContent } from '@/lib/hooks/useAiCurator';
import {
  aiCuratorRequestSchema,
  type AiCuratorRequestInput,
} from '@/lib/validators/ai-curator';
import { STATUS_META } from '@/lib/constants/statuses';
import { LIMITS } from '@/lib/constants/limits';
import { canRunAiCurator } from '@/lib/guards/permissions';
import { parseApiError } from '@/lib/errors/api-error';
import type { AiCuratorReport, LiveEvent } from '@/types';

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
  // Map backend status to the curator's local status vocabulary.
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

  // Live events awaiting curation (status SCHEDULED + has not been AI-reviewed)
  const { data, isFetching, refetch } = useLiveEvents(
    { status: 'SCHEDULED', limit: 50 },
    { enabled: canCurate },
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedQuery = useLiveEventById(selectedId ?? undefined, {
    enabled: !!selectedId && canCurate,
  });

  const [reportById, setReportById] = useState<Record<string, AiCuratorReport>>(
    {},
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

  // Track in-flight analyze requests so we can disable buttons per-row
  const analyzeMutation = useAnalyzeContent();

  const handleAnalyze = async (row: CuratorRow) => {
    // Validate before sending so we get a friendly inline error first.
    const payload: AiCuratorRequestInput = {
      title: row.title,
      description: row.description || undefined,
      channelName: row.channelName,
      scheduledAt: row.scheduledAt,
    };
    const parsed = aiCuratorRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      console.warn('[ai-curator] validation failed', firstIssue);
      return;
    }

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
    } catch (rawError) {
      const api = parseApiError(rawError);
      console.error('[ai-curator] analyze failed', api);
    }
  };

  // Refresh when the underlying live-events query refetches
  // (placeholder for future auto-refresh hook)

  if (!canCurate) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="p-10 glass-card text-center max-w-md">
          <Lock className="w-12 h-12 mx-auto mb-4 text-dark-500" />
          <h1 className="text-xl font-bold text-white mb-2">
            Không có quyền truy cập
          </h1>
          <p className="text-dark-400 text-sm">
            Bạn cần vai trò <strong>STAFF</strong> trở lên để vào AI Curator
            Studio. Vui lòng liên hệ quản trị viên nếu bạn cần quyền này.
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
                  AI Curator Studio
                </h1>
                <p className="text-dark-400">
                  Đánh giá và phê duyệt nội dung với AI
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {rows.filter((r) => !r.aiReport).length}
                </p>
                <p className="text-sm text-dark-400">Chờ phân tích</p>
              </div>
              <Button
                className="gap-2"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`}
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
            <div className="p-4 border-b border-dark-700">
              <h2 className="font-bold text-white">Danh sách chương trình</h2>
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
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedId === program.id
                        ? 'bg-primary-500/10 border-l-2 border-primary-500'
                        : 'hover:bg-dark-800/50'
                    }`}
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
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            STATUS_META[program.status as keyof typeof STATUS_META]?.tone.bg ??
                              'bg-dark-700'
                          } ${
                            STATUS_META[program.status as keyof typeof STATUS_META]?.tone.text ??
                              'text-dark-300'
                          }`}
                        >
                          {STATUS_META[program.status as keyof typeof STATUS_META]?.label ??
                            program.status}
                        </span>
                        {!program.aiReport && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnalyze(program);
                            }}
                            disabled={
                              analyzeMutation.isPending &&
                              analyzeMutation.variables?.title === program.title
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
            <div className="p-4 border-b border-dark-700">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-accent-gold" />
                AI Analysis Report
              </h2>
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
                    <div className="space-y-4">
                      {/* Broadcast Suitability */}
                      <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-dark-400">
                            Khả năng phát sóng
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                              selectedRow.aiReport.broadcastSuitability ===
                              'PRIME_TIME'
                                ? 'bg-accent-gold/20 text-accent-gold'
                                : selectedRow.aiReport.broadcastSuitability ===
                                    'STANDARD'
                                  ? 'bg-primary-500/20 text-primary-400'
                                  : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {selectedRow.aiReport.broadcastSuitability ===
                            'PRIME_TIME'
                              ? '★ Giờ vàng'
                              : selectedRow.aiReport.broadcastSuitability ===
                                  'STANDARD'
                                ? '◆ Phát thường'
                                : '⚠ Hạn chế'}
                          </span>
                        </div>
                        <p className="text-sm text-white">
                          <Target className="w-4 h-4 inline mr-2 text-primary-400" />
                          Khung giờ đề xuất:{' '}
                          {selectedRow.aiReport.suggestedTimeSlot}
                        </p>
                        {selectedRow.aiReport.complianceAssessment
                          ?.recommendedBroadcastWindow && (
                          <p className="text-xs text-dark-400 mt-2">
                            Khung phát sóng khuyến nghị:{' '}
                            {
                              selectedRow.aiReport.complianceAssessment
                                .recommendedBroadcastWindow
                            }
                          </p>
                        )}
                      </div>

                      {/* Sentiment Analysis */}
                      <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
                        <h4 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Phân tích tình cảm
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-2 rounded bg-dark-800">
                            <p
                              className={`text-sm font-medium ${
                                selectedRow.aiReport.sentimentAnalysis
                                  .overallSentiment === 'positive'
                                  ? 'text-green-400'
                                  : selectedRow.aiReport.sentimentAnalysis
                                      .overallSentiment === 'neutral'
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                              }`}
                            >
                              {selectedRow.aiReport.sentimentAnalysis
                                .overallSentiment === 'positive'
                                ? 'Tích cực'
                                : selectedRow.aiReport.sentimentAnalysis
                                    .overallSentiment === 'neutral'
                                  ? 'Trung lập'
                                  : 'Tiêu cực'}
                            </p>
                            <p className="text-xs text-dark-500">Cảm xúc</p>
                          </div>
                          <div className="text-center p-2 rounded bg-dark-800">
                            <p className="text-sm font-medium text-white capitalize">
                              {
                                selectedRow.aiReport.sentimentAnalysis
                                  .hypeLevel
                              }
                            </p>
                            <p className="text-xs text-dark-500">
                              Mức độ hype
                            </p>
                          </div>
                          <div className="text-center p-2 rounded bg-dark-800">
                            <p className="text-sm font-medium text-white">
                              {
                                selectedRow.aiReport.sentimentAnalysis
                                  .audienceEngagement
                              }
                              %
                            </p>
                            <p className="text-xs text-dark-500">Tương tác</p>
                          </div>
                        </div>
                      </div>

                      {/* Compliance */}
                      <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
                        <h4 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Đánh giá tuân thủ
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              selectedRow.aiReport.complianceAssessment
                                .isAgeRestricted
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {
                              selectedRow.aiReport.complianceAssessment
                                .ageRating
                            }
                          </span>
                          {selectedRow.aiReport.complianceAssessment.flaggedContent?.map(
                            (flag, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-sm"
                              >
                                {flag}
                              </span>
                            ),
                          )}
                        </div>
                      </div>

                      {/* Risk Warning */}
                      {selectedRow.aiReport.riskWarnings && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-400">
                                Cảnh báo
                              </p>
                              <p className="text-sm text-dark-300">
                                {selectedRow.aiReport.riskWarnings}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Model footer */}
                      <p className="text-xs text-dark-500">
                        Model:{' '}
                        {selectedRow.aiReport.aiModelVersion ?? 'unknown'} ·
                        Xử lý:{' '}
                        {selectedRow.aiReport.processingTimeMs ?? 0}ms
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      {analyzeMutation.isPending &&
                      analyzeMutation.variables?.title === selectedRow.title ? (
                        <div className="space-y-4">
                          <Loader2 className="w-12 h-12 mx-auto text-primary-400 animate-spin" />
                          <p className="text-dark-400">AI đang phân tích...</p>
                        </div>
                      ) : (
                        <>
                          <Bot className="w-12 h-12 mx-auto text-dark-600 mb-4" />
                          <p className="text-dark-400 mb-4">
                            Chưa có báo cáo AI cho chương trình này
                          </p>
                          <Button
                            onClick={() => handleAnalyze(selectedRow)}
                            className="gap-2"
                          >
                            <Bot className="w-4 h-4" />
                            Phân tích với AI
                          </Button>
                          <p className="text-xs text-dark-500 mt-3">
                            Tiêu đề: {LIMITS.AI_TITLE_MIN}–
                            {LIMITS.AI_TITLE_MAX} ký tự
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
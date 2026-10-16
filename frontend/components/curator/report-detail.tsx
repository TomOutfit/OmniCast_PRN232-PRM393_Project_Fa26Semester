// ============================================================
// OmniCast - Curator · Report Detail
// ============================================================
//
// Renders the full 3-agent pipeline output for a single program.
// Shared between the Studio Curator page and any future curator
// surface (e.g. an "AI badge" inline on the program detail page).
// ============================================================

'use client';

import {
  AlertTriangle,
  FileText,
  Gauge,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { Tooltip } from '@/components/ui/tooltip';
import type { AiCuratorReport } from '@/types';

interface ReportDetailProps {
  report: AiCuratorReport;
}

const suitabilityConfig = {
  PRIME_TIME: {
    label: '★ Giờ vàng',
    bg: 'bg-accent-gold/20',
    text: 'text-accent-gold',
  },
  STANDARD: {
    label: '◆ Phát thường',
    bg: 'bg-primary-500/20',
    text: 'text-primary-400',
  },
  RESTRICTED: {
    label: '⚠ Hạn chế',
    bg: 'bg-red-500/20',
    text: 'text-red-400',
  },
} as const;

const sentimentColor = {
  positive: 'text-green-400',
  neutral: 'text-yellow-400',
  negative: 'text-red-400',
} as const;

const sentimentLabel = {
  positive: 'Tích cực',
  neutral: 'Trung lập',
  negative: 'Tiêu cực',
} as const;

const broadcastWindowLabel = {
  DAY: 'Ban ngày',
  EVENING: 'Buổi tối',
  LATE_NIGHT: 'Đêm khuya',
} as const;

/**
 * Bucket a 0–100 confidence score into a Tailwind colour. Returns
 * `{ tone, label }` so callers can keep accessibility text alongside
 * the colour (colour-blind curators still see the badge word).
 */
function confidenceBand(confidence: number): {
  tone: 'green' | 'yellow' | 'red';
  label: string;
} {
  if (confidence >= 80) return { tone: 'green', label: 'Cao' };
  if (confidence >= 50) return { tone: 'yellow', label: 'Trung bình' };
  return { tone: 'red', label: 'Thấp' };
}

const confidenceToneClasses = {
  green: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', bar: 'bg-emerald-400' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', bar: 'bg-yellow-400' },
  red: { bg: 'bg-red-500/20', text: 'text-red-300', bar: 'bg-red-400' },
} as const;

export function ReportDetail({ report }: ReportDetailProps) {
  const { t } = useI18n();
  const suitability = suitabilityConfig[report.broadcastSuitability];

  // Suitability labels — multilingual via the i18n dictionary.
  // Vietnamese originals are passed as fallbacks so the vi locale
  // (whose dictionary intentionally lacks the `curator.*` keys)
  // renders the existing Vietnamese strings.
  const suitabilityLabels: Record<string, string> = {
    PRIME_TIME: t('curator.primeTime', 'Giờ vàng'),
    STANDARD: t('curator.standard', 'Phát thường'),
    RESTRICTED: t('curator.restricted', 'Hạn chế'),
  };

  const confidence = report.confidence;
  const showConfidence =
    typeof confidence === 'number' && Number.isFinite(confidence);
  const confidenceClamped =
    showConfidence ? Math.max(0, Math.min(100, Math.round(confidence!))) : 0;
  const confidenceMeta = showConfidence
    ? confidenceBand(confidenceClamped)
    : null;

  return (
    <div className="space-y-4">
      {/* Broadcast Suitability */}
      <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-dark-400">
            {t('curator.broadcastSuitability')}
          </span>
          <span
            className={cn(
              'px-3 py-1 rounded-full text-sm font-bold',
              suitability.bg,
              suitability.text,
            )}
          >
            {suitabilityLabels[report.broadcastSuitability] ?? suitability.label}
          </span>
        </div>
        <p className="text-sm text-white">
          <Target className="w-4 h-4 inline mr-2 text-primary-400" />
          {t('curator.suggestedTimeSlot')}: {report.suggestedTimeSlot}
        </p>
        {report.complianceAssessment?.recommendedBroadcastWindow && (
          <p className="text-xs text-dark-400 mt-2">
            {t('curator.recommendedWindow')}:{' '}
            <Tooltip
              content="Khung giờ phát sóng phù hợp theo đối tượng"
              side="top"
            >
              <span className="text-dark-200 underline decoration-dotted decoration-dark-600 cursor-help">
                {broadcastWindowLabel[
                  report.complianceAssessment.recommendedBroadcastWindow
                ] ??
                  report.complianceAssessment.recommendedBroadcastWindow}
              </span>
            </Tooltip>
          </p>
        )}
        {report.targetAudienceVibe && (
          <p className="text-xs text-dark-300 mt-2">
            <Sparkles className="w-3 h-3 inline mr-1" />
            {t('curator.targetAudience')}: {report.targetAudienceVibe}
          </p>
        )}
      </div>

      {/* Sentiment Analysis */}
      <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
        <h4 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {t('curator.sentimentAnalysis')}
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded bg-dark-800">
            <p
              className={cn(
                'text-sm font-medium',
                sentimentColor[report.sentimentAnalysis.overallSentiment],
              )}
            >
              {sentimentLabel[report.sentimentAnalysis.overallSentiment]}
            </p>
            <Tooltip
              content="Cảm xúc tổng thể của nội dung dựa trên phân tích ngôn ngữ"
              side="top"
            >
              <p className="text-xs text-dark-500 underline decoration-dotted decoration-dark-600 cursor-help">
                {t('curator.sentiment')}
              </p>
            </Tooltip>
          </div>
          <div className="text-center p-2 rounded bg-dark-800">
            <p className="text-sm font-medium text-white capitalize">
              {report.sentimentAnalysis.hypeLevel}
            </p>
            <Tooltip
              content="Mức độ được mong đợi / bàn tán của khán giả"
              side="top"
            >
              <p className="text-xs text-dark-500 underline decoration-dotted decoration-dark-600 cursor-help">
                {t('curator.hypeLevel')}
              </p>
            </Tooltip>
          </div>
          <div className="text-center p-2 rounded bg-dark-800">
            <p className="text-sm font-medium text-white">
              {report.sentimentAnalysis.audienceEngagement}%
            </p>
            <Tooltip
              content="Điểm tương tác dự đoán (0-100)"
              side="top"
            >
              <p className="text-xs text-dark-500 underline decoration-dotted decoration-dark-600 cursor-help">
                {t('curator.engagement')}
              </p>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Confidence Score (only when backend supplies the field) */}
      {showConfidence && confidenceMeta && (
        <div
          className={cn(
            'p-4 rounded-lg border',
            confidenceToneClasses[confidenceMeta.tone].bg,
            'border-dark-700',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <h4
              className={cn(
                'text-sm font-medium flex items-center gap-2',
                confidenceToneClasses[confidenceMeta.tone].text,
              )}
            >
              <Gauge className="w-4 h-4" />
              Độ tin cậy
            </h4>
            <span
              className={cn(
                'text-sm font-bold',
                confidenceToneClasses[confidenceMeta.tone].text,
              )}
            >
              {confidenceClamped}% · {confidenceMeta.label}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-dark-800 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                confidenceToneClasses[confidenceMeta.tone].bar,
              )}
              style={{ width: `${confidenceClamped}%` }}
              aria-label={`Confidence ${confidenceClamped}%`}
            />
          </div>
        </div>
      )}

      {/* Compliance */}
      <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
        <h4 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          {t('curator.compliance')}
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip
            content="Giới hạn độ tuổi khuyến nghị theo quy chuẩn Việt Nam"
            side="top"
          >
            <span
              className={cn(
                'px-2 py-1 rounded text-sm underline decoration-dotted decoration-dashed cursor-help',
                report.complianceAssessment.isAgeRestricted
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-green-500/20 text-green-400',
              )}
            >
              {report.complianceAssessment.ageRating}
            </span>
          </Tooltip>
          {report.complianceAssessment.flaggedContent?.map((flag, i) => (
            <span
              key={i}
              className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-sm"
            >
              {flag}
            </span>
          ))}
        </div>
      </div>

      {/* Risk Warning */}
      {report.riskWarnings && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <p className="font-medium text-red-400">{t('curator.riskWarning')}</p>
              <p className="text-sm text-dark-300">{report.riskWarnings}</p>
            </div>
          </div>
        </div>
      )}

      {/* Model footer */}
      <div className="text-xs text-dark-500 font-mono space-y-1">
        <p className="flex items-center gap-2">
          <FileText className="w-3 h-3" />
          {t('curator.model')}: {report.aiModelVersion ?? 'unknown'}{' '}
          <Tooltip content="Thời gian xử lý toàn bộ pipeline 3 agent" side="top">
            <span className="underline decoration-dotted decoration-dark-600 cursor-help">
              · {t('curator.processing', 'Xử lý')}: {report.processingTimeMs ?? 0}ms
            </span>
          </Tooltip>
        </p>
        {report.agentTimings && (
          <p className="flex flex-wrap items-center gap-3 text-[11px] text-dark-500">
            <Tooltip content="Thời gian agent phân tích cảm xúc" side="top">
              <span className="underline decoration-dotted decoration-dark-700 cursor-help">
                sentiment: {report.agentTimings.sentimentMs ?? 0}ms
              </span>
            </Tooltip>
            <Tooltip content="Thời gian agent kiểm tra tuân thủ" side="top">
              <span className="underline decoration-dotted decoration-dark-700 cursor-help">
                compliance: {report.agentTimings.complianceMs ?? 0}ms
              </span>
            </Tooltip>
            <Tooltip content="Thời gian agent đề xuất lịch phát sóng" side="top">
              <span className="underline decoration-dotted decoration-dark-700 cursor-help">
                editorial: {report.agentTimings.editorialMs ?? 0}ms
              </span>
            </Tooltip>
          </p>
        )}
      </div>
    </div>
  );
}
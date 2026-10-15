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
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/i18n-provider';
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

  return (
    <div className="space-y-4">
      {/* Broadcast Suitability */}
      <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-dark-400">{t('curator.broadcastSuitability')}</span>
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
            <span className="text-dark-200">
              {broadcastWindowLabel[
                report.complianceAssessment.recommendedBroadcastWindow
              ] ??
                report.complianceAssessment.recommendedBroadcastWindow}
            </span>
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
            <p className="text-xs text-dark-500">{t('curator.sentiment')}</p>
          </div>
          <div className="text-center p-2 rounded bg-dark-800">
            <p className="text-sm font-medium text-white capitalize">
              {report.sentimentAnalysis.hypeLevel}
            </p>
            <p className="text-xs text-dark-500">{t('curator.hypeLevel')}</p>
          </div>
          <div className="text-center p-2 rounded bg-dark-800">
            <p className="text-sm font-medium text-white">
              {report.sentimentAnalysis.audienceEngagement}%
            </p>
            <p className="text-xs text-dark-500">{t('curator.engagement')}</p>
          </div>
        </div>
      </div>

      {/* Compliance */}
      <div className="p-4 rounded-lg bg-dark-900/50 border border-dark-700">
        <h4 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          {t('curator.compliance')}
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'px-2 py-1 rounded text-sm',
              report.complianceAssessment.isAgeRestricted
                ? 'bg-red-500/20 text-red-400'
                : 'bg-green-500/20 text-green-400',
            )}
          >
            {report.complianceAssessment.ageRating}
          </span>
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
      <p className="text-xs text-dark-500 font-mono flex items-center gap-2">
        <FileText className="w-3 h-3" />
        {t('curator.model')}: {report.aiModelVersion ?? 'unknown'} · {t('curator.processing', 'Xử lý')}:{' '}
        {report.processingTimeMs ?? 0}ms
      </p>
    </div>
  );
}
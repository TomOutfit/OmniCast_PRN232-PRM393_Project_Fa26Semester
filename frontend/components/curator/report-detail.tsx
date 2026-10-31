// ============================================================
// OmniCast - Curator · Report Detail (Standard Broadcast Spec)
// ============================================================
//
// Renders the comprehensive broadcast-standard AI curation report
// covering:
//   1. Tổng quan Phân loại & Chỉ số Phát sóng (OBI Index)
//   2. Bộ Chỉ số Đánh giá Đa chiều (Diverse Multi-dimensional Scoring)
//   3. Thẩm định Nội dung chương trình (Content Assessment)
//   4. Thẩm định Hình thức & Kỹ thuật Dàn dựng (Format & Production)
//   5. Phân tích Cảm xúc & Tuân thủ Phát sóng (Sentiment & Compliance)
//   6. Độ tin cậy mô hình & Thời gian xử lý từng agent
// ============================================================

'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  FileText,
  Flame,
  Gauge,
  Layers,
  Link2,
  Radio,
  Shield,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  Tv,
  Volume2,
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
    border: 'border-accent-gold/40',
  },
  STANDARD: {
    label: '◆ Phát thường',
    bg: 'bg-primary-500/20',
    text: 'text-primary-400',
    border: 'border-primary-500/40',
  },
  RESTRICTED: {
    label: '⚠ Hạn chế',
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/40',
  },
} as const;

const gradeConfig: Record<
  string,
  { label: string; bg: string; text: string; desc: string }
> = {
  S: {
    label: 'Hạng S · Xuất sắc',
    bg: 'bg-amber-500/20 border-amber-500/50',
    text: 'text-amber-300',
    desc: 'Nội dung & hình thức hoàn hảo, ưu tiên khung giờ vàng cao điểm',
  },
  A: {
    label: 'Hạng A · Rất tốt',
    bg: 'bg-emerald-500/20 border-emerald-500/50',
    text: 'text-emerald-300',
    desc: 'Đạt chuẩn truyền hình cao cấp, sẵn sàng phát sóng',
  },
  B: {
    label: 'Hạng B · Đạt chuẩn',
    bg: 'bg-blue-500/20 border-blue-500/50',
    text: 'text-blue-300',
    desc: 'Đáp ứng đầy đủ tiêu chí biên tập và khung giờ thông thường',
  },
  C: {
    label: 'Hạng C · Cần hoàn thiện',
    bg: 'bg-yellow-500/20 border-yellow-500/50',
    text: 'text-yellow-300',
    desc: 'Cần biên tập lại hoặc tối ưu hình thức trước khi phát',
  },
  D: {
    label: 'Hạng D · Chưa đạt',
    bg: 'bg-red-500/20 border-red-500/50',
    text: 'text-red-300',
    desc: 'Không khuyến nghị phát sóng ở định dạng hiện tại',
  },
};

const pacingConfig = {
  SLOW: { label: 'Chậm rãi · Sâu lắng', text: 'text-sky-300', bg: 'bg-sky-500/15' },
  MODERATE: { label: 'Vừa phải · Cân bằng', text: 'text-blue-300', bg: 'bg-blue-500/15' },
  DYNAMIC: { label: 'Sôi nổi · Biến đổi', text: 'text-indigo-300', bg: 'bg-indigo-500/15' },
  FAST_PACED: { label: 'Dồn dập · Kịch tính', text: 'text-purple-300', bg: 'bg-purple-500/15' },
} as const;

const interactivityConfig = {
  LOW: { label: 'Tương tác Thấp', text: 'text-dark-400', bg: 'bg-dark-800' },
  MEDIUM: { label: 'Tương tác Vừa', text: 'text-cyan-300', bg: 'bg-cyan-500/15' },
  HIGH: { label: 'Tương tác Cao (Đa nền tảng)', text: 'text-emerald-300', bg: 'bg-emerald-500/15' },
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
  DAY: 'Ban ngày (06:00 - 18:00)',
  EVENING: 'Buổi tối (18:00 - 22:00)',
  LATE_NIGHT: 'Đêm khuya (22:00 - 06:00)',
} as const;

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

/**
 * Tone for the grounding score band. The thresholds mirror the
 * backend's `applyGroundingPenalty()`: below 55 the report is
 * considered weakly grounded and its confidence is discounted.
 */
function groundingTone(score: number): {
  label: string;
  grounding: {
    bg: string;
    text: string;
    border: string;
    bar: string;
  };
} {
  if (score >= 70) {
    return {
      label: 'Báo cáo bám sát tốt với mô tả chương trình.',
      grounding: {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-300',
        border: 'border-emerald-500/40',
        bar: 'bg-emerald-400',
      },
    };
  }
  if (score >= 55) {
    return {
      label: 'Báo cáo bám sát mô tả ở mức chấp nhận được.',
      grounding: {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-300',
        border: 'border-yellow-500/40',
        bar: 'bg-yellow-400',
      },
    };
  }
  return {
    label: 'Báo cáo bám sát nội dung yếu — nên rà soát lại mô tả chương trình.',
    grounding: {
      bg: 'bg-red-500/20',
      text: 'text-red-300',
      border: 'border-red-500/40',
      bar: 'bg-red-400',
    },
  };
}

function scoreColor(score: number): { text: string; bar: string; badge: string } {  if (score >= 85) {
    return {
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      badge: 'bg-emerald-500/20 text-emerald-300',
    };
  }
  if (score >= 70) {
    return {
      text: 'text-blue-400',
      bar: 'bg-blue-500',
      badge: 'bg-blue-500/20 text-blue-300',
    };
  }
  if (score >= 55) {
    return {
      text: 'text-yellow-400',
      bar: 'bg-yellow-500',
      badge: 'bg-yellow-500/20 text-yellow-300',
    };
  }
  return {
    text: 'text-red-400',
    bar: 'bg-red-500',
    badge: 'bg-red-500/20 text-red-300',
  };
}

export function ReportDetail({ report }: ReportDetailProps) {
  const { t } = useI18n();
  const suitability = suitabilityConfig[report.broadcastSuitability];
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

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

  const scoring = report.scoringBreakdown;
  const content = report.contentAssessment;
  const format = report.formatAssessment;
  const gradeInfo = scoring?.grade ? gradeConfig[scoring.grade] : null;

  // Grounding (v5). Older reports persisted before prompt v5 have no
  // grounding block — the section is simply omitted for them.
  const grounding = report.grounding;
  const groundingToneInfo = grounding
    ? groundingTone(grounding.groundingScore)
    : null;
  return (
    <div className="space-y-4 text-dark-100">
      {/* ─── HEADER: Tổng quan Phân loại & Chỉ số Phát sóng (OBI) ─── */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-dark-900/90 via-dark-900/60 to-dark-800/40 border border-dark-700 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border',
                suitability.bg,
                suitability.text,
                suitability.border,
              )}
            >
              {suitabilityLabels[report.broadcastSuitability] ?? suitability.label}
            </span>
            {gradeInfo && (
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold border',
                  gradeInfo.bg,
                  gradeInfo.text,
                )}
              >
                {gradeInfo.label}
              </span>
            )}
          </div>
          {scoring?.overallScore !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-400 font-medium">Chỉ số OBI:</span>
              <span
                className={cn(
                  'text-lg font-black font-mono px-2 py-0.5 rounded bg-dark-800 border border-dark-700',
                  scoreColor(scoring.overallScore).text,
                )}
              >
                {scoring.overallScore}
                <span className="text-xs text-dark-500 font-normal">/100</span>
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-white font-medium">
            <Target className="w-4 h-4 text-primary-400 shrink-0" />
            <span>
              {t('curator.suggestedTimeSlot')}:{' '}
              <strong className="text-primary-300 font-mono">
                {report.suggestedTimeSlot}
              </strong>
            </span>
          </div>

          {report.complianceAssessment?.recommendedBroadcastWindow && (
            <p className="text-xs text-dark-300 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-dark-400 shrink-0" />
              <span>
                {t('curator.recommendedWindow')}:{' '}
                <span className="text-dark-200 font-medium">
                  {broadcastWindowLabel[
                    report.complianceAssessment.recommendedBroadcastWindow
                  ] ?? report.complianceAssessment.recommendedBroadcastWindow}
                </span>
              </span>
            </p>
          )}

          {report.targetAudienceVibe && (
            <p className="text-xs text-dark-300 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent-gold shrink-0 mt-0.5" />
              <span>
                <strong className="text-dark-200">Định vị khán giả:</strong>{' '}
                {report.targetAudienceVibe}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ─── SECTION 1: Bộ Chỉ Số Đánh Giá Đa Chiều (Scoring Breakdown) ─── */}
      {scoring && (
        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-accent-gold" />
              Bộ Chỉ Số Đánh Giá Đa Chiều
            </h4>
            <span className="text-[11px] text-dark-400">
              Thang điểm chuẩn truyền hình 0–100
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* Metric 1: Chất lượng nội dung */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-dark-300 font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  Chất lượng Nội dung & Kịch bản
                </span>
                <span
                  className={cn(
                    'font-mono font-bold text-xs',
                    scoreColor(scoring.contentQuality).text,
                  )}
                >
                  {scoring.contentQuality}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    scoreColor(scoring.contentQuality).bar,
                  )}
                  style={{ width: `${scoring.contentQuality}%` }}
                />
              </div>
            </div>

            {/* Metric 2: Hình thức & Thẩm mỹ dàn dựng */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-dark-300 font-medium flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-purple-400" />
                  Hình thức & Thẩm mỹ Sản xuất
                </span>
                <span
                  className={cn(
                    'font-mono font-bold text-xs',
                    scoreColor(scoring.productionValue).text,
                  )}
                >
                  {scoring.productionValue}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    scoreColor(scoring.productionValue).bar,
                  )}
                  style={{ width: `${scoring.productionValue}%` }}
                />
              </div>
            </div>

            {/* Metric 3: Sức hút & Giữ chân khán giả */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-dark-300 font-medium flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Sức hút & Tương tác Khán giả
                </span>
                <span
                  className={cn(
                    'font-mono font-bold text-xs',
                    scoreColor(scoring.audienceAppeal).text,
                  )}
                >
                  {scoring.audienceAppeal}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    scoreColor(scoring.audienceAppeal).bar,
                  )}
                  style={{ width: `${scoring.audienceAppeal}%` }}
                />
              </div>
            </div>

            {/* Metric 4: An toàn & Chuẩn mực phát sóng */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-dark-300 font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  An toàn & Chuẩn mực Phát sóng
                </span>
                <span
                  className={cn(
                    'font-mono font-bold text-xs',
                    scoreColor(scoring.complianceSafety).text,
                  )}
                >
                  {scoring.complianceSafety}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    scoreColor(scoring.complianceSafety).bar,
                  )}
                  style={{ width: `${scoring.complianceSafety}%` }}
                />
              </div>
            </div>

            {/* Metric 5: Tiềm năng thương mại & Tài trợ */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-dark-300 font-medium flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  Tiềm năng Thương mại & Tài trợ
                </span>
                <span
                  className={cn(
                    'font-mono font-bold text-xs',
                    scoreColor(scoring.commercialPotential).text,
                  )}
                >
                  {scoring.commercialPotential}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    scoreColor(scoring.commercialPotential).bar,
                  )}
                  style={{ width: `${scoring.commercialPotential}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 2: Thẩm định Nội dung chương trình ─── */}
      {content && (
        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700 space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-400" />
            Thẩm Định Nội Dung Chương Trình
          </h4>

          {/* Tóm lược kịch bản */}
          <div className="p-3 rounded-lg bg-dark-800/80 border border-dark-700/80 text-xs text-dark-200 leading-relaxed">
            <p className="font-semibold text-dark-400 uppercase tracking-wider text-[10px] mb-1">
              Tóm lược kịch bản & Nội dung trọng tâm:
            </p>
            {content.summary}
          </div>

          {/* Điểm nhấn nội dung */}
          {content.highlights?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-dark-400 uppercase tracking-wider">
                Điểm nhấn nội dung chính:
              </p>
              <ul className="space-y-1">
                {content.highlights.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-dark-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Điểm mạnh & Điểm cần lưu ý biên tập */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {content.strengths?.length > 0 && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Điểm mạnh nội dung:
                </p>
                <ul className="space-y-1">
                  {content.strengths.map((str, i) => (
                    <li key={i} className="text-[11px] text-dark-200 leading-tight">
                      • {str}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {content.weaknesses?.length > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Lưu ý biên tập:
                </p>
                <ul className="space-y-1">
                  {content.weaknesses.map((weak, i) => (
                    <li key={i} className="text-[11px] text-dark-200 leading-tight">
                      • {weak}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {content.narrativeFlow && (
            <p className="text-xs text-dark-300 pt-1">
              <strong className="text-dark-200">Mạch dẫn dắt:</strong>{' '}
              {content.narrativeFlow}
            </p>
          )}
        </div>
      )}

      {/* ─── SECTION 3: Thẩm định Hình thức & Kỹ thuật Dàn dựng ─── */}
      {format && (
        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Tv className="w-4 h-4 text-purple-400" />
              Hình Thức & Kỹ Thuật Dàn Dựng
            </h4>
          </div>

          {/* Badges thể loại & nhịp độ */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              {format.productionFormat}
            </span>
            {format.pacing && (
              <span
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium border border-dark-700',
                  pacingConfig[format.pacing]?.bg,
                  pacingConfig[format.pacing]?.text,
                )}
              >
                Nhịp điệu: {pacingConfig[format.pacing]?.label ?? format.pacing}
              </span>
            )}
            {format.interactivityLevel && (
              <span
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium border border-dark-700',
                  interactivityConfig[format.interactivityLevel]?.bg,
                  interactivityConfig[format.interactivityLevel]?.text,
                )}
              >
                {interactivityConfig[format.interactivityLevel]?.label ??
                  format.interactivityLevel}
              </span>
            )}
          </div>

          {/* Yêu cầu dàn dựng, âm thanh, hình ảnh */}
          {format.visualAudioRequirements?.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-dark-400" />
                Yêu cầu âm thanh & đồ họa trường quay:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {format.visualAudioRequirements.map((req, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[11px] bg-dark-800 text-dark-200 border border-dark-700"
                  >
                    ✓ {req}
                  </span>
                ))}
              </div>
            </div>
          )}

          {format.technicalRecommendations && (
            <div className="p-2.5 rounded-lg bg-dark-800/60 border border-dark-700 text-xs text-dark-300">
              <span className="font-semibold text-dark-200">
                Khuyến nghị kỹ thuật:
              </span>{' '}
              {format.technicalRecommendations}
            </div>
          )}
        </div>
      )}

      {/* ─── SECTION 4: Phân tích Cảm xúc & Tuân thủ Phát sóng ─── */}
      <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700 space-y-3">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          {t('curator.sentimentAnalysis')} & Tuân Thủ Phát Sóng
        </h4>

        {/* 3 cards: Cảm xúc, Hype, Tuân thủ độ tuổi */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="text-center p-2 rounded-lg bg-dark-800 border border-dark-700">
            <p
              className={cn(
                'text-sm font-bold',
                sentimentColor[report.sentimentAnalysis.overallSentiment],
              )}
            >
              {sentimentLabel[report.sentimentAnalysis.overallSentiment]}
            </p>
            <Tooltip
              content="Cảm xúc tổng thể của nội dung dựa trên ngôn ngữ & ngữ cảnh"
              side="top"
            >
              <p className="text-[11px] text-dark-400 underline decoration-dotted decoration-dark-600 cursor-help mt-0.5">
                {t('curator.sentiment')}
              </p>
            </Tooltip>
          </div>

          <div className="text-center p-2 rounded-lg bg-dark-800 border border-dark-700">
            <p className="text-sm font-bold text-white capitalize">
              {report.sentimentAnalysis.hypeLevel}
            </p>
            <Tooltip
              content="Mức độ bàn tán, mong đợi từ công chúng"
              side="top"
            >
              <p className="text-[11px] text-dark-400 underline decoration-dotted decoration-dark-600 cursor-help mt-0.5">
                {t('curator.hypeLevel')}
              </p>
            </Tooltip>
          </div>

          <div className="text-center p-2 rounded-lg bg-dark-800 border border-dark-700">
            <p
              className={cn(
                'text-sm font-bold',
                report.complianceAssessment.isAgeRestricted
                  ? 'text-red-400'
                  : 'text-green-400',
              )}
            >
              {report.complianceAssessment.ageRating}
            </p>
            <Tooltip
              content="Độ tuổi khuyến nghị theo chuẩn kiểm duyệt phát sóng"
              side="top"
            >
              <p className="text-[11px] text-dark-400 underline decoration-dotted decoration-dark-600 cursor-help mt-0.5">
                Độ tuổi
              </p>
            </Tooltip>
          </div>
        </div>

        {/* Cờ cảnh báo nội dung nếu có */}
        {report.complianceAssessment.flaggedContent &&
          report.complianceAssessment.flaggedContent.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-dark-400 font-medium">
                Cảnh báo kiểm duyệt:
              </span>
              {report.complianceAssessment.flaggedContent.map((flag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30"
                >
                  ⚠ {flag}
                </span>
              ))}
            </div>
          )}
      </div>

      {/* Cảnh báo rủi ro (Risk Warnings) nếu có */}
      {report.riskWarnings && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-300">
                {t('curator.riskWarning')}
              </p>
              <p className="text-xs text-dark-200 mt-0.5 leading-relaxed">
                {report.riskWarnings}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 5: Độ bám sát nội dung (Grounding) ─── */}
      {grounding && groundingToneInfo && (
        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-400" />
              Độ bám sát nội dung
            </h4>
            <span
              className={cn(
                'text-sm font-bold font-mono px-2 py-0.5 rounded border',
                groundingToneInfo.grounding.bg,
                groundingToneInfo.grounding.text,
                groundingToneInfo.grounding.border,
              )}
            >
              {grounding.groundingScore}%
            </span>
          </div>

          {/* Score bar */}
          <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                groundingToneInfo.grounding.bar,
              )}
              style={{ width: `${grounding.groundingScore}%` }}
            />
          </div>
          <p className="text-[11px] text-dark-400 leading-relaxed">
            {groundingToneInfo.label} Điểm này do máy chủ tự chấm bằng cách
            đối chiếu báo cáo với mô tả chương trình — không phải điểm do AI
            tự khai.
          </p>

          {/* Source excerpts */}
          {grounding.sourceExcerpts.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-semibold text-dark-400 uppercase tracking-wider">
                Trích dẫn từ mô tả nguồn:
              </p>
              {grounding.sourceExcerpts.map((excerpt, i) => (
                <blockquote
                  key={i}
                  className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-dark-200 italic leading-relaxed"
                >
                  “{excerpt}”
                </blockquote>
              ))}
            </div>
          )}

          {/* Information gaps */}
          {grounding.infoGaps.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Thiếu thông tin trong mô tả:
              </p>
              <ul className="space-y-1">
                {grounding.infoGaps.map((gap, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[11px] text-dark-200"
                  >
                    <span className="text-amber-400 shrink-0">•</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ─── SECTION 6: Thông số Kỹ thuật Hệ thống & Độ tin cậy ─── */}
      <div className="p-3 rounded-xl bg-dark-900/30 border border-dark-800 space-y-2">
        {showConfidence && confidenceMeta && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-dark-400 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />
                Độ tin cậy mô hình:
              </span>
              <span
                className={cn('font-bold font-mono', confidenceToneClasses[confidenceMeta.tone].text)}
              >
                {confidenceClamped}% · {confidenceMeta.label}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-dark-800 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  confidenceToneClasses[confidenceMeta.tone].bar,
                )}
                style={{ width: `${confidenceClamped}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between text-[11px] text-dark-500 font-mono pt-1">
          <p className="flex items-center gap-1.5">
            <FileText className="w-3 h-3" />
            Model: {report.aiModelVersion ?? 'unknown'} · {report.processingTimeMs ?? 0}ms
          </p>
          {report.agentTimings && (
            <p className="text-[10px] text-dark-500">
              S: {report.agentTimings.sentimentMs ?? 0}ms · C:{' '}
              {report.agentTimings.complianceMs ?? 0}ms · E:{' '}
              {report.agentTimings.editorialMs ?? 0}ms
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
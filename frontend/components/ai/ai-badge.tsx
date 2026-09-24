import { cn } from '@/lib/utils';
import { Bot, AlertTriangle, Clock, Target, Shield, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

interface AiBadgeProps {
  report: {
    broadcastSuitability: 'PRIME_TIME' | 'STANDARD' | 'RESTRICTED';
    suggestedTimeSlot: string;
    targetAudienceVibe: string;
    riskWarnings: string;
    sentimentAnalysis: {
      overallSentiment: 'positive' | 'neutral' | 'negative';
      hypeLevel: 'low' | 'medium' | 'high';
      audienceEngagement: number;
    };
    complianceAssessment: {
      isAgeRestricted: boolean;
      ageRating: 'PG' | 'T13' | 'T16' | 'T18';
      flaggedContent: string[];
      recommendedBroadcastWindow: 'DAY' | 'EVENING' | 'LATE_NIGHT';
    };
    aiModelVersion: string;
    processingTimeMs: number;
  };
  className?: string;
}

export function AiBadge({ report, className }: AiBadgeProps) {
  const suitabilityConfig = {
    PRIME_TIME: { label: 'Giờ vàng', color: 'bg-accent-gold/20 text-accent-gold border-accent-gold/30', icon: '★' },
    STANDARD: { label: 'Phát sóng thường', color: 'bg-primary-500/20 text-primary-400 border-primary-500/30', icon: '◆' },
    RESTRICTED: { label: 'Hạn chế', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '⚠' },
  };

  const config = suitabilityConfig[report.broadcastSuitability];

  const sentimentConfig = {
    positive: { icon: ThumbsUp, color: 'text-green-400', label: 'Tích cực' },
    neutral: { icon: Minus, color: 'text-yellow-400', label: 'Trung lập' },
    negative: { icon: ThumbsDown, color: 'text-red-400', label: 'Tiêu cực' },
  };

  const sentiment = sentimentConfig[report.sentimentAnalysis.overallSentiment];
  const SentimentIcon = sentiment.icon;

  const hypeConfig = {
    low: { label: 'Thấp', color: 'bg-dark-600' },
    medium: { label: 'Trung bình', color: 'bg-yellow-500/50' },
    high: { label: 'Cao', color: 'bg-red-500' },
  };

  return (
    <div className={cn('rounded-xl border border-dark-700 bg-dark-800/50 overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600/20 to-accent-cyan/20 px-4 py-3 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Curator Report</h3>
              <p className="text-xs text-dark-400">
                Phân tích bởi OmniCast AI • v{report.aiModelVersion}
              </p>
            </div>
          </div>
          <div className={cn(
            'px-3 py-1 rounded-full text-xs font-bold border',
            config.color
          )}>
            {config.icon} {config.label}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Suggested Time & Audience */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-dark-400">
              <Clock className="w-3.5 h-3.5" />
              Khung giờ đề xuất
            </div>
            <p className="font-medium text-white">{report.suggestedTimeSlot}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-dark-400">
              <Target className="w-3.5 h-3.5" />
              Đối tượng mục tiêu
            </div>
            <p className="font-medium text-white">{report.targetAudienceVibe}</p>
          </div>
        </div>

        {/* Risk Warnings */}
        {report.riskWarnings && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Cảnh báo</p>
              <p className="text-sm text-dark-300">{report.riskWarnings}</p>
            </div>
          </div>
        )}

        {/* Sentiment Analysis */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Phân tích tình cảm</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-dark-900/50">
              <SentimentIcon className={cn('w-4 h-4 mx-auto mb-1', sentiment.color)} />
              <p className="text-xs text-white">{sentiment.label}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-dark-900/50">
              <div className={cn(
                'w-4 h-4 rounded-full mx-auto mb-1',
                hypeConfig[report.sentimentAnalysis.hypeLevel].color
              )} />
              <p className="text-xs text-white">Hype {hypeConfig[report.sentimentAnalysis.hypeLevel].label}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-dark-900/50">
              <div className="text-lg font-bold text-white mb-0.5">
                {report.sentimentAnalysis.audienceEngagement}%
              </div>
              <p className="text-xs text-dark-400">Tương tác</p>
            </div>
          </div>
        </div>

        {/* Compliance Assessment */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Đánh giá tuân thủ</h4>
          <div className="flex flex-wrap items-center gap-2">
            {report.complianceAssessment.isAgeRestricted ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">
                <Shield className="w-3 h-3" />
                Giới hạn {report.complianceAssessment.ageRating}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/30">
                <Shield className="w-3 h-3" />
                An toàn {report.complianceAssessment.ageRating}
              </span>
            )}
            {report.complianceAssessment.flaggedContent.map((flag, i) => (
              <span key={i} className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs border border-yellow-500/30">
                {flag}
              </span>
            ))}
          </div>
          <div className="text-xs text-dark-400 mt-2">
            Khuyến nghị phát:{' '}
            <span className="text-white">
              {report.complianceAssessment.recommendedBroadcastWindow === 'DAY' ? 'Ban ngày' :
               report.complianceAssessment.recommendedBroadcastWindow === 'EVENING' ? 'Buổi tối' : 'Đêm khuya'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-dark-900/50 border-t border-dark-700 text-xs text-dark-500">
        Xử lý trong {report.processingTimeMs}ms • {report.aiModelVersion}
      </div>
    </div>
  );
}

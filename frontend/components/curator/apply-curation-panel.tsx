// ============================================================
// OmniCast - Curator · Apply Curation Panel
// ============================================================
//
// Mode 3 surface — push selected AI suggestions back to the
// program. Each row is a self-contained `ApplyField` showing the
// current value next to the suggested one, with a single
// "Áp dụng" button. Disabled when there's nothing to apply.
// ============================================================

'use client';

import {
  CheckCircle2,
  FileText,
  Loader2,
  Timer,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseSuggestedTime, truncate } from '@/lib/utils/curator-helpers';
import { useI18n } from '@/lib/i18n/i18n-provider';
import type { AiCuratorReport } from '@/types';

interface ApplyCurationPanelProps {
  row: {
    id: string;
    title: string;
    description: string;
    scheduledAt: string;
    status: string;
    aiReport?: AiCuratorReport;
  };
  onApply: (fields: { description?: string; scheduledAt?: string }) => void;
  loading: boolean;
}

export function ApplyCurationPanel({
  row,
  onApply,
  loading,
}: ApplyCurationPanelProps) {
  const { t } = useI18n();
  const report = row.aiReport;
  if (!report) return null;

  // Parse the model's "21:00 - 23:00" suggestion into an ISO timestamp
  // on the same day as the program's scheduledAt. The end time is
  // intentionally ignored — we only push the START.
  const suggestedStart = parseSuggestedTime(
    report.suggestedTimeSlot,
    row.scheduledAt,
  );

  // Use the curator's vibe description as the new description ONLY
  // when it differs from the current. Otherwise the button is
  // disabled (no diff → no-op).
  const liveDescription = row.description || '';
  const suggestedDescription = report.targetAudienceVibe || liveDescription;

  return (
    <div className="p-4 rounded-lg bg-dark-900/50 border border-cyan-500/30">
      <h4 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-cyan-400" />
        {t('curator.applySuggestions')}
      </h4>
      <div className="space-y-3">
        <ApplyField
          icon={<Timer className="w-3.5 h-3.5" />}
          label={t('curator.changeTime')}
          currentValue={row.scheduledAt}
          suggestedValue={suggestedStart}
          onApply={(v) => onApply({ scheduledAt: v })}
          loading={loading}
          formatter={formatScheduledAt}
          currentLabel={t('curator.current')}
          suggestedLabel={t('curator.suggested')}
          applyLabel={t('curator.apply')}
        />
        <ApplyField
          icon={<FileText className="w-3.5 h-3.5" />}
          label={t('curator.updateDescription')}
          currentValue={liveDescription}
          suggestedValue={suggestedDescription}
          onApply={(v) => onApply({ description: v })}
          loading={loading}
          currentLabel={t('curator.current')}
          suggestedLabel={t('curator.suggested')}
          applyLabel={t('curator.apply')}
        />
      </div>
    </div>
  );
}

interface ApplyFieldProps {
  icon: React.ReactNode;
  label: string;
  currentValue: string;
  suggestedValue?: string;
  onApply: (value: string) => void;
  loading: boolean;
  formatter?: (value: string) => string;
  currentLabel: string;
  suggestedLabel: string;
  applyLabel: string;
}

function ApplyField({
  icon,
  label,
  currentValue,
  suggestedValue,
  onApply,
  loading,
  formatter,
  currentLabel,
  suggestedLabel,
  applyLabel,
}: ApplyFieldProps) {
  const format = formatter ?? ((v: string) => v);
  const hasSuggestion =
    suggestedValue !== undefined &&
    suggestedValue !== currentValue &&
    suggestedValue.length > 0;

  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <div className="flex-1 min-w-0">
        <p className="text-dark-300 font-medium flex items-center gap-1.5">
          {icon}
          {label}
        </p>
        <p
          className="text-dark-500 mt-0.5 truncate"
          title={format(currentValue)}
        >
          {currentLabel}: {truncate(format(currentValue), 60)}
        </p>
        {hasSuggestion && (
          <p
            className="text-cyan-300 mt-0.5"
            title={format(suggestedValue ?? '')}
          >
            {suggestedLabel}: {truncate(format(suggestedValue ?? ''), 60)}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={!hasSuggestion || loading}
        onClick={() => onApply(suggestedValue as string)}
        className="gap-1"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <CheckCircle2 className="w-3 h-3" />
        )}
        {applyLabel}
      </Button>
    </div>
  );
}

function formatScheduledAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
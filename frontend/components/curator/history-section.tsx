// ============================================================
// OmniCast - Curator · History Section
// ============================================================
//
// Collapsible list of the last 10 AI reports for a program. Each
// row surfaces the model version, processing time, token usage,
// and creation timestamp. Lets a curator audit model runs
// without rerunning the pipeline.
// ============================================================

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { History, Loader2 } from 'lucide-react';
import type { AiCuratorHistoryItem } from '@/lib/api/ai-curator';

interface HistorySectionProps {
  history?: AiCuratorHistoryItem[];
  isLoading: boolean;
}

export function HistorySection({ history, isLoading }: HistorySectionProps) {
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-3 rounded-lg border border-dark-700 text-xs text-dark-500 flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        Đang tải lịch sử...
      </div>
    );
  }

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-dark-700 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-3 flex items-center justify-between text-left text-sm font-medium text-dark-200 hover:bg-dark-800/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <History className="w-4 h-4 text-dark-400" />
          Lịch sử báo cáo ({history.length})
        </span>
        <span className="text-xs text-dark-500">{open ? 'Ẩn' : 'Hiện'}</span>
      </button>
      {open && (
        <div className="divide-y divide-dark-700/70 bg-dark-900/30">
          {history.map((h) => (
            <HistoryRow key={h.id} item={h} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ item }: { item: AiCuratorHistoryItem }) {
  return (
    <div className="p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-dark-300 font-medium">
          {item.broadcastSuitability} · {item.suggestedTimeSlot}
        </span>
        <span className="text-dark-500 font-mono">
          {format(new Date(item.createdAt), 'dd/MM HH:mm')}
        </span>
      </div>
      <div className="text-dark-500 mt-1 font-mono">
        {item.aiModelVersion} · {item.processingTimeMs}ms ·{' '}
        {item.tokenUsed ?? 0} tokens
      </div>
      {item.targetAudienceVibe && (
        <div className="text-dark-400 mt-1 line-clamp-1">
          {item.targetAudienceVibe}
        </div>
      )}
    </div>
  );
}
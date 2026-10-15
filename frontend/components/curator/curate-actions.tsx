// ============================================================
// OmniCast - Curator · Curate Actions
// ============================================================
//
// Three buttons that drive the lifecycle of a single program in the
// Studio Curator:
//
//   • "Phân tích lại"  — Mode 2 (preview, no DB write)
//   • "Lưu báo cáo"   — Mode 1 (persists a fresh report)
//
// The "Đã lưu" pill + ID label give the curator confidence that
// their last action went through.
// ============================================================

'use client';

import {
  CheckCircle2,
  Eye,
  Hash,
  Loader2,
  Save,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CurateActionsProps {
  row: {
    id: string;
  };
  onPreview: () => void;
  onCurate: () => void;
  analyzing: boolean;
  curating: boolean;
  isPersisted: boolean;
}

export function CurateActions({
  row,
  onPreview,
  onCurate,
  analyzing,
  curating,
  isPersisted,
}: CurateActionsProps) {
  return (
    <div className="p-4 rounded-lg bg-dark-900/50 border border-purple-500/30">
      <h4 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-purple-400" />
        Hành động
      </h4>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onPreview}
          disabled={analyzing || curating}
          className="gap-1"
        >
          {analyzing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Eye className="w-3 h-3" />
          )}
        Phân tích lại
        </Button>
        <Button
          size="sm"
          onClick={onCurate}
          disabled={curating}
          className="gap-1"
        >
          {curating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          {isPersisted ? 'Chạy lại & lưu' : 'Lưu báo cáo'}
        </Button>
        {isPersisted && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded px-2 py-1">
            <CheckCircle2 className="w-3 h-3" />
            Đã lưu
          </span>
        )}
        <span className="text-xs text-dark-500 self-center ml-auto flex items-center gap-1">
          <Hash className="w-3 h-3" />#{row.id.slice(0, 8)}
        </span>
      </div>
    </div>
  );
}
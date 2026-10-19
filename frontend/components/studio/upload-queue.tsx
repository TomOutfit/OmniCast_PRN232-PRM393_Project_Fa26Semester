// ============================================================
// OmniCast - Upload Queue (Premium)
// ============================================================
//
// The replacement for the legacy "Nội Dung Đã Chọn Từ Máy Tính
// (PC)" block in Mode 1 of the Studio. Renders one row per
// queued local file with:
//
//   • 96×64 thumbnail (with circular progress ring overlay during
//     `signing` / `uploading` / `registering`).
//   • Editable title (inline).
//   • Phase pill (`pending` / `signing` / `uploading` /
//     `registering` / `done` / `failed` / `cancelled`).
//   • Progress bar with ETA + speed (`X.X MB/s · còn ~MM:SS`).
//   • Per-row actions:
//       - Cancel (only when phase is non-terminal).
//       - Retry (only when phase is `failed`).
//       - Remove (only when phase is `done`).
//       - Preview (when phase is `done` and we have a URL).
//
// Micro-interactions:
//   • Hover: `scale-[1.01]` + cyan ring.
//   • Press: `scale-[0.99]`.
//   • Phase pill uses `bg-gradient-to-r` colour coding.
// ============================================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Trash2,
  Play,
  FileVideo,
  Mic,
  Upload,
  HardDrive,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LocalPcFile } from '@/app/studio/live/page';

// ------------------------------------------------------------
// Phase + envelope types shared with the page
// ------------------------------------------------------------

export type UploadPhase =
  | 'pending'
  | 'signing'
  | 'uploading'
  | 'registering'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface UploadQueueEntry extends LocalPcFile {
  phase: UploadPhase;
  percent: number; // 0..100 across all sub-phases
  /** Bytes-per-second of the in-flight XHR, computed by the page. */
  speedBps?: number;
  /** ETA in seconds computed from `speedBps`. */
  etaSec?: number;
  /** Cloudinary public_id, set after a successful upload. */
  publicId?: string;
  /** Recording id, set after a successful register. */
  recordingId?: string;
  /** Error message — only set when phase is `failed`. */
  error?: string;
  /** True when probe detected audio-only (no video track). */
  isAudioOnly?: boolean;
}

export interface UploadQueueProps {
  entries: UploadQueueEntry[];
  focusedId: string | null;
  onFocus: (id: string) => void;
  onChangeTitle: (id: string, title: string) => void;
  onToggleSelected: (id: string) => void;
  onPreview: (entry: UploadQueueEntry) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

export function UploadQueue(props: UploadQueueProps) {
  const {
    entries,
    focusedId,
    onFocus,
    onChangeTitle,
    onToggleSelected,
    onPreview,
    onCancel,
    onRetry,
    onRemove,
  } = props;

  // Keyboard shortcuts: Esc cancels focused upload, Enter retries
  // focused failed upload, Space toggles selection. Bound at the
  // queue level so we only listen once.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!focusedId) return;
      const target = e.target as HTMLElement | null;
      // Don't hijack typing inside the inline title input.
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel(focusedId);
      } else if (e.key === 'Enter') {
        const entry = entries.find((x) => x.id === focusedId);
        if (entry?.phase === 'failed') {
          e.preventDefault();
          onRetry(focusedId);
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        onToggleSelected(focusedId);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusedId, entries, onCancel, onRetry, onToggleSelected]);

  // Aggregate stats for the panel above the list
  const stats = useMemo(() => {
    const total = entries.length;
    let done = 0;
    let failed = 0;
    let uploading = 0;
    let pending = 0;
    let cancelled = 0;
    for (const e of entries) {
      switch (e.phase) {
        case 'done':
          done++;
          break;
        case 'failed':
          failed++;
          break;
        case 'cancelled':
          cancelled++;
          break;
        case 'pending':
          pending++;
          break;
        default:
          uploading++;
      }
    }
    return { total, done, failed, uploading, pending, cancelled };
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header + counters */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Hàng chờ upload
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            ({stats.total} file · {stats.done} xong
            {stats.failed > 0 && ` · ${stats.failed} lỗi`}
            {stats.uploading > 0 && ` · ${stats.uploading} đang chạy`}
            {stats.pending > 0 && ` · ${stats.pending} chờ`}
            )
          </span>
        </div>
      </div>

      {/* Row list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 divide-y divide-[#18273c]">
        {entries.map((entry) => (
          <UploadRow
            key={entry.id}
            entry={entry}
            focused={focusedId === entry.id}
            onFocus={() => onFocus(entry.id)}
            onChangeTitle={(t) => onChangeTitle(entry.id, t)}
            onToggleSelected={() => onToggleSelected(entry.id)}
            onPreview={() => onPreview(entry)}
            onCancel={() => onCancel(entry.id)}
            onRetry={() => onRetry(entry.id)}
            onRemove={() => onRemove(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// UploadRow — single file row
// ============================================================

interface UploadRowProps {
  entry: UploadQueueEntry;
  focused: boolean;
  onFocus: () => void;
  onChangeTitle: (title: string) => void;
  onToggleSelected: () => void;
  onPreview: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onRemove: () => void;
}

function UploadRow({
  entry,
  focused,
  onFocus,
  onChangeTitle,
  onToggleSelected,
  onPreview,
  onCancel,
  onRetry,
  onRemove,
}: UploadRowProps) {
  const isTerminal = entry.phase === 'done' || entry.phase === 'cancelled';
  const isInFlight =
    entry.phase === 'signing' ||
    entry.phase === 'uploading' ||
    entry.phase === 'registering';

  return (
    <div
      tabIndex={0}
      onClick={onFocus}
      className={cn(
        'p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3',
        'hover:scale-[1.005] active:scale-[0.995]',
        // Selection + focus styling
        entry.isSelected
          ? 'bg-cyan-950/60 border-cyan-500/50 shadow-[0_0_24px_rgba(0,242,254,0.12)]'
          : 'bg-[#09101d] border-[#18273c] opacity-90',
        focused && 'ring-2 ring-cyan-400/30',
      )}
    >
      {/* Left cluster — checkbox + thumbnail + title + meta */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={entry.isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelected();
          }}
          disabled={!isTerminal && entry.phase !== 'failed'}
          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer disabled:opacity-50"
        />

        {/* Thumbnail with optional progress ring */}
        <div className="relative w-24 h-16 rounded-lg bg-black overflow-hidden flex-shrink-0 border border-cyan-900/40">
          {entry.thumbnailUrl && !entry.isAudioOnly ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.thumbnailUrl}
              alt={entry.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-cyan-400 bg-gradient-to-br from-[#05080e] to-[#0a1018]">
              {entry.isAudioOnly ? (
                <Mic className="w-5 h-5" />
              ) : (
                <FileVideo className="w-5 h-5" />
              )}
            </div>
          )}
          {/* Duration badge */}
          <span className="absolute bottom-0.5 right-0.5 px-1 rounded text-[9px] font-mono bg-black/80 text-white font-bold">
            {formatTime(entry.duration)}
          </span>
          {/* Circular progress overlay while in flight */}
          {isInFlight && (
            <CircularProgressOverlay percent={entry.percent} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={entry.title}
            onChange={(e) => onChangeTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-cyan-500/40 focus:border-cyan-400 focus:outline-none truncate"
            title="Click để chỉnh sửa tiêu đề file"
            disabled={entry.phase === 'registering'}
          />
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950 px-1 rounded border border-cyan-800">
              {entry.sizeMb} MB
            </span>
            <span className="text-[9px] text-slate-400 truncate">
              {entry.file.type || 'video'}
            </span>
            {entry.isAudioOnly && (
              <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1 rounded">
                AUDIO ONLY
              </span>
            )}
          </div>
          {/* Progress text line */}
          {isInFlight && (
            <div className="mt-1.5 flex items-center gap-2">
              <UploadProgressBar
                percent={entry.percent}
                speedBps={entry.speedBps}
                etaSec={entry.etaSec}
                phase={entry.phase}
              />
            </div>
          )}
          {entry.phase === 'failed' && entry.error && (
            <p className="mt-1 text-[10px] text-rose-300 truncate" title={entry.error}>
              {entry.error}
            </p>
          )}
        </div>
      </div>

      {/* Right cluster — phase pill + actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <PhasePill phase={entry.phase} percent={entry.percent} />

        {entry.phase === 'done' && entry.recordingId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="p-1.5 rounded-lg bg-[#0c1422] hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-[#1b2b42] transition-colors"
            title="Xem thử video"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        )}

        {isInFlight && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="p-1.5 rounded-lg bg-[#0c1422] hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-[#1b2b42] transition-colors"
            title="Huỷ upload file này"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        )}

        {entry.phase === 'failed' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            className="p-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-500/40 transition-colors"
            title="Thử lại"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {(entry.phase === 'done' || entry.phase === 'failed' || entry.phase === 'cancelled') && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 rounded-lg bg-[#0c1422] hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-[#1b2b42] transition-colors"
            title="Bỏ file này"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PhasePill — coloured status indicator
// ============================================================

function PhasePill({ phase, percent }: { phase: UploadPhase; percent: number }) {
  const map: Record<UploadPhase, { label: string; className: string; icon?: React.ReactNode }> = {
    pending: {
      label: 'Chờ',
      className: 'bg-[#152339] text-slate-300 border-[#1b2b42]',
    },
    signing: {
      label: 'Đang ký',
      className: 'bg-amber-950/70 text-amber-300 border-amber-500/40',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    uploading: {
      label: `Upload ${percent}%`,
      className: 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40',
      icon: <Upload className="w-3 h-3" />,
    },
    registering: {
      label: 'Đăng ký',
      className: 'bg-purple-950/70 text-purple-300 border-purple-500/40',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    done: {
      label: 'Sẵn sàng',
      className: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    failed: {
      label: 'Lỗi',
      className: 'bg-rose-950/70 text-rose-300 border-rose-500/40',
      icon: <XCircle className="w-3 h-3" />,
    },
    cancelled: {
      label: 'Đã huỷ',
      className: 'bg-slate-800 text-slate-400 border-slate-600',
      icon: <AlertCircle className="w-3 h-3" />,
    },
  };
  const cfg = map[phase];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold tracking-wide',
        cfg.className,
      )}
    >
      {cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
}

// ============================================================
// UploadProgressBar — inline progress bar with ETA
// ============================================================

function UploadProgressBar({
  percent,
  speedBps,
  etaSec,
  phase,
}: {
  percent: number;
  speedBps?: number;
  etaSec?: number;
  phase: UploadPhase;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 text-[9px] font-mono text-slate-400">
        <span>
          {phase === 'signing' && 'Đang ký payload với Cloudinary…'}
          {phase === 'uploading' && `Đang upload ${percent}%`}
          {phase === 'registering' && 'Đang đăng ký vào kho kênh…'}
        </span>
        <span className="flex items-center gap-1.5 tabular-nums">
          {phase === 'uploading' && speedBps !== undefined && speedBps > 0 && (
            <>
              <span>{formatBytes(speedBps)}/s</span>
              {etaSec !== undefined && etaSec > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span>còn ~{formatEta(etaSec)}</span>
                </>
              )}
            </>
          )}
        </span>
      </div>
      <div className="relative h-1.5 mt-0.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 transition-[width] duration-150"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
        {/* Animated shine effect while uploading */}
        {phase === 'uploading' && (
          <div
            className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            style={{
              animation: 'progress-shine 1.2s linear infinite',
            }}
          />
        )}
      </div>
      <style jsx>{`
        @keyframes progress-shine {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(800%);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// CircularProgressOverlay — small radial ring on the thumbnail
// ============================================================

function CircularProgressOverlay({ percent }: { percent: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;
  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
      <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke="url(#progress-gradient)"
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-150"
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-[10px] font-bold font-mono text-white">
        {Math.round(percent)}
      </span>
    </div>
  );
}

// ============================================================
// Formatting helpers (shared with the page)
// ============================================================

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function formatEta(secs: number): string {
  if (secs < 60) return `${Math.ceil(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.ceil(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
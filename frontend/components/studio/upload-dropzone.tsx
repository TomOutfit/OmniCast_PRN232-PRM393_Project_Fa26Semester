// ============================================================
// OmniCast - Upload Dropzone (Premium)
// ============================================================
//
// A glassmorphism drag-and-drop zone used by Mode 1 of the web
// Studio. Replaces the old "Chọn file trong máy (PC)" button
// with a full-width drop area that supports both click and
// native HTML5 drag events.
//
// Why no `react-dropzone` dependency?
//   • The component is small enough that adding a 9 KB dep just
//     for one zone is wasteful. Native `onDragOver` / `onDrop`
//     covers everything we need.
//
// Behaviour:
//   • Empty: dashed border, FolderUp icon, "Kéo thả hoặc click
//     để chọn" copy in Vietnamese.
//   • Drag-over: cyan border + tinted background + cyan glow.
//   • Drop or click → same `onFiles(FileList)` callback.
//   • Accepts video/* and audio/* only. 100 MB cap surfaced as
//     helper text.
// ============================================================

'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { FolderUp, FileVideo, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ACCEPTED_MIME = 'video/*,audio/*';
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

export interface UploadDropzoneProps {
  /** Called when the user picks files via picker or drops them. */
  onFiles: (files: File[]) => void;
  /** Optional className for layout tweaks. */
  className?: string;
  /** When true, renders a compact 110 px variant (used in embedded contexts). */
  compact?: boolean;
}

export function UploadDropzone({
  onFiles,
  className,
  compact = false,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handlePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const accepted: File[] = [];
      const rejected: File[] = [];

      for (const f of files) {
        if (f.size > MAX_BYTES) {
          rejected.push(f);
        } else {
          accepted.push(f);
        }
      }

      if (rejected.length > 0) {
        toast.error(
          `${rejected.length} file vượt quá giới hạn 2 GB của hệ thống: ${rejected.map((f) => `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`).join(', ')}. Hãy nén video hoặc dùng "Thêm qua URL".`,
        );
      }

      if (accepted.length > 0) onFiles(accepted);
      // Reset so picking the same file twice still fires `change`.
      if (inputRef.current) inputRef.current.value = '';
    },
    [onFiles],
  );

  // ── Drag handlers ──────────────────────────────────────────
  // We only care about the actual `drop` event; `dragover` is
  // intercepted solely to flip the visual state and to call
  // `preventDefault()` (otherwise the browser navigates to the
  // file when the user drops it).

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types?.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only flip off when leaving the zone itself, not when crossing
    // over a child element. We do that by checking that the related
    // target is outside the current node.
    const next = e.relatedTarget as Node | null;
    if (!next || !e.currentTarget.contains(next)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      const accepted: File[] = [];
      const rejected: File[] = [];

      for (const f of files) {
        if (f.type && !f.type.startsWith('video/') && !f.type.startsWith('audio/')) {
          continue;
        }
        if (f.size > MAX_BYTES) {
          rejected.push(f);
        } else {
          accepted.push(f);
        }
      }

      if (rejected.length > 0) {
        toast.error(
          `${rejected.length} file vượt quá giới hạn 2 GB: ${rejected.map((f) => `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`).join(', ')}. Hãy nén video hoặc dùng "Thêm qua URL".`,
        );
      }

      if (accepted.length > 0) onFiles(accepted);
    },
    [onFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Kéo thả file video hoặc audio vào đây, hoặc click để chọn"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'group relative cursor-pointer overflow-hidden',
        'rounded-2xl border-2 border-dashed transition-all duration-200',
        'bg-white/[0.02] backdrop-blur-md',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        // Drag-over state — cyan glow + tinted background
        isDragOver
          ? 'border-cyan-400/80 bg-cyan-500/[0.08] shadow-[0_0_40px_rgba(0,242,254,0.25),inset_0_1px_0_rgba(255,255,255,0.1)] scale-[1.01]'
          : 'border-[#1e2d44] hover:border-cyan-500/50 hover:bg-white/[0.04] hover:shadow-[0_0_24px_rgba(0,242,254,0.12)]',
        compact ? 'p-4' : 'p-8',
        className,
      )}
    >
      {/* Hidden file input — same trick as the old code */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME}
        multiple
        onChange={handlePickerChange}
        className="hidden"
      />

      {/* Decorative animated dashed gradient on drag-over */}
      {isDragOver && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(0,242,254,0.15) 0 12px, transparent 12px 24px)',
            animation: 'dropzone-pulse 1.6s linear infinite',
          }}
        />
      )}

      <div className={cn('relative flex flex-col items-center text-center', compact ? 'gap-2' : 'gap-3')}>
        {/* Icon cluster */}
        <div
          className={cn(
            'relative flex items-center justify-center transition-transform duration-200',
            isDragOver ? 'scale-110' : 'group-hover:scale-105',
            compact ? 'w-10 h-10' : 'w-16 h-16',
          )}
        >
          <div
            className={cn(
              'absolute inset-0 rounded-2xl transition-opacity duration-200',
              'bg-gradient-to-tr from-cyan-500/20 to-blue-600/20',
              isDragOver ? 'opacity-100' : 'opacity-60 group-hover:opacity-100',
            )}
          />
          <FolderUp
            className={cn(
              'relative z-10 text-cyan-300 drop-shadow-[0_0_12px_rgba(0,242,254,0.4)]',
              compact ? 'w-5 h-5' : 'w-8 h-8',
            )}
          />
        </div>

        <div className="space-y-1">
          <p
            className={cn(
              'font-bold text-white',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {isDragOver
              ? 'Thả file để thêm vào hàng chờ'
              : 'Kéo thả video/audio vào đây hoặc click để chọn'}
          </p>
          {!compact && (
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-md mx-auto">
              Upload trực tiếp lên Cloudinary CDN — không qua API host, không giới hạn 4.5 MB.
            </p>
          )}
        </div>

        {/* Helper row — supported types + size cap */}
        {!compact && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#05080e]/80 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-900/60">
              <FileVideo className="w-3 h-3" />
              MP4 · MOV · WEBM · MKV
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#05080e]/80 text-[10px] font-mono font-bold text-purple-300 border border-purple-900/60">
              <Mic className="w-3 h-3" />
              MP3 · M4A · OGG
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.04] text-[10px] font-mono font-bold text-slate-300 border border-white/10">
              Tối đa 2 GB / file
            </span>
          </div>
        )}
      </div>

      {/* Inline keyframes for the drag-over pulse — Tailwind
          doesn't ship a `dropzone-pulse` animation by default. */}
      <style jsx>{`
        @keyframes dropzone-pulse {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 48px 0;
          }
        }
      `}</style>
    </div>
  );
}
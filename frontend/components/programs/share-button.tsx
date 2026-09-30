'use client';

import { useState } from 'react';
import { Share2, Link as LinkIcon, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  /** Absolute or relative URL to share. Required. */
  url: string;
  /** Title used by `navigator.share()`. */
  title: string;
  /** Optional description / text body. */
  description?: string;
  /** Hit the backend `/share` endpoint to bump the share counter. */
  onCount?: () => Promise<unknown> | unknown;
  variant?: 'pill' | 'icon' | 'stat';
  /** Render-only count when `variant="stat"`. */
  count?: number | string | bigint;
  className?: string;
}

/**
 * Real share button: prefers the native share sheet on mobile browsers,
 * falls back to copying the URL to the clipboard on desktop. Optionally
 * bumps the server-side share counter via `onCount`.
 */
export function ShareButton({
  url,
  title,
  description,
  onCount,
  variant = 'pill',
  count,
  className,
}: ShareButtonProps) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      setPending(true);
      const fullUrl =
        typeof window !== 'undefined' && url.startsWith('/')
          ? `${window.location.origin}${url}`
          : url;

      const nav = (typeof navigator !== 'undefined'
        ? (navigator as Navigator & {
            share?: (data: {
              title?: string;
              text?: string;
              url?: string;
            }) => Promise<void>;
            clipboard?: { writeText?: (s: string) => Promise<void> };
          })
        : null);

      const hasNativeShare = !!nav?.share;
      // `canShare` is a stronger test (mobile Chrome accepts URL shares
      // but desktop Chrome rejects some payloads).
      const canShare =
        hasNativeShare &&
        (!nav!.canShare ||
          nav!.canShare({
            title,
            text: description,
            url: fullUrl,
          }));

      if (canShare && nav) {
        await nav.share({
          title,
          text: description,
          url: fullUrl,
        });
        toast.success('Đã chia sẻ');
      } else if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Đã sao chép liên kết');
      } else {
        // Last-resort fallback for very old browsers
        const ta = document.createElement('textarea');
        ta.value = fullUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Đã sao chép liên kết');
      }

      if (onCount) {
        await Promise.resolve(onCount()).catch(() => undefined);
      }
    } catch (err: any) {
      // User cancelling the share sheet should not look like an error.
      if (err?.name === 'AbortError') return;
      toast.error('Không thể chia sẻ', {
        description: err?.message ?? 'Lỗi không xác định',
      });
    } finally {
      setPending(false);
    }
  };

  if (variant === 'stat') {
    const v =
      count == null
        ? 0
        : typeof count === 'bigint'
          ? Number(count)
          : Number(count);
    const display =
      v >= 1_000_000
        ? `${(v / 1_000_000).toFixed(1)}M`
        : v >= 1_000
          ? `${(v / 1_000).toFixed(0)}K`
          : String(v);
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-1.5 text-dark-300 hover:text-primary-300 transition-colors disabled:opacity-60',
          className,
        )}
        aria-label="Chia sẻ"
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
        <span>{display}</span>
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label="Chia sẻ"
        className={cn(
          'inline-flex items-center justify-center w-10 h-10 rounded-full border bg-dark-800/50 border-dark-700 text-dark-300 hover:border-primary-500/50 hover:text-primary-300 transition-colors disabled:opacity-60',
          className,
        )}
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60',
        'bg-dark-800/50 border-dark-700 text-dark-200 hover:border-primary-500/50 hover:text-primary-300',
        className,
      )}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : copied ? (
        <>
          <Check className="w-4 h-4 text-green-400" />
          <span>Đã sao chép</span>
        </>
      ) : (
        <>
          <LinkIcon className="w-4 h-4" />
          <span>Chia sẻ</span>
        </>
      )}
    </button>
  );
}

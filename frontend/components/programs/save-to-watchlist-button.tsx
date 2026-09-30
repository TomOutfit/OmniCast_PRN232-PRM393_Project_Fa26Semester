'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  useAddToWatchlist,
  useIsInWatchlist,
  useRemoveFromWatchlistByProgramId,
} from '@/lib/hooks/useWatchlist';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface SaveToWatchlistButtonProps {
  programId: string;
  channelId?: string;
  /** Layout — `pill` (default) renders inline; `icon` is a square icon-only button. */
  variant?: 'pill' | 'icon';
  className?: string;
}

export function SaveToWatchlistButton({
  programId,
  channelId,
  variant = 'pill',
  className,
}: SaveToWatchlistButtonProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [pendingAdd, setPendingAdd] = useState(false);

  const { isInWatchlist, watchlistId } = useIsInWatchlist(programId);
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlistByProgramId();

  const isPending = add.isPending || remove.isPending || pendingAdd;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Đăng nhập để lưu chương trình');
      router.push('/login');
      return;
    }
    try {
      if (isInWatchlist) {
        await remove.mutateAsync(programId);
        toast.success('Đã bỏ khỏi danh sách yêu thích');
      } else {
        setPendingAdd(true);
        await add.mutateAsync({ programId, channelId });
        toast.success('Đã lưu vào danh sách yêu thích');
      }
    } catch (err: any) {
      toast.error('Không thể cập nhật danh sách', {
        description: err?.response?.data?.message || err?.message,
      });
    } finally {
      setPendingAdd(false);
    }
  };

  const label = isInWatchlist ? 'Đã lưu' : 'Lưu';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label={isInWatchlist ? 'Bỏ lưu' : 'Lưu chương trình'}
        aria-pressed={isInWatchlist}
        className={cn(
          'inline-flex items-center justify-center w-10 h-10 rounded-full border transition-colors disabled:opacity-60',
          isInWatchlist
            ? 'bg-primary-500/15 border-primary-500/50 text-primary-300 hover:bg-primary-500/25'
            : 'bg-dark-800/50 border-dark-700 text-dark-300 hover:border-primary-500/50 hover:text-primary-300',
          className,
        )}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isInWatchlist ? (
          <BookmarkCheck className="w-4 h-4" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isInWatchlist}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60',
        isInWatchlist
          ? 'bg-primary-500/15 border-primary-500/50 text-primary-300 hover:bg-primary-500/25'
          : 'bg-dark-800/50 border-dark-700 text-dark-200 hover:border-primary-500/50 hover:text-primary-300',
        className,
      )}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isInWatchlist ? (
        <BookmarkCheck className="w-4 h-4" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
      <span>{label}</span>
      {watchlistId && (
        <span className="sr-only">watchlist id {watchlistId}</span>
      )}
    </button>
  );
}

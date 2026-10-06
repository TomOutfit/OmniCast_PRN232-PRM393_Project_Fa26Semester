import { cn } from '@/lib/utils';
import { Radio, RotateCcw, Clock } from 'lucide-react';

interface LiveBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function LiveBadge({ 
  size = 'md', 
  showIcon = true,
  className 
}: LiveBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 tracking-wider font-semibold',
    md: 'text-xs px-2.5 py-1 tracking-wider font-bold',
    lg: 'text-sm px-3 py-1.5 tracking-wider font-bold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 uppercase rounded-md',
        'bg-red-600 text-white shadow-sm',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
        </span>
      )}
      Trực tiếp
    </span>
  );
}

interface UpcomingBadgeProps {
  startsIn?: string;
  className?: string;
}

export function UpcomingBadge({ startsIn, className }: UpcomingBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium rounded-md',
        'bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1',
        className
      )}
    >
      <Clock className="w-3 h-3 text-amber-400" />
      {startsIn ? `Sắp phát: ${startsIn}` : 'Sắp diễn ra'}
    </span>
  );
}

interface EndedBadgeProps {
  className?: string;
}

export function EndedBadge({ className }: EndedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium rounded-md',
        'bg-slate-800/80 text-slate-400 border border-slate-700/50 px-2.5 py-1',
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      Đã kết thúc
    </span>
  );
}

interface ReplayBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function ReplayBadge({
  size = 'md',
  showIcon = true,
  className,
}: ReplayBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 tracking-wider font-semibold',
    md: 'text-xs px-2.5 py-1 tracking-wider font-semibold',
    lg: 'text-sm px-3 py-1.5 tracking-wider font-semibold',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md',
        'bg-slate-800/90 text-slate-200 border border-slate-700/60 shadow-sm backdrop-blur-sm',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <RotateCcw className={cn('text-indigo-400', iconSizes[size])} />}
      Phát lại 24/7
    </span>
  );
}

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
        'inline-flex items-center gap-1.5 uppercase rounded-lg font-black tracking-wider text-white',
        'bg-gradient-to-r from-red-600 via-rose-500 to-red-600 border border-red-400/50',
        'shadow-[0_0_16px_rgba(239,68,68,0.55),0_1px_0_rgba(255,255,255,0.4)_inset]',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white shadow-[0_0_4px_#fff]"></span>
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
        'inline-flex items-center gap-1.5 text-xs font-bold rounded-lg',
        'bg-amber-500/15 text-amber-300 border border-amber-400/35 px-2.5 py-1',
        'shadow-[0_0_12px_rgba(245,158,11,0.2),0_1px_0_rgba(255,255,255,0.15)_inset] backdrop-blur-md',
        className
      )}
    >
      <Clock className="w-3 h-3 text-amber-300 animate-spin-slow" />
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
        'inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg',
        'bg-slate-900/80 text-slate-400 border border-slate-700/60 px-2.5 py-1',
        'shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] backdrop-blur-md',
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
    sm: 'text-[10px] px-2 py-0.5 tracking-wider font-bold',
    md: 'text-xs px-2.5 py-1 tracking-wider font-bold',
    lg: 'text-sm px-3 py-1.5 tracking-wider font-bold',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg font-bold',
        'bg-gradient-to-r from-indigo-950/80 to-slate-900/90 text-indigo-300 border border-indigo-500/40',
        'shadow-[0_0_14px_rgba(99,102,241,0.25),0_1px_0_rgba(255,255,255,0.1)_inset] backdrop-blur-md',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <RotateCcw className={cn('text-indigo-400', iconSizes[size])} />}
      Phát lại 24/7
    </span>
  );
}

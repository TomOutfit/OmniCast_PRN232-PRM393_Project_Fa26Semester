import { cn } from '@/lib/utils';
import { Radio } from 'lucide-react';

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
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded',
        'bg-red-600 text-white shadow-glow-live',
        'animate-live-pulse',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <Radio className={cn('fill-current', iconSizes[size])} />
      )}
      Live
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
        'inline-flex items-center gap-1.5 text-xs font-medium',
        'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 rounded px-2 py-1',
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
      {startsIn ? `Sắp diễn ra: ${startsIn}` : 'Sắp diễn ra'}
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
        'inline-flex items-center gap-1.5 text-xs font-medium',
        'bg-dark-600/50 text-dark-400 border border-dark-600 rounded px-2 py-1',
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-dark-500" />
      Đã kết thúc
    </span>
  );
}

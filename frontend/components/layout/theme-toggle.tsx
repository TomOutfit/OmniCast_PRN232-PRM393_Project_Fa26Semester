'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme/theme-provider';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  compact = false,
  className,
  showLabel = false,
}: ThemeToggleProps) {
  const { resolved, setMode } = useTheme();
  const nextMode = resolved === 'dark' ? 'light' : 'dark';
  const label = resolved === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối';
  const Icon = resolved === 'dark' ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setMode(nextMode)}
      title={label}
      aria-label={label}
      aria-pressed={resolved === 'light'}
      className={cn(
        'group relative inline-flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95 cursor-pointer',
        'border border-border/70 hover:border-cyan-400/50',
        'bg-surface-container-low hover:bg-surface-container-high text-muted-foreground hover:text-foreground',
        'shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_0_12px_rgba(0,242,254,0.18)]',
        compact ? 'w-9 h-9 p-0 flex-shrink-0' : 'h-9 px-3 gap-2',
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'w-4 h-4 transition-transform duration-300 group-hover:rotate-45',
          resolved === 'dark' ? 'text-amber-400' : 'text-cyan-600',
        )}
      />
      {(showLabel || !compact) && (
        <span className="text-xs font-semibold select-none">
          {resolved === 'dark' ? 'Sáng' : 'Tối'}
        </span>
      )}
    </button>
  );
}

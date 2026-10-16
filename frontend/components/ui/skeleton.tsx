import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton — light-weight loading placeholder primitive.
 *
 * Replaces ad-hoc `animate-pulse` divs scattered across pages with a
 * single, theme-aware component. Three layout variants:
 *   - `block`   (default) — rounded rectangle, fills its container
 *   - `text`    — single line of text; clamps to width/height
 *   - `circle`  — equal width/height rounded-full
 *
 * Colour follows the OmniCast dark-cinema palette: `bg-dark-700/60`
 * base, fading to `bg-dark-600/80` via Tailwind's built-in pulse.
 *
 * Example:
 *   <Skeleton className="h-4 w-32" />
 *   <Skeleton variant="circle" className="h-10 w-10" />
 *   <Skeleton variant="text" count={3} />
 */
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'block' | 'text' | 'circle';
    /** When variant="text", render N lines (default 1). Adds mb-1 gap to each. */
    count?: number;
  }
>(({ className, variant = 'block', count = 1, ...props }, ref) => {
  const variantClass =
    variant === 'circle'
      ? 'rounded-full'
      : variant === 'text'
        ? 'rounded-md h-3 w-full'
        : 'rounded-md';

  const baseClass = cn(
    'relative overflow-hidden bg-dark-700/60',
    'before:absolute before:inset-0',
    'before:bg-gradient-to-r before:from-transparent before:via-white/[0.04] before:to-transparent',
    'before:translate-x-[-100%] before:animate-[shimmer_1.6s_infinite]',
    variantClass,
    className,
  );

  if (variant === 'text' && count > 1) {
    // Stack N rows with a subtle gap. Last row is 60% width to feel
    // like real body copy.
    return (
      <div ref={ref} className="flex flex-col gap-2" {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClass,
              i === count - 1 ? 'w-3/5' : 'w-full',
            )}
          />
        ))}
      </div>
    );
  }

  return <div ref={ref} className={baseClass} {...props} />;
});

Skeleton.displayName = 'Skeleton';

export { Skeleton };

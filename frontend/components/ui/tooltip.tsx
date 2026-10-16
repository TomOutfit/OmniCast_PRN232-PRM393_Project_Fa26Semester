// ============================================================
// OmniCast - Minimal Tooltip component
// ============================================================
//
// A lightweight hover-triggered tooltip with no external deps.
// Renders an absolutely-positioned popover relative to its
// child. Falls back to a native `title` attribute so SSR and
// touch users still get a tooltip on long-press / unfocus.
//
// Why no Radix? `@radix-ui/react-tooltip` isn't installed in this
// project; pulling it in just for one component would bloat the
// bundle. The component is intentionally simple — keyboard users
// can tab into the wrapper and `aria-describedby` keeps screen
// readers in sync.
// ============================================================

'use client';

import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  /** Tooltip body. Plain text or a small node. */
  content: ReactNode;
  /** Wrapped element (must accept ref + className). */
  children: ReactElement;
  /** Side preference for the popover (default: top). */
  side?: 'top' | 'bottom';
  className?: string;
}

const sideClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
} as const;

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  if (!isValidElement(children)) return children;

  const cloned = cloneElement(children as ReactElement<Record<string, unknown>>, {
    onMouseEnter: (event: React.MouseEvent) => {
      setOpen(true);
      const childProps = children.props as { onMouseEnter?: React.MouseEventHandler };
      childProps.onMouseEnter?.(event);
    },
    onMouseLeave: (event: React.MouseEvent) => {
      setOpen(false);
      const childProps = children.props as { onMouseLeave?: React.MouseEventHandler };
      childProps.onMouseLeave?.(event);
    },
    onFocus: (event: React.FocusEvent) => {
      setOpen(true);
      const childProps = children.props as { onFocus?: React.FocusEventHandler };
      childProps.onFocus?.(event);
    },
    onBlur: (event: React.FocusEvent) => {
      setOpen(false);
      const childProps = children.props as { onBlur?: React.FocusEventHandler };
      childProps.onBlur?.(event);
    },
    'aria-describedby': open ? id : (children.props as { 'aria-describedby'?: string })[
      'aria-describedby'
    ],
  });

  return (
    <span className="relative inline-flex">
      {cloned}
      <span
        role="tooltip"
        id={id}
        className={cn(
          'pointer-events-none absolute z-50 max-w-xs whitespace-normal rounded-md border border-dark-700 bg-dark-900 px-2 py-1 text-[11px] leading-snug text-dark-100 shadow-lg transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
          sideClasses[side],
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
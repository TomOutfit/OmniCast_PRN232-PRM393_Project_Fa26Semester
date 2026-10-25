import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/25',
        cyber3d: 'btn-3d-cyan',
        neon: 'bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/60 text-cyan-300 shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:shadow-[0_0_30px_rgba(0,242,254,0.5)] active:scale-95',
        glass3d: 'bg-slate-900/70 hover:bg-slate-850 backdrop-blur-xl border border-white/10 hover:border-cyan-400/40 text-white shadow-[0_8px_20px_rgba(0,0,0,0.5)] active:scale-95',
        gold3d: 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 font-bold border border-amber-300/60 shadow-[0_4px_0_#b45309,0_10px_25px_rgba(245,158,11,0.35)] active:translate-y-1 active:shadow-[0_1px_0_#b45309]',
        destructive: 'bg-red-600 text-white hover:bg-red-700 active:scale-95',
        outline: 'border border-dark-600 bg-transparent hover:bg-dark-800 hover:border-dark-500',
        secondary: 'bg-dark-700 text-white hover:bg-dark-600',
        ghost: 'hover:bg-dark-800 hover:text-white',
        link: 'text-primary-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8',
        xl: 'h-14 rounded-lg px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };

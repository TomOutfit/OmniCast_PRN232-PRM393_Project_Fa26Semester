import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'relative rounded-2xl border transition-all duration-300 text-white overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-[#0e1726]/90 to-[#070b12]/95 border-[#1b2b42] shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        elevated:
          'bg-gradient-to-b from-[#111e32]/95 to-[#090f1a]/95 border-[#233854] shadow-[0_15px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-400/30 before:to-transparent',
        interactive:
          'bg-gradient-to-b from-[#0d1624]/90 to-[#070b12]/95 border-[#18273d] hover:border-cyan-500/50 hover:shadow-[0_15px_35px_rgba(0,242,254,0.15)] hover:-translate-y-1 backdrop-blur-md cursor-pointer before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent hover:before:via-cyan-400/50',
        neon:
          'bg-gradient-to-b from-[#0c1829] to-[#060c16] border-cyan-500/40 shadow-[0_0_25px_rgba(0,242,254,0.2)] backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-cyan-500/10 before:via-cyan-400 before:to-cyan-500/10',
        outline:
          'border border-dashed border-[#1f314d] bg-transparent hover:bg-[#0c1626]/40',
        ghost:
          'border-transparent bg-transparent hover:bg-[#0e192a]/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6 relative z-10', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-black tracking-tight text-white font-display leading-tight',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs text-slate-400 leading-relaxed', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0 relative z-10', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0 relative z-10', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };

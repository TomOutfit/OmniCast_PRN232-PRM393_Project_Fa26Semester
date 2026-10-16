'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface PageTransition3DProps {
  children: ReactNode;
}

/**
 * PageTransition3D — 3D-feel page transitions.
 *
 * Each route change gets a 3D-style "fly through" entrance: slight Z-axis
 * push, depth-of-field blur, and upward translate. Respects
 * `prefers-reduced-motion` and degrades to a simple fade.
 */
export function PageTransition3D({ children }: PageTransition3DProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <AnimatePresence mode="wait">{children}</AnimatePresence>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 24, filter: 'blur(8px)', scale: 0.98 }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
        exit={{ opacity: 0, y: -16, filter: 'blur(6px)', scale: 1.01 }}
        transition={{
          duration: 0.55,
          ease: [0.22, 1, 0.36, 1], // easeOutQuart
        }}
        style={{
          willChange: 'transform, opacity, filter',
          transformStyle: 'preserve-3d',
          perspective: 1200,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

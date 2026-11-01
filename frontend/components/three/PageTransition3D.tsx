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
 * Keep route changes subtle so pages do not blur or shift during navigation.
 * Respects `prefers-reduced-motion`.
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.18,
          ease: 'easeOut',
        }}
        style={{
          willChange: 'transform, opacity',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

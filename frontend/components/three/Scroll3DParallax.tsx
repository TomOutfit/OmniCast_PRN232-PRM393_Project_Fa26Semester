'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';

interface Scroll3DParallaxProps {
  children: ReactNode;
  /** Depth multiplier. Negative = reverse parallax. */
  depth?: number;
  /** Z-axis translation distance. */
  z?: number;
  /** Rotation around X in degrees. */
  rotateX?: number;
  className?: string;
}

/**
 * Scroll3DParallax — applies a scroll-linked 3D transform to its
 * children. Useful for hero sections, large media blocks, and cards
 * that should appear to "float" as the user scrolls.
 */
export function Scroll3DParallax({
  children,
  depth = 1,
  z = 40,
  rotateX = 0,
  className,
}: Scroll3DParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [z * depth, -z * depth]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 1, 0.98]);

  return (
    <motion.div
      ref={ref}
      style={{
        y,
        scale,
        rotateX,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

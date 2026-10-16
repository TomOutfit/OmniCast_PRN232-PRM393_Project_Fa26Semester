/**
 * Mouse position tracking hook for 3D scene parallax / cursor follow.
 * Returns normalized -1..1 coordinates (Y is inverted to match 3D convention).
 * Throttled with rAF to avoid layout thrash.
 */
'use client';

import { useEffect, useRef, useState } from 'react';

export interface NormalizedPointer {
  x: number;
  y: number;
  /** raw pixel position - useful for DOM-based parallax */
  px: number;
  py: number;
}

export function useMousePosition(initial: NormalizedPointer = { x: 0, y: 0, px: 0, py: 0 }) {
  const [pos, setPos] = useState<NormalizedPointer>(initial);
  const raf = useRef<number | null>(null);
  const target = useRef<NormalizedPointer>(initial);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      let cx = 0;
      let cy = 0;
      if ('touches' in e && e.touches.length) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else if ('clientX' in e) {
        cx = (e as MouseEvent).clientX;
        cy = (e as MouseEvent).clientY;
      } else {
        return;
      }
      target.current = {
        x: (cx / window.innerWidth) * 2 - 1,
        y: -((cy / window.innerHeight) * 2 - 1),
        px: cx,
        py: cy,
      };
      if (raf.current == null) {
        raf.current = requestAnimationFrame(() => {
          setPos(target.current);
          raf.current = null;
        });
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, []);

  return pos;
}

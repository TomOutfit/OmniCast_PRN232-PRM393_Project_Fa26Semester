'use client';

import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CursorFollower3DProps {
  /** Color of the trailing ring. */
  color?: string;
  /** Multiplier on the cursor offset (0 = no follow, 1 = full). */
  intensity?: number;
  /** Whether to render the DOM dot as well. */
  showDomDot?: boolean;
}

/**
 * CursorFollower3D — two parts:
 *  1. A 3D ring mesh that follows the camera-space mouse position
 *     (rendered inside the <Canvas>).
 *  2. A DOM dot that follows the page cursor (optional).
 *
 * Mount the DOM dot once at the page level via the exported
 * `CursorFollowerDOM` component.
 */
export function CursorFollower3D({ color = '#00f2fe', intensity = 1 }: CursorFollower3DProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const { camera, mouse } = useThree();

  useFrame(() => {
    if (!ringRef.current) return;
    // Project normalized mouse into world space at z=0 plane.
    const vec = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const point = camera.position.clone().add(dir.multiplyScalar(distance));
    ringRef.current.position.lerp(
      new THREE.Vector3(point.x * intensity, point.y * intensity, 0),
      0.18
    );
  });

  return (
    <mesh ref={ringRef}>
      <ringGeometry args={[0.12, 0.16, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

/**
 * CursorFollowerDOM — a soft glowing dot that trails the real cursor.
 * Sits at the body level via fixed positioning; never interferes with clicks.
 */
export function CursorFollowerDOM() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const el = ref.current;
    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          x += (tx - x) * 0.18;
          y += (ty - y) * 0.18;
          el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
          raf = 0;
        });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] hidden md:block"
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(0,242,254,0.55) 0%, rgba(0,242,254,0.18) 35%, transparent 70%)',
        mixBlendMode: 'screen',
        willChange: 'transform',
      }}
    />
  );
}

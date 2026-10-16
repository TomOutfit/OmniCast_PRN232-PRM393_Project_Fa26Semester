'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FloatingShapesProps {
  count?: number;
  /** Spread radius. */
  radius?: number;
  /** Optional color palette to mix. */
  colors?: string[];
  /** When true, shapes self-rotate. */
  spin?: boolean;
  /** Speed multiplier. */
  speed?: number;
}

/**
 * FloatingShapes — drifting low-poly geometry layer (icosahedrons, torus,
 * octahedrons) for the background. Used on the home hero, auth pages, and
 * any empty-state that needs a "more than 2D" feel.
 */
export function FloatingShapes({
  count = 12,
  radius = 4.5,
  colors = ['#00f2fe', '#9bcbff', '#ff5722', '#4facfe'],
  spin = true,
  speed = 1,
}: FloatingShapesProps) {
  const groupRef = useRef<THREE.Group>(null);

  const geometries = useMemo(
    () => [
      new THREE.IcosahedronGeometry(0.25, 0),
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.TorusGeometry(0.18, 0.05, 8, 16),
      new THREE.TetrahedronGeometry(0.22, 0),
    ],
    []
  );

  const items = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => {
        const r = radius * (0.5 + Math.random() * 0.7);
        const theta = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const phi = (Math.random() - 0.5) * Math.PI * 0.6;
        return {
          geometry: geometries[i % geometries.length],
          color: colors[i % colors.length],
          x: r * Math.cos(phi) * Math.cos(theta),
          y: r * Math.sin(phi),
          z: r * Math.cos(phi) * Math.sin(theta) - 2,
          rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [
            number,
            number,
            number,
          ],
          speed: 0.4 + Math.random() * 0.6,
        };
      }),
    [count, radius, colors, geometries]
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.04 * speed;
    if (spin) {
      groupRef.current.children.forEach((c, i) => {
        c.rotation.x += delta * 0.1 * speed;
        c.rotation.y += delta * 0.07 * speed;
        c.position.y += Math.sin(performance.now() * 0.001 + i) * 0.0008;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <mesh key={i} geometry={it.geometry} position={[it.x, it.y, it.z]} rotation={it.rot}>
          <meshStandardMaterial
            color={it.color}
            metalness={0.6}
            roughness={0.25}
            emissive={it.color}
            emissiveIntensity={0.18}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

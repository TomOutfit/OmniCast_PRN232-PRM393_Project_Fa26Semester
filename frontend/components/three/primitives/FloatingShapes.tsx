'use client';

// ============================================================
// OmniCast - Floating Cyber Prisms & Geo Nodes
// ------------------------------------------------------------
// Drifting futuristic polyhedral nodes (crystal icosahedrons,
// sleek torus rings, and diamond octahedrons) with holographic
// neon materials and glowing inner cores.
// ============================================================

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FloatingShapesProps {
  count?: number;
  /** Spread radius. */
  radius?: number;
  /** Cybernetic color palette. */
  colors?: string[];
  /** When true, shapes self-rotate. */
  spin?: boolean;
  /** Speed multiplier. */
  speed?: number;
}

const DEFAULT_CYBER_COLORS = [
  '#00f2fe', // Cyber Cyan
  '#a855f7', // Electric Violet
  '#38bdf8', // Neon Sky
  '#10b981', // Emerald Core
  '#818cf8', // Indigo Glow
];

export function FloatingShapes({
  count = 10,
  radius = 5.2,
  colors = DEFAULT_CYBER_COLORS,
  spin = true,
  speed = 1,
}: FloatingShapesProps) {
  const groupRef = useRef<THREE.Group>(null);

  const geometries = useMemo(
    () => [
      new THREE.IcosahedronGeometry(0.26, 0),
      new THREE.DodecahedronGeometry(0.24, 0),
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.TorusGeometry(0.22, 0.025, 16, 48),
    ],
    []
  );

  const items = useMemo(
    () =>
      new Array(count).fill(0).map((_, i) => {
        const r = radius * (0.6 + Math.random() * 0.6);
        const theta = (i / count) * Math.PI * 2 + Math.random() * 0.3;
        const phi = (Math.random() - 0.5) * Math.PI * 0.65;
        const color = colors[i % colors.length];
        return {
          geometry: geometries[i % geometries.length],
          color,
          x: r * Math.cos(phi) * Math.cos(theta),
          y: r * Math.sin(phi),
          z: r * Math.cos(phi) * Math.sin(theta) - 2.5,
          rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [
            number,
            number,
            number,
          ],
          rotSpeed: [
            (0.04 + Math.random() * 0.05) * (Math.random() > 0.5 ? 1 : -1),
            (0.03 + Math.random() * 0.05) * (Math.random() > 0.5 ? 1 : -1),
          ],
          floatOffset: Math.random() * Math.PI * 2,
          scale: 0.85 + Math.random() * 0.35,
        };
      }),
    [count, radius, colors, geometries]
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // Subtle overall ambient rotation
    groupRef.current.rotation.y += delta * 0.025 * speed;

    if (spin) {
      groupRef.current.children.forEach((child, i) => {
        const it = items[i];
        if (!it) return;
        child.rotation.x += delta * it.rotSpeed[0] * speed;
        child.rotation.y += delta * it.rotSpeed[1] * speed;
        child.position.y = it.y + Math.sin(t * 0.8 + it.floatOffset) * 0.12;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {items.map((it, i) => (
        <group key={i} position={[it.x, it.y, it.z]} rotation={it.rot} scale={it.scale}>
          {/* Main Translucent Polyhedron */}
          <mesh geometry={it.geometry}>
            <meshPhysicalMaterial
              color={it.color}
              emissive={it.color}
              emissiveIntensity={0.35}
              roughness={0.15}
              metalness={0.85}
              clearcoat={0.9}
              clearcoatRoughness={0.1}
              transparent
              opacity={0.7}
              wireframe={false}
            />
          </mesh>

          {/* Holographic Wireframe Cage Overlay */}
          <mesh geometry={it.geometry} scale={1.06}>
            <meshBasicMaterial
              color={it.color}
              wireframe
              transparent
              opacity={0.25}
            />
          </mesh>

          {/* Inner Glowing Micro Core */}
          <mesh scale={0.25}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.65} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

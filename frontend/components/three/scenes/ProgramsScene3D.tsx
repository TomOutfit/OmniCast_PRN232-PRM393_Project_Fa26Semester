'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleField } from '../primitives/ParticleField';

export interface ProgramPoster {
  id: string;
  title: string;
  category: string;
  rating?: number;
  year?: number;
  color?: string;
  isLive?: boolean;
}

interface ProgramsScene3DProps {
  programs: ProgramPoster[];
  onSelect?: (p: ProgramPoster) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  SPORTS: '#ff5722',
  CINE: '#9bcbff',
  DRAMA: '#f06292',
  NEWS: '#ef4444',
  MUSIC: '#a855f7',
  KIDS: '#22c55e',
  TECH: '#00f2fe',
  GAMING: '#7c3aed',
  SHOW: '#facc15',
};

/**
 * ProgramsScene3D — 3D poster showcase laid out on a curved wall
 * with depth-sorting. Hovering a poster scales it forward; clicking
 * dispatches onSelect.
 */
export function ProgramsScene3D({ programs, onSelect }: ProgramsScene3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const positions = useMemo(() => {
    // Spread posters in a fan
    const cols = 5;
    return programs.map((_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = (col - (cols - 1) / 2) * 0.95;
      const y = -row * 1.1 + 0.4;
      // Curve: closer to center = further forward
      const z = -Math.abs(col - (cols - 1) / 2) * 0.4;
      return { x, y, z };
    });
  }, [programs]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        -0.1,
        0.04
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 4, 4]} intensity={0.7} color="#00f2fe" />
      <pointLight position={[0, 0, 4]} intensity={0.8} color="#ff5722" distance={8} />

      <ParticleField count={400} radius={5} color="#00f2fe" size={0.016} orbit={false} />

      <group ref={groupRef}>
        {programs.map((p, i) => {
          const pos = positions[i];
          const color = p.color || CATEGORY_COLORS[p.category] || '#00f2fe';
          const isHovered = hovered === p.id;
          return (
            <group
              key={p.id}
              position={[pos.x, pos.y, isHovered ? pos.z + 0.4 : pos.z]}
              rotation={[0, isHovered ? 0 : -pos.x * 0.15, 0]}
            >
              <mesh
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHovered(p.id);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  setHovered(null);
                  document.body.style.cursor = 'auto';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(p);
                }}
                scale={isHovered ? 1.15 : 1}
              >
                <boxGeometry args={[0.78, 1.15, 0.05]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={isHovered ? 0.6 : 0.3}
                  metalness={0.4}
                  roughness={0.4}
                />
              </mesh>
              {/* Title plate */}
              <mesh position={[0, -0.45, 0.03]}>
                <planeGeometry args={[0.78, 0.22]} />
                <meshBasicMaterial color="#0b1320" transparent opacity={0.85} />
              </mesh>
              <Text
                position={[0, -0.45, 0.04]}
                fontSize={0.07}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                maxWidth={0.7}
              >
                {p.title}
              </Text>
              {p.rating != null && (
                <Text
                  position={[0.32, 0.45, 0.04]}
                  fontSize={0.07}
                  color="#facc15"
                  anchorX="center"
                  anchorY="middle"
                >
                  ★ {p.rating.toFixed(1)}
                </Text>
              )}
              {p.isLive && (
                <mesh position={[-0.32, 0.45, 0.04]}>
                  <circleGeometry args={[0.05, 16]} />
                  <meshBasicMaterial color="#ff5722" />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    </>
  );
}

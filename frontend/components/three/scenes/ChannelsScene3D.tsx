'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleField } from '../primitives/ParticleField';

export interface ChannelOrbData {
  id: string;
  name: string;
  category: string;
  isLive: boolean;
  color?: string;
}

interface ChannelsScene3DProps {
  channels: ChannelOrbData[];
  onSelect?: (c: ChannelOrbData) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  SPORTS: '#ff5722',
  CINE: '#9bcbff',
  DRAMA: '#f06292',
  NEWS: '#ef4444',
  MUSIC: '#a855f7',
  KIDS: '#22c55e',
  TECH: '#00f2fe',
  FOOD: '#facc15',
  DOCUMENTARY: '#14b8a6',
  GAMING: '#7c3aed',
};

/**
 * ChannelsScene3D — 25 channels arranged in a 3D sphere shell.
 * Each orb floats; hover expands and brightens; click dispatches.
 */
export function ChannelsScene3D({ channels, onSelect }: ChannelsScene3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const positions = useMemo(() => {
    const n = channels.length;
    return channels.map((_, i) => {
      // Fibonacci sphere
      const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 3.6;
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    });
  }, [channels]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 0, 0]} intensity={1.2} color="#00f2fe" distance={10} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />

      <ParticleField count={500} radius={6} color="#00f2fe" size={0.018} />

      <group ref={groupRef}>
        {channels.map((c, i) => {
          const pos = positions[i];
          const color = c.color || CATEGORY_COLORS[c.category] || '#00f2fe';
          const isHovered = hovered === c.id;
          return (
            <group key={c.id} position={pos.toArray()}>
              <mesh
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHovered(c.id);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  setHovered(null);
                  document.body.style.cursor = 'auto';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(c);
                }}
                scale={isHovered ? 1.3 : 1}
              >
                <sphereGeometry args={[0.18, 24, 24]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={isHovered ? 0.9 : 0.45}
                  metalness={0.4}
                  roughness={0.3}
                />
              </mesh>
              {isHovered && (
                <Text
                  position={[0, 0.35, 0]}
                  fontSize={0.11}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.005}
                  outlineColor="#000000"
                >
                  {c.name}
                </Text>
              )}
              {c.isLive && (
                <mesh position={[0, 0.22, 0]}>
                  <circleGeometry args={[0.04, 16]} />
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

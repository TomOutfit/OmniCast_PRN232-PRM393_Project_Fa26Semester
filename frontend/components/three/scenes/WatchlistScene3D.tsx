'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleField } from '../primitives/ParticleField';

export interface WatchlistItem3D {
  id: string;
  title: string;
  channel: string;
  scheduledAt?: string;
  status: 'live' | 'upcoming' | 'past';
  color?: string;
}

interface WatchlistScene3DProps {
  items: WatchlistItem3D[];
  onSelect?: (it: WatchlistItem3D) => void;
}

const STATUS_COLORS: Record<WatchlistItem3D['status'], string> = {
  live: '#ff5722',
  upcoming: '#00f2fe',
  past: '#64748b',
};

/**
 * WatchlistScene3D — 3D "card stack" with depth and slight rotation.
 * The top card is the active one; hovering pops it forward.
 */
export function WatchlistScene3D({ items, onSelect }: WatchlistScene3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const layout = useMemo(() => {
    return items.map((_, i) => {
      const angle = (i - items.length / 2) * 0.18;
      return {
        z: -i * 0.06,
        rot: angle,
        y: -Math.abs(angle) * 1.5,
        x: angle * 0.6,
      };
    });
  }, [items]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        state.mouse.x * 0.18,
        0.05
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        -state.mouse.y * 0.1,
        0.05
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[0, 4, 4]} intensity={0.7} />
      <pointLight position={[2, 2, 3]} intensity={0.8} color="#00f2fe" distance={8} />

      <ParticleField count={250} radius={4} color="#00f2fe" size={0.015} orbit={false} />

      <group ref={groupRef}>
        {items.map((it, i) => {
          const pos = layout[i];
          const color = it.color || STATUS_COLORS[it.status];
          const isHovered = hovered === it.id;
          return (
            <group
              key={it.id}
              position={[pos.x, pos.y, pos.z + (isHovered ? 0.5 : 0)]}
              rotation={[0, pos.rot, 0]}
              scale={isHovered ? 1.1 : 1}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(it.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHovered(null);
                document.body.style.cursor = 'auto';
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(it);
              }}
            >
              <mesh>
                <boxGeometry args={[1.6, 1.0, 0.04]} />
                <meshStandardMaterial
                  color="#0e1625"
                  metalness={0.6}
                  roughness={0.3}
                  emissive={color}
                  emissiveIntensity={isHovered ? 0.4 : 0.15}
                />
              </mesh>
              {/* Status bar */}
              <mesh position={[-0.78, 0, 0.025]}>
                <planeGeometry args={[0.05, 0.95]} />
                <meshBasicMaterial color={color} />
              </mesh>
              <Text
                position={[-0.55, 0.25, 0.03]}
                fontSize={0.11}
                color="#f1f5f9"
                anchorX="left"
                anchorY="middle"
                maxWidth={1.4}
              >
                {it.title}
              </Text>
              <Text
                position={[-0.55, 0.05, 0.03]}
                fontSize={0.07}
                color="#9bcbff"
                anchorX="left"
                anchorY="middle"
              >
                {it.channel}
              </Text>
              {it.scheduledAt && (
                <Text
                  position={[-0.55, -0.25, 0.03]}
                  fontSize={0.07}
                  color="#64748b"
                  anchorX="left"
                  anchorY="middle"
                >
                  {it.scheduledAt}
                </Text>
              )}
              <Text
                position={[0.55, -0.4, 0.03]}
                fontSize={0.07}
                color={color}
                anchorX="right"
                anchorY="middle"
              >
                {it.status.toUpperCase()}
              </Text>
            </group>
          );
        })}
      </group>
    </>
  );
}

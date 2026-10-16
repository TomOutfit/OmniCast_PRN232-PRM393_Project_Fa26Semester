'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleField } from '../primitives/ParticleField';

export interface EPGProgram {
  id: string;
  title: string;
  startMin: number; // minutes from 00:00
  durationMin: number;
  channelId: string;
  category?: string;
  isLive?: boolean;
}

interface EPGScene3DProps {
  programs: EPGProgram[];
  channels?: string[]; // ordered channel IDs
  onSelect?: (p: EPGProgram) => void;
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
};

/**
 * EPGScene3D — programs laid out on a curved 3D wall.
 * Each row is a channel; each program is a glowing block whose width
 * represents duration and whose color encodes category. The current
 * time is rendered as a vertical "now" line.
 */
export function EPGScene3D({ programs, channels = [], onSelect }: EPGScene3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const rowHeight = 0.32;
  const totalMinutes = 24 * 60;
  const xScale = 4.5 / totalMinutes; // 4.5 world units across a day
  const channelsResolved = useMemo(
    () => (channels.length ? channels : Array.from(new Set(programs.map((p) => p.channelId)))),
    [channels, programs]
  );

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        -0.15,
        0.04
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 4, 5]} intensity={0.6} />

      <ParticleField count={300} radius={5} color="#00f2fe" size={0.015} orbit={false} />

      <group ref={groupRef} position={[0, 0, 0]}>
        {/* "Now" marker — vertical line at current time */}
        {(() => {
          const now = new Date();
          const minutes = now.getHours() * 60 + now.getMinutes();
          const x = minutes * xScale - 2.25;
          return (
            <mesh position={[x, 0, 0.05]}>
              <boxGeometry args={[0.012, channelsResolved.length * rowHeight + 0.3, 0.01]} />
              <meshBasicMaterial color="#ff5722" />
            </mesh>
          );
        })()}

        {/* Hour grid */}
        {Array.from({ length: 25 }).map((_, h) => {
          const x = h * 60 * xScale - 2.25;
          return (
            <group key={h} position={[x, 0, -0.05]}>
              <mesh>
                <boxGeometry args={[0.003, channelsResolved.length * rowHeight + 0.2, 0.01]} />
                <meshBasicMaterial color="#1e293b" transparent opacity={0.5} />
              </mesh>
              <Text
                position={[0, channelsResolved.length * rowHeight * 0.5 + 0.15, 0]}
                fontSize={0.08}
                color="#475569"
                anchorX="center"
                anchorY="middle"
              >
                {String(h % 24).padStart(2, '0')}:00
              </Text>
            </group>
          );
        })}

        {/* Channel rows */}
        {channelsResolved.map((chId, rowIdx) => {
          const y = (channelsResolved.length / 2 - rowIdx - 0.5) * rowHeight;
          const progs = programs.filter((p) => p.channelId === chId);
          return (
            <group key={chId} position={[0, y, 0]}>
              <Text
                position={[-2.35, 0, 0]}
                fontSize={0.07}
                color="#9bcbff"
                anchorX="right"
                anchorY="middle"
              >
                {chId}
              </Text>
              <mesh position={[0, 0, -0.02]}>
                <planeGeometry args={[4.5, rowHeight * 0.85]} />
                <meshBasicMaterial color="#0e1625" transparent opacity={0.4} />
              </mesh>
              {progs.map((p) => {
                const w = Math.max(0.06, p.durationMin * xScale);
                const x = p.startMin * xScale - 2.25 + w / 2;
                const color = CATEGORY_COLORS[p.category ?? ''] || '#00f2fe';
                const isHovered = hovered === p.id;
                return (
                  <mesh
                    key={p.id}
                    position={[x, 0, isHovered ? 0.05 : 0]}
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
                  >
                    <boxGeometry args={[w, rowHeight * 0.7, 0.04]} />
                    <meshStandardMaterial
                      color={color}
                      emissive={color}
                      emissiveIntensity={isHovered || p.isLive ? 0.7 : 0.35}
                      metalness={0.3}
                      roughness={0.4}
                    />
                  </mesh>
                );
              })}
            </group>
          );
        })}

        {/* Hovered program label */}
        {programs
          .filter((p) => hovered === p.id)
          .map((p) => {
            const rowIdx = channelsResolved.indexOf(p.channelId);
            const y = (channelsResolved.length / 2 - rowIdx - 0.5) * rowHeight + 0.32;
            const x = (p.startMin + p.durationMin / 2) * xScale - 2.25;
            return (
              <Text
                key={p.id + '-label'}
                position={[x, y, 0.1]}
                fontSize={0.1}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.005}
                outlineColor="#000000"
                maxWidth={2}
              >
                {p.title}
              </Text>
            );
          })}
      </group>
    </>
  );
}

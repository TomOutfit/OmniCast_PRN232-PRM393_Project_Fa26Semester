'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleField } from '../primitives/ParticleField';
import { FloatingShapes } from '../primitives/FloatingShapes';
import { ChannelCard3D, type ChannelCard3DData } from '../primitives/ChannelCard3D';

interface HeroScene3DProps {
  channels?: ChannelCard3DData[];
  /** Heading text. */
  headline?: string;
  /** Secondary line. */
  subline?: string;
  /** Camera dolly speed. */
  speed?: number;
  /** Click handler for a card. */
  onSelect?: (data: ChannelCard3DData) => void;
}

const DEFAULT_CHANNELS: ChannelCard3DData[] = [
  { id: '1', title: 'Omni Sport 1', subtitle: 'Thể thao trực tiếp', category: 'SPORTS', color: '#0e1625', isLive: true },
  { id: '2', title: 'Omni Cine 4K', subtitle: 'Điện ảnh Hollywood', category: 'CINE', color: '#0e1625', isLive: true },
  { id: '3', title: 'Omni News', subtitle: 'Tin tức 24/7', category: 'NEWS', color: '#0e1625', isLive: true },
  { id: '4', title: 'Omni Music', subtitle: 'Âm nhạc & MV', category: 'MUSIC', color: '#0e1625', isLive: false },
  { id: '5', title: 'Omni Tech', subtitle: 'Công nghệ & AI', category: 'TECH', color: '#0e1625', isLive: true },
  { id: '6', title: 'Omni Kids', subtitle: 'Thiếu nhi', category: 'KIDS', color: '#0e1625', isLive: false },
];

/**
 * HeroScene3D — the centerpiece of the home page.
 *
 * Composition:
 *  - Title + subline text rendered with <Text>.
 *  - 6 channel cards arranged in a circular carousel around the camera.
 *  - Particle field + floating shapes for ambient depth.
 *  - Mouse-reactive camera dolly.
 */
export function HeroScene3D({
  channels = DEFAULT_CHANNELS,
  headline = 'OMNICAST',
  subline = 'Enterprise Media & Broadcast Intelligence',
  speed = 1,
  onSelect,
}: HeroScene3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const cardPositions = useMemo(() => {
    const radius = 2.8;
    return channels.map((_, i) => {
      const angle = (i / channels.length) * Math.PI * 2;
      return {
        position: [Math.cos(angle) * radius, Math.sin(angle * 0.6) * 0.3, -Math.sin(angle) * radius] as [
          number,
          number,
          number,
        ],
        rotation: [0, -angle + Math.PI, 0] as [number, number, number],
      };
    });
  }, [channels]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08 * speed;
      // Subtle parallax from mouse
      const { x, y } = state.mouse;
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, x * 0.25, 0.05);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, -y * 0.15, 0.05);
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} color="#9bcbff" />
      <directionalLight position={[4, 4, 4]} intensity={0.8} color="#00f2fe" />
      <pointLight position={[-4, -2, 3]} intensity={1.2} color="#ff5722" distance={20} />
      <pointLight position={[0, 5, 2]} intensity={0.6} color="#4facfe" distance={15} />

      {/* Background field */}
      <ParticleField count={800} radius={6} size={0.025} color="#00f2fe" />
      <FloatingShapes count={6} radius={5} colors={['#00f2fe', '#9bcbff', '#4facfe']} />

      {/* Hero text */}
      <group position={[0, 0.4, -2.2]}>
        <Text
          fontSize={0.55}
          color="#00f2fe"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
          letterSpacing={0.05}
        >
          {headline}
        </Text>
        <Text
          position={[0, -0.45, 0]}
          fontSize={0.13}
          color="#9bcbff"
          anchorX="center"
          anchorY="middle"
        >
          {subline}
        </Text>
      </group>

      {/* Carousel */}
      <group ref={groupRef}>
        {channels.map((c, i) => (
          <ChannelCard3D
            key={c.id}
            data={c}
            position={cardPositions[i].position}
            rotation={cardPositions[i].rotation}
            active={activeId === c.id}
            onHover={(d) => setActiveId(d?.id ?? null)}
            onClick={onSelect}
          />
        ))}
      </group>
    </>
  );
}

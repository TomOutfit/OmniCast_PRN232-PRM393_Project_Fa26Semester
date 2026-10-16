'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export interface ChannelCard3DData {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  color?: string; // hex
  isLive?: boolean;
}

interface ChannelCard3DProps {
  data: ChannelCard3DData;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onClick?: (data: ChannelCard3DData) => void;
  onHover?: (data: ChannelCard3DData | null) => void;
  /** When true, the card is "active" (highlighted). */
  active?: boolean;
}

/**
 * ChannelCard3D — a single 3D "card" in a 3D channel sphere/grid.
 * Uses procedural geometry: a rounded card (PlaneGeometry + beveled edge)
 * with the channel name and live indicator text.
 *
 * Hovering floats the card forward; clicking fires `onClick(data)`.
 */
export function ChannelCard3D({
  data,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  onClick,
  onHover,
  active = false,
}: ChannelCard3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const targetZ = useRef(0);

  const baseColor = useMemo(() => new THREE.Color(data.color || '#0e1625'), [data.color]);
  const accent = useMemo(() => new THREE.Color('#00f2fe'), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const z = active ? 0.35 : hovered ? 0.18 : 0;
    targetZ.current = THREE.MathUtils.lerp(targetZ.current, z, 0.18);
    groupRef.current.position.z = position[2] + targetZ.current;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      rotation[1] + (hovered ? 0.05 : 0),
      0.18
    );
    // Idle float
    groupRef.current.position.y = position[1] + Math.sin(performance.now() * 0.001 + position[0]) * 0.04;
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
        onHover?.(data);
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
        onHover?.(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(data);
      }}
    >
      {/* Card body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.7, 0.06]} />
        <meshStandardMaterial
          color={hovered || active ? '#162338' : baseColor}
          metalness={0.6}
          roughness={0.35}
          emissive={hovered || active ? accent : '#000000'}
          emissiveIntensity={hovered || active ? 0.25 : 0}
        />
      </mesh>
      {/* Inner glow plane (slightly inset) */}
      <mesh position={[0, 0, 0.031]}>
        <planeGeometry args={[1.0, 0.6]} />
        <meshBasicMaterial color={hovered || active ? '#00f2fe' : '#0b1320'} transparent opacity={0.08} />
      </mesh>
      {/* Title */}
      <Text
        position={[-0.46, 0.06, 0.04]}
        fontSize={0.13}
        color="#f1f5f9"
        anchorX="left"
        anchorY="middle"
        maxWidth={0.95}
        outlineWidth={0.005}
        outlineColor="#000000"
      >
        {data.title}
      </Text>
      {/* Subtitle / category */}
      {data.subtitle && (
        <Text
          position={[-0.46, -0.12, 0.04]}
          fontSize={0.07}
          color="#9bcbff"
          anchorX="left"
          anchorY="middle"
        >
          {data.subtitle}
        </Text>
      )}
      {/* Live dot */}
      {data.isLive && (
        <mesh position={[0.45, 0.22, 0.04]}>
          <circleGeometry args={[0.04, 24]} />
          <meshBasicMaterial color="#ff5722" />
        </mesh>
      )}
    </group>
  );
}

/**
 * ChannelCardTilt — DOM-side 3D card with CSS transform parallax.
 * Use this when you have a real list of channels and want them to
 * react to the cursor without paying for a full R3F render.
 */
export function ChannelCardTilt({
  children,
  className,
  intensity = 14,
  glow = true,
  scale = 1.02,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glow?: boolean;
  scale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
  });
  const [coords, setCoords] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 50,
    active: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const x = (px - 0.5) * 2;
      const y = (py - 0.5) * 2;

      setCoords({ x: px * 100, y: py * 100, active: true });
      setStyle({
        transform: `perspective(1000px) rotateY(${x * intensity}deg) rotateX(${
          -y * intensity
        }deg) scale3d(${scale}, ${scale}, ${scale})`,
        transition: 'transform 0.08s ease-out',
      });
    };

    const onLeave = () => {
      setCoords((prev) => ({ ...prev, active: false }));
      setStyle({
        transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)',
        transition: 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
      });
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [intensity, scale]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
    >
      {children}
      {glow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-30"
          style={{
            opacity: coords.active ? 1 : 0,
            background: `radial-gradient(400px circle at ${coords.x}% ${coords.y}%, rgba(0, 242, 254, 0.22), transparent 60%)`,
          }}
        />
      )}
    </div>
  );
}

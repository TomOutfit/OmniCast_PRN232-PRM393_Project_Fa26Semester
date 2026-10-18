'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleField } from '../primitives/ParticleField';
import { FloatingShapes } from '../primitives/FloatingShapes';

interface AuthScene3DProps {
  /** Centered brand text. */
  brand?: string;
  /** Tagline. */
  tagline?: string;
}

/**
 * AuthScene3D — login / register background. A simple low-density
 * particle cloud + 4 floating shapes + brand text, intended to run
 * behind a centered auth card without competing for attention.
 */
export function AuthScene3D({ brand = 'OMNICAST', tagline = 'Sign in to continue' }: AuthScene3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 5]} intensity={1.4} color="#00f2fe" distance={12} />
      <pointLight position={[3, -2, 3]} intensity={0.6} color="#a855f7" distance={8} />

      <ParticleField count={600} radius={5.5} color="#00f2fe" size={0.02} orbit />
      <FloatingShapes count={6} radius={4} colors={['#00f2fe', '#a855f7', '#38bdf8']} />

      <group ref={groupRef}>
        <Text
          position={[0, 0.6, -2]}
          fontSize={0.5}
          color="#00f2fe"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#000000"
          letterSpacing={0.06}
        >
          {brand}
        </Text>
        <Text
          position={[0, 0.05, -2]}
          fontSize={0.13}
          color="#9bcbff"
          anchorX="center"
          anchorY="middle"
        >
          {tagline}
        </Text>
      </group>
    </>
  );
}

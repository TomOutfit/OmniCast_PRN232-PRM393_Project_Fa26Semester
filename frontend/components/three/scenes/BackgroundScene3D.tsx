'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleField } from '../primitives/ParticleField';
import { FloatingShapes } from '../primitives/FloatingShapes';

interface BackgroundScene3DProps {
  /** Subtle ambient density of particles. */
  particleCount?: number;
  /** Subtle ambient shapes. */
  shapeCount?: number;
  /** Camera dolly speed. */
  speed?: number;
}

/**
 * BackgroundScene3D — the always-on ambient layer mounted in the root
 * layout. Provides a slow, calming 3D field behind the entire app.
 */
export function BackgroundScene3D({
  particleCount = 1000,
  shapeCount = 10,
  speed = 1,
}: BackgroundScene3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  // Mild ambient lights so the shapes actually reflect color.
  const lights = useMemo(
    () => (
      <>
        <ambientLight intensity={0.5} color="#9bcbff" />
        <directionalLight position={[5, 5, 5]} intensity={0.6} color="#00f2fe" />
        <pointLight position={[-5, -3, 2]} intensity={1.4} color="#ff5722" distance={22} />
        <pointLight position={[3, 4, -1]} intensity={0.8} color="#00f2fe" distance={18} />
      </>
    ),
    []
  );

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.015 * speed;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.02 * speed;
      ringRef.current.rotation.x += delta * 0.01 * speed;
    }
  });

  return (
    <group ref={groupRef}>
      {lights}
      <ParticleField
        count={particleCount}
        color="#00f2fe"
        radius={10}
        size={0.024}
        orbit
        reactive={false}
      />
      <Sparkles
        count={50}
        scale={12}
        size={2.5}
        speed={0.3 * speed}
        opacity={0.35}
        color="#00f2fe"
      />
      <FloatingShapes
        count={shapeCount}
        radius={7}
        colors={['#00f2fe', '#9bcbff', '#4facfe', '#ff5722']}
        speed={speed}
      />

      {/* Cybernetic distant orbital rings */}
      <mesh ref={ringRef} position={[0, 0, -2]}>
        <torusGeometry args={[6.5, 0.015, 16, 120]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.12} />
      </mesh>

      <mesh position={[0, 0, -3]}>
        <icosahedronGeometry args={[4.5, 1]} />
        <meshBasicMaterial wireframe color="#9bcbff" transparent opacity={0.04} />
      </mesh>
    </group>
  );
}

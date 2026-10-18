'use client';

// ============================================================
// OmniCast - Global Ambient Background Scene 3D
// ------------------------------------------------------------
// Provides a slow, hypnotic cybernetic galaxy background:
//   - Dual counter-rotating quantum orbital rings
//   - Mouse parallax depth response (subtle tilt on cursor move)
//   - Holographic particle nebula with multi-hued cyber sparkles
//   - High-end lighting (Cyber Cyan + Neon Violet + Aurora Indigo)
// ============================================================

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

export function BackgroundScene3D({
  particleCount = 800,
  shapeCount = 8,
  speed = 1,
}: BackgroundScene3DProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const ringPrimaryRef = useRef<THREE.Mesh>(null);
  const ringSecondaryRef = useRef<THREE.Mesh>(null);
  const icosahedronRef = useRef<THREE.Mesh>(null);

  // Atmospheric neon broadcast lights
  const lights = useMemo(
    () => (
      <>
        <ambientLight intensity={0.65} color="#0c192c" />
        <directionalLight position={[6, 8, 4]} intensity={0.7} color="#00f2fe" />
        <pointLight position={[-6, -4, 2]} intensity={1.8} color="#8b5cf6" distance={25} />
        <pointLight position={[4, 5, -1]} intensity={1.2} color="#00f2fe" distance={20} />
        <pointLight position={[0, -6, 1]} intensity={0.9} color="#06b6d4" distance={18} />
      </>
    ),
    []
  );

  useFrame((state, delta) => {
    // 1. Mouse Parallax response (smooth lerp for natural camera depth)
    if (rootGroupRef.current) {
      const { x, y } = state.mouse;
      rootGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        rootGroupRef.current.rotation.y,
        x * 0.12,
        0.04
      );
      rootGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        rootGroupRef.current.rotation.x,
        -y * 0.08,
        0.04
      );
    }

    // 2. Slow continuous orbital spin
    if (ringPrimaryRef.current) {
      ringPrimaryRef.current.rotation.z += delta * 0.02 * speed;
      ringPrimaryRef.current.rotation.x += delta * 0.008 * speed;
    }
    if (ringSecondaryRef.current) {
      ringSecondaryRef.current.rotation.z -= delta * 0.015 * speed;
      ringSecondaryRef.current.rotation.y += delta * 0.012 * speed;
    }
    if (icosahedronRef.current) {
      icosahedronRef.current.rotation.y += delta * 0.006 * speed;
      icosahedronRef.current.rotation.x += delta * 0.004 * speed;
    }
  });

  return (
    <group ref={rootGroupRef}>
      {lights}

      {/* Cybernetic Particle Galaxy */}
      <ParticleField
        count={particleCount}
        color="#00f2fe"
        radius={11}
        size={0.022}
        orbit
        reactive={false}
      />

      {/* Cyan Cosmic Dust */}
      <Sparkles
        count={60}
        scale={14}
        size={2.8}
        speed={0.25 * speed}
        opacity={0.4}
        color="#00f2fe"
      />

      {/* Violet Quantum Sparkles */}
      <Sparkles
        count={45}
        scale={12}
        size={2.2}
        speed={0.2 * speed}
        opacity={0.35}
        color="#a855f7"
      />

      {/* Premium Floating Shapes with Cyber Palette */}
      <FloatingShapes
        count={shapeCount}
        radius={6.8}
        colors={['#00f2fe', '#a855f7', '#38bdf8', '#818cf8', '#10b981']}
        speed={speed}
      />

      {/* Outer Quantum Telemetry Ring 1 (Cyan) */}
      <mesh ref={ringPrimaryRef} position={[0, 0, -2.5]} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[6.8, 0.018, 16, 128]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.16} />
      </mesh>

      {/* Outer Quantum Telemetry Ring 2 (Violet) */}
      <mesh ref={ringSecondaryRef} position={[0, 0, -2.8]} rotation={[-Math.PI / 3, 0.2, 0]}>
        <torusGeometry args={[7.4, 0.014, 16, 128]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.12} />
      </mesh>

      {/* Deep Cyber Constellation Geodesic Sphere */}
      <mesh ref={icosahedronRef} position={[0, 0, -3.8]}>
        <icosahedronGeometry args={[5.2, 1]} />
        <meshBasicMaterial wireframe color="#38bdf8" transparent opacity={0.035} />
      </mesh>
    </group>
  );
}

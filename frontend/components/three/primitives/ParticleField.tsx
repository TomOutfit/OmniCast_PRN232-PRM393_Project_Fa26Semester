'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleFieldProps {
  /** Number of particles to draw. */
  count?: number;
  /** Particle color (hex). */
  color?: string | number;
  /** Radius of the spherical distribution. */
  radius?: number;
  /** Particle base size in world units. */
  size?: number;
  /** Optional axis for orbit motion. */
  orbit?: boolean;
  /** Time scale (1 = normal). */
  speed?: number;
  /** When true, particles are pulled slightly toward the camera by mouse parallax. */
  reactive?: boolean;
}

/**
 * ParticleField — lightweight GPU-instanced particle sphere.
 *
 * Reused by every page-level 3D scene as a background layer. Driven by
 * a single Points object + ShaderMaterial; never re-allocates the
 * buffer once mounted.
 */
export function ParticleField({
  count = 1500,
  color = '#00f2fe',
  radius = 6,
  size = 0.025,
  orbit = true,
  speed = 1,
  reactive = true,
}: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  // Build positions once.
  const positions = ((): Float32Array => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  })();

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    if (orbit) {
      pointsRef.current.rotation.y += delta * 0.05 * speed;
      pointsRef.current.rotation.x += delta * 0.02 * speed;
    }
    if (reactive && matRef.current) {
      const { x, y } = state.mouse;
      // Mild parallax — only the size, so the entire cloud breathes toward the cursor.
      const breath = 1 + 0.35 * (1 - Math.abs(x + y));
      matRef.current.size = size * breath;
    }
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        color={new THREE.Color(color)}
        size={size}
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

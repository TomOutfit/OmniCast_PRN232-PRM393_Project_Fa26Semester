'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleField } from '../primitives/ParticleField';
import { FloatingShapes } from '../primitives/FloatingShapes';

interface StudioScene3DProps {
  /** Title shown in 3D space. */
  title?: string;
  /** Whether streaming is active (changes color pulse). */
  isLive?: boolean;
}

/**
 * StudioScene3D — viewfinder for the live studio page.
 * A semi-transparent "monitor" with wireframe borders, a 3D central
 * logo block, and a constant particle + shape stream — gives the
 * "transmitting in 3D" feel without overwhelming the page.
 */
export function StudioScene3D({
  title = 'OMNICAST STUDIO',
  isLive = false,
}: StudioScene3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const wireRef = useRef<THREE.LineSegments>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const wire = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    return new THREE.EdgesGeometry(g);
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }
    if (wireRef.current) {
      wireRef.current.rotation.x -= delta * 0.05;
      wireRef.current.rotation.z += delta * 0.03;
    }
    if (coreRef.current) {
      const t = state.clock.getElapsedTime();
      const pulse = isLive ? 1 + 0.15 * Math.sin(t * 4) : 1 + 0.08 * Math.sin(t * 2);
      coreRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[3, 2, 4]} intensity={1.2} color="#00f2fe" distance={10} />
      <pointLight position={[-3, -2, 2]} intensity={0.8} color="#ff5722" distance={8} />
      <directionalLight position={[0, 5, 0]} intensity={0.4} />

      <ParticleField count={500} radius={5} color={isLive ? '#ff5722' : '#00f2fe'} size={0.02} />
      <FloatingShapes count={6} radius={4} colors={['#00f2fe', '#9bcbff', '#ff5722']} />

      <group ref={groupRef}>
        {/* Inner solid core */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.45, 0]} />
          <meshStandardMaterial
            color={isLive ? '#ff5722' : '#00f2fe'}
            emissive={isLive ? '#ff5722' : '#00f2fe'}
            emissiveIntensity={0.8}
            metalness={0.7}
            roughness={0.2}
            wireframe={false}
          />
        </mesh>
        {/* Wireframe outer shell */}
        <lineSegments ref={wireRef} geometry={wire}>
          <lineBasicMaterial color="#00f2fe" transparent opacity={0.6} />
        </lineSegments>
        {/* Title text below */}
        <Text
          position={[0, -1.6, 0]}
          fontSize={0.18}
          color="#9bcbff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor="#000000"
          letterSpacing={0.06}
        >
          {title}
        </Text>
        {isLive && (
          <Text
            position={[0, -1.95, 0]}
            fontSize={0.1}
            color="#ff5722"
            anchorX="center"
            anchorY="middle"
          >
            ● ON AIR
          </Text>
        )}
      </group>
    </>
  );
}

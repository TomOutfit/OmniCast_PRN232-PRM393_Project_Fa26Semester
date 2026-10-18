'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';

interface CyberScene3DProps {
  title?: string;
  subtitle?: string;
  color?: string;
}

export function CyberScene3D({
  title = 'OMNICAST KNOWLEDGE HUB',
  subtitle = 'Tài liệu kỹ thuật & Kiến trúc phát sóng 4K',
  color = '#00f2fe',
}: CyberScene3DProps) {
  const crystalRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y += delta * 0.4;
      crystalRef.current.rotation.x += delta * 0.2;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z -= delta * 0.3;
      ringRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} color="#9bcbff" />
      <directionalLight position={[5, 5, 5]} intensity={1} color={color} />
      <pointLight position={[-4, -2, 3]} intensity={1.5} color="#a855f7" />

      <Sparkles count={120} scale={10} size={3} speed={0.5} color={color} />

      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
        {/* Central Cyber Crystal Monolith */}
        <mesh ref={crystalRef} position={[0, 0.4, 0]}>
          <octahedronGeometry args={[1.3, 0]} />
          <meshStandardMaterial
            color="#081426"
            emissive={color}
            emissiveIntensity={0.7}
            metalness={0.9}
            roughness={0.15}
            wireframe={false}
          />
        </mesh>

        {/* Wireframe shell */}
        <mesh position={[0, 0.4, 0]}>
          <dodecahedronGeometry args={[1.7, 0]} />
          <meshBasicMaterial wireframe color={color} transparent opacity={0.25} />
        </mesh>

        {/* Orbital telemetry rings */}
        <group ref={ringRef} position={[0, 0.4, 0]}>
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[2.2, 0.02, 16, 80]} />
            <meshBasicMaterial color="#00f2fe" transparent opacity={0.6} />
          </mesh>
          <mesh rotation={[-Math.PI / 4, 0, 0]}>
            <torusGeometry args={[2.5, 0.015, 16, 80]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.5} />
          </mesh>
        </group>

        {/* Floating Title Text */}
        <group position={[0, -1.2, 0]}>
          <Text
            fontSize={0.28}
            color="#00f2fe"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.008}
            outlineColor="#000000"
            letterSpacing={0.06}
          >
            {title}
          </Text>
          <Text
            position={[0, -0.32, 0]}
            fontSize={0.11}
            color="#9bcbff"
            anchorX="center"
            anchorY="middle"
          >
            {subtitle}
          </Text>
        </group>
      </Float>
    </>
  );
}

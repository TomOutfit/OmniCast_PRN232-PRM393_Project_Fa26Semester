'use client';

// ============================================================
// OmniCast - Global Ambient Background Scene 3D (Elevated)
// ------------------------------------------------------------
// Hyper-futuristic Cybernetic Cosmos & Broadcast Intelligence:
//   - Undulating 3D Cyber Wave Horizon (Digital Broadcast Ocean)
//   - Quantum Core Reactor with Triple Gyroscopic Celestial Rings
//   - Pulsing Singularity & Holographic Crystalline Polyhedron
//   - Dynamic Mouse Parallax & Realtime Specular Light Tracking
//   - Constellation Telemetry Arcs & Multi-Spectrum Stellar Sparkles
//   - Floating Anti-Gravity Cyber Prisms with Inner Plasma Cores
// ============================================================

import { useRef, useMemo, useEffect } from 'react';
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
 * CyberHorizonWave — dynamic undulating 3D wireframe grid representing
 * digital broadcast wave frequencies and cyber-space highway.
 */
function CyberHorizonWave({ speed = 1 }: { speed?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geomRef = useRef<THREE.PlaneGeometry>(null);

  // Store base original vertex coordinates
  const originalPos = useMemo(() => {
    const geo = new THREE.PlaneGeometry(28, 20, 36, 30);
    return new Float32Array(geo.attributes.position.array);
  }, []);

  useFrame((state) => {
    if (!geomRef.current) return;
    const pos = geomRef.current.attributes.position;
    const t = state.clock.getElapsedTime() * speed * 0.75;

    for (let i = 0; i < pos.count; i++) {
      const u = originalPos[i * 3];
      const v = originalPos[i * 3 + 1];

      // Multi-harmonic broadcast wave equation
      const wave =
        Math.sin(u * 0.35 + t * 1.1) * Math.cos(v * 0.35 + t * 0.85) * 0.38 +
        Math.sin(u * 0.7 - t * 0.6) * 0.12;

      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
  });

  return (
    <group position={[0, -3.5, -3.2]} rotation={[-Math.PI / 2.35, 0, 0]}>
      {/* Primary Cyber Cyan Horizon Grid */}
      <mesh ref={meshRef}>
        <planeGeometry ref={geomRef} args={[28, 20, 36, 30]} />
        <meshBasicMaterial
          color="#00f2fe"
          wireframe
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Secondary Electric Violet Deep Under-Grid */}
      <mesh position={[0, 0, -0.15]}>
        <planeGeometry args={[28, 20, 18, 15]} />
        <meshBasicMaterial
          color="#a855f7"
          wireframe
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * ConstellationArcs — floating cybernetic telemetry nodes linked by subtle
 * laser connector lines across the deep cosmic background.
 */
function ConstellationArcs({ speed = 1 }: { speed?: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const { points, lineGeometry } = useMemo(() => {
    const count = 16;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const r = 5.5 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;
      pts.push(
        new THREE.Vector3(
          r * Math.cos(phi) * Math.cos(theta),
          r * Math.sin(phi),
          r * Math.cos(phi) * Math.sin(theta) - 3.5
        )
      );
    }

    // Connect close neighbors
    const linePositions: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dist = pts[i].distanceTo(pts[j]);
        if (dist < 4.2) {
          linePositions.push(pts[i].x, pts[i].y, pts[i].z);
          linePositions.push(pts[j].x, pts[j].y, pts[j].z);
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePositions, 3)
    );

    return { points: pts, lineGeometry: geom };
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.012 * speed;
      groupRef.current.rotation.z += delta * 0.006 * speed;
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* Glowing anchor dots */}
      {points.map((p, idx) => (
        <mesh key={idx} position={p}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial
            color={idx % 2 === 0 ? '#00f2fe' : '#a855f7'}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * QuantumReactorCore — central cosmic gyroscope featuring triple concentric
 * celestial rings, orbiting plasma satellites, and an iridescent crystal singularity.
 */
function QuantumReactorCore({ speed = 1 }: { speed?: number }) {
  const ringPrimaryRef = useRef<THREE.Mesh>(null);
  const ringSecondaryRef = useRef<THREE.Mesh>(null);
  const ringTertiaryRef = useRef<THREE.Mesh>(null);
  const coreIcosaRef = useRef<THREE.Mesh>(null);
  const coreOctaRef = useRef<THREE.Mesh>(null);
  const singularityRef = useRef<THREE.Mesh>(null);
  const satellitesGroupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime() * speed;

    // Triple celestial ring gyroscope rotations
    if (ringPrimaryRef.current) {
      ringPrimaryRef.current.rotation.z += delta * 0.024 * speed;
      ringPrimaryRef.current.rotation.x += delta * 0.012 * speed;
    }
    if (ringSecondaryRef.current) {
      ringSecondaryRef.current.rotation.z -= delta * 0.018 * speed;
      ringSecondaryRef.current.rotation.y += delta * 0.015 * speed;
    }
    if (ringTertiaryRef.current) {
      ringTertiaryRef.current.rotation.y += delta * 0.02 * speed;
      ringTertiaryRef.current.rotation.x -= delta * 0.01 * speed;
    }

    // Central faceted core rotations
    if (coreIcosaRef.current) {
      coreIcosaRef.current.rotation.y += delta * 0.015 * speed;
      coreIcosaRef.current.rotation.x += delta * 0.008 * speed;
    }
    if (coreOctaRef.current) {
      coreOctaRef.current.rotation.y -= delta * 0.03 * speed;
      coreOctaRef.current.rotation.z += delta * 0.02 * speed;
    }

    // Singularity breathing pulse
    if (singularityRef.current) {
      const pulse = 0.52 + Math.sin(t * 2.2) * 0.06;
      singularityRef.current.scale.set(pulse, pulse, pulse);
    }

    // Orbiting plasma satellites
    if (satellitesGroupRef.current) {
      satellitesGroupRef.current.rotation.y += delta * 0.08 * speed;
      satellitesGroupRef.current.rotation.x += delta * 0.04 * speed;
    }
  });

  return (
    <group position={[0, 0, -2.6]}>
      {/* 1. Primary Outer Celestial Ring (Cyan Neon Glow) */}
      <mesh ref={ringPrimaryRef} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[6.4, 0.024, 16, 128]} />
        <meshBasicMaterial
          color="#00f2fe"
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Secondary Celestial Ring (Electric Violet Glow) */}
      <mesh ref={ringSecondaryRef} rotation={[-Math.PI / 3, 0.35, 0]}>
        <torusGeometry args={[7.1, 0.02, 16, 128]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={0.24}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Tertiary Equator Ring (Sky Blue Accent) */}
      <mesh ref={ringTertiaryRef} rotation={[0.4, -0.6, Math.PI / 2]}>
        <torusGeometry args={[5.5, 0.016, 16, 96]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Orbiting Telemetry Satellites Group */}
      <group ref={satellitesGroupRef}>
        <mesh position={[6.4, 0, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-4.5, 4.5, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#00f2fe" />
        </mesh>
        <mesh position={[0, -5.5, 3.8]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color="#ec4899" />
        </mesh>
      </group>

      {/* Central Holographic Crystalline Matrix */}
      <group position={[0, 0, -0.8]}>
        {/* Outer Translucent Glass Icosahedron */}
        <mesh ref={coreIcosaRef}>
          <icosahedronGeometry args={[1.75, 0]} />
          <meshPhysicalMaterial
            color="#00f2fe"
            emissive="#00f2fe"
            emissiveIntensity={0.35}
            roughness={0.12}
            metalness={0.7}
            clearcoat={1}
            clearcoatRoughness={0.08}
            transparent
            opacity={0.38}
            wireframe={false}
          />
        </mesh>

        {/* Outer Wireframe Shield */}
        <mesh scale={1.06}>
          <icosahedronGeometry args={[1.75, 1]} />
          <meshBasicMaterial
            wireframe
            color="#00f2fe"
            transparent
            opacity={0.18}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Counter-Rotating Inner Octahedron (Electric Violet) */}
        <mesh ref={coreOctaRef} scale={0.92}>
          <octahedronGeometry args={[1.2, 0]} />
          <meshBasicMaterial
            wireframe
            color="#c084fc"
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Pulsing White Singularity Light Core */}
        <mesh ref={singularityRef}>
          <sphereGeometry args={[0.42, 24, 24]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  );
}

export function BackgroundScene3D({
  particleCount = 1000,
  shapeCount = 10,
  speed = 1,
}: BackgroundScene3DProps) {
  const rootGroupRef = useRef<THREE.Group>(null);
  const mouseLightRef = useRef<THREE.PointLight>(null);

  // High-end cinematic enterprise broadcast atmospheric lighting
  const lights = useMemo(
    () => (
      <>
        {/* Deep cosmic ambient */}
        <ambientLight intensity={0.7} color="#081426" />

        {/* Primary Cyber Cyan Directional Key Light */}
        <directionalLight
          position={[7, 9, 5]}
          intensity={0.85}
          color="#00f2fe"
        />

        {/* Violet Neon Rim Fill Light */}
        <pointLight
          position={[-7, -5, 3]}
          intensity={2.4}
          color="#a855f7"
          distance={32}
        />

        {/* Sky Blue Center Fill */}
        <pointLight
          position={[5, 6, -1]}
          intensity={1.6}
          color="#38bdf8"
          distance={26}
        />

        {/* Deep Indigo Horizon Uplight */}
        <pointLight
          position={[0, -7, 1]}
          intensity={1.5}
          color="#4338ca"
          distance={24}
        />

        {/* Magenta Energy Glint */}
        <pointLight
          position={[-4, 7, -2]}
          intensity={1.2}
          color="#ec4899"
          distance={20}
        />
      </>
    ),
    []
  );

  useFrame((state) => {
    // 1. Mouse Parallax response (smooth lerp for natural camera depth)
    if (rootGroupRef.current) {
      const { x, y } = state.mouse;
      rootGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        rootGroupRef.current.rotation.y,
        x * 0.16,
        0.04
      );
      rootGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        rootGroupRef.current.rotation.x,
        -y * 0.11,
        0.04
      );
    }

    // 2. Interactive Realtime Specular Light following cursor
    if (mouseLightRef.current) {
      const { x, y } = state.mouse;
      mouseLightRef.current.position.x = THREE.MathUtils.lerp(
        mouseLightRef.current.position.x,
        x * 5,
        0.08
      );
      mouseLightRef.current.position.y = THREE.MathUtils.lerp(
        mouseLightRef.current.position.y,
        y * 3.5,
        0.08
      );
    }
  });

  return (
    <group ref={rootGroupRef}>
      {lights}

      {/* Interactive Cursor Specular Point Light */}
      <pointLight
        ref={mouseLightRef}
        position={[0, 0, 4]}
        intensity={1.8}
        color="#00f2fe"
        distance={15}
      />

      {/* Undulating 3D Cyber Horizon Wave Plane */}
      <CyberHorizonWave speed={speed} />

      {/* Central Quantum Reactor Core & Gyroscopic Celestial Rings */}
      <QuantumReactorCore speed={speed} />

      {/* Cybernetic Constellation Telemetry Arcs */}
      <ConstellationArcs speed={speed} />

      {/* Cybernetic Particle Galaxy Field */}
      <ParticleField
        count={particleCount}
        color="#00f2fe"
        radius={12}
        size={0.024}
        orbit
        reactive
        speed={speed}
      />

      {/* Multi-Spectrum Stellar Sparkles Layer 1: Cyan Nebula Dust */}
      <Sparkles
        count={95}
        scale={16}
        size={3.4}
        speed={0.25 * speed}
        opacity={0.48}
        color="#00f2fe"
      />

      {/* Multi-Spectrum Stellar Sparkles Layer 2: Electric Violet Stars */}
      <Sparkles
        count={70}
        scale={13}
        size={2.6}
        speed={0.2 * speed}
        opacity={0.42}
        color="#c084fc"
      />

      {/* Multi-Spectrum Stellar Sparkles Layer 3: Warm Amber Broadcast Telemetry Packets */}
      <Sparkles
        count={35}
        scale={11}
        size={1.9}
        speed={0.35 * speed}
        opacity={0.55}
        color="#fbbf24"
      />

      {/* Premium Floating Shapes with Cyber Palette */}
      <FloatingShapes
        count={shapeCount}
        radius={7.2}
        colors={['#00f2fe', '#a855f7', '#38bdf8', '#818cf8', '#10b981', '#ec4899']}
        speed={speed}
      />
    </group>
  );
}

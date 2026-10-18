'use client';

// ============================================================
// OmniCast - Spatial Universe 3D (360° Broadcast Metaverse)
// ------------------------------------------------------------
// Immersive 3D interactive broadcast space:
//   - Holographic Core Earth with tri-axial telemetry energy rings
//   - High-fidelity orbital satellite stations with solar panels & dishes
//   - Active data transmission beams connecting earth to live channels
//   - Cybernetic starfield & audio frequency wave rings
//   - Interactive channel inspection HUD & direct playback navigation
// ============================================================

import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  X,
  Compass,
  RotateCw,
  Tv,
  Play,
  RotateCcw,
  Sparkles as SparklesIcon,
  Info,
} from 'lucide-react';
import { useChannels } from '@/lib/hooks/useChannels';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { useRouter } from 'next/navigation';
import type { Channel } from '@/types';

interface SatelliteNodeProps {
  channel: Channel;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: (ch: Channel) => void;
}

function SatelliteNode({
  channel,
  position,
  isSelected,
  onSelect,
}: SatelliteNodeProps) {
  const meshRef = useRef<THREE.Group>(null);
  const dishRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.35;
    }
    if (dishRef.current) {
      dishRef.current.rotation.z += delta * 0.5;
    }
  });

  const categoryColor = useMemo(() => {
    switch (channel.category) {
      case 'SPORTS':
        return '#00f2fe';
      case 'CINE':
        return '#f43f5e';
      case 'NEWS':
        return '#38bdf8';
      case 'TECH':
        return '#a855f7';
      case 'MUSIC':
        return '#06b6d4';
      default:
        return '#818cf8';
    }
  }, [channel.category]);

  const isActive = isSelected || hovered;

  return (
    <group position={position}>
      {/* Laser Data Transmission Beam to Center Earth when hovered or selected */}
      {isActive && (
        <Line
          points={[
            [0, 0, 0],
            [-position[0], -position[1], -position[2]],
          ]}
          color={categoryColor}
          lineWidth={1.5}
          transparent
          opacity={0.65}
        />
      )}

      <Float speed={2.2} rotationIntensity={0.6} floatIntensity={0.9}>
        <group
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(channel);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
        >
          {/* Central Satellite Station Body */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.28, 16]} />
            <meshStandardMaterial
              color={isActive ? '#ffffff' : '#0c1a2e'}
              emissive={categoryColor}
              emissiveIntensity={isActive ? 1.5 : 0.6}
              metalness={0.9}
              roughness={0.15}
            />
          </mesh>

          {/* Left Solar Panel Wing */}
          <mesh position={[-0.32, 0, 0]}>
            <boxGeometry args={[0.3, 0.12, 0.015]} />
            <meshStandardMaterial
              color="#00f2fe"
              emissive="#00f2fe"
              emissiveIntensity={isActive ? 0.9 : 0.4}
              metalness={0.8}
              roughness={0.2}
              wireframe={false}
            />
          </mesh>

          {/* Right Solar Panel Wing */}
          <mesh position={[0.32, 0, 0]}>
            <boxGeometry args={[0.3, 0.12, 0.015]} />
            <meshStandardMaterial
              color="#00f2fe"
              emissive="#00f2fe"
              emissiveIntensity={isActive ? 0.9 : 0.4}
              metalness={0.8}
              roughness={0.2}
              wireframe={false}
            />
          </mesh>

          {/* Parabolic Telemetry Dish */}
          <mesh ref={dishRef} position={[0, 0.2, 0]} rotation={[Math.PI / 3, 0, 0]}>
            <coneGeometry args={[0.16, 0.08, 16, 1, true]} />
            <meshStandardMaterial
              color={categoryColor}
              emissive={categoryColor}
              emissiveIntensity={0.8}
              metalness={0.9}
              roughness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Holographic Glowing Atmosphere Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.42, 0.48, 32]} />
            <meshBasicMaterial
              color={categoryColor}
              transparent
              opacity={isActive ? 0.9 : 0.35}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* HTML Overlay with Channel Badge */}
          <Html
            position={[0, 0.65, 0]}
            center
            distanceFactor={11}
            zIndexRange={[100, 0]}
          >
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer select-none shadow-2xl backdrop-blur-md flex items-center gap-2 ${
                isSelected
                  ? 'bg-cyan-500 text-black border-white ring-4 ring-cyan-500/40 scale-110 font-bold'
                  : hovered
                  ? 'bg-slate-900/95 text-cyan-300 border-cyan-400 scale-105 shadow-[0_0_15px_rgba(0,242,254,0.4)]'
                  : 'bg-slate-950/85 text-slate-200 border-white/15'
              }`}
            >
              <div
                className="w-2 h-2 rounded-full animate-ping"
                style={{ backgroundColor: categoryColor }}
              />
              <span>{channel.name}</span>
              <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-white/10 uppercase">
                {channel.category || 'LIVE'}
              </span>
            </div>
          </Html>
        </group>
      </Float>
    </group>
  );
}

function HolographicCoreGlobe() {
  const globeRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.06;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 0.12;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x += delta * 0.09;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y -= delta * 0.14;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Central Holographic Geodesic Earth Core */}
      <mesh>
        <sphereGeometry args={[1.65, 36, 36]} />
        <meshStandardMaterial
          color="#040c1a"
          emissive="#00f2fe"
          emissiveIntensity={0.3}
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Inner Dark Planet Sphere */}
      <mesh>
        <sphereGeometry args={[1.42, 28, 28]} />
        <meshStandardMaterial
          color="#050a14"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Atmospheric Halo Glow */}
      <mesh>
        <sphereGeometry args={[1.82, 32, 32]} />
        <meshBasicMaterial
          color="#00f2fe"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Tri-Axial Orbital Telemetry Energy Rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.25, 0.02, 16, 120]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.6} />
      </mesh>

      <mesh ref={ring2Ref} rotation={[-Math.PI / 3, 0.4, 0]}>
        <torusGeometry args={[2.55, 0.016, 16, 120]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.5} />
      </mesh>

      <mesh ref={ring3Ref} rotation={[0, Math.PI / 3, Math.PI / 6]}>
        <torusGeometry args={[2.85, 0.014, 16, 120]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function AudioFrequencyWaveRings() {
  const ringsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ringsRef.current) {
      const t = state.clock.getElapsedTime();
      ringsRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const scale = 1 + Math.sin(t * 2 + i * 0.45) * 0.07;
        mesh.scale.set(scale, scale, scale);
      });
    }
  });

  return (
    <group ref={ringsRef} position={[0, -2.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {[2.8, 3.4, 4.0, 4.7].map((radius, i) => (
        <mesh key={i}>
          <ringGeometry args={[radius, radius + 0.025, 64]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#00f2fe' : '#a855f7'}
            transparent
            opacity={0.3 - i * 0.06}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export function SpatialUniverseModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const controlsRef = useRef<any>(null);
  const { data: channelsData } = useChannels({ isActive: true, limit: 30 });
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [autoRotate, setAutoRotate] = useState(true);

  const channels: Channel[] = useMemo(() => {
    if (!channelsData) return [];
    if (Array.isArray(channelsData)) return channelsData;
    if (Array.isArray((channelsData as any).data)) return (channelsData as any).data;
    if (Array.isArray((channelsData as any).items)) return (channelsData as any).items;
    return [];
  }, [channelsData]);

  const filteredChannels = useMemo(() => {
    if (activeCategory === 'ALL') return channels.slice(0, 18);
    return channels.filter((c) => c.category === activeCategory).slice(0, 18);
  }, [channels, activeCategory]);

  const categories = ['ALL', 'SPORTS', 'CINE', 'NEWS', 'TECH', 'MUSIC'];

  // Fibonacci sphere positioning for smooth 3D orbits
  const satellitePositions = useMemo(() => {
    const count = filteredChannels.length;
    const radius = 4.4;
    return filteredChannels.map((_, i) => {
      const phi = Math.acos(-1 + (2 * i) / Math.max(count, 1));
      const theta = Math.sqrt(count * Math.PI) * phi;
      return [
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.cos(phi) * 0.8,
        radius * Math.sin(theta) * Math.sin(phi),
      ] as [number, number, number];
    });
  }, [filteredChannels]);

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      setAutoRotate(true);
      setSelectedChannel(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050811] text-slate-100 overflow-hidden select-none animate-in fade-in duration-300">
      {/* ── Top HUD Navigation ──────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 bg-slate-950/80 backdrop-blur-xl border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.35)]">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-sky-200 to-white bg-clip-text text-transparent">
                OmniCast 3D Spatial Universe
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                LIVE 360°
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Không gian truyền hình ba chiều tương tác trực tiếp
            </p>
          </div>
        </div>

        {/* Category Filter Pills in 3D Mode */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-white/10">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeCategory === cat
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Controls & Close Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={resetCamera}
            className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-cyan-300 hover:bg-white/5 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="Đặt lại góc nhìn mặc định"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Đặt Lại</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              autoRotate
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(0,242,254,0.2)]'
                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Bật/Tắt tự động xoay không gian"
          >
            <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Tự Xoay</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-slate-300 hover:text-red-300 transition-all cursor-pointer"
            aria-label="Đóng không gian 3D"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── 3D Canvas Viewport ──────────────────────────────────────────────── */}
      <main className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        <Canvas
          camera={{ position: [0, 2, 7.8], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.6} color="#0c192c" />
          <directionalLight position={[10, 10, 5]} intensity={1.1} color="#00f2fe" />
          <pointLight position={[-10, -5, -5]} intensity={1.6} color="#a855f7" />
          <pointLight position={[5, -8, 4]} intensity={1.0} color="#00f2fe" />

          {/* Cyan Star Dust */}
          <Sparkles count={250} scale={18} size={2.5} speed={0.35} color="#00f2fe" />

          {/* Purple Deep Space Sparkles */}
          <Sparkles count={180} scale={16} size={2.2} speed={0.3} color="#a855f7" />

          {/* Central Holographic Globe & Frequency Rings */}
          <HolographicCoreGlobe />
          <AudioFrequencyWaveRings />

          {/* Orbiting Satellite Channels */}
          {filteredChannels.map((channel, idx) => (
            <SatelliteNode
              key={channel.id}
              channel={channel}
              position={satellitePositions[idx] || [0, 0, 0]}
              isSelected={selectedChannel?.id === channel.id}
              onSelect={(ch) => setSelectedChannel(ch)}
            />
          ))}

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            autoRotate={autoRotate}
            autoRotateSpeed={0.7}
            minDistance={3.2}
            maxDistance={14}
            maxPolarAngle={Math.PI / 1.8}
          />
        </Canvas>

        {/* ── Floating Selected Channel Inspection HUD ─────────────────────── */}
        {selectedChannel && (
          <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 p-5 rounded-3xl bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/50 shadow-2xl shadow-cyan-950/70 z-30 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <ChannelLogo
                  logoUrl={selectedChannel.logoUrl}
                  slug={selectedChannel.slug}
                  name={selectedChannel.name}
                  category={selectedChannel.category}
                  size="md"
                />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedChannel.name}
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h3>
                  <p className="text-xs text-cyan-400 font-mono">
                    Kênh {(selectedChannel as any).orderIndex || '01'} • {selectedChannel.category}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedChannel(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
              {selectedChannel.description ||
                'Kênh phát sóng truyền hình chất lượng 4K Ultra HD trên nền tảng OmniCast.'}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/channels?channel=${selectedChannel.slug || selectedChannel.id}`);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black" />
                Vào Xem Trực Tiếp
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push('/epg');
                }}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Tv className="w-4 h-4 text-cyan-400" />
                Lịch EPG
              </button>
            </div>
          </div>
        )}

        {/* Bottom Hint */}
        <div className="pointer-events-none absolute bottom-4 left-6 text-[11px] text-slate-500 flex items-center gap-2 font-mono">
          <Info className="w-3.5 h-3.5 text-cyan-500/80" />
          <span>Kéo chuột để xoay 360° • Cuộn chuột để phóng to/thu nhỏ • Nhấn vệ tinh để chọn kênh</span>
        </div>
      </main>
    </div>
  );
}

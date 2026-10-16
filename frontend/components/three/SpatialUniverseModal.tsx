'use client';

import React, { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Text, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  X,
  Compass,
  RotateCw,
  Sparkles as SparklesIcon,
  Tv,
  Radio,
  Play,
  Layers,
  Volume2,
  Maximize2,
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
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
    }
  });

  const categoryColor = useMemo(() => {
    switch (channel.category) {
      case 'SPORTS':
        return '#00f2fe';
      case 'CINE':
        return '#ff007f';
      case 'NEWS':
        return '#ff5722';
      case 'TECH':
        return '#7928ca';
      case 'MUSIC':
        return '#00dfd8';
      default:
        return '#3b82f6';
    }
  }, [channel.category]);

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.8} floatIntensity={1.2}>
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
          {/* Orbital Satellite Node */}
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.35, 32, 32]} />
            <meshStandardMaterial
              color={hovered || isSelected ? '#ffffff' : '#0d1626'}
              emissive={categoryColor}
              emissiveIntensity={hovered || isSelected ? 1.4 : 0.6}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>

          {/* Glowing Outer Atmosphere Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.42, 0.48, 32]} />
            <meshBasicMaterial
              color={categoryColor}
              transparent
              opacity={hovered || isSelected ? 0.9 : 0.4}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* HTML Overlay with Channel Badge */}
          <Html
            position={[0, 0.6, 0]}
            center
            distanceFactor={10}
            zIndexRange={[100, 0]}
          >
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer select-none shadow-2xl backdrop-blur-md flex items-center gap-2 ${
                isSelected
                  ? 'bg-cyan-500 text-black border-white ring-4 ring-cyan-500/40 scale-110'
                  : hovered
                  ? 'bg-slate-900/90 text-cyan-300 border-cyan-400/80 scale-105'
                  : 'bg-slate-950/80 text-slate-200 border-white/20'
              }`}
            >
              <div
                className="w-2 h-2 rounded-full animate-ping"
                style={{ backgroundColor: categoryColor }}
              />
              <span>{channel.name}</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/10 uppercase">
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

  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group ref={globeRef}>
      {/* Central Holographic Broadcast Core */}
      <mesh>
        <sphereGeometry args={[1.6, 36, 36]} />
        <meshStandardMaterial
          color="#061224"
          emissive="#00f2fe"
          emissiveIntensity={0.25}
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[1.3, 24, 24]} />
        <meshBasicMaterial color="#002244" transparent opacity={0.6} />
      </mesh>

      {/* Equatorial Telemetry Rings */}
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.2, 0.02, 16, 100]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.5, 0.015, 16, 100]} />
        <meshBasicMaterial color="#ff5722" transparent opacity={0.4} />
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
        const scale = 1 + Math.sin(t * 2 + i * 0.5) * 0.08;
        mesh.scale.set(scale, scale, scale);
      });
    }
  });

  return (
    <group ref={ringsRef} position={[0, -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {[2.8, 3.4, 4.0, 4.6].map((radius, i) => (
        <mesh key={i}>
          <ringGeometry args={[radius, radius + 0.03, 64]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? '#00f2fe' : '#9bcbff'}
            transparent
            opacity={0.25 - i * 0.04}
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
    const radius = 4.2;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050811] text-slate-100 overflow-hidden select-none animate-in fade-in duration-300">
      {/* ── Top HUD Navigation ──────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 bg-slate-950/70 backdrop-blur-xl border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
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
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Controls & Close Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              autoRotate
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
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
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-slate-300 hover:text-red-300 transition-all"
            aria-label="Đóng không gian 3D"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── 3D Canvas Viewport ──────────────────────────────────────────────── */}
      <main className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        <Canvas
          camera={{ position: [0, 2, 7.5], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={0.9} color="#00f2fe" />
          <pointLight position={[-10, -5, -5]} intensity={1.5} color="#ff5722" />

          <Sparkles count={300} scale={18} size={2.5} speed={0.4} color="#00f2fe" />

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
            enableDamping
            dampingFactor={0.06}
            autoRotate={autoRotate}
            autoRotateSpeed={0.8}
            minDistance={3.5}
            maxDistance={14}
            maxPolarAngle={Math.PI / 1.8}
          />
        </Canvas>

        {/* ── Floating Selected Channel Inspection HUD ─────────────────────── */}
        {selectedChannel && (
          <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-96 p-5 rounded-3xl bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 z-30 animate-in slide-in-from-bottom-5 duration-300">
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
                className="text-slate-400 hover:text-white p-1"
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
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
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
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs flex items-center gap-1.5 transition-all"
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

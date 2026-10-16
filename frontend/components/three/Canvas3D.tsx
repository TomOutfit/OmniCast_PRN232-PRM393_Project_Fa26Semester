'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import {
  detectCapabilities,
  tierToDprCap,
  tierToAntialias,
  type QualityTier,
  type Scene3DCapabilities,
} from '@/lib/three/capabilities';
import type { Canvas3DProps } from '@/lib/three/types';
import { cn } from '@/lib/utils';
import { PostprocessingFX } from './primitives/PostprocessingFX';

interface InternalProps extends Canvas3DProps {
  /** Optional fallback when WebGL is unavailable. */
  fallback?: React.ReactNode;
  /** When true, the camera will animate to its position on mount. */
  animateCamera?: boolean;
}

/**
 * Canvas3D — the only place where `<Canvas>` is mounted in the app.
 *
 * Responsibilities:
 *  1. Detect WebGL/quality tier and adapt DPR, antialias, shadows.
 *  2. Apply reduced-motion + low-power fallbacks.
 *  3. Provide a Suspense boundary so all 3D children can suspend.
 *  4. Optionally layer postprocessing (bloom, vignette, chromatic aberration).
 *
 * All page-level 3D scenes should compose this component instead of
 * mounting their own <Canvas> directly.
 */
export function Canvas3D({
  children,
  cameraPosition = [0, 0, 5],
  fov = 45,
  orthographic = false,
  enableZoom = false,
  enablePan = false,
  enableRotate = false,
  lowPower = false,
  className,
  style,
  postprocessing = true,
  fallback = null,
  animateCamera = true,
}: InternalProps) {
  const [caps, setCaps] = useState<Scene3DCapabilities | null>(null);

  useEffect(() => {
    const c = detectCapabilities();
    setCaps(c);
  }, []);

  const effectiveTier: QualityTier = useMemo(() => {
    if (lowPower) return 'low';
    if (!caps) return 'high';
    return caps.quality;
  }, [caps, lowPower]);

  if (caps && effectiveTier === 'off') {
    return (
      <div
        className={cn('relative w-full h-full', className)}
        style={style}
        aria-hidden="true"
      >
        {fallback}
      </div>
    );
  }

  const dprCap = tierToDprCap(effectiveTier);
  const antialias = tierToAntialias(effectiveTier);

  return (
    <div
      className={cn('relative w-full h-full', className)}
      style={style}
      data-3d-quality={effectiveTier}
    >
      <Canvas
        dpr={[1, dprCap]}
        gl={{
          antialias,
          alpha: true,
          powerPreference: lowPower ? 'low-power' : 'high-performance',
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        camera={undefined}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          {orthographic ? (
            <OrthographicCamera
              makeDefault
              position={cameraPosition}
              zoom={50}
              near={-1000}
              far={1000}
            />
          ) : (
            <PerspectiveCamera
              makeDefault
              fov={fov}
              near={0.1}
              far={1000}
              position={cameraPosition}
            />
          )}
          {children}
          {postprocessing && effectiveTier !== 'low' && <PostprocessingFX tier={effectiveTier} />}
        </Suspense>
      </Canvas>
    </div>
  );
}

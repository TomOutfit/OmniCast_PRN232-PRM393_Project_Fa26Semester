'use client';

import { Canvas3D } from './Canvas3D';
import { BackgroundScene3D } from './scenes/BackgroundScene3D';
import { detectCapabilities } from '@/lib/three/capabilities';
import { useEffect, useState } from 'react';

/**
 * Global3DBackground — mounted once in the root layout. Renders an
 * elevated, hyper-futuristic ambient 3D scene behind every page.
 * Highly optimized with shared instancing and adaptive quality tiers.
 */
export function Global3DBackground() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(detectCapabilities().webgl);
  }, []);

  if (!supported) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden"
      style={{
        // Always behind UI; never intercepts user clicks.
        contain: 'strict',
      }}
    >
      {/* 3D WebGL Canvas Layer */}
      <Canvas3D
        cameraPosition={[0, 0, 6.2]}
        fov={52}
        postprocessing
        className="w-full h-full"
      >
        <BackgroundScene3D particleCount={1000} shapeCount={10} speed={0.75} />
      </Canvas3D>

      {/* Atmospheric Aurora Flairs (Top-Left Cyan & Bottom-Right Violet) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 18%, rgba(0, 242, 254, 0.08) 0%, transparent 45%), radial-gradient(circle at 88% 82%, rgba(168, 85, 247, 0.08) 0%, transparent 45%), radial-gradient(circle at 50% 10%, rgba(56, 189, 248, 0.05) 0%, transparent 50%)',
        }}
      />

      {/* Subtle Cyber Holographic Grid Texture Layer */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0, 242, 254, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 242, 254, 0.04) 1px, transparent 1px)',
          backgroundSize: '4rem 4rem',
          maskImage:
            'radial-gradient(ellipse 75% 65% at 50% 45%, #000 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 75% 65% at 50% 45%, #000 40%, transparent 100%)',
        }}
      />

      {/* Precision Contrast Vignette: Keeps UI text ultra-sharp while letting the 3D core & waves shine */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 95% 75% at 50% 36%, rgba(7, 11, 18, 0.12) 0%, rgba(7, 11, 18, 0.45) 60%, rgba(7, 11, 18, 0.88) 100%)',
        }}
      />
    </div>
  );
}

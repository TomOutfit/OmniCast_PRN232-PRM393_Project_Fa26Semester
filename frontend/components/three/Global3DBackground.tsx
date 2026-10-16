'use client';

import { Canvas3D } from './Canvas3D';
import { BackgroundScene3D } from './scenes/BackgroundScene3D';
import { detectCapabilities } from '@/lib/three/capabilities';
import { useEffect, useState } from 'react';

/**
 * Global3DBackground — mounted once in the root layout. Renders an
 * ambient 3D scene behind every page. Stays performant by using
 * a low particle count and a single shared buffer; never re-mounts.
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
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        // Always behind UI; never intercepts clicks.
        contain: 'strict',
      }}
    >
      <Canvas3D
        cameraPosition={[0, 0, 6]}
        fov={55}
        postprocessing
        className="w-full h-full"
      >
        <BackgroundScene3D particleCount={600} shapeCount={6} speed={0.6} />
      </Canvas3D>
      {/* Subtle dimmer so text remains readable while keeping the 3D depth clearly visible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 40%, rgba(7,11,18,0.2) 0%, rgba(7,11,18,0.6) 60%, rgba(7,11,18,0.85) 100%)',
        }}
      />
    </div>
  );
}

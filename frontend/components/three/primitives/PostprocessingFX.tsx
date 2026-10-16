'use client';

import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import type { QualityTier } from '@/lib/three/capabilities';
import { Fragment } from 'react';

interface PostprocessingFXProps {
  tier: QualityTier;
}

/**
 * PostprocessingFX — quality-aware composer.
 * Skipped on "low" tier to save frames; on "medium" we keep only bloom
 * + vignette; on "high" we add chromatic aberration + film grain.
 */
export function PostprocessingFX({ tier }: PostprocessingFXProps) {
  if (tier === 'low') return null;

  const isHigh = tier === 'high';

  return (
    <EffectComposer multisampling={isHigh ? 4 : 0}>
      <Bloom
        intensity={isHigh ? 0.9 : 0.6}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.6}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.15} darkness={0.6} />
      <Fragment>
        {isHigh ? (
          <>
            <ChromaticAberration
              offset={new Vector2(0.0006, 0.0006)}
              blendFunction={BlendFunction.NORMAL}
              radialModulation={false}
              modulationOffset={0.5}
            />
            <Noise opacity={0.06} blendFunction={BlendFunction.OVERLAY} />
          </>
        ) : null}
      </Fragment>
    </EffectComposer>
  );
}

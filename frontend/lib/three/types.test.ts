/**
 * Unit tests for the public 3D type surface.
 */
import { describe, it, expect } from 'vitest';
import type { Canvas3DProps, Scene3DVariant } from './types';

describe('3D types', () => {
  it('Canvas3DProps accepts a camera position tuple', () => {
    const props: Canvas3DProps = {
      children: null,
      cameraPosition: [0, 1, 5],
      fov: 50,
      postprocessing: true,
    };
    expect(props.cameraPosition?.[0]).toBe(0);
    expect(props.fov).toBe(50);
  });

  it('Scene3DVariant includes all supported variants', () => {
    const variants: Scene3DVariant[] = [
      'background',
      'hero',
      'channels',
      'programs',
      'epg',
      'studio',
      'watchlist',
      'auth',
      'cyber',
    ];
    expect(variants).toHaveLength(9);
  });
});

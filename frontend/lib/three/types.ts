/**
 * 3D-specific types shared across the scene graph and page-level
 * Three.js components. Keeping them centralized prevents drift
 * between the various 3D scene files.
 */

import type { ReactNode } from 'react';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type Scene3DVariant =
  | 'background'
  | 'hero'
  | 'channels'
  | 'programs'
  | 'epg'
  | 'studio'
  | 'watchlist'
  | 'auth'
  | 'cyber';

export interface Canvas3DProps {
  children: ReactNode;
  /** Camera position [x, y, z] */
  cameraPosition?: [number, number, number];
  /** Camera field of view */
  fov?: number;
  /** Use orthographic projection instead of perspective */
  orthographic?: boolean;
  /** Allow user scroll/drag to rotate the scene */
  enableZoom?: boolean;
  enablePan?: boolean;
  enableRotate?: boolean;
  /** When true, the canvas is rendered with `dpr={[1, 1]}` to save battery */
  lowPower?: boolean;
  /** Class for the wrapping <div> */
  className?: string;
  /** Style for the wrapping <div> */
  style?: React.CSSProperties;
  /** Whether to render post-processing (bloom, etc.). Defaults to true. */
  postprocessing?: boolean;
  /** Callback to receive the renderer capabilities */
  onCapabilities?: (caps: { quality: 'high' | 'medium' | 'low' | 'off' }) => void;
}

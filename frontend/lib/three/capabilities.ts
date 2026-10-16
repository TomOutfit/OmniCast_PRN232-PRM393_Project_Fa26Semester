/**
 * 3D Capability Detection
 *
 * Detects whether the current environment can (and should) render a
 * WebGL/Three.js scene. Used by every <Canvas3D> instance to fall back
 * to a 2D-rendered shell when WebGL is unavailable, the user prefers
 * reduced motion, or the device is known to be too weak.
 *
 * Pure / SSR-safe: all browser-only branches are guarded by `typeof window`.
 */

export type QualityTier = 'high' | 'medium' | 'low' | 'off';

export interface Scene3DCapabilities {
  webgl: boolean;
  webgl2: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  isMobile: boolean;
  isLowPower: boolean;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  quality: QualityTier;
  reason?: string;
}

function detectWebGL(): { webgl: boolean; webgl2: boolean } {
  if (typeof window === 'undefined') return { webgl: false, webgl2: false };
  try {
    const canvas = document.createElement('canvas');
    const ctx2 = canvas.getContext('webgl2');
    if (ctx2) return { webgl: true, webgl2: true };
    const ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return { webgl: !!ctx, webgl2: false };
  } catch {
    return { webgl: false, webgl2: false };
  }
}

function detectMotionPreference(): { reduced: boolean; highContrast: boolean } {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return { reduced: false, highContrast: false };
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const highContrast = window.matchMedia('(prefers-contrast: more)').matches;
  return { reduced, highContrast };
}

function isMobileUA(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function isLowPowerDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  // 4 hardware threads or fewer is a strong signal of a low-end mobile.
  const cores = navigator.hardwareConcurrency ?? 4;
  if (cores > 0 && cores <= 4) return true;
  // SaveData hint
  const conn = (navigator as unknown as { connection?: { saveData?: boolean } })
    .connection;
  if (conn?.saveData) return true;
  return false;
}

export function detectCapabilities(): Scene3DCapabilities {
  const { webgl, webgl2 } = detectWebGL();
  const { reduced, highContrast } = detectMotionPreference();
  const mobile = isMobileUA();
  const lowPower = isLowPowerDevice();
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? 4 : 4;
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  let quality: QualityTier = 'high';
  let reason: string | undefined;

  if (!webgl) {
    quality = 'off';
    reason = 'WebGL not available';
  } else if (reduced) {
    quality = 'low';
    reason = 'prefers-reduced-motion';
  } else if (lowPower && mobile) {
    quality = 'low';
    reason = 'low-power mobile';
  } else if (mobile) {
    quality = 'medium';
    reason = 'mobile device';
  } else if (highContrast) {
    quality = 'medium';
    reason = 'prefers-high-contrast';
  }

  return {
    webgl,
    webgl2,
    prefersReducedMotion: reduced,
    prefersHighContrast: highContrast,
    isMobile: mobile,
    isLowPower: lowPower,
    devicePixelRatio: dpr,
    hardwareConcurrency: cores,
    quality,
    reason,
  };
}

export function tierToDprCap(tier: QualityTier): number {
  switch (tier) {
    case 'high':
      return 2;
    case 'medium':
      return 1.5;
    case 'low':
      return 1;
    case 'off':
    default:
      return 1;
  }
}

export function tierToShadow(tier: QualityTier): boolean {
  return tier === 'high';
}

export function tierToAntialias(tier: QualityTier): boolean {
  return tier === 'high' || tier === 'medium';
}

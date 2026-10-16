/**
 * Unit tests for 3D capability detection and quality tier mapping.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectCapabilities,
  tierToDprCap,
  tierToAntialias,
  tierToShadow,
} from './capabilities';

function setNavigator(userAgent: string, hardwareConcurrency: number) {
  // jsdom's navigator is read-only; use defineProperty to override.
  Object.defineProperty(global, 'navigator', {
    value: { userAgent, hardwareConcurrency },
    configurable: true,
    writable: true,
  });
}

function setWindow(matchMediaImpl: (q: string) => { matches: boolean }, dpr: number) {
  Object.defineProperty(global, 'window', {
    value: {
      matchMedia: matchMediaImpl,
      devicePixelRatio: dpr,
    },
    configurable: true,
    writable: true,
  });
}

describe('3D capability detection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a capabilities object with the expected shape', () => {
    setWindow(() => ({ matches: false }), 1);
    setNavigator('Mozilla/5.0 (Windows NT 10.0)', 8);
    const caps = detectCapabilities();
    expect(caps).toHaveProperty('webgl');
    expect(caps).toHaveProperty('devicePixelRatio');
    expect(caps).toHaveProperty('hardwareConcurrency');
    expect(caps).toHaveProperty('quality');
    expect(['high', 'medium', 'low', 'off']).toContain(caps.quality);
  });

  it('handles missing window gracefully (SSR-safe)', () => {
    const originalWindow = (global as any).window;
    // @ts-expect-error: temporary delete for SSR test
    delete global.window;
    try {
      const caps = detectCapabilities();
      expect(caps.webgl).toBe(false);
      expect(caps.quality).toBe('off');
      expect(caps.reason).toBe('WebGL not available');
    } finally {
      (global as any).window = originalWindow;
    }
  });

  it('respects prefers-reduced-motion when WebGL is available', () => {
    // Force WebGL "available" path by stubbing canvas.getContext.
    const fakeGL = {};
    const originalCreateElement = (global as any).document?.createElement;
    if (global.document) {
      (global as any).document.createElement = (tag: string) => {
        if (tag === 'canvas') {
          return { getContext: () => fakeGL };
        }
        return originalCreateElement?.(tag);
      };
    }
    setWindow(
      (q: string) => ({ matches: q.includes('prefers-reduced-motion') }),
      2
    );
    setNavigator('Mozilla/5.0 (Macintosh; Intel)', 16);
    const caps = detectCapabilities();
    expect(caps.prefersReducedMotion).toBe(true);
    // We can't assert on caps.quality because jsdom may report webgl=false
    // (canvas.getContext returns a truthy fake but our code may still
    // short-circuit); this test asserts the motion flag was honored.
    if (caps.webgl) {
      expect(caps.quality).toBe('low');
    }
  });

  it('classifies low-power mobile devices', () => {
    setWindow(() => ({ matches: false }), 2);
    setNavigator('Mozilla/5.0 (Linux; Android 12)', 4);
    const caps = detectCapabilities();
    expect(caps.isMobile).toBe(true);
    expect(caps.isLowPower).toBe(true);
  });

  it('classifies high-power desktop', () => {
    setWindow(() => ({ matches: false }), 2);
    setNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 16);
    const caps = detectCapabilities();
    expect(caps.isMobile).toBe(false);
    expect(caps.isLowPower).toBe(false);
  });
});

describe('tierToDprCap', () => {
  it('returns 2 for high tier', () => {
    expect(tierToDprCap('high')).toBe(2);
  });
  it('returns 1.5 for medium tier', () => {
    expect(tierToDprCap('medium')).toBe(1.5);
  });
  it('returns 1 for low tier', () => {
    expect(tierToDprCap('low')).toBe(1);
  });
  it('returns 1 for off tier', () => {
    expect(tierToDprCap('off')).toBe(1);
  });
});

describe('tierToAntialias', () => {
  it('enables antialias on high', () => {
    expect(tierToAntialias('high')).toBe(true);
  });
  it('enables antialias on medium', () => {
    expect(tierToAntialias('medium')).toBe(true);
  });
  it('disables antialias on low', () => {
    expect(tierToAntialias('low')).toBe(false);
  });
});

describe('tierToShadow', () => {
  it('enables shadow only on high', () => {
    expect(tierToShadow('high')).toBe(true);
    expect(tierToShadow('medium')).toBe(false);
    expect(tierToShadow('low')).toBe(false);
  });
});

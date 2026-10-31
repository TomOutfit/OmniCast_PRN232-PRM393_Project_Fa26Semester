/**
 * OmniCast — Camera composition tests
 *
 * `computeCoverRect` is the pure core of the camera composer: it
 * decides which part of the camera frame is kept so the result is
 * always a 16:9 (1280×720) image.
 *
 * Run with: `npx vitest run lib/camera/compose-stream.test.ts`
 */

import { describe, it, expect } from 'vitest';
import { computeCoverRect, CAMERA_OUTPUT } from './compose-stream';

describe('computeCoverRect', () => {
  it('keeps the whole frame when the source is already 16:9', () => {
    const rect = computeCoverRect(1280, 720, 1280, 720);
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(1280);
    expect(rect.height).toBe(720);
    expect(rect.scale).toBe(1);
  });

  it('crops a 4:3 source vertically (centre crop)', () => {
    // 640×480 → 1280×720. The width fills the target, so the source is
    // scaled up by 2 (→ 1280×960) and the height is cropped to 360 of
    // the original 480 rows.
    const rect = computeCoverRect(640, 480, 1280, 720);
    expect(rect.scale).toBe(2);
    expect(rect.width).toBe(640);
    expect(rect.height).toBe(360);
    // Centred: equal amounts removed on top and bottom.
    expect(rect.x).toBe(0);
    expect(rect.y).toBeCloseTo(60, 6);
  });

  it('crops a portrait source vertically', () => {
    // 1080×1920 → 1280×720. The width fills the target.
    const rect = computeCoverRect(1080, 1920, 1280, 720);
    expect(rect.scale).toBeCloseTo(1280 / 1080, 6);
    expect(rect.width).toBe(1080);
    expect(rect.height).toBeCloseTo(720 / (1280 / 1080), 6);
    expect(rect.y).toBeCloseTo((1920 - rect.height) / 2, 6);
  });

  it('always produces a crop that exactly fills the target', () => {
    const cases: Array<[number, number]> = [
      [640, 480],
      [1280, 720],
      [1080, 1920],
      [1920, 1080],
      [320, 240],
      [2592, 1944],
    ];

    for (const [srcW, srcH] of cases) {
      const rect = computeCoverRect(srcW, srcH, CAMERA_OUTPUT.width, CAMERA_OUTPUT.height);
      // Scaled crop size must equal the target size.
      expect(rect.width * rect.scale).toBeCloseTo(CAMERA_OUTPUT.width, 6);
      expect(rect.height * rect.scale).toBeCloseTo(CAMERA_OUTPUT.height, 6);
      // The crop window must stay inside the source.
      expect(rect.x).toBeGreaterThanOrEqual(-1e-9);
      expect(rect.y).toBeGreaterThanOrEqual(-1e-9);
      expect(rect.x + rect.width).toBeLessThanOrEqual(srcW + 1e-9);
      expect(rect.y + rect.height).toBeLessThanOrEqual(srcH + 1e-9);
    }
  });

  it('never scales DOWN a source that is smaller than the target', () => {
    const rect = computeCoverRect(320, 180, 1280, 720);
    expect(rect.scale).toBe(4);
  });

  it('returns a harmless rect for degenerate input', () => {
    const rect = computeCoverRect(0, 0, 1280, 720);
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
    expect(rect.scale).toBe(1);
  });
});

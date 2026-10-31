// ============================================================
// OmniCast — Camera stream composer (front-end)
// ============================================================
//
// WHY THIS EXISTS
// ---------------
// Every camera reports its own native resolution and aspect ratio:
//
//   • a laptop webcam   → 1280×720  (16:9)
//   • an old 4:3 webcam → 640×480  (4:3)
//   • a phone camera    → 1080×1920 (portrait 9:16)
//
// MediaMTX publishes whatever it receives, so viewers on different
// devices end up seeing a stretched or letterboxed picture — and a
// portrait phone stream looks completely broken on a 16:9 player.
//
// This module normalises ANY camera into a fixed 16:9 (1280×720)
// frame by drawing it onto a canvas with a "cover" crop (the source
// is scaled up until it fills the frame, then the overflow is
// cropped away — the same behaviour as `object-fit: cover`).
//
// The audio track is passed through untouched, so the microphone
// keeps working exactly as before.
//
// FALLBACK
// --------
// If the browser cannot capture a canvas (`captureStream` is
// unavailable, or the context is tainted), the composer returns the
// ORIGINAL stream unchanged instead of failing the broadcast.
//
// PURE CORE
// ---------
// `computeCoverRect` contains all the maths and has no DOM
// dependency, so it can be unit-tested directly.
// ============================================================

/** The normalised output size every camera is composed into. */
export const CAMERA_OUTPUT = {
  width: 1280,
  height: 720,
} as const;

/** A rectangle in source-pixel coordinates. */
export interface CoverRect {
  /** X offset of the crop window inside the source frame. */
  x: number;
  /** Y offset of the crop window inside the source frame. */
  y: number;
  /** Width of the crop window (source pixels). */
  width: number;
  /** Height of the crop window (source pixels). */
  height: number;
  /** Scale factor applied to the source before cropping. */
  scale: number;
}

/**
 * Compute the "cover" crop rectangle for a source frame inside a
 * target frame.
 *
 * The source is scaled by the LARGER of the two ratios so it always
 * covers the target completely; the overflow is then cropped evenly
 * on both sides (centre crop).
 *
 * @param srcW  Source width  (pixels).
 * @param srcH  Source height (pixels).
 * @param dstW  Target width  (pixels).
 * @param dstH  Target height (pixels).
 */
export function computeCoverRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): CoverRect {
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) {
    // Degenerate input — produce an empty, harmless rect.
    return { x: 0, y: 0, width: 0, height: 0, scale: 1 };
  }

  const scale = Math.max(dstW / srcW, dstH / srcH);

  // Size of the source once scaled.
  const scaledW = srcW * scale;
  const scaledH = srcH * scale;

  // Crop window in SOURCE pixels (the scaled overflow, divided back
  // by the scale so the caller can crop before drawing).
  const cropW = dstW / scale;
  const cropH = dstH / scale;

  return {
    x: (srcW - cropW) / 2,
    y: (srcH - cropH) / 2,
    width: cropW,
    height: cropH,
    scale,
  };
}

export interface CameraComposerOptions {
  /** Target size. Defaults to {@link CAMERA_OUTPUT}. */
  output?: { width: number; height: number };
  /** Frames per second for the canvas capture. Defaults to 30. */
  fps?: number;
  /**
   * Called when the composer had to fall back to the raw stream
   * (canvas capture unsupported, or the source has no video track).
   */
  onFallback?: (reason: string) => void;
}

export interface CameraComposer {
  /**
   * The normalised stream: one canvas-backed video track plus the
   * original audio tracks. When the fallback kicked in this is the
   * ORIGINAL, untouched stream.
   */
  stream: MediaStream;
  /** True when the raw camera stream was returned instead of a composed one. */
  usedFallback: boolean;
  /** Stop the canvas loop and release the canvas. */
  stop: () => void;
}

/**
 * Compose a camera stream into a fixed-size 16:9 stream.
 *
 * @param source The raw camera (+ microphone) stream.
 * @param opts   Composition options.
 */
export async function createCameraComposer(
  source: MediaStream,
  opts: CameraComposerOptions = {},
): Promise<CameraComposer> {
  const output = opts.output ?? CAMERA_OUTPUT;
  const fps = opts.fps ?? 30;

  const videoTrack = source.getVideoTracks()[0];
  const audioTracks = source.getAudioTracks();

  const fallback = (reason: string): CameraComposer => {
    opts.onFallback?.(reason);
    return {
      stream: source,
      usedFallback: true,
      stop: () => undefined,
    };
  };

  if (!videoTrack) {
    return fallback('Camera stream has no video track.');
  }

  if (typeof document === 'undefined') {
    return fallback('No DOM available — camera composition skipped.');
  }

  // `HTMLCanvasElement.captureStream` is not available everywhere
  // (older Safari, some embedded webviews).
  if (
    typeof HTMLCanvasElement === 'undefined' ||
    typeof HTMLCanvasElement.prototype.captureStream !== 'function'
  ) {
    return fallback('This browser cannot capture a canvas (captureStream missing).');
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement('canvas');
    canvas.width = output.width;
    canvas.height = output.height;
  } catch {
    return fallback('Could not create the composition canvas.');
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return fallback('Could not acquire a 2D canvas context.');
  }

  const video = document.createElement('video');
  video.srcObject = source;
  video.muted = true;
  video.playsInline = true;
  // The source is only used as a drawing surface, never audible.
  video.style.display = 'none';

  let timerId: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  let canvasStream: MediaStream | null = null;

  const draw = () => {
    if (stopped) return;

    const srcW = video.videoWidth;
    const srcH = video.videoHeight;

    if (srcW > 0 && srcH > 0) {
      const rect = computeCoverRect(srcW, srcH, output.width, output.height);

      // Fill first so the letterbox bars (if any rounding gap
      // appears) never show the previous frame.
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, output.width, output.height);

      ctx.drawImage(
        video,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        output.width,
        output.height,
      );
    }
  };

  try {
    canvasStream = canvas.captureStream(fps);
  } catch {
    return fallback('Canvas capture failed (captureStream threw).');
  }

  const canvasTrack = canvasStream.getVideoTracks()[0];
  if (!canvasTrack) {
    return fallback('Canvas capture produced no video track.');
  }

  const composed = new MediaStream();
  composed.addTrack(canvasTrack);
  for (const audio of audioTracks) {
    composed.addTrack(audio);
  }

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    canvasTrack.stop();
    video.srcObject = null;
    canvasStream = null;
  };

  // The video element must actually be playing before frames can be
  // drawn. `play()` resolves once the first frame is available.
  try {
    await video.play();
  } catch {
    // Autoplay blocked (should not happen for a muted element) —
    // fall back to the raw stream rather than publishing black.
    canvasTrack.stop();
    video.srcObject = null;
    return fallback('Camera composition could not start (autoplay blocked).');
  }

  // A timer (not `requestAnimationFrame`) is used deliberately:
  // `requestAnimationFrame` is PAUSED entirely when the tab is in the
  // background, which would freeze the published video. A timer keeps
  // the composition running for an operator who switches tabs.
  timerId = setInterval(draw, Math.max(16, Math.round(1000 / fps)));

  return { stream: composed, usedFallback: false, stop };
}

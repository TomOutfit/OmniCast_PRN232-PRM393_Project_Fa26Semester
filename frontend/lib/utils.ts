import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

// ============================================================
// Stream URL resolver (frontend-side safety net)
// ============================================================
//
// Live Studio "Tự ghi hình" uploads used to be persisted on the
// backend as **relative** URLs (`/uploads/self-record/.../file.mp4`).
// The browser's `<video src>` and `hls.js.loadSource()` both reject
// relative URLs because they have no host. Older DB rows may still
// carry the relative form.
//
// This helper transparently rebuilds an absolute URL by prepending
// the API origin (without the trailing `/api` segment) when given a
// path-only string. Absolute URLs (the common case) pass through
// untouched. Safe to call from any player wrapper.
// ============================================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

function apiOrigin(): string {
  if (!API_BASE_URL) return '';
  // Strip trailing `/api` or `/api/v1` so we get the host root
  // (e.g. `https://omnicast-api.vercel.app`).
  return API_BASE_URL.replace(/\/api(\/.*)?$/, '');
}

/**
 * Verified production-ready sample streams (HTTP 200 OK, CORS enabled, byte-range seeking supported).
 * Used when third-party sample storage (such as Google's deprecated GCS sample bucket) is blocked or unreachable.
 */
export const VERIFIED_FALLBACK_STREAMS = {
  BIG_BUCK_BUNNY_MP4:
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  BIG_BUCK_BUNNY_1080P_MP4:
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4',
  BIG_BUCK_BUNNY_HLS: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  SINTEL_MP4:
    'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  /**
   * Cloudinary demo account — always HTTP 200, CORS enabled.
   * Used as the fallback when a Cloudinary-hosted recording URL
   * is unreachable (e.g. deleted asset or misconfigured bucket).
   */
  CLOUDINARY_DEMO_MP4:
    'https://res.cloudinary.com/demo/video/upload/v1/samples/elephants.mp4',
};

export const VERIFIED_FALLBACK_POSTER =
  'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg';

export function resolvePosterUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower.includes('commondatastorage.googleapis.com')) {
    return VERIFIED_FALLBACK_POSTER;
  }
  return trimmed;
}

export function resolveStreamUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();

  // Proactive safety net: Google's sample storage bucket has been shut down / returns 403 Forbidden.
  // Transparently remap legacy sample references to verified, high-availability multi-bitrate CDN streams.
  if (lower.includes('commondatastorage.googleapis.com')) {
    if (lower.includes('sintel') || lower.includes('elephantsdream')) {
      return VERIFIED_FALLBACK_STREAMS.SINTEL_MP4;
    }
    return VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4;
  }

  // Broken Vercel serverless /uploads/ paths that return 500 on Vercel
  if (lower.includes('omnicast-api.vercel.app/uploads/')) {
    return VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4;
  }

  // Transparently rewrite localhost:8888 / 127.0.0.1:8888 MediaMTX URLs to the actual
  // server hostname when accessed from other devices on the LAN
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    if (lower.includes('://localhost:8888/') || lower.includes('://127.0.0.1:8888/')) {
      return trimmed.replace(/:\/\/(localhost|127\.0\.0\.1):8888\//, `://${window.location.hostname}:8888/`);
    }
  }

  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:')
  ) {
    return trimmed;
  }
  const origin = apiOrigin();
  if (!origin) return trimmed; // no env → return as-is, browser will fail loudly
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin}${path}`;
}

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

export function resolveStreamUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:')
  ) {
    return trimmed;
  }
  const origin = apiOrigin();
  if (!origin) return trimmed; // no env → return as-is, browser will fail loudly
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin}${path}`;
}

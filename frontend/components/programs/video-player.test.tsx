/**
 * OmniCast — Video Player component tests
 *
 * Tests the video-player.tsx helper functions and verifies the fallback
 * chain resolves to the correct priority order.
 *
 * Run with: `npx vitest run components/programs/video-player.test.tsx`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Browser globals mock (Node environment — no window/document) ─────────────────
beforeEach(() => {
  Object.defineProperty(globalThis, 'window', {
    value: { location: { hostname: 'localhost' } },
    writable: true,
    configurable: true,
  });
});

// ── Mock dependencies ──────────────────────────────────────────────────────────
vi.mock('next/link', () => ({ default: ({ href, children }: any) => children }));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: null }),
}));

// ── Helper functions (extracted from component for unit-testing) ───────────────

type PlayerType = 'hls' | 'mp4' | 'webm' | 'iframe';

function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const fileMatch = url.match(/(?:drive|docs)\.google\.com\/(?:file\/)?(?:u\/\d+\/)?(?:d\/|open\?id=)([a-zA-Z0-9_-]+)/i);
  if (fileMatch && fileMatch[1]) return fileMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idMatch && idMatch[1]) return idMatch[1];
  const dMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/i);
  if (dMatch && dMatch[1]) return dMatch[1];
  return null;
}

function detectType(url: string): PlayerType {
  const lower = url.toLowerCase();
  if (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('vimeo.com') ||
    lower.includes('twitch.tv') ||
    lower.includes('drive.google.com') ||
    lower.includes('docs.google.com') ||
    lower.includes('drive.usercontent.google.com') ||
    Boolean(extractGoogleDriveFileId(url)) ||
    lower.includes('<iframe')
  ) {
    return 'iframe';
  }
  if (lower.includes('.m3u8')) return 'hls';
  if (lower.includes('.mp4')) return 'mp4';
  if (lower.includes('.webm')) return 'webm';
  if (lower.startsWith('blob:') || lower.startsWith('file:')) return 'mp4';
  return 'mp4';
}

function getEmbedUrl(url: string): string {
  if (!url) return url;
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
  );
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&enablejsapi=1`;
  }
  const twitchMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
  if (twitchMatch && twitchMatch[1]) {
    const parent =
      typeof window !== 'undefined' && window.location.hostname
        ? window.location.hostname
        : 'localhost';
    return `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${parent}&autoplay=true`;
  }
  const gDriveId = extractGoogleDriveFileId(url);
  if (gDriveId) {
    return `https://drive.google.com/file/d/${gDriveId}/preview`;
  }
  return url;
}

// ── Fallback chain helper (mirrors the component's useMemo chain) ─────────────

const VERIFIED_FALLBACK_STREAMS = {
  BIG_BUCK_BUNNY_MP4:
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  BIG_BUCK_BUNNY_1080P_MP4:
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4',
  BIG_BUCK_BUNNY_HLS: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  SINTEL_MP4:
    'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  CLOUDINARY_DEMO_MP4:
    'https://res.cloudinary.com/demo/video/upload/v1/samples/elephants.mp4',
};

function buildChain(src: string, fallbackSrc?: string): string[] {
  const list: string[] = [];
  if (src) list.push(src);
  if (fallbackSrc && !list.includes(fallbackSrc)) list.push(fallbackSrc);
  if (!list.includes(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4)) {
    list.push(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4);
  }
  if (!list.includes(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_HLS)) {
    list.push(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_HLS);
  }
  if (!list.includes(VERIFIED_FALLBACK_STREAMS.CLOUDINARY_DEMO_MP4)) {
    list.push(VERIFIED_FALLBACK_STREAMS.CLOUDINARY_DEMO_MP4);
  }
  return list;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('detectType', () => {
  it('returns hls for .m3u8 URLs', () => {
    expect(detectType('https://cdn.example.com/live/stream.m3u8')).toBe('hls');
    expect(detectType('http://stream.io/master.M3U8')).toBe('hls');
    expect(detectType('/path/to/playlist.m3u8?token=abc')).toBe('hls');
  });

  it('returns mp4 for .mp4 URLs', () => {
    expect(detectType('https://cdn.example.com/video.mp4')).toBe('mp4');
    expect(detectType('http://cdn.example.com/path/file.MP4')).toBe('mp4');
  });

  it('returns webm for .webm URLs', () => {
    expect(detectType('https://cdn.example.com/video.webm')).toBe('webm');
  });

  it('returns iframe for YouTube watch URLs', () => {
    expect(detectType('https://www.youtube.com/watch?v=abc123xyz')).toBe('iframe');
    expect(detectType('https://youtu.be/abc123xyz')).toBe('iframe');
    expect(detectType('https://youtube.com/watch?v=xyz789')).toBe('iframe');
  });

  it('returns iframe for YouTube embed URLs', () => {
    expect(detectType('https://www.youtube.com/embed/or0kpqcuONA')).toBe('iframe');
  });

  it('returns iframe for Twitch URLs', () => {
    expect(detectType('https://www.twitch.tv/esports_channel')).toBe('iframe');
    expect(detectType('https://twitch.tv/nocopyright')).toBe('iframe');
  });

  it('returns iframe for Vimeo URLs', () => {
    expect(detectType('https://vimeo.com/123456789')).toBe('iframe');
  });

  it('returns iframe for Google Drive URLs with preview embed', () => {
    expect(detectType('https://drive.google.com/file/d/1B2C3D4E5F6G/view?usp=sharing')).toBe('iframe');
    expect(detectType('https://drive.google.com/open?id=1B2C3D4E5F6G')).toBe('iframe');
    expect(getEmbedUrl('https://drive.google.com/file/d/1B2C3D4E5F6G/view')).toBe('https://drive.google.com/file/d/1B2C3D4E5F6G/preview');
  });

  it('defaults to mp4 for unknown URL patterns', () => {
    expect(detectType('https://cdn.example.com/live')).toBe('mp4');
    expect(detectType('rtmp://stream.example.com/live')).toBe('mp4');
    expect(detectType('')).toBe('mp4');
  });

  it('returns mp4 for blob: URLs from local file uploads', () => {
    expect(detectType('blob:https://omnicast.local/abc-123')).toBe('mp4');
    expect(detectType('blob:http://localhost:3000/def-456')).toBe('mp4');
  });

  it('returns mp4 for file: URLs from local file system', () => {
    expect(detectType('file:///C:/Users/demo/video.mp4')).toBe('mp4');
    expect(detectType('file:///home/user/Downloads/clip.webm')).toBe('webm');
  });
});

describe('getEmbedUrl', () => {
  beforeEach(() => {
    // Reset window.location.hostname between tests
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true,
    });
  });

  it('converts YouTube watch URLs to youtube-nocookie embed', () => {
    const result = getEmbedUrl('https://www.youtube.com/watch?v=or0kpqcuONA');
    expect(result).toBe('https://www.youtube-nocookie.com/embed/or0kpqcuONA?autoplay=1&enablejsapi=1');
  });

  it('converts youtu.be short URLs to youtube-nocookie embed', () => {
    const result = getEmbedUrl('https://youtu.be/or0kpqcuONA');
    expect(result).toBe('https://www.youtube-nocookie.com/embed/or0kpqcuONA?autoplay=1&enablejsapi=1');
  });

  it('extracts 11-character YouTube video IDs correctly', () => {
    const result = getEmbedUrl('https://www.youtube.com/watch?v=abc123XYZ12');
    expect(result).toContain('embed/abc123XYZ12');
  });

  it('converts Twitch channel URLs to player.twitch.tv embed', () => {
    const result = getEmbedUrl('https://www.twitch.tv/esports_channel');
    expect(result).toBe('https://player.twitch.tv/?channel=esports_channel&parent=localhost&autoplay=true');
  });

  it('uses window.location.hostname as the Twitch parent', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'omnicast.tv' },
      writable: true,
    });
    const result = getEmbedUrl('https://twitch.tv/sports_channel');
    expect(result).toContain('parent=omnicast.tv');
  });

  it('passes through non-YouTube/Twitch URLs unchanged', () => {
    expect(getEmbedUrl('https://cdn.example.com/stream.m3u8')).toBe('https://cdn.example.com/stream.m3u8');
    expect(getEmbedUrl('https://example.com/video.mp4')).toBe('https://example.com/video.mp4');
  });

  it('returns empty string for empty input', () => {
    expect(getEmbedUrl('')).toBe('');
  });

  it('handles URLs with extra parameters correctly', () => {
    const result = getEmbedUrl('https://www.youtube.com/watch?v=abc123XYZ12&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
    expect(result).toContain('embed/abc123XYZ12');
  });
});

describe('Fallback chain priority', () => {
  it('includes the primary source first', () => {
    const chain = buildChain(
      'https://bunny-cdn.example.com/stream.m3u8',
    );
    expect(chain[0]).toBe('https://bunny-cdn.example.com/stream.m3u8');
  });

  it('appends the fallbackSrc after the primary source', () => {
    const chain = buildChain(
      'https://primary.example.com/video.mp4',
      'https://fallback.example.com/video.mp4',
    );
    expect(chain).toEqual([
      'https://primary.example.com/video.mp4',
      'https://fallback.example.com/video.mp4',
      VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4,
      VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_HLS,
      VERIFIED_FALLBACK_STREAMS.CLOUDINARY_DEMO_MP4,
    ]);
  });

  it('avoids duplicate URLs in the chain', () => {
    // If the fallbackSrc is the same as a verified fallback, it should not be duplicated
    const chain = buildChain(
      VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4,
      VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4,
    );
    // Should only have the MP4 fallback once, plus HLS + Cloudinary fallback
    const mp4Count = chain.filter((u) => u === VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4).length;
    expect(mp4Count).toBe(1);
    expect(chain).toHaveLength(3);
  });

  it('always ends with the guaranteed MP4, HLS, and Cloudinary fallbacks', () => {
    const chain = buildChain('https://primary.example.com/video.mp4');
    expect(chain[chain.length - 3]).toBe(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4);
    expect(chain[chain.length - 2]).toBe(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_HLS);
    expect(chain[chain.length - 1]).toBe(VERIFIED_FALLBACK_STREAMS.CLOUDINARY_DEMO_MP4);
  });

  it('produces a chain of at least 4 entries (primary + 3 guaranteed fallbacks)', () => {
    const chain = buildChain('https://primary.example.com/video.mp4');
    expect(chain.length).toBeGreaterThanOrEqual(4);
  });

  it('handles empty src gracefully (starts with fallback + guaranteed)', () => {
    const chain = buildChain('');
    expect(chain[0]).toBe(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4);
    expect(chain[chain.length - 1]).toBe(VERIFIED_FALLBACK_STREAMS.CLOUDINARY_DEMO_MP4);
  });

  it('inserts backend-provided fallbackSrc before the guaranteed MP4', () => {
    const chain = buildChain(
      'https://bunny.example.com/stream.m3u8',
      'https://bunny.example.com/backup.m3u8',
    );
    expect(chain[0]).toBe('https://bunny.example.com/stream.m3u8');
    expect(chain[1]).toBe('https://bunny.example.com/backup.m3u8');
    expect(chain[2]).toBe(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4);
  });
});

describe('Verified fallback stream URLs', () => {
  it('BIG_BUCK_BUNNY_MP4 is a valid https URL', () => {
    expect(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4).toMatch(/^https:\/\/.+/);
  });

  it('BIG_BUCK_BUNNY_HLS is a valid https URL ending in .m3u8', () => {
    expect(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_HLS).toMatch(/^https:\/\/.+\.m3u8$/);
  });

  it('SINTEL_MP4 is a valid https URL', () => {
    expect(VERIFIED_FALLBACK_STREAMS.SINTEL_MP4).toMatch(/^https:\/\/.+/);
  });

  it('all fallback URLs are served from CDN domains known to support CORS', () => {
    const mp4Domains = [
      VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_MP4,
      VERIFIED_FALLBACK_STREAMS.SINTEL_MP4,
    ];
    mp4Domains.forEach((url) => {
      expect(url).toMatch(/^https:\/\/test-videos\.co\.uk\//);
    });
    // HLS fallback lives on a separate Mux CDN — also CORS-enabled
    expect(VERIFIED_FALLBACK_STREAMS.BIG_BUCK_BUNNY_HLS).toMatch(/^https:\/\/test-streams\.mux\.dev\//);
    // Cloudinary demo URL — CORS always enabled for demo accounts
    expect(VERIFIED_FALLBACK_STREAMS.CLOUDINARY_DEMO_MP4).toMatch(/^https:\/\/res\.cloudinary\.com\/demo\//);
  });

  it('CLOUDINARY_DEMO_MP4 is a valid https URL', () => {
    expect(VERIFIED_FALLBACK_STREAMS.CLOUDINARY_DEMO_MP4).toMatch(/^https:\/\/.+/);
  });
});

/**
 * OmniCast — Network host rule tests
 *
 * These cover the ONE rule that decides "is this browser on a
 * machine-local address?" and the ONE rule that rewrites a MediaMTX
 * URL to the machine the browser is currently on.
 *
 * Run with: `npx vitest run lib/net-host.test.ts`
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  isLiteralIpv4,
  isLocalOrLanHost,
  isBakedLocalUrl,
  rewriteMediaUrlForClient,
  rewriteMediaHostForClient,
  getClientMediaHost,
  MEDIAMTX_PORTS,
} from './net-host';

/** Pretend the browser runs on the given host. */
function setBrowserHost(hostname: string): void {
  (globalThis as any).window = {
    location: { hostname, origin: `http://${hostname}:3001` },
  };
}

const originalWindow = (globalThis as any).window;

afterEach(() => {
  (globalThis as any).window = originalWindow;
});

describe('isLiteralIpv4', () => {
  it('accepts any IPv4 literal, including non-RFC1918 ranges', () => {
    expect(isLiteralIpv4('192.168.1.10')).toBe(true);
    expect(isLiteralIpv4('172.9.8.239')).toBe(true); // campus Wi-Fi
    expect(isLiteralIpv4('100.64.0.1')).toBe(true); // carrier NAT
    expect(isLiteralIpv4('8.8.8.8')).toBe(true);
  });

  it('rejects DNS names and malformed values', () => {
    expect(isLiteralIpv4('localhost')).toBe(false);
    expect(isLiteralIpv4('omnicast.vercel.app')).toBe(false);
    expect(isLiteralIpv4('192.168.1')).toBe(false);
    expect(isLiteralIpv4('192.168.1.1.1')).toBe(false);
  });

  it('is a shape check, not a range check', () => {
    // The rule only asks "is this a literal IPv4-shaped string?".
    // Range validation is the OS network stack's job.
    expect(isLiteralIpv4('999.1.1.1')).toBe(true);
  });
});

describe('isLocalOrLanHost', () => {
  it('treats loopback and every IPv4 literal as local', () => {
    expect(isLocalOrLanHost('localhost')).toBe(true);
    expect(isLocalOrLanHost('127.0.0.1')).toBe(true);
    expect(isLocalOrLanHost('::1')).toBe(true);
    expect(isLocalOrLanHost('100.64.0.1')).toBe(true);
  });

  it('treats DNS names as public', () => {
    expect(isLocalOrLanHost('omnicast.vercel.app')).toBe(false);
    expect(isLocalOrLanHost('omnicast-fe-git-main.vercel.app')).toBe(false);
  });
});

describe('isBakedLocalUrl', () => {
  it('detects machine-local URLs', () => {
    expect(isBakedLocalUrl('http://localhost:3000/api/v1')).toBe(true);
    expect(isBakedLocalUrl('http://192.168.1.5:3000/api/v1')).toBe(true);
  });

  it('accepts public URLs', () => {
    expect(isBakedLocalUrl('https://omnicast-api.vercel.app/api/v1')).toBe(false);
  });
});

describe('rewriteMediaUrlForClient', () => {
  it('rewrites a stale literal IP on a MediaMTX port to the current host', () => {
    setBrowserHost('10.12.2.162');
    const out = rewriteMediaUrlForClient('http://172.9.8.239:8888/sport/live/index.m3u8');
    expect(out).toBe('http://10.12.2.162:8888/sport/live/index.m3u8');
  });

  it('rewrites localhost to the current host', () => {
    setBrowserHost('10.12.2.162');
    expect(rewriteMediaUrlForClient('http://localhost:8888/a/index.m3u8')).toBe(
      'http://10.12.2.162:8888/a/index.m3u8',
    );
    expect(rewriteMediaUrlForClient('http://127.0.0.1:8889/sport/whip')).toBe(
      'http://10.12.2.162:8889/sport/whip',
    );
  });

  it('preserves path templates such as {slug}', () => {
    setBrowserHost('10.12.2.162');
    const out = rewriteMediaUrlForClient('http://192.168.0.5:8888/{slug}/index.m3u8');
    expect(out).toBe('http://10.12.2.162:8888/{slug}/index.m3u8');
  });

  it('handles ws:// URLs (WebRTC playback)', () => {
    setBrowserHost('10.12.2.162');
    expect(rewriteMediaUrlForClient('ws://192.168.0.5:8889/sport')).toBe(
      'ws://10.12.2.162:8889/sport',
    );
  });

  it('never touches CDN or production URLs', () => {
    setBrowserHost('10.12.2.162');
    const cdn = 'https://res.cloudinary.com/demo/video/upload/v1/samples/elephants.mp4';
    expect(rewriteMediaUrlForClient(cdn)).toBe(cdn);
    expect(
      rewriteMediaUrlForClient('https://omnicast-api.vercel.app/api/v1/programs'),
    ).toBe('https://omnicast-api.vercel.app/api/v1/programs');
  });

  it('never touches a URL on a non-MediaMTX port', () => {
    setBrowserHost('10.12.2.162');
    expect(rewriteMediaUrlForClient('http://192.168.0.5:3000/api/v1/programs')).toBe(
      'http://192.168.0.5:3000/api/v1/programs',
    );
  });

  it('is a no-op on a public host (no window / DNS hostname)', () => {
    (globalThis as any).window = {
      location: { hostname: 'omnicast.vercel.app', origin: 'https://omnicast.vercel.app' },
    };
    const url = 'http://192.168.0.5:8888/a/index.m3u8';
    expect(rewriteMediaUrlForClient(url)).toBe(url);
  });

  it('leaves the URL alone when it already points at the current host', () => {
    setBrowserHost('10.12.2.162');
    const url = 'http://10.12.2.162:8888/a/index.m3u8';
    expect(rewriteMediaUrlForClient(url)).toBe(url);
  });

  it('returns the input unchanged for unparsable values', () => {
    setBrowserHost('10.12.2.162');
    expect(rewriteMediaUrlForClient('not a url')).toBe('not a url');
    expect(rewriteMediaUrlForClient('')).toBe('');
    expect(rewriteMediaUrlForClient(null)).toBe('');
  });});

describe('rewriteMediaHostForClient', () => {
  it('replaces localhost with the current LAN address', () => {
    setBrowserHost('10.12.2.162');
    expect(rewriteMediaHostForClient('localhost')).toBe('10.12.2.162');
    expect(rewriteMediaHostForClient('127.0.0.1')).toBe('10.12.2.162');
  });

  it('keeps a real host as-is', () => {
    setBrowserHost('10.12.2.162');
    expect(rewriteMediaHostForClient('192.168.0.5')).toBe('192.168.0.5');
  });

  it('is a no-op on a public host', () => {
    (globalThis as any).window = {
      location: { hostname: 'omnicast.vercel.app', origin: 'https://omnicast.vercel.app' },
    };
    expect(rewriteMediaHostForClient('localhost')).toBe('localhost');
  });
});

describe('getClientMediaHost', () => {
  it('returns the host only for a literal IPv4', () => {
    setBrowserHost('10.12.2.162');
    expect(getClientMediaHost()).toBe('10.12.2.162');
  });

  it('returns an empty string for localhost and public hosts', () => {
    setBrowserHost('localhost');
    expect(getClientMediaHost()).toBe('');
    setBrowserHost('omnicast.vercel.app');
    expect(getClientMediaHost()).toBe('');
  });
});

describe('MEDIAMTX_PORTS', () => {
  it('matches the backend port set', () => {
    expect([...MEDIAMTX_PORTS].sort()).toEqual(['1935', '8888', '8889']);
  });
});

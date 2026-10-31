/**
 * OmniCast - Media URL resolver unit tests
 *
 * The streaming machine's LAN IP changes whenever the DHCP lease
 * renews or the user switches Wi-Fi. Stream URLs are persisted in
 * the database with whatever host was reachable at the time, so
 * they go stale and every viewer gets a dead stream.
 *
 * These tests lock in the self-healing behaviour of
 * `src/common/utils/media-url.ts`:
 *
 *   - A stale `MEDIAMTX_PUBLIC_HOST` (an IP this machine no longer
 *     owns) is IGNORED in favour of the freshly detected LAN IP.
 *   - `MEDIAMTX_PUBLIC_BASE_URL` (tunnel / production domain) always
 *     wins, because it is the operator's explicit choice.
 *   - Only literal IPs on MediaMTX ports are rewritten - CDN
 *     hostnames and unrelated ports are left untouched.
 *
 * Run via: `npm run test`
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'os';

import {
  detectLanIpv4,
  getMediaPublicHost,
  isIpOnThisMachine,
  isLiteralIpv4,
  isPrivateIpv4,
  pickMediaBaseUrl,
  rewriteMediaHost,
} from '../src/common/utils/media-url';

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

const SAVED_ENV = { ...process.env };

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const previous = { ...process.env };
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    fn();
  } finally {
    process.env = { ...previous };
  }
}

/** An IPv4 that certainly is NOT an address of this machine. */
const FOREIGN_IP = '203.0.113.77';

/** The LAN IP this machine actually owns right now (if any). */
const LOCAL_LAN_IP = (() => {
  const detected = detectLanIpv4();
  return detected === 'localhost' ? null : detected;
})();

// ---------------------------------------------------------------------
// isLiteralIpv4 / isPrivateIpv4
// ---------------------------------------------------------------------

test('isLiteralIpv4 only accepts dotted-quad IPv4 addresses', () => {
  assert.equal(isLiteralIpv4('192.168.1.88'), true);
  assert.equal(isLiteralIpv4('10.0.0.1'), true);
  assert.equal(isLiteralIpv4('localhost'), false);
  assert.equal(isLiteralIpv4('stream.example.com'), false);
  assert.equal(isLiteralIpv4('192.168.1.88:8888'), false);
});

test('isPrivateIpv4 recognises loopback and RFC1918 ranges', () => {
  assert.equal(isPrivateIpv4('127.0.0.1'), true);
  assert.equal(isPrivateIpv4('10.1.2.3'), true);
  assert.equal(isPrivateIpv4('192.168.0.5'), true);
  assert.equal(isPrivateIpv4('172.16.0.1'), true);
  assert.equal(isPrivateIpv4('172.31.255.254'), true);
  assert.equal(isPrivateIpv4('8.8.8.8'), false);
  assert.equal(isPrivateIpv4(''), false);
});

// ---------------------------------------------------------------------
// detectLanIpv4 / isIpOnThisMachine
// ---------------------------------------------------------------------

test('detectLanIpv4 returns an IPv4 address of this machine', () => {
  const ip = detectLanIpv4();
  assert.notEqual(ip, '');
  assert.ok(
    isLiteralIpv4(ip) || ip === 'localhost',
    `expected an IPv4 or localhost, got "${ip}"`,
  );
});

test('isIpOnThisMachine accepts this machine addresses and rejects foreign ones', () => {
  assert.equal(isIpOnThisMachine('127.0.0.1'), true);
  assert.equal(isIpOnThisMachine('localhost'), true);
  assert.equal(isIpOnThisMachine(FOREIGN_IP), false);
  assert.equal(isIpOnThisMachine(''), false);
});

// ---------------------------------------------------------------------
// getMediaPublicHost
// ---------------------------------------------------------------------

test('getMediaPublicHost ignores a stale MEDIAMTX_PUBLIC_HOST', () => {
  withEnv(
    {
      MEDIAMTX_PUBLIC_HOST: FOREIGN_IP,
      MEDIAMTX_PUBLIC_BASE_URL: '',
    },
    () => {
      const resolved = getMediaPublicHost();
      assert.notEqual(resolved, FOREIGN_IP, 'a foreign IP must never be advertised');
      assert.equal(resolved, detectLanIpv4());
    },
  );
});

test('getMediaPublicHost prefers MEDIAMTX_PUBLIC_BASE_URL over everything else', () => {
  withEnv(
    {
      MEDIAMTX_PUBLIC_BASE_URL: 'https://stream.example.com',
      MEDIAMTX_PUBLIC_HOST: FOREIGN_IP,
    },
    () => {
      assert.equal(getMediaPublicHost(), 'stream.example.com');
    },
  );
});

test('getMediaPublicHost falls back to detection when no env is set', () => {
  withEnv(
    {
      MEDIAMTX_PUBLIC_HOST: undefined,
      MEDIAMTX_PUBLIC_BASE_URL: '',
    },
    () => {
      assert.equal(getMediaPublicHost(), detectLanIpv4());
    },
  );
});

test('getMediaPublicHost accepts MEDIAMTX_PUBLIC_HOST when it is a local address', () => {
  if (!LOCAL_LAN_IP) {
    // This machine has no LAN adapter (CI / container) - nothing to assert.
    return;
  }
  withEnv(
    {
      MEDIAMTX_PUBLIC_HOST: LOCAL_LAN_IP,
      MEDIAMTX_PUBLIC_BASE_URL: '',
    },
    () => {
      assert.equal(getMediaPublicHost(), LOCAL_LAN_IP);
    },
  );
});

test('getMediaPublicHost auto-detects with a fully empty MEDIAMTX environment', () => {
  // This is the SHIPPED default in `backend/.env`: every MEDIAMTX_*
  // value is blank, so the stack must self-configure on whatever
  // network the machine happens to be on.
  withEnv(
    {
      MEDIAMTX_PUBLIC_HOST: '',
      MEDIAMTX_PUBLIC_BASE_URL: '',
      MEDIAMTX_HLS_URL: '',
      MEDIAMTX_WEBRTC_URL: '',
      MEDIAMTX_WHIP_URL: '',
      MEDIAMTX_RTMP_URL: '',
    },
    () => {
      const resolved = getMediaPublicHost();
      assert.equal(resolved, detectLanIpv4());
      // The detected host must be a real address of THIS machine,
      // otherwise every viewer would be handed a dead URL.
      assert.equal(isIpOnThisMachine(resolved), true);
    },
  );
});

// ---------------------------------------------------------------------
// rewriteMediaHost
// ---------------------------------------------------------------------

test('rewriteMediaHost rewrites a stale MediaMTX URL to the current host', () => {
  withEnv(
    {
      MEDIAMTX_PUBLIC_HOST: FOREIGN_IP,
      MEDIAMTX_PUBLIC_BASE_URL: '',
    },
    () => {
      const rewritten = rewriteMediaHost(
        'http://192.168.1.50:8888/omni-sport/live/index.m3u8',
      );
      assert.ok(
        rewritten.startsWith(`http://${detectLanIpv4()}:8888/`),
        `expected the current host, got "${rewritten}"`,
      );
      assert.ok(rewritten.endsWith('/omni-sport/live/index.m3u8'));
    },
  );
});

test('rewriteMediaHost rewrites every MediaMTX port', () => {
  withEnv(
    {
      MEDIAMTX_PUBLIC_HOST: FOREIGN_IP,
      MEDIAMTX_PUBLIC_BASE_URL: '',
    },
    () => {
      for (const port of ['8888', '8889', '1935']) {
        const rewritten = rewriteMediaHost(`http://192.168.1.50:${port}/demo`);
        assert.ok(
          rewritten.startsWith(`http://${detectLanIpv4()}:${port}/`),
          `port ${port} was not rewritten: "${rewritten}"`,
        );
      }
    },
  );
});

test('rewriteMediaHost never touches CDN hostnames', () => {
  withEnv(
    {
      MEDIAMTX_PUBLIC_HOST: FOREIGN_IP,
      MEDIAMTX_PUBLIC_BASE_URL: '',
    },
    () => {
      const cdn = 'https://res.cloudinary.com/omnicast/video/upload/sample.mp4';
      assert.equal(rewriteMediaHost(cdn), cdn);

      const tunnel = 'https://random-words.trycloudflare.com/demo/index.m3u8';
      assert.equal(rewriteMediaHost(tunnel), tunnel);
    },
  );
});

test('rewriteMediaHost leaves non-MediaMTX ports untouched', () => {
  withEnv(
    {
      MEDIAMTX_PUBLIC_HOST: FOREIGN_IP,
      MEDIAMTX_PUBLIC_BASE_URL: '',
    },
    () => {
      const api = 'http://192.168.1.50:3000/api/programs';
      assert.equal(rewriteMediaHost(api), api);
    },
  );
});

test('rewriteMediaHost passes through empty and unparsable values', () => {
  assert.equal(rewriteMediaHost(null), '');
  assert.equal(rewriteMediaHost(undefined), '');
  assert.equal(rewriteMediaHost('not a url'), 'not a url');
  assert.equal(rewriteMediaHost(''), '');
});

test('rewriteMediaHost is idempotent', () => {
  withEnv(
    {
      MEDIAMTX_PUBLIC_HOST: FOREIGN_IP,
      MEDIAMTX_PUBLIC_BASE_URL: '',
    },
    () => {
      const once = rewriteMediaHost('http://192.168.1.50:8888/demo/index.m3u8');
      const twice = rewriteMediaHost(once);
      assert.equal(once, twice);
    },
  );
});

// ---------------------------------------------------------------------
// pickMediaBaseUrl
// ---------------------------------------------------------------------

test('pickMediaBaseUrl builds the fallback from the resolved host', () => {
  assert.equal(
    pickMediaBaseUrl(undefined, 'http', '192.168.1.29', '8888'),
    'http://192.168.1.29:8888',
  );
  assert.equal(
    pickMediaBaseUrl('', 'ws', '192.168.1.29', '8889'),
    'ws://192.168.1.29:8889',
  );
  assert.equal(
    pickMediaBaseUrl('   ', 'rtmp', '192.168.1.29', '1935'),
    'rtmp://192.168.1.29:1935',
  );
});

test('pickMediaBaseUrl ignores a stale literal-IP override', () => {
  // The override points at an IP from a previous network. It must NOT
  // win over the freshly resolved host.
  assert.equal(
    pickMediaBaseUrl(
      'http://192.168.1.88:8888',
      'http',
      '192.168.1.29',
      '8888',
    ),
    'http://192.168.1.29:8888',
  );
});

test('pickMediaBaseUrl honours an override that matches the resolved host', () => {
  assert.equal(
    pickMediaBaseUrl(
      'http://192.168.1.29:8888/',
      'http',
      '192.168.1.29',
      '8888',
    ),
    'http://192.168.1.29:8888',
  );
});

test('pickMediaBaseUrl honours a DNS-name override (tunnel / proxy)', () => {
  assert.equal(
    pickMediaBaseUrl(
      'https://stream.example.com',
      'http',
      'stream.example.com',
      '8888',
    ),
    'https://stream.example.com',
  );
});

test('pickMediaBaseUrl falls back for an unparsable override', () => {
  assert.equal(
    pickMediaBaseUrl('not a url', 'http', '192.168.1.29', '8888'),
    'http://192.168.1.29:8888',
  );
});

// Keep the process env clean for the other spec files.
process.env = { ...SAVED_ENV };

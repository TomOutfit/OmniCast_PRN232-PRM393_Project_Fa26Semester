/**
 * OmniCast - CORS origin policy unit tests
 *
 * The frontend decides "am I on a LAN host?" with ONE rule: any
 * literal IPv4 (plus localhost / 127.0.0.1 / ::1) counts as
 * machine-local. The backend MUST agree, otherwise a request from a
 * campus / hotel / hotspot Wi-Fi is rejected with
 * `CORS: Origin not allowed` even though the frontend correctly
 * routed it to the local backend.
 *
 * These tests lock in that agreement.
 *
 * Run via: `npm run test`
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isLiteralIpv4,
  isLocalOrLanHost,
  isOriginAllowed,
  isVercelOrigin,
  parseAllowedOrigins,
} from '../src/common/utils/cors';

// ---------------------------------------------------------------------
// isLiteralIpv4 / isLocalOrLanHost
// ---------------------------------------------------------------------

test('isLiteralIpv4 only accepts dotted-quad IPv4 addresses', () => {
  assert.equal(isLiteralIpv4('192.168.1.88'), true);
  assert.equal(isLiteralIpv4('10.0.0.1'), true);
  assert.equal(isLiteralIpv4('172.9.8.239'), true);
  assert.equal(isLiteralIpv4('100.64.0.1'), true);
  assert.equal(isLiteralIpv4('localhost'), false);
  assert.equal(isLiteralIpv4('omnicast.vercel.app'), false);
});

test('isLocalOrLanHost accepts ANY literal IPv4, not just RFC1918', () => {
  // The historical bug: only 192.168 / 10 / 172.16-31 were accepted.
  assert.equal(isLocalOrLanHost('192.168.1.204'), true);
  assert.equal(isLocalOrLanHost('10.0.0.5'), true);
  assert.equal(isLocalOrLanHost('172.16.0.1'), true);

  // Networks that fell through the old regex:
  assert.equal(isLocalOrLanHost('172.9.8.239'), true); // campus / hotel
  assert.equal(isLocalOrLanHost('172.20.0.7'), true); // campus / hotel
  assert.equal(isLocalOrLanHost('100.64.3.12'), true); // carrier NAT hotspot
  assert.equal(isLocalOrLanHost('203.0.113.9'), true); // routed LAN

  assert.equal(isLocalOrLanHost('localhost'), true);
  assert.equal(isLocalOrLanHost('127.0.0.1'), true);
  assert.equal(isLocalOrLanHost('::1'), true);

  assert.equal(isLocalOrLanHost('omnicast.vercel.app'), false);
  assert.equal(isLocalOrLanHost(''), false);
});

// ---------------------------------------------------------------------
// isVercelOrigin
// ---------------------------------------------------------------------

test('isVercelOrigin matches production and preview deployments only', () => {
  assert.equal(isVercelOrigin('https://omnicast.vercel.app'), true);
  assert.equal(isVercelOrigin('https://omnicast-fe-git-main-x.vercel.app'), true);
  assert.equal(isVercelOrigin('http://omnicast.vercel.app'), false);
  assert.equal(isVercelOrigin('https://vercel.app'), false);
  assert.equal(isVercelOrigin('https://evil.com'), false);
});

// ---------------------------------------------------------------------
// parseAllowedOrigins
// ---------------------------------------------------------------------

test('parseAllowedOrigins splits, trims and drops empty entries', () => {
  assert.deepEqual(
    parseAllowedOrigins('http://a:3000, http://b:3000 ,,'),
    ['http://a:3000', 'http://b:3000'],
  );
  assert.deepEqual(parseAllowedOrigins(''), []);
  assert.deepEqual(parseAllowedOrigins(undefined), []);
});

// ---------------------------------------------------------------------
// isOriginAllowed
// ---------------------------------------------------------------------

test('requests without an Origin header are always allowed', () => {
  // Mobile apps, curl, server-to-server.
  assert.equal(isOriginAllowed(undefined, []), true);
  assert.equal(isOriginAllowed('', []), true);
  assert.equal(isOriginAllowed(null, []), true);
});

test('a wildcard allow-list disables the origin check', () => {
  assert.equal(isOriginAllowed('https://anything.example.com', ['*']), true);
});

test('an explicit allow-list entry is accepted', () => {
  const allowed = ['https://omnicast.vercel.app', 'http://localhost:3001'];
  assert.equal(isOriginAllowed('https://omnicast.vercel.app', allowed), true);
  assert.equal(isOriginAllowed('http://localhost:3001', allowed), true);
});

test('Vercel origins are accepted even when not listed explicitly', () => {
  assert.equal(isOriginAllowed('https://omnicast-fe-pr-42.vercel.app', []), true);
});

test('any machine-local origin is accepted on any port', () => {
  const allowed: string[] = [];

  assert.equal(isOriginAllowed('http://localhost:3001', allowed), true);
  assert.equal(isOriginAllowed('http://127.0.0.1:3001', allowed), true);
  assert.equal(isOriginAllowed('http://192.168.1.204:3001', allowed), true);
  assert.equal(isOriginAllowed('http://172.9.8.239:3001', allowed), true);
  assert.equal(isOriginAllowed('http://100.64.3.12:3001', allowed), true);
  assert.equal(isOriginAllowed('http://203.0.113.9:3001', allowed), true);
});

test('an unrelated public origin is rejected', () => {
  assert.equal(isOriginAllowed('https://evil.example.com', []), false);
  assert.equal(isOriginAllowed('https://omnicast-api.vercel.app.evil.com', []), false);
});

test('a non-HTTP origin is rejected', () => {
  assert.equal(isOriginAllowed('file:///etc/passwd', []), false);
  assert.equal(isOriginAllowed('not a url', []), false);
});

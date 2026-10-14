// Quick smoke test for parseCloudinaryUrl. We re-implement the
// parser inline because the service class depends on Nest DI.
// Keep in sync with src/cloudinary/cloudinary.service.ts.

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function parseCloudinaryUrl(raw: unknown) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed.toLowerCase().startsWith('cloudinary://')) return null;
  const match = trimmed.match(/^cloudinary:\/\/([^:/]+):([^@]+)@([^/?#]+)/i);
  if (!match) return null;
  const apiKey = safeDecode(match[1]);
  const apiSecret = safeDecode(match[2]);
  const cloudName = safeDecode(match[3]);
  if (!apiKey || !apiSecret || !cloudName) return null;
  return { apiKey, apiSecret, cloudName };
}

const cases = [
  {
    name: 'standard',
    input: 'cloudinary://1234567890abcdef:secretvalue@lixsfpvi',
    expect: {
      apiKey: '1234567890abcdef',
      apiSecret: 'secretvalue',
      cloudName: 'lixsfpvi',
    },
  },
  {
    name: 'with trailing slash',
    input: 'cloudinary://key:secret@cloud/',
    expect: { apiKey: 'key', apiSecret: 'secret', cloudName: 'cloud' },
  },
  {
    name: 'with query/fragment stripped',
    input: 'cloudinary://key:secret@cloud/auto/upload?x=1#frag',
    expect: { apiKey: 'key', apiSecret: 'secret', cloudName: 'cloud' },
  },
  {
    name: 'url-encoded secret with @ and :',
    input: 'cloudinary://a:b%40c%3Ad@cloud',
    // The regex stops at the first '@', so the encoded ':' inside
    // the secret is part of apiSecret. decodeURIComponent yields ':'.
    // Note: an *unescaped* '@' in the secret would break this; that
    // is a known limitation of the cloudinary:// scheme itself.
    expect: { apiKey: 'a', apiSecret: 'b@c:d', cloudName: 'cloud' },
  },
  { name: 'empty', input: '', expect: null },
  { name: 'wrong scheme', input: 'https://x@y', expect: null },
  {
    name: 'missing colon',
    input: 'cloudinary://keyonly@cloud',
    expect: null,
  },
  { name: 'missing @', input: 'cloudinary://key:secretcloud', expect: null },
  { name: 'whitespace tolerated', input: '  cloudinary://k:s@c  ', expect: { apiKey: 'k', apiSecret: 's', cloudName: 'c' } },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const got = parseCloudinaryUrl(c.input);
  const ok = JSON.stringify(got) === JSON.stringify(c.expect);
  if (ok) {
    pass++;
    console.log(`  ✓ ${c.name}`);
  } else {
    fail++;
    console.log(`  ✗ ${c.name}`);
    console.log(`      input: ${c.input}`);
    console.log(`      want:  ${JSON.stringify(c.expect)}`);
    console.log(`      got:   ${JSON.stringify(got)}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);

// ============================================================
// Redaction coverage (CLOUDINARY_URL + friends)
// ============================================================
// Mirrors src/common/utils/redact.ts; keep in sync.

import { redactSecrets } from '../src/common/utils/redact';
const redactCases = [
  {
    name: 'CLOUDINARY_URL plain',
    input: 'failed: cloudinary://1234:abcd@lixsfpvi',
    expectContains: 'cloudinary://1234:<REDACTED>@lixsfpvi',
  },
  {
    name: 'CLOUDINARY_URL quoted JSON',
    input: '{"CLOUDINARY_URL":"cloudinary://1234:abcd@lixsfpvi"}',
    expectContains: '"CLOUDINARY_URL":"<REDACTED>"',
  },
  {
    name: 'CLOUDINARY_API_SECRET=val',
    input: 'config error CLOUDINARY_API_SECRET=su52RYyFJIk',
    expectContains: 'CLOUDINARY_API_SECRET=<REDACTED>',
  },
  {
    name: 'DATABASE_URL with password',
    input:
      'Prisma error DATABASE_URL=postgresql://user:s3cret@db.tkt.supabase.co:5432/post',
    // The first regex redacts the *entire* value, which is safer
    // than only the password portion (the host itself is a useful
    // signal that something was leaked, so we collapse the lot).
    expectContains: 'DATABASE_URL=<REDACTED>',
  },
  {
    name: 'JWT_SECRET quoted',
    input: 'JWT_SECRET = "super-secret-value"',
    expectContains: 'JWT_SECRET=<REDACTED>',
  },
  {
    name: 'Authorization bearer',
    input: 'headers={"authorization":"Bearer eyJhbGc.payload.sig"}',
    expectContains: 'authorization":"Bearer <REDACTED>',
  },
  {
    name: 'benign message unchanged',
    input: 'channel "sport-1" missing',
    expectContains: 'channel "sport-1" missing',
  },
  {
    name: 'empty / null safe',
    input: '',
    expectContains: '',
  },
];

let rPass = 0;
let rFail = 0;
for (const c of redactCases) {
  const got = redactSecrets(c.input);
  if (got.includes(c.expectContains)) {
    rPass++;
    console.log(`  ✓ ${c.name}`);
  } else {
    rFail++;
    console.log(`  ✗ ${c.name}`);
    console.log(`      input:    ${c.input}`);
    console.log(`      want sub: ${c.expectContains}`);
    console.log(`      got:      ${got}`);
  }
}
console.log(`\nRedaction: ${rPass} passed, ${rFail} failed`);

const totalFail = fail + rFail;
process.exit(totalFail === 0 ? 0 : 1);

/**
 * OmniCast - Redaction helper tests
 *
 * Mirrors the backend's `src/common/utils/redact.ts` test cases.
 * Run with: `npx vitest run lib/utils/redact.test.ts`
 */

import { describe, it, expect } from 'vitest';
import { redactSecrets, SENSITIVE_KEYS } from './redact';

describe('redactSecrets', () => {
  it('is a no-op on empty / null / undefined input', () => {
    expect(redactSecrets('')).toBe('');
    expect(redactSecrets(null)).toBe('');
    expect(redactSecrets(undefined)).toBe('');
  });

  it('redacts CLOUDINARY_URL plain assignment', () => {
    const input = 'failed: cloudinary://1234:abcd@lixsfpvi';
    const out = redactSecrets(input);
    // Both the value (whole URL) and the URL userinfo portion get
    // scrubbed — either is acceptable as long as the secret is
    // not present.
    expect(out).not.toContain('1234:abcd');
    expect(out).toMatch(/<REDACTED>/);
  });

  it('redacts CLOUDINARY_URL in JSON-quoted form', () => {
    const out = redactSecrets('{"CLOUDINARY_URL":"cloudinary://1234:abcd@lixsfpvi"}');
    expect(out).not.toContain('1234:abcd');
    expect(out).toContain('<REDACTED>');
  });

  it('redacts CLOUDINARY_API_SECRET=value', () => {
    const out = redactSecrets('config error CLOUDINARY_API_SECRET=su52RYyFJIk');
    expect(out).not.toContain('su52RYyFJIk');
    expect(out).toContain('CLOUDINARY_API_SECRET=<REDACTED>');
  });

  it('redacts JWT_SECRET=… (and quoted variant)', () => {
    expect(redactSecrets('JWT_SECRET = "super-secret-value"')).not.toContain(
      'super-secret-value',
    );
    expect(redactSecrets('{"JWT_SECRET":"super-secret-value"}')).not.toContain(
      'super-secret-value',
    );
  });

  it('redacts Authorization Bearer in JSON-quoted form', () => {
    const out = redactSecrets('headers={"authorization":"Bearer eyJhbGc.payload.sig"}');
    // The actual contract: the token is gone, regardless of how
    // the surrounding text is reshaped. The exact form is an
    // implementation detail (we may collapse the whole
    // `Authorization: Bearer ...` tail, or just the token).
    expect(out).not.toContain('eyJhbGc.payload.sig');
    expect(out).toMatch(/<REDACTED>/);
  });

  it('redacts Authorization Bearer in plain form too', () => {
    const out = redactSecrets('Authorization: Bearer abc.def.ghi');
    expect(out).not.toContain('abc.def.ghi');
    // Some `<REDACTED>` form is present (either `Bearer <REDACTED>`
    // or `Authorization=<REDACTED>`, depending on which regex wins
    // last; both are safe).
    expect(out).toMatch(/<REDACTED>/);
  });

  it('redacts nested object fields like `password`, `token`, `apiKey`', () => {
    const blob = JSON.stringify({
      name: 'ok',
      password: 'hunter2',
      nested: { token: 'abc.def.ghi' },
      arr: [{ apiKey: 'sk-12345' }],
    });
    const out = redactSecrets(blob);
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('abc.def.ghi');
    expect(out).not.toContain('sk-12345');
  });

  it('redacts connection string userinfo in arbitrary scheme', () => {
    const out = redactSecrets('Prisma DATABASE_URL=postgresql://user:s3cret@host:5432/db');
    expect(out).not.toContain('s3cret');
    expect(out).toContain('<REDACTED>');
  });

  it('leaves benign messages untouched', () => {
    const msg = 'channel "sport-1" missing — please check slug';
    expect(redactSecrets(msg)).toBe(msg);
  });

  it('coerces non-string input to a string before redaction', () => {
    // Numeric input is preserved as-is (we call String() then
    // re-redact, which is a no-op for digits).
    expect(redactSecrets(404 as unknown as string)).toBe('404');
  });
});

describe('SENSITIVE_KEYS', () => {
  it('covers the high-risk set used by the backend', () => {
    // Sanity check: the env keys the backend redactor covers
    // should also appear here so a single point of failure can't
    // drift.
    const must = [
      'CLOUDINARY_URL',
      'CLOUDINARY_API_SECRET',
      'JWT_SECRET',
      'OPENAI_API_KEY',
      'DATABASE_URL',
      'password',
      'token',
      'apiKey',
    ];
    for (const k of must) {
      expect(SENSITIVE_KEYS).toContain(k);
    }
  });
});

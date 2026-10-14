/**
 * OmniCast - Safe logger tests
 *
 * Verifies that an Error / AxiosError-like object passed through
 * `toSafeLogValue` has its `Authorization` header and any other
 * sensitive fields redacted.
 *
 * Run with: `npx vitest run lib/utils/safe-log.test.ts`
 */

import { describe, it, expect, vi } from 'vitest';
import { toSafeLogValue, logError, logWarn } from './safe-log';

describe('toSafeLogValue', () => {
  it('passes through primitives', () => {
    expect(toSafeLogValue(null)).toBeNull();
    expect(toSafeLogValue(undefined)).toBeUndefined();
    expect(toSafeLogValue(42)).toBe(42);
    expect(toSafeLogValue(true)).toBe(true);
  });

  it('redacts strings in place', () => {
    expect(toSafeLogValue('hello')).toBe('hello');
    expect(toSafeLogValue('token=eyJabc.def.ghi')).not.toContain('eyJabc.def.ghi');
  });

  it('redacts Error.message and Error.stack', () => {
    const err = new Error('cloudinary://1234:abcd@lixsfpvi');
    const safe = toSafeLogValue(err) as Record<string, string>;
    expect(safe.__type).toBe('Error');
    expect(safe.message).not.toContain('1234:abcd');
    expect(safe.message).toContain('<REDACTED>');
    expect(safe.stack).not.toContain('1234:abcd');
  });

  it('redacts deeply nested secrets inside an object', () => {
    const obj = {
      url: '/api/v1/programs',
      method: 'POST',
      config: {
        headers: {
          Authorization: 'Bearer abc.def.ghi',
          'Content-Type': 'application/json',
        },
        data: {
          password: 'hunter2',
          nested: { token: 'xxx.yyy.zzz' },
        },
      },
    };
    const safe = toSafeLogValue(obj) as string;
    expect(safe).not.toContain('abc.def.ghi');
    expect(safe).not.toContain('hunter2');
    expect(safe).not.toContain('xxx.yyy.zzz');
    expect(safe).toContain('<REDACTED>');
    // Non-sensitive fields survive
    expect(safe).toContain('/api/v1/programs');
    expect(safe).toContain('application/json');
  });

  it('survives circular structures (axios request → response → request)', () => {
    const req: any = { url: '/x', method: 'GET' };
    const res: any = { status: 500, data: { message: 'oops' } };
    req.response = res;
    res.request = req; // back-reference
    req.headers = { Authorization: 'Bearer secret.jwt.value' };
    const safe = toSafeLogValue(req) as string;
    expect(safe).toContain('[Circular]');
    expect(safe).not.toContain('secret.jwt.value');
  });
});

describe('logError / logWarn', () => {
  it('does not throw on weird inputs and routes through the safe path', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logError('[omnicast:test]', { password: 'hunter2', err: new Error('Bearer xyz.abc') });
    expect(spy).toHaveBeenCalledTimes(1);
    const printed = spy.mock.calls[0].map((c) => String(c)).join(' ');
    expect(printed).not.toContain('hunter2');
    expect(printed).not.toContain('xyz.abc');
    expect(printed).toContain('[omnicast:test]');

    logWarn('[omnicast:test]', { token: 't0p.s3cr3t' });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const printedWarn = warnSpy.mock.calls[0].map((c) => String(c)).join(' ');
    expect(printedWarn).not.toContain('t0p.s3cr3t');

    spy.mockRestore();
    warnSpy.mockRestore();
  });
});

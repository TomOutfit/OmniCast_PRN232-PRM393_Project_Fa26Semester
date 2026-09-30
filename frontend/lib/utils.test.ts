/**
 * OmniCast - Frontend utility function tests
 *
 * Pure-function unit tests covering every helper exported from
 * lib/utils.ts. These functions are called on every page so they
 * have to be reliable.
 *
 * Run with: `npx vitest run lib/utils.test.ts`
 */

import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
  slugify,
  getInitials,
  truncate,
} from './utils';

describe('cn', () => {
  it('merges class strings and resolves Tailwind conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });
});

describe('formatDate', () => {
  it('returns dd/MM/yyyy for a Date', () => {
    const out = formatDate(new Date('2026-01-05T00:00:00Z'));
    expect(out).toMatch(/^0?5\/0?1\/2026$/);
  });

  it('accepts a string and produces the same output as a Date', () => {
    expect(formatDate('2026-12-31T00:00:00Z')).toBe(
      formatDate(new Date('2026-12-31T00:00:00Z')),
    );
  });
});

describe('formatDateTime', () => {
  it('includes both date and HH:mm', () => {
    const out = formatDateTime(new Date('2026-03-15T14:30:00Z'));
    expect(out).toMatch(/15\/03\/2026/);
    expect(out).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatDuration', () => {
  it('returns minutes only when under an hour', () => {
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(45 * 60)).toBe('45m');
  });

  it('returns hours and minutes when >= 1 hour', () => {
    expect(formatDuration(60 * 60)).toBe('1h 0m');
    expect(formatDuration(90 * 60)).toBe('1h 30m');
    expect(formatDuration(2 * 60 * 60 + 15 * 60)).toBe('2h 15m');
  });
});

describe('formatNumber', () => {
  it('keeps small numbers as-is', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });

  it('uses K suffix for thousands', () => {
    expect(formatNumber(1500)).toBe('1.5K');
  });

  it('uses M suffix for millions', () => {
    expect(formatNumber(1_500_000)).toBe('1.5M');
  });
});

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips punctuation and collapses multiple dashes', () => {
    expect(slugify('  Foo!!  Bar??  Baz  ')).toBe('-foo-bar-baz-');
    expect(slugify('a---b')).toBe('a-b');
  });
});

describe('getInitials', () => {
  it('takes first letter of first two words', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL');
    expect(getInitials('Grace Brewster Murray Hopper')).toBe('GB');
  });

  it('handles single-word names', () => {
    expect(getInitials('Cher')).toBe('C');
  });
});

describe('truncate', () => {
  it('returns the original string when short enough', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('appends ... and clips at the requested length', () => {
    expect(truncate('a very long sentence', 10)).toBe('a very lon...');
  });
});

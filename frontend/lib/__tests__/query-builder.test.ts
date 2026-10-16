// ============================================================
// OmniCast - Query Builder Tests
// ============================================================
//
// Unit tests for `lib/query-builder.ts`. Covers:
//   - Dropping undefined / null / empty-string values
//   - Multi-value serialisation (?tag=a&tag=b)
//   - Numeric / boolean / array coercion in parseSearchQuery
//   - withQuery / appendQueryParam / removeQueryParam helpers
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  buildSearchQuery,
  parseSearchQuery,
  appendQueryParam,
  removeQueryParam,
  withQuery,
} from '@/lib/query-builder';

describe('buildSearchQuery', () => {
  it('returns empty string for nullish input', () => {
    expect(buildSearchQuery(null as any)).toBe('');
    expect(buildSearchQuery(undefined as any)).toBe('');
  });

  it('drops undefined / null / empty-string values', () => {
    const qs = buildSearchQuery({
      query: 'cats',
      page: undefined,
      limit: undefined,
      empty: '',
      category: 'SPORTS',
    });
    expect(qs).not.toContain('page=');
    expect(qs).not.toContain('limit=');
    expect(qs).not.toContain('empty=');
    expect(qs).not.toContain('undefined');
    expect(qs).not.toContain('null');
    expect(qs).toContain('query=cats');
    expect(qs).toContain('category=SPORTS');
  });

  it('serialises arrays as repeated keys', () => {
    const qs = buildSearchQuery({ tags: ['a', 'b', 'c'] });
    expect(qs).toBe('tags=a&tags=b&tags=c');
  });

  it('coerces booleans to "true"/"false"', () => {
    const qs = buildSearchQuery({ includeLive: true, isPrivate: false });
    expect(qs).toContain('includeLive=true');
    expect(qs).toContain('isPrivate=false');
  });

  it('coerces finite numbers to strings', () => {
    const qs = buildSearchQuery({ page: 2, minDuration: 60 });
    expect(qs).toContain('page=2');
    expect(qs).toContain('minDuration=60');
  });

  it('drops empty arrays', () => {
    const qs = buildSearchQuery({ tags: [] });
    expect(qs).not.toContain('tags=');
  });
});

describe('parseSearchQuery', () => {
  it('returns empty object for empty input', () => {
    expect(parseSearchQuery('')).toEqual({});
    expect(parseSearchQuery('?')).toEqual({});
  });

  it('coerces page/limit/minDuration/maxDuration to numbers', () => {
    const result = parseSearchQuery('page=3&limit=20&minDuration=60&maxDuration=900');
    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
    expect(result.minDuration).toBe(60);
    expect(result.maxDuration).toBe(900);
  });

  it('coerces includeLive to boolean', () => {
    const result = parseSearchQuery('includeLive=true');
    expect(result.includeLive).toBe(true);
  });

  it('collects repeated tags into an array', () => {
    const result = parseSearchQuery('tags=a&tags=b&tags=c');
    expect(result.tags).toEqual(['a', 'b', 'c']);
  });

  it('preserves non-coerced values as strings', () => {
    const result = parseSearchQuery('query=hello&category=SPORTS');
    expect(result.query).toBe('hello');
    expect(result.category).toBe('SPORTS');
  });
});

describe('appendQueryParam / removeQueryParam', () => {
  it('appends a new param without losing existing ones', () => {
    const url = appendQueryParam('/search?query=hi', 'page', '2');
    expect(url).toContain('query=hi');
    expect(url).toContain('page=2');
  });

  it('skips empty / undefined values', () => {
    const url = appendQueryParam('/search', 'page', undefined);
    expect(url).toBe('/search');
  });

  it('removes a key from the query', () => {
    const url = removeQueryParam('/search?query=hi&page=2', 'page');
    expect(url).toContain('query=hi');
    expect(url).not.toContain('page=');
  });

  it('removeQueryParam is a no-op for missing keys', () => {
    const url = removeQueryParam('/search?query=hi', 'nonexistent');
    expect(url).toBe('/search?query=hi');
  });
});

describe('withQuery', () => {
  it('appends a query string with ? or & based on existing state', () => {
    expect(withQuery('/search', { query: 'hi' })).toBe('/search?query=hi');
    expect(withQuery('/search?type=all', { query: 'hi' })).toBe(
      '/search?type=all&query=hi',
    );
  });

  it('returns base unchanged when no params are provided', () => {
    expect(withQuery('/search', {})).toBe('/search');
    expect(withQuery('/search', { page: undefined })).toBe('/search');
  });
});

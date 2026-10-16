// ============================================================
// OmniCast - Query Builder
// ============================================================
//
// Centralised URL ↔ FilterState conversion. Before this module
// existed, every consumer (Search, Programs, EPG) built query
// strings inline with ad-hoc `URLSearchParams` snippets — leading
// to subtle bugs around:
//   - `undefined` values getting stringified as `"undefined"`;
//   - arrays serialised as `?tag=a&tag=b` vs `?tag=a,b` (server
//     accepts both, but clients don't agree on read);
//   - numeric vs string flags (`page=2` vs `page="2"`) making
//     equality checks in `parseSearchQuery` brittle.
//
// This module fixes all three by:
//   1. Stripping empty values BEFORE building the query string.
//   2. Always using the multi-value shape `?tag=a&tag=b`.
//   3. Coercing `page`, `limit`, `minDuration`, `maxDuration`
//      back to numbers during parse.
//
// The `FilterParams` shape below is intentionally loose — every
// consumer is allowed to extend it via `& FilterParams`. The
// canonical fields cover the most common case (search).
// ============================================================

/**
 * Canonical filter shape. Additional fields are allowed via
 * intersection types when consumers extend this.
 */
export interface FilterParams {
  query?: string;
  type?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  tags?: string[];
  channelId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  minDuration?: number;
  maxDuration?: number;
  includeLive?: boolean;
  [extra: string]: unknown;
}

/** Returns true when the value is a non-empty string and not "undefined". */
function isMeaningfulString(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    v.length > 0 &&
    v !== 'undefined' &&
    v !== 'null'
  );
}

/** Returns true for non-empty arrays. Empty arrays should be dropped. */
function isMeaningfulArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

/**
 * Build a query string (without leading `?`) from a FilterParams
 * object. Empty / undefined / null values are dropped automatically.
 * Arrays produce `key=val1&key=val2` style params.
 */
export function buildSearchQuery(params: FilterParams): string {
  if (!params || typeof params !== 'object') return '';

  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (isMeaningfulArray(value)) {
      for (const item of value) {
        const str = String(item);
        if (isMeaningfulString(str)) sp.append(key, str);
      }
      continue;
    }

    if (typeof value === 'boolean') {
      sp.append(key, value ? 'true' : 'false');
      continue;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      sp.append(key, String(value));
      continue;
    }

    if (isMeaningfulString(value)) {
      sp.append(key, value);
    }
  }
  return sp.toString();
}

/**
 * Parse a query string into a FilterParams object. Whitespace
 * trimmed. Numeric coercion applied to known numeric fields.
 * Repeated keys collapse into arrays.
 */
export function parseSearchQuery(qs: string): FilterParams {
  const out: FilterParams = {};
  if (!qs) return out;
  const trimmed = qs.startsWith('?') ? qs.slice(1) : qs;
  if (!trimmed) return out;

  const numericKeys = new Set([
    'page',
    'limit',
    'minDuration',
    'maxDuration',
  ]);
  const booleanKeys = new Set(['includeLive']);
  const arrayKeys = new Set(['tags']);
  const params = new URLSearchParams(trimmed);
  for (const [key, value] of params.entries()) {
    if (!value) continue;

    if (arrayKeys.has(key)) {
      const existing = (out[key] as string[] | undefined) ?? [];
      existing.push(value);
      out[key] = existing;
      continue;
    }

    if (numericKeys.has(key)) {
      const n = Number(value);
      if (Number.isFinite(n)) out[key] = n;
      continue;
    }

    if (booleanKeys.has(key)) {
      out[key] = value === 'true' || value === '1';
      continue;
    }

    out[key] = value;
  }
  return out;
}

/**
 * Append a single key/value pair to an existing path's query string.
 * Returns the new path. Useful in event handlers where we want to
 * update the URL without rewriting the whole pathname.
 */
export function appendQueryParam(
  path: string,
  key: string,
  value: string | number | boolean | undefined,
): string {
  if (value === undefined || value === null || value === '') return path;

  const [pathname, qs = ''] = path.split('?');
  const params = new URLSearchParams(qs);
  params.set(key, String(value));
  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

/**
 * Remove a single key from an existing path's query string. No-op
 * if the key isn't present.
 */
export function removeQueryParam(path: string, key: string): string {
  const [pathname, qs = ''] = path.split('?');
  const params = new URLSearchParams(qs);
  params.delete(key);
  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}

/**
 * Compose a full URL by combining a base URL with a FilterParams
 * payload. Returns the base URL unchanged when no meaningful
 * params are present.
 */
export function withQuery(baseUrl: string, params: FilterParams): string {
  const qs = buildSearchQuery(params);
  if (!qs) return baseUrl;
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}${qs}`;
}

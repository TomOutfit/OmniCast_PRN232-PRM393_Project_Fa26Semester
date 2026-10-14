// ============================================================
// OmniCast - Secret Redactor (frontend)
// ============================================================
//
// Browser-safe mirror of `backend/src/common/utils/redact.ts`.
// Used by `lib/utils/safe-log.ts` to scrub secrets out of any
// value that ends up in `console.error` / telemetry.
//
// Threat model: when an AxiosError bubbles up from `apiClient`,
// `error.config.headers` carries the live `Authorization: Bearer
// <jwt>` header. If a developer (or Sentry) prints the full error
// object, the JWT and any cookie / refresh token that happened
// to be in scope will land in the browser console and in the
// production log. This helper is the last line of defence.
//
// Like the backend version, this is *defence-in-depth*, not a
// security boundary. Keep `SENSITIVE_KEYS` in sync with the
// backend's `SENSITIVE_ENV_KEYS` when you onboard new secrets.

/**
 * Field names whose value, anywhere inside a serialised object,
 * must be redacted. We redact the *value* of these keys, not the
 * keys themselves, so structural context is preserved.
 */
export const SENSITIVE_KEYS: readonly string[] = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'jwt',
  'cookie',
  'set-cookie',
  'apiKey',
  'api_key',
  'apiSecret',
  'api_secret',
  'secret',
  'CLOUDINARY_URL',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'TMDB_API_KEY',
  'YOUTUBE_API_KEY',
  'TWITCH_CLIENT_SECRET',
  'GNEWS_API_KEY',
  'RAWG_API_KEY',
  'THESPORTSDB_API_KEY',
  'DATABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
];

/**
 * Replace any `KEY=value` / `"KEY":"value"` / `KEY: value` token
 * for a known sensitive env or field name with `<REDACTED>`.
 * Also scrubs `scheme://user:password@host` and `Bearer <token>`
 * patterns so a stringified axios request config can't leak its
 * credentials.
 */
export function redactSecrets(input: string | undefined | null): string {
  if (!input) return '';
  let out = String(input);

  // 1) Bearer / Basic auth FIRST. Run this before the
  //    `SENSITIVE_KEYS` pass below so the whole `Bearer <token>`
  //    tail is collapsed into one `<REDACTED>` unit instead of
  //    leaving an orphan token after the `authorization: Bearer`
  //    prefix is replaced.
  out = out.replace(
    /(["']?authorization["']?\s*[:=]\s*"?)(bearer|basic)\s+[A-Za-z0-9._\-+/=]+/gi,
    '$1$2 <REDACTED>',
  );

  // 2) Known sensitive keys/values: `KEY=value` and JSON-quoted
  //    forms. By the time we get here, the token from any
  //    `Authorization: Bearer …` has already been collapsed into
  //    `<REDACTED>`, so this regex only needs to handle the
  //    surrounding structure.
  for (const key of SENSITIVE_KEYS) {
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(
      new RegExp(`\\b(${esc})\\b\\s*[:=]\\s*"?([^"\\s&;,)]+)"?`, 'gi'),
      `$1=<REDACTED>`,
    );
    // JSON form: "key": "value"
    out = out.replace(
      new RegExp(`"(${esc})"\\s*:\\s*"([^"]+)"`, 'gi'),
      `"$1":"<REDACTED>"`,
    );
  }

  // 3) Generic URL with embedded userinfo: scheme://user:pass@host
  out = out.replace(
    /([a-z][a-z0-9+.\-]*:\/\/[^:\/\s]+:)([^@\s]+)(@)/gi,
    '$1<REDACTED>$3',
  );

  return out;
}

/**
 * Replacer that JSON.stringify can use to drop functions and
 * collapse circular structures into the literal `[Circular]`.
 * Pass it as the second argument: `JSON.stringify(value, safeReplacer)`.
 */
export function safeReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'function') return undefined;
  if (typeof value === 'bigint') return value.toString();
  return value;
}

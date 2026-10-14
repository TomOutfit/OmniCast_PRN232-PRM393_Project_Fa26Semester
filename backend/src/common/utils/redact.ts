// ============================================================
// OmniCast - Secret Redactor
// ============================================================
//
// Pure string redaction for log lines. Used by `LoggerService` and
// any other call site that interpolates user-controlled or
// environment-derived data into a log/trace payload.
//
// This is a *defence-in-depth* layer, not a security boundary. The
// goal is to stop accidental leaks (e.g. an exception message that
// interpolates a config value, a connection string printed by an
// upstream library). A determined attacker who can hand-craft a
// string to be logged can still smuggle data, but that's a
// pre-existing logger-injection problem in Node, not something we
// can solve here.

/**
 * Env keys whose value (in any string) must be redacted. Add new
 * entries here when you onboard a new secret-bearing env var.
 */
export const SENSITIVE_ENV_KEYS: readonly string[] = [
  'CLOUDINARY_URL',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'JWT_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'OPENAI_API_KEY',
  'TMDB_API_KEY',
  'YOUTUBE_API_KEY',
  'TWITCH_CLIENT_SECRET',
  'GNEWS_API_KEY',
  'RAWG_API_KEY',
  'THESPORTSDB_API_KEY',
  'DATABASE_URL',
];

/**
 * Replace any `KEY=value` / `"KEY":"value"` / `KEY: value` token
 * for a known sensitive env name with `<REDACTED>`. Also scrubs
 * `scheme://user:password@host` patterns (Postgres, Mongo,
 * Cloudinary, etc.) and `Authorization: Bearer <token>` so
 * connection strings / auth headers printed by upstream libraries
 * can't leak credentials.
 */
export function redactSecrets(input: string | undefined | null): string {
  if (!input) return '';
  let out = String(input);

  // 1) Known env keys. Match `KEY=value` (with optional quotes,
  //    optional spaces) and the JSON variant `"KEY":"value"`.
  for (const key of SENSITIVE_ENV_KEYS) {
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(
      new RegExp(`\\b(${esc})\\b\\s*[:=]\\s*"?([^"\\s&;,)]+)"?`, 'gi'),
      `$1=<REDACTED>`,
    );
    // JSON form
    out = out.replace(
      new RegExp(`"${esc}"\\s*:\\s*"([^"]+)"`, 'gi'),
      `"${key}":"<REDACTED>"`,
    );
  }

  // 2) Generic URL with embedded userinfo: scheme://user:pass@host
  out = out.replace(
    /([a-z][a-z0-9+.\-]*:\/\/[^:\/\s]+:)([^@\s]+)(@)/gi,
    '$1<REDACTED>$3',
  );

  // 3) Bearer / Basic auth headers, including in JSON-quoted keys
  //    like `{"authorization":"Bearer eyJ..."}`.
  out = out.replace(
    /(["']?authorization["']?\s*[:=]\s*"?)(bearer|basic)\s+[A-Za-z0-9._\-+/=]+/gi,
    '$1$2 <REDACTED>',
  );

  return out;
}

// ============================================================
// OmniCast - Secret Redactor (mobile / Dart)
// ============================================================
//
// Dart port of `frontend/lib/utils/redact.ts` and
// `backend/src/common/utils/redact.ts`. Used by `safe_log.dart`
// to scrub secrets out of any value before it reaches
// `debugPrint` / `developer.log` / `print`.
//
// Threat model: the mobile `auth_interceptor.dart` debugPrints
// the raw `Authorization` header and request body on every API
// call. If a user shares a bug report with `flutter logs` or
// attaches their device log to a Sentry event, the JWT and the
// login password land in the report. This helper is the last
// line of defence.
//
// Like the other redaction helpers, this is *defence-in-depth*,
// not a security boundary. Keep `sensitiveKeys` in sync with
// the TS / NestJS versions when you onboard new secrets.

/// Field names whose value, anywhere inside a serialised object,
/// must be redacted. We redact the *value* of these keys, not the
/// keys themselves, so structural context is preserved.
const List<String> sensitiveKeys = <String>[
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

RegExp _escape(String s) {
  final escaped = s.replaceAllMapped(
    RegExp(r'[.*+?^${}()|[\]\\]'),
    (m) => '\\${m[0]}',
  );
  return RegExp(escaped, caseSensitive: false);
}

final List<RegExp> _envKeyPatterns = sensitiveKeys
    .map(
      (key) => RegExp(
        '\\b(${_escape(key).pattern})\\b\\s*[:=]\\s*"?([^"\\s&;,)]+)"?',
      ),
    )
    .toList(growable: false);

final List<RegExp> _envKeyJsonPatterns = sensitiveKeys
    .map(
      (key) => RegExp(
        '"(${_escape(key).pattern})"\\s*:\\s*"([^"]+)"',
      ),
    )
    .toList(growable: false);

final RegExp _userinfoPattern = RegExp(
  r'([a-z][a-z0-9+.\-]*://[^:/\s]+:)([^@\s]+)(@)',
  caseSensitive: false,
);

final RegExp _bearerPattern = RegExp(
  r'''(["']?authorization["']?\s*[:=]\s*"?)(bearer|basic)\s+[A-Za-z0-9._\-+/=]+''',
  caseSensitive: false,
);

/// Replace any `KEY=value` / `"KEY":"value"` / `KEY: value` token
/// for a known sensitive env or field name with `<REDACTED>`.
/// Also scrubs `scheme://user:password@host` and `Bearer <token>`
/// patterns so a stringified Dio request config can't leak its
/// credentials.
String redactSecrets(String? input) {
  if (input == null || input.isEmpty) return '';
  var out = input;

  // 1) Bearer / Basic auth FIRST. Run this before the env-key
  //    pass below so the whole `Bearer <token>` tail is
  //    collapsed into one `<REDACTED>` unit instead of leaving
  //    an orphan token after the `authorization: Bearer`
  //    prefix is replaced.
  out = out.replaceAllMapped(_bearerPattern, (m) => '${m[1]}${m[2]} <REDACTED>');

  // 2) Known sensitive keys/values: `KEY=value` and JSON-quoted
  //    forms. By the time we get here, the token from any
  //    `Authorization: Bearer …` has already been collapsed.
  for (final re in _envKeyPatterns) {
    out = out.replaceAllMapped(re, (m) => '${m[1]}=<REDACTED>');
  }
  for (final re in _envKeyJsonPatterns) {
    out = out.replaceAllMapped(re, (m) => '"${m[1]}":"<REDACTED>"');
  }

  // 3) Generic URL with embedded userinfo: scheme://user:pass@host
  out = out.replaceAllMapped(
    _userinfoPattern,
    (m) => '${m[1]}<REDACTED>${m[3]}',
  );

  return out;
}

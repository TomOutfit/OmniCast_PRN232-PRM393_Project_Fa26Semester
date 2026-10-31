// ============================================================
// OmniCast - CORS origin policy (backend)
// ============================================================
//
// WHY THIS FILE EXISTS
// --------------------
// The frontend decides whether it is running on a LAN host with ONE
// rule: "any literal IPv4 (plus localhost / 127.0.0.1 / ::1) is
// machine-local, anything else is a public DNS host".
//
// The backend used to apply a NARROWER rule - only the RFC1918
// ranges `192.168.x`, `10.x`, `172.16 - 172.31` - so the two sides
// disagreed on real networks:
//
//   * campus / hotel / airport Wi-Fi  → `172.9.x`, `172.20.x`
//   * mobile hotspot (carrier NAT)    → `100.64.x - 100.127.x`
//   * routed / enterprise LANs        → arbitrary `A.B.C.D`
//
// On such a network the browser sent
//   `Origin: http://172.9.8.239:3001`
// the backend rejected it with `CORS: Origin not allowed`, and every
// API call failed - even though the frontend had correctly routed
// the request to the local backend.
//
// The rule below now MIRRORS the frontend exactly (see
// `frontend/lib/net-host.ts`). Both sides agree by construction.
//
// PRODUCTION SAFETY
// -----------------
// A literal IPv4 origin is still attacker-controlled in theory, but
// it can only be used to talk to a backend that is ALREADY reachable
// at that address, so it grants nothing extra. The deployed API is
// protected by the explicit `FRONTEND_URL` allow-list, which always
// wins, plus the `*.vercel.app` rule for preview deployments.
//
// The explicit allow-list is checked FIRST, so an operator can still
// lock the API down to specific origins in production.
// ============================================================

/** True when `host` is a literal IPv4 address (not a DNS name). */
export function isLiteralIpv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/**
 * True when a hostname refers to a machine-local address.
 *
 * Mirrors `isLocalOrLanHost` in `frontend/lib/net-host.ts`.
 */
export function isLocalOrLanHost(host: string): boolean {
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  return isLiteralIpv4(host);
}

/**
 * True for Vercel-hosted origins (production + preview deployments).
 *
 * `https://omnicast.vercel.app`, `https://omnicast-fe-git-main-x.vercel.app`
 */
export function isVercelOrigin(origin: string): boolean {
  return /^https:\/\/[a-zA-Z0-9_.-]*\.vercel\.app$/.test(origin);
}

/**
 * Split the configured allow-list into normalised origins.
 *
 * `FRONTEND_URL="http://a:3000, http://b:3000"` → `['http://a:3000', 'http://b:3000']`
 */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Decide whether a request origin may call the API.
 *
 * Order of precedence:
 *   1. The explicit allow-list (`FRONTEND_URL`). `*` disables the
 *      origin check entirely.
 *   2. Vercel-hosted origins.
 *   3. Machine-local origins (localhost / any literal IPv4).
 *
 * @param origin   The `Origin` header, or `undefined` for requests
 *                 without one (mobile apps, curl, server-to-server).
 * @param allowed  The parsed allow-list.
 */
export function isOriginAllowed(
  origin: string | undefined | null,
  allowed: string[],
): boolean {
  // No Origin header → not a browser cross-origin request.
  // Mobile apps, curl and server-to-server calls land here.
  if (!origin) return true;

  if (allowed.includes('*')) return true;
  if (allowed.includes(origin)) return true;
  if (isVercelOrigin(origin)) return true;

  // Machine-local origin (any literal IPv4, any port).
  try {
    const parsed = new URL(origin);
    if (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      isLocalOrLanHost(parsed.hostname)
    ) {
      return true;
    }
  } catch {
    // Not a parsable URL → fall through to the rejection below.
  }

  return false;
}

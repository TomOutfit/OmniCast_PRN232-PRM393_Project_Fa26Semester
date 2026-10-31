// ============================================================
// OmniCast - Network host helpers (shared)
// ============================================================
//
// ONE definition of "is this browser on a machine-local / LAN
// address?", used by:
//
//   * `lib/api.ts`            → which backend origin to talk to
//   * `lib/hooks/useLiveSession.ts` → Socket.IO base URL
//   * `lib/hooks/useLiveStream.ts` → Socket.IO base URL
//   * `lib/utils.ts`          → MediaMTX stale-host rewrite
//
// WHY IT MATTERS
// --------------
// The old per-file regex only accepted RFC1918 ranges
// (`192.168.x`, `10.x`, `172.16 – 172.31`). Plenty of real Wi-Fi
// networks hand out addresses OUTSIDE those ranges:
//
//   * campus / hotel / airport networks → `172.9.x`, `172.20.x`
//   * carrier NAT (mobile hotspot)    → `100.64.x – 100.127.x`
//   * public / routed LANs             → arbitrary `A.B.C.D`
//
// When that happened the app silently split its brain: the API call
// went to the local backend while the WebSocket went to the
// production deployment, and the backend rejected the request with
// a CORS error because its own allow-list used the same narrow
// regex.
//
// The rule is now deliberately simple: ANY literal IPv4 (plus
// `localhost` / `127.0.0.1` / `::1`) means "this is a machine-local
// address". A DNS name (`omnicast.vercel.app`, a tunnel, a custom
// domain) always means "public" and uses the deployed API.
//
// The backend mirrors this exact rule in
// `backend/src/common/utils/cors.ts`, so both sides always agree.
// ============================================================

/** True when `host` is a literal IPv4 address (not a DNS name). */
export function isLiteralIpv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/**
 * True when the browser runs on the developer machine or on a
 * machine inside the same LAN.
 *
 * ANY literal IPv4 counts as local — see the note above.
 */
export function isLocalOrLanHost(host: string): boolean {
  if (!host) return false;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  return isLiteralIpv4(host);
}

/**
 * True when a configured URL points at a machine-local address.
 *
 * Such a URL is only reachable from inside the developer's own
 * network, so it must never be used when the app is served from a
 * public host.
 */
export function isBakedLocalUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes('localhost') || lower.includes('127.0.0.1')) return true;
  try {
    const parsed = new URL(url);
    return isLiteralIpv4(parsed.hostname);
  } catch {
    // Not a parsable URL — fall back to a conservative textual check.
    return /https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(url);
  }
}

/** The deployed API, used whenever the browser is NOT on a LAN host. */
export const PRODUCTION_API_ORIGIN = 'https://omnicast-api.vercel.app';

/** Port the NestJS backend listens on. */
export const BACKEND_PORT = 3000;

/**
 * Ports MediaMTX listens on (HLS, WebRTC/WHIP-WHEP, RTMP).
 *
 * Mirrors `MEDIAMTX_PORTS` in `backend/src/common/utils/media-url.ts`.
 * Only URLs on one of these ports are ever host-rewritten, so CDN and
 * API traffic is never affected.
 */
export const MEDIAMTX_PORTS = new Set(['8888', '8889', '1935']);

/**
 * The host this browser is currently using, when it is a machine-local
 * / LAN address (a literal IPv4).
 *
 * Returns an empty string for public hosts (DNS names) — those never
 * need rewriting because the URLs they point at are public too.
 */
export function getClientMediaHost(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  if (!host || !isLiteralIpv4(host)) return '';
  return host;
}

/**
 * Rewrite a MediaMTX URL so it points at the machine the browser is
 * currently running on.
 *
 * This is THE single rule for media host rewriting on the frontend.
 * It covers both failure modes with one implementation:
 *
 *   • `localhost` / `127.0.0.1` baked into a stored URL → replaced
 *     with the browser's own LAN address (so a phone on the same
 *     Wi-Fi can actually reach the stream).
 *   • A STALE literal IP (the address the streaming machine had at
 *     publish time, before the DHCP lease changed) → replaced with
 *     the browser's own LAN address.
 *
 * Guard rails:
 *   • Only literal IPs and loopback hosts are touched — a CDN, tunnel
 *     or production domain is never rewritten.
 *   • Only MediaMTX ports are touched.
 *   • Only when the browser itself is on a literal IPv4 (LAN mode).
 *     On a public host the URL is returned untouched.
 */
export function rewriteMediaUrlForClient(
  url: string | null | undefined,
): string {
  if (!url) return '';

  const currentHost = getClientMediaHost();
  if (!currentHost) return url;

  // Parse the AUTHORITY only. A full `new URL()` round-trip would
  // percent-encode path templates such as `{slug}` and break them.
  const match = /^([a-z][a-z0-9+.-]*:\/\/)([^/?#:@]+)(?::(\d+))?/i.exec(url);
  if (!match) return url;

  const scheme = match[1].toLowerCase();
  if (
    scheme !== 'http://' &&
    scheme !== 'https://' &&
    scheme !== 'ws://' &&
    scheme !== 'wss://'
  ) {
    return url;
  }

  const host = match[2];
  const isLoopback = host === 'localhost' || host === '127.0.0.1';
  if (!isLoopback && !isLiteralIpv4(host)) return url;
  if (host === currentHost) return url;

  const port =
    match[3] || (scheme === 'https://' || scheme === 'wss://' ? '443' : '80');
  if (!MEDIAMTX_PORTS.has(port)) return url;

  const authority = match[3] ? `${currentHost}:${match[3]}` : currentHost;
  return url.replace(match[0], `${match[1]}${authority}`);
}

/**
 * Rewrite a bare host name (no scheme, no port) so it points at the
 * machine the browser is currently running on.
 *
 * Only `localhost` / `127.0.0.1` are rewritten — a real IP or a DNS
 * name is left alone, because the backend already resolves the
 * authoritative host for those.
 */
export function rewriteMediaHostForClient(host: string | null | undefined): string {
  if (!host) return '';
  const currentHost = getClientMediaHost();
  if (!currentHost) return host;
  if (host !== 'localhost' && host !== '127.0.0.1') return host;
  return currentHost;
}

/**
 * The media host a client should advertise to the backend.
 *
 * On a LAN host → the browser's own address. On a public host → an
 * empty string, which lets the backend fall back to its own
 * auto-detected address.
 */
export function resolveMediaHostForClient(): string {
  return getClientMediaHost();
}

/**
 * The backend origin (no `/api` suffix) the Socket.IO client should
 * connect to.
 *
 * On a LAN host → the backend running on the SAME machine
 * (`http://<lan-ip>:3000`). Everywhere else → the deployed API.
 *
 * Shared by both Socket.IO hooks so the realtime traffic can never
 * disagree with the REST traffic in `lib/api.ts`.
 */
export function getSocketBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (isLocalOrLanHost(host)) {
      return `http://${host}:${BACKEND_PORT}`;
    }
  }

  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && !isBakedLocalUrl(configured)) {
    return configured.replace(/\/api(\/.*)?$/, '');
  }

  return PRODUCTION_API_ORIGIN;
}

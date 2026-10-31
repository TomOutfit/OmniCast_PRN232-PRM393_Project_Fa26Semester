// ============================================================
// OmniCast - Media URL Resolver (backend)
// ============================================================
//
// WHY THIS FILE EXISTS
// --------------------
// Stream URLs are persisted in the database with the host that
// was reachable at the moment the event was created (e.g.
// `http://172.9.8.239:8888/omni-sport/live/index.m3u8`).
// The LAN IP of the streaming machine changes whenever the DHCP
// lease renews or the user switches Wi-Fi, so those stored URLs
// go stale and every viewer gets a dead stream.
//
// Rather than rewriting the DB on every IP change (error prone),
// the server REWRITES the host on the fly at the API boundary.
// Only URLs that point at a *literal IP* on a MediaMTX port are
// touched; CDN hostnames (bunny.net, cloudinary, vercel.app, …)
// pass through untouched.
//
// The authoritative "current host" is resolved once, in this file:
//   1. `MEDIAMTX_PUBLIC_BASE_URL` — explicit override (tunnel /
//      production domain). Wins over everything.
//   2. `MEDIAMTX_PUBLIC_HOST` — accepted only when it really is
//      an address of THIS machine (a stale value is ignored).
//   3. Auto-detected LAN IPv4 of this machine.
//
// ============================================================

import * as os from 'os';

/** Ports that MediaMTX listens on. */
const MEDIAMTX_PORTS = new Set(['8888', '8889', '1935']);

const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

/** True when `host` is a literal IPv4 address (not a DNS name). */
export function isLiteralIpv4(host: string): boolean {
  return IPV4_RE.test(host);
}

/** True for loopback / link-local / RFC1918 private addresses. */
export function isPrivateIpv4(ip: string): boolean {
  if (!ip) return false;
  if (ip === 'localhost' || ip === '127.0.0.1') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  return /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

/**
 * Detect the host's active local Wi-Fi / LAN IPv4 address so that
 * devices on the same network can auto-connect to MediaMTX with
 * zero configuration.
 */
export function detectLanIpv4(): string {
  try {
    const interfaces = os.networkInterfaces();
    let fallbackIp: string | null = null;

    // Pass 1: Prioritize Wi-Fi, WLAN, Ethernet
    for (const [name, list] of Object.entries(interfaces)) {
      if (!list) continue;
      const lowerName = name.toLowerCase();
      if (
        lowerName.includes('loopback') ||
        lowerName.includes('vethernet') ||
        lowerName.includes('wsl') ||
        lowerName.includes('docker') ||
        lowerName.includes('vbox') ||
        lowerName.includes('vmware')
      ) {
        continue;
      }

      for (const iface of list) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (iface.address.startsWith('169.254.') || iface.address === '127.0.0.1') continue;
          if (
            lowerName.includes('wi-fi') ||
            lowerName.includes('wifi') ||
            lowerName.includes('wlan') ||
            lowerName.includes('ethernet') ||
            lowerName.includes('eth') ||
            lowerName.includes('en')
          ) {
            return iface.address;
          }
          if (!fallbackIp) {
            fallbackIp = iface.address;
          }
        }
      }
    }

    if (fallbackIp) return fallbackIp;

    // Pass 2: Any non-internal IPv4
    for (const list of Object.values(interfaces)) {
      if (!list) continue;
      for (const iface of list) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (!iface.address.startsWith('169.254.') && iface.address !== '127.0.0.1') {
            return iface.address;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return 'localhost';
}

/** True when `ip` is one of the addresses bound to this machine. */
export function isIpOnThisMachine(ip: string): boolean {
  // An empty value is not an address at all, so it is NOT "on this
  // machine". Every caller already filters empty values out before
  // getting here, but returning false keeps the contract honest.
  if (!ip) return false;
  if (ip === 'localhost' || ip === '127.0.0.1') return true;
  try {
    const interfaces = os.networkInterfaces();
    for (const list of Object.values(interfaces)) {
      if (!list) continue;
      for (const iface of list) {
        if (iface.address === ip) return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * The host every client should use to reach MediaMTX.
 *
 * `MEDIAMTX_PUBLIC_BASE_URL` (e.g. `https://stream.example.com`)
 * takes precedence because it is the operator's explicit choice.
 * `MEDIAMTX_PUBLIC_HOST` is only honoured when it is genuinely an
 * address of this machine — otherwise a stale value from a previous
 * network would be advertised to every viewer.
 */
export function getMediaPublicHost(): string {
  const explicitBase = (process.env.MEDIAMTX_PUBLIC_BASE_URL || '').trim();
  if (explicitBase) {
    try {
      const host = new URL(explicitBase).hostname;
      if (host) return host;
    } catch {
      // not a URL — fall through to the other sources
    }
  }

  const envHost = (process.env.MEDIAMTX_PUBLIC_HOST || '').trim();
  if (
    envHost &&
    envHost !== 'localhost' &&
    envHost !== '127.0.0.1' &&
    isIpOnThisMachine(envHost)
  ) {
    return envHost;
  }

  const lan = detectLanIpv4();
  return lan === 'localhost' ? '127.0.0.1' : lan;
}

/**
 * Rewrite a stored media URL so it points at the current MediaMTX host.
 *
 * Rules:
 *   • Non-HTTP URLs and unparsable values are returned untouched.
 *   • Hostnames (CDNs, tunnels, domains) are NEVER touched.
 *   • Only URLs whose port is a MediaMTX port are rewritten, so
 *     API/CDN traffic is unaffected.
 *   • The current host is inserted verbatim, so a stale
 *     `http://172.9.8.239:8888/...` becomes
 *     `http://192.168.1.204:8888/...` automatically.
 */
export function rewriteMediaHost(url: string | null | undefined): string {
  if (!url) return url ?? '';

  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return trimmed;
  }

  const host = parsed.hostname;
  const isLoopback = host === 'localhost' || host === '127.0.0.1';
  if (!isLiteralIpv4(host) && !isLoopback) {
    // A DNS name — a CDN, a tunnel, or a production domain.
    return trimmed;
  }

  const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  if (!MEDIAMTX_PORTS.has(port)) {
    return trimmed;
  }

  const current = getMediaPublicHost();
  if (!current || host === current) {
    return trimmed;
  }

  parsed.hostname = current;
  return parsed.toString();
}

/**
 * Pick the base URL to advertise for one MediaMTX protocol.
 *
 * The `MEDIAMTX_*_URL` environment overrides are a convenience for
 * exotic setups (a reverse proxy, a non-standard port). They are
 * only honoured when they point at the SAME host the server already
 * resolved — otherwise a leftover value from a previous network
 * would silently win over the freshly detected address and every
 * viewer would get a dead stream.
 *
 * @param rawUrl     The configured override (may be empty/undefined).
 * @param scheme     Scheme to build the fallback with (`http`, `ws`, `rtmp`).
 * @param host       The resolved public host.
 * @param port       The port to use for the fallback.
 */
export function pickMediaBaseUrl(
  rawUrl: string | undefined | null,
  scheme: string,
  host: string,
  port: string,
): string {
  const fallback = `${scheme}://${host}:${port}`;

  if (!rawUrl) return fallback;

  const trimmed = rawUrl.trim();
  if (!trimmed) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return fallback;
  }

  // A DNS name (tunnel, production domain, reverse proxy) is a
  // deliberate choice — honour it as-is.
  if (!isLiteralIpv4(parsed.hostname) && parsed.hostname !== 'localhost') {
    return trimmed.replace(/\/$/, '');
  }

  // A literal IP only counts when it is the address we resolved.
  if (parsed.hostname !== host) {
    return fallback;
  }

  return trimmed.replace(/\/$/, '');
}

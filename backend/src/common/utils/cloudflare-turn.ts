export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CloudflareTurnOptions {
  keyId?: string;
  apiToken?: string;
  ttlSeconds?: number;
  fetcher?: typeof fetch;
}

const TURN_CREDENTIALS_URL = "https://rtc.live.cloudflare.com/v1/turn/keys";
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

export async function createCloudflareTurnIceServers({
  keyId,
  apiToken,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  fetcher = fetch,
}: CloudflareTurnOptions): Promise<IceServerConfig[]> {
  if (!keyId || !apiToken) return [];

  const response = await fetcher(
    `${TURN_CREDENTIALS_URL}/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: ttlSeconds }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Cloudflare TURN credential request failed (${response.status}).`,
    );
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !("iceServers" in payload)) {
    throw new Error("Cloudflare TURN returned an invalid ICE server response.");
  }

  const iceServers = (payload as { iceServers?: unknown }).iceServers;
  if (!Array.isArray(iceServers)) {
    throw new Error("Cloudflare TURN returned an invalid ICE server list.");
  }

  return iceServers.filter((server): server is IceServerConfig => {
    if (!server || typeof server !== "object" || !("urls" in server))
      return false;
    const urls = (server as { urls?: unknown }).urls;
    return (
      typeof urls === "string" ||
      (Array.isArray(urls) && urls.every((url) => typeof url === "string"))
    );
  });
}

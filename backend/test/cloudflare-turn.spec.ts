import { test } from "node:test";
import assert from "node:assert/strict";
import { createCloudflareTurnIceServers } from "../src/common/utils/cloudflare-turn";

test("Cloudflare TURN returns no relay config when credentials are not configured", async () => {
  assert.deepEqual(await createCloudflareTurnIceServers({}), []);
});

test("Cloudflare TURN requests short-lived ICE servers with the secret kept server-side", async () => {
  let requestUrl = "";
  let request: RequestInit | undefined;
  const servers = [{ urls: ["stun:stun.cloudflare.com:3478"] }];

  const result = await createCloudflareTurnIceServers({
    keyId: "turn-key-id",
    apiToken: "server-only-token",
    ttlSeconds: 43200,
    fetcher: (async (url, init) => {
      requestUrl = String(url);
      request = init;
      return new Response(JSON.stringify({ iceServers: servers }), {
        status: 201,
      });
    }) as typeof fetch,
  });

  assert.equal(
    requestUrl,
    "https://rtc.live.cloudflare.com/v1/turn/keys/turn-key-id/credentials/generate-ice-servers",
  );
  assert.equal(request?.method, "POST");
  assert.equal(
    new Headers(request?.headers).get("authorization"),
    "Bearer server-only-token",
  );
  assert.deepEqual(JSON.parse(String(request?.body)), { ttl: 43200 });
  assert.deepEqual(result, servers);
});

test("Cloudflare TURN rejects provider errors and malformed responses", async () => {
  const failingFetch = (async () =>
    new Response(null, { status: 503 })) as typeof fetch;
  await assert.rejects(
    () =>
      createCloudflareTurnIceServers({
        keyId: "key",
        apiToken: "token",
        fetcher: failingFetch,
      }),
    /failed \(503\)/,
  );

  const malformedFetch = (async () =>
    new Response(JSON.stringify({ iceServers: "invalid" }), {
      status: 201,
    })) as typeof fetch;
  await assert.rejects(
    () =>
      createCloudflareTurnIceServers({
        keyId: "key",
        apiToken: "token",
        fetcher: malformedFetch,
      }),
    /invalid ICE server list/,
  );
});

# Public MediaMTX Deployment

The production media plane runs on a VPS with a stable public IP. The web API remains on Vercel; Caddy terminates HTTPS and forwards HLS/WHIP/WHEP to MediaMTX over the private Docker network. Cloudflare Realtime TURN provides relay candidates for broadcasters behind restrictive NATs.

## VPS and DNS

1. Provision an Ubuntu VPS with a public IPv4 address and Docker Compose.
2. Create a DNS-only `A` record such as `stream.example.com` pointing to the VPS. Keep this record DNS-only so WebRTC ICE candidates resolve directly to the media server.
3. Allow inbound TCP `80` and `443`, UDP `443`, and TCP/UDP `8189` in both the VPS firewall and provider firewall. Caddy uses 80/443 for HTTPS; MediaMTX uses 8189 for WebRTC media.
4. Clone the repository, then configure `backend/.env` with:

```dotenv
MEDIAMTX_PUBLIC_HOST=stream.example.com
MEDIAMTX_PUBLIC_BASE_URL=https://stream.example.com
MEDIAMTX_HLS_URL=https://stream.example.com
MEDIAMTX_WHIP_URL=https://stream.example.com
MEDIAMTX_WEBRTC_URL=wss://stream.example.com
MEDIAMTX_AUTH_URL=https://omnicast-api.vercel.app/api/v1/programs/studio/media-auth
MEDIAMTX_BIND_ADDRESS=127.0.0.1
```

Set `MEDIAMTX_BIND_ADDRESS=127.0.0.1` for production. This keeps the direct RTMP/HLS/WHIP/WebRTC HTTP ports on loopback; the Caddy container can still reach MediaMTX on the private Compose network. ICE port 8189 remains public.

Start the stack from `backend/`:

```sh
docker compose --profile public up -d
docker compose ps
docker compose logs --tail=100 caddy mediamtx
```

Check `https://stream.example.com` and confirm Caddy obtained a trusted certificate before registering the endpoint.

## Register the endpoint

Run this once from a trusted workstation with the backend database URL configured in `backend/.env`:

```powershell
cd backend
$env:OMNICAST_MEDIA_PUBLIC_HOST = 'stream.example.com'
$env:OMNICAST_MEDIA_HLS_URL = 'https://stream.example.com'
$env:OMNICAST_MEDIA_WHIP_URL = 'https://stream.example.com'
$env:OMNICAST_MEDIA_WEBRTC_URL = 'wss://stream.example.com'
node scripts/register-media-endpoint.js
```

The API reads this database row dynamically, so the backend does not need a redeploy for media URL changes. Do not commit `backend/.env` or paste database credentials into source files.

## TURN relay

Create a Cloudflare Realtime TURN key and a restricted API token with permission to generate TURN credentials. Store `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN` as encrypted environment variables on the Vercel **backend** project, then redeploy it. The API token stays on the backend; broadcasters receive short-lived credentials from the Staff/Admin-only `/programs/studio/live/ice-servers` endpoint.

Cloudflare's current self-serve TURN pricing includes 1,000 GB of monthly egress, then charges `$0.05/GB`; usage is billed to the Cloudflare account. See [Cloudflare Realtime TURN pricing](https://developers.cloudflare.com/realtime/turn/faq/) and [credential generation](https://developers.cloudflare.com/realtime/turn/generate-credentials/).

The web and mobile publishers use TURN credentials when configured and retain direct ICE/STUN as a fallback. If TURN credentials are absent, the endpoint reports no relay and restrictive networks may still fail to publish.

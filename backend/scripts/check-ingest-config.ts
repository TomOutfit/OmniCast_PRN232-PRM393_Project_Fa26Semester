/**
 * OmniCast — Ingest config smoke check
 *
 * Runs `LiveStudioService.getIngestConfig()` with an EMPTY
 * `MEDIAMTX_*` environment (exactly what `backend/.env` now ships
 * with) and prints the result.
 *
 * The point: with no hard-coded LAN IP in `.env`, the backend must
 * still hand out a REACHABLE address — the one this machine actually
 * has right now.
 *
 * Run with: npx ts-node scripts/check-ingest-config.ts
 */

process.env.MEDIAMTX_PUBLIC_HOST = '';
process.env.MEDIAMTX_PUBLIC_BASE_URL = '';
process.env.MEDIAMTX_HLS_URL = '';
process.env.MEDIAMTX_WEBRTC_URL = '';
process.env.MEDIAMTX_WHIP_URL = '';
process.env.MEDIAMTX_RTMP_URL = '';

// eslint-disable-next-line @typescript-eslint/no-var-requires
import { LiveStudioService } from '../src/programs/live-studio.service';

const service = Object.create(LiveStudioService.prototype) as LiveStudioService;
const config = service.getIngestConfig();

console.log('Ingest config with an EMPTY MEDIAMTX_* environment:');
console.log(JSON.stringify(config, null, 2));

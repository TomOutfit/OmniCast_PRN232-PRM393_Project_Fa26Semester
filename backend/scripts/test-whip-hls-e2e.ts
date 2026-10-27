/**
 * OmniCast - WHIP → HLS end-to-end verification
 * ============================================================
 *
 * Drives a REAL headless Chrome with a fake camera/microphone and
 * publishes it into MediaMTX over WHIP, exactly the way
 * `frontend/lib/webrtc/whip-client.ts` does from the Studio. It then
 * verifies that the viewer side (HLS / LL-HLS) actually serves a
 * playable playlist and media segments.
 *
 * This is the automated counterpart of manually opening
 * `/studio/live`, pressing "BẬT LIVE WEBCAM" and watching
 * `/live/{eventId}` — but it needs no database, no login and no
 * human eyes.
 *
 * What it proves
 *   1. WHIP  : POST {whipUrl}/{slug}/whip returns 201 + a SDP answer
 *              and the peer connection reaches "connected".
 *   2. HLS   : GET {hlsUrl}/{slug}/index.m3u8 returns a playlist that
 *              references at least one media segment.
 *   3. DATA  : that segment is downloadable and carries bytes.
 *   4. Codec : the negotiated video codec is one MediaMTX can remux
 *              to HLS (H264 / VP9 / AV1). VP8 would show a black
 *              screen to every viewer, so it is treated as a FAILURE.
 *
 * Usage
 *   npx ts-node scripts/test-whip-hls-e2e.ts
 *   npx ts-node scripts/test-whip-hls-e2e.ts --slug my-test --host 127.0.0.1
 *
 * Exit code 0 = all checks passed, 1 = at least one check failed.
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import http from 'http';

const CHROME_PATH =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

interface Options {
  host: string;
  slug: string;
  whipPort: number;
  hlsPort: number;
  timeoutMs: number;
}

function parseArgs(): Options {
  const opts: Options = {
    host: '127.0.0.1',
    slug: 'e2e-whip',
    whipPort: 8889,
    hlsPort: 8888,
    timeoutMs: 45000,
  };

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--slug') opts.slug = next();
    else if (arg === '--host') opts.host = next();
    else if (arg === '--whip-port') opts.whipPort = Number(next());
    else if (arg === '--hls-port') opts.hlsPort = Number(next());
    else if (arg === '--timeout') opts.timeoutMs = Number(next());
  }
  return opts;
}

const opts = parseArgs();

const WHIP_URL = `http://${opts.host}:${opts.whipPort}/${opts.slug}/whip`;
const HLS_INDEX_URL = `http://${opts.host}:${opts.hlsPort}/${opts.slug}/index.m3u8`;

type CheckName =
  | 'WHIP handshake (201 + SDP answer)'
  | 'Peer connection connected'
  | 'Video codec HLS-compatible'
  | 'HLS manifest served'
  | 'HLS variant playlist referenced'
  | 'HLS media segment downloadable'
  | 'HLS init segment present';

const failures: string[] = [];

function report(name: CheckName, ok: boolean, detail: string): boolean {
  const icon = ok ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${name} — ${detail}`);
  if (!ok) failures.push(name);
  return ok;
}

/**
 * Publish a fake camera stream over WHIP, inside the browser page.
 *
 * The logic mirrors `frontend/lib/webrtc/whip-client.ts`:
 *   • getUserMedia with Chrome's fake device
 *   • restrict the video codec to H264 → VP9 (VP8 cannot be
 *     remuxed to HLS by MediaMTX)
 *   • POST the offer as `application/sdp`
 *   • apply the SDP answer and wait for "connected"
 */
async function publishFromBrowser(page: Page): Promise<{
  ok: boolean;
  status: number;
  answerSdp: string;
  videoCodec: string;
  error?: string;
}> {
  return page.evaluate(
    async (whipUrl: string, timeoutMs: number) => {
      const result = {
        ok: false,
        status: 0,
        answerSdp: '',
        videoCodec: '',
        error: '',
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      const pc = new RTCPeerConnection({
        iceServers: [],
        bundlePolicy: 'max-bundle',
      });

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      // Codec selection — same priority as the real client.
      const caps = RTCRtpSender.getCapabilities('video');
      if (caps) {
        const h264 = caps.codecs.filter(
          (c) => c.mimeType.toLowerCase() === 'video/h264',
        );
        const vp9 = caps.codecs.filter(
          (c) => c.mimeType.toLowerCase() === 'video/vp9',
        );
        const pref = [...h264, ...vp9];
        if (pref.length) {
          for (const transceiver of pc.getTransceivers()) {
            const kind =
              transceiver.receiver.track?.kind ??
              transceiver.sender.track?.kind;
            if (kind === 'video') {
              try {
                transceiver.setCodecPreferences(pref);
              } catch {
                /* unsupported — ignore */
              }
            }
          }
        }
      }

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(offer);

        // Wait for ICE gathering (bounded).
        if (pc.iceGatheringState !== 'complete') {
          await new Promise<void>((resolve) => {
            const done = () => {
              pc.removeEventListener(
                'icegatheringstatechange',
                onGatheringChange,
              );
              clearTimeout(timer);
              resolve();
            };
            const onGatheringChange = () => {
              if (pc.iceGatheringState === 'complete') done();
            };
            const timer = setTimeout(done, 4000);
            pc.addEventListener('icegatheringstatechange', onGatheringChange);
          });
        }

        const response = await fetch(whipUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: pc.localDescription?.sdp ?? offer.sdp ?? '',
        });

        result.status = response.status;
        result.answerSdp = await response.text();

        if (response.status !== 201 && response.status !== 200) {
          result.error = `HTTP ${response.status}: ${result.answerSdp.slice(0, 200)}`;
          return result;
        }

        await pc.setRemoteDescription({ type: 'answer', sdp: result.answerSdp });

        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve();
          };
          const fail = (msg: string) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(new Error(msg));
          };
          const timer = setTimeout(
            () => fail(`connection state = ${pc.connectionState}`),
            timeoutMs,
          );
          pc.addEventListener('connectionstatechange', () => {
            if (pc.connectionState === 'connected') finish();
            else if (pc.connectionState === 'failed')
              fail('connection failed');
          });
          if (pc.connectionState === 'connected') finish();
        });

        // Read the negotiated codec out of the stats report.
        const report = await pc.getStats();
        report.forEach((entry: any) => {
          if (
            !result.videoCodec &&
            entry.type === 'codec' &&
            String(entry.mimeType).toLowerCase().startsWith('video/')
          ) {
            result.videoCodec = String(entry.mimeType);
          }
        });

        result.ok = true;

        // Keep publishing until the caller tears the page down.
        (window as any).__omnicastWhipPc = pc;
        return result;
      } catch (err: any) {
        result.error = err?.message || String(err);
        return result;
      }
    },
    WHIP_URL,
    opts.timeoutMs,
  );
}

/** Fetch the HLS multivariant playlist and return its text. */
async function fetchHlsManifest(): Promise<{ ok: boolean; body: string; status: number }> {
  try {
    const res = await fetch(HLS_INDEX_URL);
    const body = await res.text();
    return { ok: res.ok, body, status: res.status };
  } catch (err: any) {
    return { ok: false, body: String(err?.message || err), status: 0 };
  }
}

/**
 * Serve a blank page over plain HTTP on 127.0.0.1.
 *
 * `navigator.mediaDevices` only exists in a SECURE CONTEXT, and
 * `about:blank` / `data:` URLs are not one. `http://127.0.0.1` IS
 * treated as a secure context by Chrome (and by the WHATWG spec),
 * so a tiny local server is enough to unlock getUserMedia without
 * any TLS setup.
 */
async function startTestPageServer(): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const server = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(
      '<!doctype html><html><head><meta charset="utf-8"><title>OmniCast WHIP e2e</title></head><body>OmniCast WHIP e2e harness</body></html>',
    );
  });

  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}/`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function main(): Promise<void> {
  console.log('============================================================');
  console.log(' OmniCast - WHIP → HLS end-to-end verification');
  console.log('============================================================');
  console.log(`  WHIP publish : ${WHIP_URL}`);
  console.log(`  HLS playback : ${HLS_INDEX_URL}`);
  console.log('');

  if (!process.env.CHROME_PATH && !require('fs').existsSync(CHROME_PATH)) {
    console.error(`Chrome not found at ${CHROME_PATH}.`);
    console.error('Set CHROME_PATH to a Chrome/Edge executable.');
    process.exit(1);
  }

  let browser: Browser | null = null;
  let testPage: { url: string; close: () => Promise<void> } | null = null;

  try {
    testPage = await startTestPageServer();

    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
      ],
    });

    const page = await browser.newPage();
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[e2e]')) console.log(`      ${text}`);
    });

    // `navigator.mediaDevices` needs a secure context — a local
    // HTTP server on 127.0.0.1 qualifies.
    await page.goto(testPage.url, { waitUntil: 'domcontentloaded' });

    console.log('▶ Publishing a fake camera over WHIP...');
    const publish = await publishFromBrowser(page);

    report(
      'WHIP handshake (201 + SDP answer)',
      (publish.status === 201 || publish.status === 200) &&
        publish.answerSdp.includes('v=0'),
      publish.status
        ? `HTTP ${publish.status}, answer ${publish.answerSdp.length} bytes`
        : publish.error || 'no response',
    );

    report(
      'Peer connection connected',
      publish.ok,
      publish.ok ? 'connectionState = connected' : publish.error || 'not connected',
    );

    // VP8 cannot be remuxed to HLS by MediaMTX — viewers would see a
    // black screen, so a VP8 negotiation is a hard failure.
    const codec = (publish.videoCodec || '').toLowerCase();
    const hlsCompatible =
      codec.includes('h264') ||
      codec.includes('vp9') ||
      codec.includes('av1') ||
      codec.includes('h265');
    report(
      'Video codec HLS-compatible',
      hlsCompatible,
      publish.videoCodec
        ? `${publish.videoCodec} (${hlsCompatible ? 'remuxable' : 'NOT remuxable to HLS'})`
        : 'codec not reported',
    );

    if (!publish.ok) {
      console.log('');
      console.log('✖ Publish failed — skipping the HLS checks.');
      return;
    }

    console.log('');
    console.log('▶ Waiting for the HLS muxer to produce a playlist...');

    // The muxer needs a moment to arm and emit the first segments.
    let manifest = { ok: false, body: '', status: 0 };
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      manifest = await fetchHlsManifest();
      if (manifest.ok && manifest.body.includes('#EXTM3U')) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    report(
      'HLS manifest served',
      manifest.ok && manifest.body.includes('#EXTM3U'),
      manifest.ok
        ? `${manifest.body.split('\n').length} lines`
        : manifest.body.slice(0, 200),
    );

    if (manifest.ok && manifest.body.includes('#EXTM3U')) {
      // The multivariant manifest only lists VARIANT playlists.
      // The actual media segments live one level down, inside the
      // variant playlist, so the test has to walk that chain:
      //
      //   index.m3u8  →  <variant>.m3u8  →  init.mp4 + <part>.m4s
      //
      // Stopping at the variant playlist would prove that the
      // manifest exists, but NOT that a single media byte was
      // produced — which is exactly what a broken muxer looks like.
      // MediaMTX appends a `?session=<id>` query to the playlist
      // URLs, so the file extension is not necessarily the last
      // thing on the line — the extension has to be matched with a
      // regex instead of `endsWith`.
      const variantLine = manifest.body
        .split('\n')
        .map((l) => l.trim())
        .find(
          (l) => l.length > 0 && !l.startsWith('#') && /\.m3u8(\?|$)/.test(l),
        );

      if (!variantLine) {
        report(
          'HLS variant playlist referenced',
          false,
          'the multivariant manifest lists no variant playlist',
        );
      } else {
        const variantUrl = new URL(variantLine, HLS_INDEX_URL).toString();
        let variantBody = '';
        let variantStatus = 0;
        try {
          const res = await fetch(variantUrl);
          variantStatus = res.status;
          variantBody = await res.text();
        } catch {
          /* handled below */
        }

        report(
          'HLS variant playlist referenced',
          variantStatus === 200 && variantBody.includes('#EXTM3U'),
          `${variantLine} → HTTP ${variantStatus}, ${variantBody.length} bytes`,
        );
        if (process.env.E2E_DEBUG) {
          console.log('--- variant playlist ---');
          console.log(variantBody);
          console.log('------------------------');
        }

        const segmentLine = variantBody
          .split('\n')
          .map((l) => l.trim())
          .find(
            (l) =>
              l.length > 0 &&
              !l.startsWith('#') &&
              !/\.m3u8(\?|$)/.test(l) &&
              // `gap.mp4` is MediaMTX's LL-HLS gap filler: it is a
              // placeholder URI, not a real media file, and it is
              // not downloadable on its own.
              !/^gap\.mp4(\?|$)/.test(l),
          );

        if (!segmentLine) {
          report(
            'HLS media segment downloadable',
            false,
            'the variant playlist references no media segment',
          );
        } else {
          const segmentUrl = new URL(segmentLine, variantUrl).toString();
          let size = 0;
          let status = 0;
          try {
            const res = await fetch(segmentUrl);
            status = res.status;
            const buf = await res.arrayBuffer();
            size = buf.byteLength;
          } catch {
            status = 0;
          }
          report(
            'HLS media segment downloadable',
            status === 200 && size > 0,
            `${segmentLine} → HTTP ${status}, ${size} bytes`,
          );

          // The init segment carries the codec init data. Its
          // presence proves the video track was really muxed.
          const initLine = variantBody
            .split('\n')
            .map((l) => l.trim())
            .find((l) => l.includes('EXT-X-MAP'))
            ?.split('"')[1];

          if (initLine) {
            const initUrl = new URL(initLine, variantUrl).toString();
            let initSize = 0;
            try {
              const res = await fetch(initUrl);
              const buf = await res.arrayBuffer();
              initSize = buf.byteLength;
            } catch {
              /* reported as 0 */
            }
            report(
              'HLS init segment present',
              initSize > 0,
              `${initLine} → ${initSize} bytes`,
            );
          }
        }
      }
    }
  } finally {
    await browser?.close().catch(() => undefined);
    await testPage?.close().catch(() => undefined);
  }
}

main()
  .then(() => {
    console.log('');
    console.log('============================================================');
    if (failures.length === 0) {
      console.log(' ✔ ALL CHECKS PASSED');
      console.log('============================================================');
      process.exit(0);
    }
    console.log(` ✖ ${failures.length} CHECK(S) FAILED:`);
    for (const f of failures) console.log(`   - ${f}`);
    console.log('============================================================');
    process.exit(1);
  })
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

// Publish a fake camera into MediaMTX over WHIP and keep it alive.
// Used to probe HLS URL behaviour (redirects, query strings, sessions).
import puppeteer, { Browser, Page } from 'puppeteer-core';
import http from 'http';

const CHROME_PATH =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SLUG = process.env.SLUG || 'verify1';
const HOST = process.env.HOST || '127.0.0.1';
const WHIP_URL = `http://${HOST}:8889/${SLUG}/whip`;

async function startTestPageServer() {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><body>harness</body></html>');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const a = server.address();
  const port = typeof a === 'object' && a ? a.port : 0;
  return { url: `http://127.0.0.1:${port}/`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

async function main() {
  const testPage = await startTestPageServer();
  const browser: Browser = await puppeteer.launch({
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
  const page: Page = await browser.newPage();
  await page.goto(testPage.url, { waitUntil: 'domcontentloaded' });

  await page.evaluate(async (whipUrl: string) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
    const pc = new RTCPeerConnection({ iceServers: [], bundlePolicy: 'max-bundle' });
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    const caps = RTCRtpSender.getCapabilities('video');
    const pref = caps ? caps.codecs.filter((c) => /h264|vp9/i.test(c.mimeType)) : [];
    if (pref.length) {
      pc.getTransceivers().forEach((tr) => {
        try { tr.setCodecPreferences(pref); } catch { /* ignore */ }
      });
    }
    const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const t = setTimeout(resolve, 4000);
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); }
      });
    });
    const res = await fetch(whipUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: pc.localDescription?.sdp ?? offer.sdp ?? '',
    });
    await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
    (window as any).__pc = pc;
  }, WHIP_URL);

  console.log('PUBLISHING to', WHIP_URL, '- keeping alive for 120s');
  await new Promise((r) => setTimeout(r, 120000));
  await browser.close().catch(() => undefined);
  await testPage.close().catch(() => undefined);
}

main().catch((e) => { console.error(e); process.exit(1); });

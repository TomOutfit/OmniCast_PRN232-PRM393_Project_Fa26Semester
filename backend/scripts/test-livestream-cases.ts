import http from 'http';
import fs from 'fs';
import path from 'path';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api';

async function request(method: string, pathUrl: string, token: string | null = null, data: any = null, isMultipart = false, filePath: string | null = null): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + pathUrl);
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let body: Buffer | string | null = null;
    let boundary: string | null = null;

    if (isMultipart && filePath) {
      boundary = '--------------------------' + Date.now().toString(16);
      headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      const filename = path.basename(filePath);
      const fileBuffer = fs.readFileSync(filePath);

      const headerBuf = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: video/mp4\r\n\r\n`
      );
      const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`);
      body = Buffer.concat([headerBuf, fileBuffer, footerBuf]);
      headers['Content-Length'] = body.length.toString();
    } else if (data) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
      headers['Content-Length'] = Buffer.byteLength(body).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res: any) => {
        let resData = '';
        res.on('data', (chunk: any) => (resData += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(resData);
          } catch {
            json = resData;
          }
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Running Backend Livestream 14 Test Cases...\n');
  const results: any[] = [];

  // 1. Get tokens
  const staffLogin = await request('POST', '/auth/login', null, {
    email: 'staff@omnicast.dev',
    password: 'Staff123!',
  });
  const staffToken = staffLogin.data?.data?.accessToken || staffLogin.data?.accessToken;

  const viewerLogin = await request('POST', '/auth/login', null, {
    email: 'viewer@omnicast.dev',
    password: 'Staff123!',
  });
  const viewerToken = viewerLogin.data?.data?.accessToken || viewerLogin.data?.accessToken;

  // CASE 1
  const case1 = await request('GET', '/programs/studio/channels/sport-1/recordings?limit=10', staffToken);
  const items1 = case1.data?.data?.items || case1.data?.items || [];
  const case1Pass = case1.status === 200 && items1.length > 0 &&
    !items1.some((i: any) => i.externalPlatform && ['YOUTUBE', 'TWITCH', 'VIMEO', 'FACEBOOK', 'TIKTOK', 'DAILYMOTION', 'EMBED_IFRAME'].includes(i.externalPlatform));
  results.push({ id: 'CASE-1', title: 'List broadcastable recordings (auth + filter)', pass: case1Pass, status: case1.status, details: `Count: ${items1.length}` });

  const sport1Channel = await prisma.liveChannel.findUnique({ where: { slug: 'sport-1' } });
  const pexelsRec = await prisma.recording.findFirst({ where: { channelId: sport1Channel!.id, sourceType: 'PEXELS', isActive: true } });
  const validRecordingId = pexelsRec?.id || items1[0]?.id;

  // CASE 2
  const case2 = await request('GET', '/programs/studio/channels/sport-1/recordings', null);
  results.push({ id: 'CASE-2', title: 'List broadcastable WITHOUT token -> 401', pass: case2.status === 401, status: case2.status });

  // CASE 3
  const case3 = await request('GET', '/programs/studio/channels/sport-1/recordings', viewerToken);
  results.push({ id: 'CASE-3', title: 'List broadcastable with USER role -> 403', pass: case3.status === 403, status: case3.status });

  // CASE 4
  const case4 = await request('POST', '/programs/studio/curate-live', staffToken, {
    channelId: 'sport-1',
    recordingIds: [validRecordingId],
  });
  const case4Pass = case4.status === 200 || case4.status === 201;
  const liveEventId = case4.data?.event?.id || case4.data?.data?.event?.id || case4.data?.data?.id || case4.data?.data?.event?.id;
  results.push({ id: 'CASE-4', title: 'Curate live hợp lệ', pass: case4Pass, status: case4.status, details: `Event ID: ${liveEventId}` });

  // CASE 5: YouTube blocked
  let ytRecording = await prisma.recording.findFirst({ where: { sourceType: 'YOUTUBE_EMBED', channelId: sport1Channel!.id } });
  if (!ytRecording) {
    ytRecording = await prisma.recording.create({
      data: {
        title: 'YT Anti Piracy Test',
        sourceType: 'YOUTUBE_EMBED',
        externalPlatform: 'YOUTUBE',
        license: 'DEMO_PRODUCTION_OK',
        duration: 300,
        channelId: sport1Channel!.id,
      },
    });
  }
  const case5 = await request('POST', '/programs/studio/curate-live', staffToken, {
    channelId: 'sport-1',
    recordingIds: [ytRecording.id],
  });
  results.push({ id: 'CASE-5', title: 'Curate live với YouTube recording -> 403', pass: case5.status === 403, status: case5.status, details: case5.data?.message });

  // CASE 6: Stop live
  const case6 = await request('POST', `/programs/studio/live-events/${liveEventId}/stop`, staffToken, { keepAsVod: true });
  results.push({ id: 'CASE-6', title: 'Stop live hợp lệ (giữ ON_DEMAND)', pass: case6.status === 200, status: case6.status, details: case6.data?.message || 'Stopped' });

  // CASE 7: Stop live again -> 400
  const case7 = await request('POST', `/programs/studio/live-events/${liveEventId}/stop`, staffToken, { keepAsVod: true });
  results.push({ id: 'CASE-7', title: 'Stop live event đã ENDED -> 400', pass: case7.status === 400, status: case7.status, details: case7.data?.message });

  // CASE 8: Dead URL -> 400
  const case8 = await request('POST', '/programs/studio/recordings/library', staffToken, {
    channelId: 'sport-1',
    title: 'Test dead URL',
    videoUrl: 'https://nonexistent-cdn-12345.example.com/video.mp4',
    duration: 600,
  });
  results.push({ id: 'CASE-8', title: 'Add to library với URL die -> 400', pass: case8.status === 400, status: case8.status, details: case8.data?.message });

  // CASE 9: YouTube URL -> 403
  const case9 = await request('POST', '/programs/studio/recordings/library', staffToken, {
    channelId: 'sport-1',
    title: 'Test YT block',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 600,
  });
  results.push({ id: 'CASE-9', title: 'Add to library với YouTube URL -> 403', pass: case9.status === 403, status: case9.status, details: case9.data?.message });

  // CASE 10: Valid Pexels URL -> 201
  const case10 = await request('POST', '/programs/studio/recordings/library', staffToken, {
    channelId: 'sport-1',
    title: 'Pexels test video',
    videoUrl: 'https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_25fps.mp4',
    duration: 30,
    licenseOverride: 'PEXELS',
  });
  const rec10Id = case10.data?.data?.recording?.id || case10.data?.data?.id || case10.data?.recording?.id;
  results.push({ id: 'CASE-10', title: 'Add to library với Pexels URL -> 201', pass: case10.status === 201 || case10.status === 200, status: case10.status, details: `ID: ${rec10Id}` });

  // CASE 11: List catalog streams
  const case11 = await request('GET', '/programs/studio/catalog/streams?verified=true&limit=5', staffToken);
  results.push({ id: 'CASE-11', title: 'List catalog streams', pass: case11.status === 200, status: case11.status });

  // CASE 12: EPG now playing (curated live priority)
  const case12_curate = await request('POST', '/programs/studio/curate-live', staffToken, {
    channelId: 'sport-1',
    recordingIds: [validRecordingId],
  });
  const liveId12 = case12_curate.data?.data?.event?.id || case12_curate.data?.event?.id;
  const case12 = await request('GET', '/programs/epg/now?channelId=sport-1');
  const epg12 = case12.data?.data || case12.data;
  const case12Pass = case12.status === 200 && (epg12?.source === 'studio-curated-live' || epg12?.source === 'live-event') && epg12?.isOnAir === true;
  results.push({ id: 'CASE-12', title: 'EPG now-playing (curated live priority)', pass: case12Pass, status: case12.status, details: `Source: ${epg12?.source}` });

  // CASE 13: EPG now-playing when NOT live -> fallback
  await request('POST', `/programs/studio/live-events/${liveId12}/stop`, staffToken, { keepAsVod: true });
  const case13 = await request('GET', '/programs/epg/now?channelId=sport-1');
  const epg13 = case13.data?.data || case13.data;
  const case13Pass = case13.status === 200 && epg13?.streamUrl != null;
  results.push({ id: 'CASE-13', title: 'EPG now-playing (fallback/replay when offline)', pass: case13Pass, status: case13.status, details: `Source: ${epg13?.source}` });

  // CASE 14: Upload file multipart
  const dummyFile = path.join(__dirname, 'test_sample.mp4');
  if (!fs.existsSync(dummyFile)) {
    fs.writeFileSync(dummyFile, Buffer.from('FAKE_MP4_HEADER_DATA_1234567890'));
  }
  const case14 = await request('POST', '/programs/studio/recordings/upload/file', staffToken, null, true, dummyFile);
  const case14Pass = (case14.status === 201 || case14.status === 200) && (case14.data?.url?.startsWith('http') || case14.data?.data?.url?.startsWith('http'));
  results.push({ id: 'CASE-14', title: 'Upload file multipart', pass: case14Pass, status: case14.status, details: `URL: ${case14.data?.data?.url || case14.data?.url}` });

  console.log('RESULTS SUMMARY:');
  console.table(results);
  process.exit(0);
}

runTests().catch(console.error);

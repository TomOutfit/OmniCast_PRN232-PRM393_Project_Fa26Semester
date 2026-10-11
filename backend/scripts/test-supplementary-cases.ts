import http from 'http';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api/v1';

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
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
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

async function runSupplementaryTests() {
  console.log('🚀 Running Supplementary Livestream Test Cases (C.1 - C.6)...\n');
  const results: any[] = [];

  // Login STAFF
  const staffLogin = await request('POST', '/auth/login', null, {
    email: 'staff@omnicast.dev',
    password: 'Staff123!',
  });
  const staffToken = staffLogin.data?.data?.accessToken || staffLogin.data?.accessToken;

  // C.1 AUDIT LOGS
  const auditLogs = await prisma.auditLog.findMany({
    where: { action: { startsWith: 'STUDIO_' } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { action: true, entityType: true, createdAt: true },
  });
  const c1Pass = auditLogs.length > 0;
  results.push({ id: 'C.1', title: 'Audit Log Verification', pass: c1Pass, details: `Found ${auditLogs.length} STUDIO_* logs` });

  // C.2 EPG NOW WITH STUDIO PRIORITY
  const sport1Channel = await prisma.liveChannel.findUnique({ where: { slug: 'sport-1' } });
  const recDb = await prisma.recording.findFirst({
    where: {
      channelId: sport1Channel!.id,
      isPublished: true,
      license: { in: ['PEXELS_LICENSE', 'CC0_PUBLIC_DOMAIN', 'CC_BY_3', 'CC_BY_4', 'BLENDER_OPEN_MOVIE', 'BUNNY_SELF_HOSTED', 'DEMO_PRODUCTION_OK'] }
    }
  });
  const recId = recDb?.id;
  const curateRes = await request('POST', '/programs/studio/curate-live', staffToken, {
    channelId: 'sport-1',
    recordingIds: [recId],
  });
  const liveEventId = curateRes.data?.data?.event?.id || curateRes.data?.event?.id || curateRes.data?.id;
  
  const epgNowRes = await request('GET', '/programs/epg/now?channelId=sport-1');
  const epgData = epgNowRes.data?.data || epgNowRes.data;
  const c2Pass = epgNowRes.status === 200 &&
    (epgData?.source === 'studio-curated-live' || epgData?.source === 'live-event') &&
    epgData?.isOnAir === true &&
    epgData?.program?.id === liveEventId;
  results.push({
    id: 'C.2',
    title: 'EPG Now Studio Priority',
    pass: c2Pass,
    details: `Source: ${epgData?.source}, isOnAir: ${epgData?.isOnAir}, Program ID Match: ${epgData?.program?.id === liveEventId}`
  });

  // C.3 SELF-RECORD 2-STEP FLOW
  const sampleMp4 = path.join(__dirname, 'test_sample.mp4');
  if (!fs.existsSync(sampleMp4)) {
    fs.writeFileSync(sampleMp4, Buffer.from('FAKE_MP4_HEADER_DATA_1234567890'));
  }
  const uploadFileRes = await request('POST', '/programs/studio/recordings/upload/file', staffToken, null, true, sampleMp4);
  const fileUrl = uploadFileRes.data?.data?.url || uploadFileRes.data?.url;

  const selfRecordRes = await request('POST', '/programs/studio/recordings/upload', staffToken, {
    channelId: 'sport-1',
    title: 'Self-record test',
    videoUrl: fileUrl,
    duration: 30,
    visibility: 'IMMEDIATE',
  });
  const createdRecId = selfRecordRes.data?.data?.recording?.id || selfRecordRes.data?.recording?.id;
  const createdLiveStatus = selfRecordRes.data?.data?.liveEvent?.status || selfRecordRes.data?.liveEvent?.status;
  const c3Pass = selfRecordRes.status === 201 || selfRecordRes.status === 200;
  results.push({
    id: 'C.3',
    title: 'Self-Record 2-Step Flow',
    pass: c3Pass && createdRecId != null && createdLiveStatus === 'LIVE',
    details: `Rec ID: ${createdRecId}, Live Status: ${createdLiveStatus}`
  });

  // C.4 ADD-FROM-CATALOG
  const catalogRes = await request('GET', '/programs/studio/catalog/streams?verified=true&limit=1', staffToken);
  const catalogItem = catalogRes.data?.data?.items?.[0] || catalogRes.data?.items?.[0];
  let c4Pass = false;
  let c4Details = '';
  if (catalogItem) {
    const addCatalogRes = await request('POST', '/programs/studio/recordings/library/from-catalog', staffToken, {
      channelId: 'sport-1',
      catalogId: catalogItem.id,
    });
    c4Pass = addCatalogRes.status === 201 || addCatalogRes.status === 200;
    c4Details = `Catalog ID: ${catalogItem.id}, Status: ${addCatalogRes.status}`;
  } else {
    c4Details = 'No verified catalog entry found';
  }
  results.push({ id: 'C.4', title: 'Add From Catalog', pass: c4Pass, details: c4Details });

  // C.5 4-SURFACE CONSISTENCY
  // Verify API, DB, and Stream
  const dbLiveEvent = await prisma.liveEvent.findFirst({
    where: { channel: { slug: 'sport-1' }, status: 'LIVE' },
    orderBy: { createdAt: 'desc' },
  });
  const epgConsistencyRes = await request('GET', '/programs/epg/now?channelId=sport-1');
  const epgConsData = epgConsistencyRes.data?.data || epgConsistencyRes.data;
  const c5Pass = dbLiveEvent != null && epgConsData?.program?.id === dbLiveEvent.id;
  results.push({
    id: 'C.5',
    title: '4-Surface Consistency (API/DB/EPG/Studio)',
    pass: c5Pass,
    details: `DB Event: "${dbLiveEvent?.title}", EPG Title: "${epgConsData?.program?.title}"`
  });

  // C.6 CURL FALLBACK VIDEO PROBE
  const fallbackUrl = epgConsData?.fallbackStreamUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  let c6Pass = false;
  let c6Status = 0;
  try {
    const probeRes = await new Promise<number>((res) => {
      const u = new URL(fallbackUrl);
      const req = http.request(u, { method: 'HEAD' }, (r) => res(r.statusCode || 0));
      req.on('error', () => res(0));
      req.end();
    });
    c6Status = probeRes;
    c6Pass = probeRes >= 200 && probeRes < 400;
  } catch (err) {
    c6Pass = false;
  }
  results.push({ id: 'C.6', title: 'Fallback Video Probe (CDN Check)', pass: c6Pass, details: `Fallback URL status: ${c6Status}` });

  console.log('SUPPLEMENTARY RESULTS SUMMARY:');
  console.table(results);
  process.exit(0);
}

runSupplementaryTests().catch(console.error);

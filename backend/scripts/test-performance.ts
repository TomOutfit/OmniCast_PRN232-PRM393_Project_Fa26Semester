import http from 'http';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function request(url: string, options: http.RequestOptions, body: any = null): Promise<{ status: number; timeMs: number; data: any }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const u = new URL(url);
    const req = http.request(u, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const timeMs = Date.now() - start;
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode || 0, timeMs, data: json });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runPerformanceTests() {
  console.log('🚀 Running Performance SLO Tests (F.1 - F.4)...\n');

  // Get Staff Token
  const loginRes = await request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { email: 'staff@omnicast.dev', password: 'Staff123!' });
  const staffToken = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;

  // F.1 EPG /now (10 samples)
  const samples: number[] = [];
  for (let i = 0; i < 10; i++) {
    const res = await request('http://localhost:3000/api/v1/programs/epg/now?channelId=sport-1', { method: 'GET' });
    samples.push(res.timeMs);
  }
  samples.sort((a, b) => a - b);
  const avgF1 = samples.reduce((a, b) => a + b, 0) / samples.length;
  const p95F1 = samples[Math.floor(samples.length * 0.95)] || samples[samples.length - 1];
  const passF1 = avgF1 < 200 && p95F1 < 350;

  // F.2 EPG /timeline limit=20
  const resF2 = await request('http://localhost:3000/api/v1/programs/epg/timeline?channelId=sport-1&limit=20', { method: 'GET' });
  const passF2 = resF2.timeMs < 300;

  // F.3 Studio /curate-live
  const sport1Channel = await prisma.liveChannel.findUnique({ where: { slug: 'sport-1' } });
  const recDb = await prisma.recording.findFirst({
    where: {
      channelId: sport1Channel!.id,
      isPublished: true,
      license: { in: ['PEXELS_LICENSE', 'CC0_PUBLIC_DOMAIN', 'CC_BY_3', 'CC_BY_4', 'BLENDER_OPEN_MOVIE', 'BUNNY_SELF_HOSTED', 'DEMO_PRODUCTION_OK'] }
    }
  });
  const resF3 = await request('http://localhost:3000/api/v1/programs/studio/curate-live', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${staffToken}`,
      'Content-Type': 'application/json',
    },
  }, { channelId: 'sport-1', recordingIds: [recDb!.id] });
  const passF3 = resF3.timeMs < 800;

  // F.4 Studio /recordings picker (50 items)
  const resF4 = await request('http://localhost:3000/api/v1/programs/studio/channels/sport-1/recordings?limit=50', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${staffToken}` },
  });
  const passF4 = resF4.timeMs < 300;

  const results = [
    { metric: 'F.1 EPG /now (avg)', value: `${Math.round(avgF1)} ms`, target: '< 200 ms', pass: avgF1 < 200 },
    { metric: 'F.1 EPG /now (p95)', value: `${Math.round(p95F1)} ms`, target: '< 350 ms', pass: p95F1 < 350 },
    { metric: 'F.2 EPG /timeline (limit=20)', value: `${resF2.timeMs} ms`, target: '< 300 ms', pass: passF2 },
    { metric: 'F.3 Studio /curate-live', value: `${resF3.timeMs} ms`, target: '< 800 ms', pass: passF3 },
    { metric: 'F.4 Studio /recordings (limit=50)', value: `${resF4.timeMs} ms`, target: '< 300 ms', pass: passF4 },
  ];

  console.table(results);
  process.exit(0);
}

runPerformanceTests().catch(console.error);

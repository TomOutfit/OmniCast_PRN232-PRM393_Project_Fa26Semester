// Live smoke test: hit the running backend over HTTP
// 1) Login as seeded admin → get JWT
// 2) GET /programs/ingest/status
// 3) POST /programs/ingest/category/PODCAST  (keyless iTunes source)
// 4) Verify DB row count increased

const axios = require('axios');

const BASE = 'http://localhost:3000/api/v1';

async function api(method, path, body, token) {
  const r = await axios({
    method,
    url: BASE + path,
    data: body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 60000,
  });
  return r.data;
}

async function main() {
  console.log('1) Login as admin@omnicast.tv ...');
  const login = await api('POST', '/auth/login', {
    email: 'admin@omnicast.tv',
    password: 'Admin123!',
  });
  const token = login?.data?.accessToken || login?.accessToken || login?.data?.token;
  if (!token) {
    console.log('Login response:', JSON.stringify(login).slice(0, 400));
    throw new Error('No token returned');
  }
  console.log('   Token acquired, length=' + token.length);

  console.log('\n2) GET /programs/ingest/status ...');
  const status = await api('GET', '/programs/ingest/status', null, token);
  console.log('   Active channels:', status?.data?.totalActiveChannels);
  const sources = status?.data?.sources || [];
  console.log('   Sources (' + sources.length + '):');
  sources.forEach((s) =>
    console.log(
      '     ' + s.sourceName.padEnd(22) +
      ' cat=' + s.category.padEnd(12) +
      ' configured=' + s.isConfigured +
      ' envVars=' + JSON.stringify(s.requiredEnvVars)
    )
  );

  console.log('\n3) POST /programs/ingest/category/PODCAST ...');
  const t0 = Date.now();
  const res = await api('POST', '/programs/ingest/category/PODCAST', null, token);
  const dt = Date.now() - t0;
  console.log('   Response in ' + dt + 'ms');
  console.log('   totalChannels: ' + res?.data?.totalChannels);
  console.log('   totalFetched:  ' + res?.data?.totalFetched);
  console.log('   totalUpserted: ' + res?.data?.totalUpserted);
  console.log('   totalErrors:   ' + res?.data?.totalErrors);
  console.log('   durationMs:    ' + res?.data?.durationMs);
  console.log('   Per-source results:');
  (res?.data?.results || []).forEach((r) =>
    console.log(
      '     ' + r.source.padEnd(12) +
      ' cat=' + r.category +
      ' fetched=' + r.fetched +
      ' upserted=' + r.upserted +
      ' errors=' + r.errors +
      (r.errorMessages ? ' errs=' + JSON.stringify(r.errorMessages) : '')
    )
  );

  console.log('\n4) Verify DB row count changed ...');
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  try {
    const total = await p.recording.count();
    const itunes = await p.recording.count({
      where: { externalId: { startsWith: 'itunes-' } },
    });
    const podcastChannels = await p.liveChannel.count({
      where: { category: 'PODCAST', isActive: true },
    });
    console.log('   Total recordings in DB: ' + total);
    console.log('   iTunes recordings:      ' + itunes);
    console.log('   Active PODCAST channels: ' + podcastChannels);
  } finally {
    await p.$disconnect();
  }

  console.log('\n=== LIVE INGEST SMOKE TEST PASS ===');
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  if (e.response) {
    console.error('  HTTP', e.response.status);
    console.error('  Body:', JSON.stringify(e.response.data).slice(0, 500));
  }
  process.exit(1);
});

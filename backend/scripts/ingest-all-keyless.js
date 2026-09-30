// Run ingest for all 8 keyless categories (sources with no API key).
// Reuses login + status from the previous run; serial calls to avoid
// hammering external APIs.

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const BASE = 'http://localhost:3000/api/v1';
const p = new PrismaClient();

const KEYLESS_CATEGORIES = [
  'PODCAST',      // iTunes  (already ran once, re-run is idempotent)
  'TECH',         // HackerNews + DEV.to
  'EDUCATION',    // KhanAcademy
  'FOOD',         // TheMealDB
  'HEALTH',       // OpenFDA
  'TRAVEL',       // Wikipedia
  'ART',          // MetMuseum
  'LIFESTYLE',    // Wikipedia-Wellness
  'SHOW',         // Lifestyle alias
  'ENTERTAINMENT',// Lifestyle alias
  'KIDS',         // Lifestyle alias
  'DOCUMENTARY',  // Lifestyle alias
];

async function api(method, path, token) {
  const r = await axios({
    method,
    url: BASE + path,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 120000,
  });
  return r.data;
}

async function count() {
  return {
    total: await p.recording.count(),
    itunes: await p.recording.count({ where: { externalId: { startsWith: 'itunes-' } } }),
    hackernews: await p.recording.count({ where: { externalId: { startsWith: 'hn-' } } }),
    devto: await p.recording.count({ where: { externalId: { startsWith: 'devto-' } } }),
    khan: await p.recording.count({ where: { externalId: { startsWith: 'khan-' } } }),
    meal: await p.recording.count({ where: { externalId: { startsWith: 'meal-' } } }),
    fda: await p.recording.count({ where: { externalId: { startsWith: 'fda-' } } }),
    wiki: await p.recording.count({ where: { externalId: { startsWith: 'wiki-' } } }),
    met: await p.recording.count({ where: { externalId: { startsWith: 'met-' } } }),
  };
}

async function main() {
  console.log('1) Login ...');
  const login = await axios.post(BASE + '/auth/login', {
    email: 'admin@omnicast.tv',
    password: 'Admin123!',
  });
  const token = login.data?.data?.accessToken || login.data?.accessToken;
  console.log('   Token OK, length=' + token.length);

  console.log('\n2) Baseline DB counts:');
  const before = await count();
  console.log('  ', JSON.stringify(before, null, 2).split('\n').join('\n   '));

  console.log('\n3) Running ingest for ' + KEYLESS_CATEGORIES.length + ' keyless categories ...\n');
  const results = [];
  const tStart = Date.now();

  for (const cat of KEYLESS_CATEGORIES) {
    process.stdout.write('   ' + cat.padEnd(14));
    try {
      const t0 = Date.now();
      const res = await api('POST', `/programs/ingest/category/${cat}`, token);
      const dt = Date.now() - t0;
      const d = res?.data || {};
      console.log(
        ' OK  ' + dt.toString().padStart(5) + 'ms' +
        '  fetched=' + (d.totalFetched || 0).toString().padStart(4) +
        '  upserted=' + (d.totalUpserted || 0).toString().padStart(4) +
        '  errors=' + (d.totalErrors || 0)
      );
      results.push({ cat, ok: true, ...d, durationMs: dt });
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      console.log(' FAIL  ' + msg.slice(0, 80));
      results.push({ cat, ok: false, error: msg });
    }
  }
  const totalDt = Date.now() - tStart;
  console.log('\n   Total elapsed: ' + (totalDt / 1000).toFixed(1) + 's');

  console.log('\n4) Final DB counts:');
  const after = await count();
  console.log('  ', JSON.stringify(after, null, 2).split('\n').join('\n   '));
  console.log('\n   Deltas:');
  for (const k of Object.keys(before)) {
    const delta = after[k] - before[k];
    console.log('     ' + k.padEnd(12) + ' ' + (delta >= 0 ? '+' : '') + delta);
  }

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  const totalFetched = results.reduce((s, r) => s + (r.totalFetched || 0), 0);
  const totalUpserted = results.reduce((s, r) => s + (r.totalUpserted || 0), 0);
  const totalErrors = results.reduce((s, r) => s + (r.totalErrors || 0), 0);

  console.log('\n=== INGEST SWEEP COMPLETE ===');
  console.log('   Categories OK:  ' + ok + '/' + KEYLESS_CATEGORIES.length);
  console.log('   Categories FAIL:' + fail);
  console.log('   Total fetched:  ' + totalFetched);
  console.log('   Total upserted: ' + totalUpserted);
  console.log('   Total errors:   ' + totalErrors);
  console.log('   Wall time:      ' + (totalDt / 1000).toFixed(1) + 's');
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error('FAILED:', e.message);
  if (e.response) console.error('  HTTP', e.response.status, JSON.stringify(e.response.data).slice(0, 400));
  await p.$disconnect();
  process.exit(1);
});

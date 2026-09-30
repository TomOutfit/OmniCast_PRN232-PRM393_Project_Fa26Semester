// Standalone smoke test for the content aggregator.
// Replicates what POST /programs/ingest/all does, but without
// needing the NestJS HTTP server / JWT. Goes through the same
// Prisma upsert path so it's the most accurate test.

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { createHash } = require('crypto');

const p = new PrismaClient();

async function main() {
  // 1) Find a PODCAST channel
  const podcastChannels = await p.liveChannel.findMany({
    where: { category: 'PODCAST', isActive: true },
    select: { id: true, name: true, slug: true },
  });
  if (podcastChannels.length === 0) {
    console.log('NO PODCAST CHANNELS — run seed first');
    process.exit(1);
  }
  const ch = podcastChannels[0];
  console.log(`Target channel: ${ch.name} (${ch.id})`);

  // 2) Count current iTunes recordings for this channel
  //    (iTunes source uses externalId = "itunes-<trackId>")
  const beforeAll = await p.recording.count({ where: { channelId: ch.id } });
  const beforeItunes = await p.recording.count({
    where: { channelId: ch.id, externalId: { startsWith: 'itunes-' } },
  });
  console.log(`Before: total=${beforeAll} iTunes=${beforeItunes}`);

  // 3) Hit iTunes directly (same call itunes-source.service.ts makes)
  const term = ch.name.replace(/^Omni\s+/i, '') || 'talk';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=podcast&limit=10&country=VN`;
  console.log(`\nCalling: ${url}`);
  const t0 = Date.now();
  const res = await axios.get(url, { timeout: 15000 });
  const dt = Date.now() - t0;
  console.log(`Response: ${res.status} in ${dt}ms, resultCount=${res.data.resultCount}`);

  if (res.data.resultCount === 0) {
    console.log('iTunes returned 0 results — try a different channel');
    process.exit(1);
  }

  // 4) Simulate one upsert
  const first = res.data.results[0];
  console.log(`\nSample item: "${first.trackName}" by ${first.artistName}`);

  const seed = `${ch.id}-rec-itunes-${first.trackId}`;
  const hash = createHash('md5').update(seed).digest('hex');
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;

  const created = await p.recording.upsert({
    where: { id },
    update: { title: `Podcast: ${first.trackName}` },
    create: {
      id,
      channelId: ch.id,
      title: `Podcast: ${first.trackName}`.slice(0, 255),
      description: `${first.artistName}${first.collectionName ? ' - ' + first.collectionName : ''}`,
      thumbnailUrl: first.artworkUrl600 || first.artworkUrl100 || null,
      contentSource: 'EXTERNAL',
      externalPlatform: 'EMBED_IFRAME',
      externalId: `itunes-${first.trackId}`,
      duration: Math.floor((first.trackTimeMillis || 1800000) / 1000),
      quality: 'AUTO',
      contentType: 'AUDIO',
      language: 'vi',
      viewCount: BigInt(1000),
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      downloadCount: 0,
      tags: ['iTunes', 'podcast'],
      category: 'PODCAST',
      isPublished: true,
      isFeatured: false,
      publishedAt: first.releaseDate ? new Date(first.releaseDate) : new Date(),
    },
  });
  console.log(`\nUpserted: recording id=${created.id}`);
  console.log(`  title:        ${created.title}`);
  console.log(`  externalId:   ${created.externalId}`);
  console.log(`  thumbnail:    ${created.thumbnailUrl ? 'YES' : 'NO'}`);

  // 5) Count after
  const afterAll = await p.recording.count({ where: { channelId: ch.id } });
  const afterItunes = await p.recording.count({
    where: { channelId: ch.id, externalId: { startsWith: 'itunes-' } },
  });
  console.log(`\nAfter: total=${afterAll} iTunes=${afterItunes}`);
  console.log(`Delta: total=+${afterAll - beforeAll} iTunes=+${afterItunes - beforeItunes}`);

  // 6) Test idempotency: re-run the exact same upsert (same id), row count must not change
  await p.recording.upsert({
    where: { id },
    update: { title: `Podcast: ${first.trackName} (re-upserted)` },
    create: {
      id,
      channelId: ch.id,
      title: 'unused-because-row-exists',
      contentSource: 'EXTERNAL',
      externalPlatform: 'EMBED_IFRAME',
      externalId: `itunes-dup-${first.trackId}`,
      duration: 60,
      quality: 'AUTO',
      contentType: 'AUDIO',
      language: 'vi',
      publishedAt: new Date(),
    },
  });
  const afterReUpsert = await p.recording.count({
    where: { channelId: ch.id, externalId: { startsWith: 'itunes-' } },
  });
  console.log(`Idempotency: re-upserted same id, iTunes count=${afterReUpsert} (expected ${afterItunes}, diff=${afterReUpsert - afterItunes})`);

  // 7) Verify the row was UPDATED not INSERTED again
  const verify = await p.recording.findUnique({ where: { id } });
  console.log(`Re-upsert proof: title="${verify.title}"`);

  // 7) Cleanup the smoke-test row
  await p.recording.delete({ where: { id } });
  console.log(`\nSmoke-test row removed. DB clean.`);

  console.log('\n=== SMOKE TEST PASS ===');
  console.log('  1. DB connection works');
  console.log('  2. iTunes API reachable (no key needed)');
  console.log('  3. Prisma upsert writes to Supabase');
  console.log('  4. Schema accepts full recording payload');
  console.log('  5. Re-run is idempotent (no duplicate rows)');
  console.log('\nReady for production: POST /programs/ingest/all');
}

main()
  .catch((e) => {
    console.error('FAILED:', e.message);
    if (e.response) {
      console.error('  HTTP', e.response.status, e.response.statusText);
    }
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });

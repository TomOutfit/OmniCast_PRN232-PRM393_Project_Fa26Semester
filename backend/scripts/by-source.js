const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const recs = await p.recording.findMany({
    select: { externalId: true, externalPlatform: true, tags: true, channelId: true },
  });
  const bySource = {};
  recs.forEach((r) => {
    if (!r.externalId) return;
    const k = r.externalId.split('-')[0];
    bySource[k] = (bySource[k] || 0) + 1;
  });
  console.log('Recordings by source tag (total=' + recs.length + '):');
  Object.entries(bySource)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log('  ' + k.padEnd(20) + v));

  // Per-channel breakdown for new sources
  console.log('\nPer-channel counts (new sources only):');
  const newSources = ['hn', 'devto', 'wiki', 'met'];
  for (const src of newSources) {
    const cnt = await p.recording.count({
      where: { externalId: { startsWith: src + '-' } },
    });
    console.log('  ' + src.padEnd(20) + cnt);
  }
  await p.$disconnect();
})();

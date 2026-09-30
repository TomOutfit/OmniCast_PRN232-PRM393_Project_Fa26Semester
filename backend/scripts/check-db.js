const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const total = await p.liveChannel.count();
    const recs = await p.recording.count();
    const events = await p.liveEvent.count();
    const cats = await p.liveChannel.groupBy({
      by: ['category'],
      _count: true,
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });
    console.log('=== DB STATE ===');
    console.log('LiveChannels total:', total);
    console.log('LiveEvents   total:', events);
    console.log('Recordings   total:', recs);
    console.log('---Active channels by category---');
    cats.forEach((c) =>
      console.log('  ' + c.category.padEnd(15) + ' count=' + c._count)
    );
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();

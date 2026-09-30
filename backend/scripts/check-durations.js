const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const top = await p.liveEvent.findMany({
    select: { id: true, title: true, duration: true, scheduledAt: true, status: true },
    orderBy: { duration: 'desc' },
    take: 20,
  });
  console.log('TOP 20 durations (minutes):');
  console.log(JSON.stringify(top, null, 2));

  const stats = await p.liveEvent.aggregate({
    _min: { duration: true },
    _max: { duration: true },
    _avg: { duration: true },
    _count: true,
  });
  console.log('\nSTATS:', JSON.stringify(stats, null, 2));

  const nullCount = await p.liveEvent.count({ where: { duration: null } });
  const totalCount = await p.liveEvent.count();
  console.log('null duration:', nullCount, '/', totalCount);

  const sample = await p.liveEvent.findMany({
    take: 5,
    select: { id: true, title: true, duration: true, scheduledAt: true, status: true }
  });
  console.log('\nSAMPLE 5:', JSON.stringify(sample, null, 2));

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });

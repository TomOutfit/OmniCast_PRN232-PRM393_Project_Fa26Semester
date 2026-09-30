const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Check distinct dates in LiveEvent
  const allEvents = await p.liveEvent.findMany({
    select: { id: true, scheduledAt: true, channelId: true, status: true },
    orderBy: { scheduledAt: 'asc' },
  });
  console.log('Total LiveEvents:', allEvents.length);

  const byDate = {};
  for (const e of allEvents) {
    const d = e.scheduledAt.toISOString().slice(0, 10);
    byDate[d] = (byDate[d] || 0) + 1;
  }
  console.log('\nLiveEvent count by date (top 10):');
  const sorted = Object.entries(byDate).sort((a, b) => b[1] - a[1]);
  sorted.slice(0, 10).forEach(([d, c]) => console.log('  ' + d + ': ' + c));

  // Total recordings
  const recCount = await p.recording.count();
  console.log('\nTotal Recordings:', recCount);
  const recByChannel = await p.recording.groupBy({
    by: ['channelId'],
    _count: true,
    orderBy: { _count: { channelId: 'desc' } },
    take: 30,
  });
  console.log('\nRecordings per channel (top 30):');
  for (const r of recByChannel) {
    console.log('  ' + r.channelId + ': ' + r._count);
  }

  // Total channels
  const channelCount = await p.liveChannel.count();
  const activeChannelCount = await p.liveChannel.count({ where: { isActive: true } });
  console.log('\nChannels: total=' + channelCount + ' active=' + activeChannelCount);

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });

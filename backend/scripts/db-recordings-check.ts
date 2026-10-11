import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
async function main() {
  const total = await p.recording.count();
  const withMeta = await p.recording.count({
    where: { sourceType: { not: null }, license: { not: 'UNKNOWN' } },
  });
  const recent = await p.recording.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, sourceType: true, license: true,
      sourceAttribution: true, fallbackUrl: true, isActive: true,
    },
  });
  console.log(`Total recordings: ${total}`);
  console.log(`With v2.1 metadata: ${withMeta}`);
  console.log('\n5 most recent:');
  for (const r of recent) {
    console.log(`  · ${r.id.slice(0, 8)} "${r.title.slice(0, 40)}"`);
    console.log(`    sourceType=${r.sourceType} license=${r.license} active=${r.isActive}`);
    console.log(`    attribution=${r.sourceAttribution ?? '(null)'} fallback=${r.fallbackUrl ?? '(null)'}`);
  }

  const channels = await p.liveChannel.count();
  console.log(`\nLiveChannels: ${channels}`);
}
main().catch((e: any) => {
  console.error('ERR:', e.message?.slice(0, 300) ?? e);
  return p.$disconnect().then(() => process.exit(1));
}).finally(() => p.$disconnect());

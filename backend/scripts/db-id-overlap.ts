import { PrismaClient } from '@prisma/client';
import { expandAll, TOTAL_ENTRIES_AFTER_EXPANSION } from './catalog-data';

const p = new PrismaClient();
async function main() {
  const rows = expandAll();
  console.log(`Catalog rows: ${TOTAL_ENTRIES_AFTER_EXPANSION}`);
  const ids = rows.map((r) => r.id);
  const existing = await p.recording.findMany({
    where: { id: { in: ids.slice(0, 500) } },
    select: { id: true, title: true },
  });
  console.log(`First 500 catalog IDs checked: ${existing.length} already in DB`);
  const newRows = rows.length - existing.length;
  console.log(`New rows the seed would create: ${newRows}`);

  // sample a few IDs to inspect format
  console.log('\nSample catalog IDs:');
  for (const r of rows.slice(0, 5)) {
    console.log(`  · ${r.id} (${r.channelSlug})`);
  }
  console.log('\nSample existing DB IDs:');
  const dbSample = await p.recording.findMany({
    take: 5,
    select: { id: true, title: true },
  });
  for (const r of dbSample) console.log(`  · ${r.id} (${r.title.slice(0, 30)})`);
}
main().catch((e: any) => {
  console.error('ERR:', e.message?.slice(0, 300) ?? e);
  return p.$disconnect().then(() => process.exit(1));
}).finally(() => p.$disconnect());

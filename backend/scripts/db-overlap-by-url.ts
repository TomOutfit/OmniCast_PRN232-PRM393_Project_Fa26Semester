import { PrismaClient } from '@prisma/client';
import { expandAll } from './catalog-data';

const p = new PrismaClient();
async function main() {
  const rows = expandAll();
  const catalogUrls = new Set(rows.map((r) => r.videoUrl));
  // Find existing rows whose videoUrl matches the catalog (potential duplicates by URL)
  const existingByUrl = await p.recording.findMany({
    where: { videoUrl: { in: [...catalogUrls].slice(0, 50) } },
    select: { id: true, videoUrl: true, title: true, channelId: true },
  });
  console.log(`Existing rows with first 50 catalog videoUrls: ${existingByUrl.length}`);
  for (const r of existingByUrl.slice(0, 10)) {
    const u = r.videoUrl ?? '';
    console.log(`  · ${u.slice(0, 70)} → ${r.title.slice(0, 30)}`);
  }

  // Check by title — common titles from the catalog
  const sampleTitle = rows[0]?.title ?? '';
  console.log(`\nSample catalog title: "${sampleTitle}"`);
  const byTitle = await p.recording.findMany({
    where: { title: { contains: sampleTitle.slice(0, 20) } },
    select: { id: true, title: true, videoUrl: true, channelId: true },
  });
  console.log(`Existing rows matching: ${byTitle.length}`);
  for (const r of byTitle.slice(0, 5)) {
    console.log(`  · ${r.title}`);
  }
}
main().catch((e: any) => {
  console.error('ERR:', e.message?.slice(0, 300) ?? e);
  return p.$disconnect().then(() => process.exit(1));
}).finally(() => p.$disconnect());

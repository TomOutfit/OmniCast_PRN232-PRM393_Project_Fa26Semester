// ============================================================
// OmniCast - Stream Health-Check CLI
// ============================================================
//
// One-off command-line wrapper around
// `StreamHealthCheckService.sweep()` for SRE to run on demand.
//
// Usage
// -----
//   npx ts-node scripts/health-check.ts                # round-robin 50
//   npx ts-node scripts/health-check.ts --full         # sweep everything
//   npx ts-node scripts/health-check.ts --channel=sport-1
// ============================================================

import { PrismaClient } from '@prisma/client';
import { StreamHealthCheckService } from '../src/programs/stream-health-check.service';

const prisma = new PrismaClient();
const health = new StreamHealthCheckService(prisma as any, {
  get: (key: string) => process.env[key],
} as any);

async function main() {
  const args = process.argv.slice(2);
  const full = args.includes('--full');
  const channelArg = args.find((a) => a.startsWith('--channel='));
  const channelSlug = channelArg ? channelArg.slice(10) : undefined;

  const t0 = Date.now();
  if (channelSlug) {
    // Single-channel sweep: filter the table client-side.
    const channel = await prisma.liveChannel.findUnique({ where: { slug: channelSlug } });
    if (!channel) {
      throw new Error(`Channel not found: ${channelSlug}`);
    }
    const rows = await prisma.recording.findMany({
      where: { channelId: channel.id, isPublished: true },
      take: 5000,
      select: { id: true },
    });
    let active = 0;
    let inactive = 0;
    for (const r of rows) {
      const res = await health.checkRecording(r.id);
      if (res?.status === 'ok' || res?.status === 'embed') active += 1;
      else inactive += 1;
    }
    console.log(
      `[${channelSlug}] probed=${rows.length} active=${active} inactive=${inactive} (${Date.now() - t0}ms)`,
    );
  } else {
    const result = await health.sweep({
      batch: full ? 5000 : 50,
      includeInactive: full,
    });
    console.log(
      `[sweep] probed=${result.probed} active=${result.active} inactive=${result.inactive} errors=${result.errors} (${Date.now() - t0}ms)`,
    );
  }

  // Print a quick stats summary.
  const stats = await health.getStats();
  console.log(
    `Totals: total=${stats.totals.total} active=${stats.totals.active} inactive=${stats.totals.inactive} neverChecked=${stats.totals.neverChecked}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

// ============================================================
// OmniCast - Bunny Stream Mirror Orchestrator
// ============================================================
//
// End-to-end pipeline that mirrors every catalog entry whose
// upstream source is safe to redistribute (PEXELS / BLENDER_CC /
// ARCHIVE_ORG / GOOGLE_SAMPLE) onto our own Bunny Stream CDN.
//
// Why mirror?
//   • Bunny CDN is faster than the upstream host (we control the
//     pull-zone geography, multi-bitrate HLS, and DDoS protection).
//   • Even if the upstream is rate-limiting or geo-blocking us,
//     our own CDN keeps serving.
//   • The catalog keeps the original URL as `fallbackUrl` so the
//     player can chain primary → fallback if the mirror ever
//     fails.
//
// What this does NOT do
// ----------------------
//   • It does NOT mirror YouTube / Twitch / Vimeo embeds. Those
//     are iframe embeds and not eligible for redistribution.
//   • It does NOT mirror DEV_ONLY_TEST_FIXTURE sources
//     (samplelib, test-videos.co.uk, Cloudinary public bucket,
//     Mux test streams, Unified Streaming demo, W3 Schools). We
//     keep them on the upstream so the catalog is honest about
//     its dev-only sources.
//
// Env vars
// --------
//   BUNNY_LIBRARY_ID    — required
//   BUNNY_API_KEY       — required
//   BUNNY_PULL_HOST     — optional, defaults to <id>.b-cdn.net
//   BUNNY_DRY_RUN=1     — set to "1" to print the plan without
//                         actually uploading (useful for review).
//
// Usage
// -----
//   npx ts-node scripts/orchestrate-bunny.ts                       # mirror all eligible
//   npx ts-node scripts/orchestrate-bunny.ts --channel=sport-1     # one channel
//   npx ts-node scripts/orchestrate-bunny.ts --limit=5             # first N rows
//   BUNNY_DRY_RUN=1 npx ts-node scripts/orchestrate-bunny.ts       # preview only
// ============================================================

import { PrismaClient, StreamSourceType, ContentLicense } from '@prisma/client';
import { uploadToBunny, type BunnyUploadResult } from './bunny-upload';

const prisma = new PrismaClient();

interface OrchestratorOptions {
  channelSlug?: string;
  limit?: number;
  dryRun?: boolean;
}

// SourceTypes eligible for mirror (i.e. not iframe embeds and not
// already Bunny-CDN self-hosted).
const MIRROR_ELIGIBLE = new Set<StreamSourceType>([
  'PEXELS',
  'BLENDER_CC',
  'ARCHIVE_ORG',
  'GOOGLE_SAMPLE',
  'W3_SAMPLE',
  'SAMPLELIB',
  'CLOUDINARY_DEMO',
  'MUX_TEST',
  'UNIFIED_TEST',
]);

// Licenses we *shouldn't* mirror onto Bunny (Bunny bills by stored
// minutes; for dev-only sources we'd be paying Bunny to host what
// is essentially a free public test fixture). Operators can force
// these via the env override below.
const LICENSE_BLOCKLIST = new Set<ContentLicense>([
  'DEV_ONLY_TEST_FIXTURE',
  'UNKNOWN',
]);

async function main() {
  const opts = parseCli(process.argv.slice(2));
  const libId = requireEnv('BUNNY_LIBRARY_ID');
  const apiKey = requireEnv('BUNNY_API_KEY');
  const dryRun = opts.dryRun ?? process.env.BUNNY_DRY_RUN === '1';

  if (dryRun) {
    console.log('🟡 BUNNY_DRY_RUN=1 — no uploads will be made');
  }

  // Find every recording that is eligible + still pointing at the
  // original upstream (i.e. not already mirrored).
  const where: any = {
    sourceType: { in: Array.from(MIRROR_ELIGIBLE) as any },
    videoBucketPath: { startsWith: 'catalog:' }, // hasn't been mirrored yet
  };
  if (opts.channelSlug) where.channel = { slug: opts.channelSlug };
  if (opts.limit) where.take = opts.limit;

  const candidates = await prisma.recording.findMany({
    where,
    include: {
      channel: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { publishedAt: 'asc' },
    take: opts.limit ?? 1000,
  });

  // Filter out the dev-only license block (unless operator forces
  // the mirror via `--include-dev-only`).
  const filtered = candidates.filter(
    (c) =>
      !LICENSE_BLOCKLIST.has(c.license as ContentLicense) ||
      process.env.BUNNY_FORCE_DEV === '1',
  );

  console.log(
    `→ ${filtered.length} eligible recordings (${candidates.length - filtered.length} skipped as DEV_ONLY/UNKNOWN)`,
  );

  let mirrored = 0;
  let failed = 0;
  for (const rec of filtered) {
    if (!dryRun) {
      try {
        const result = await uploadToBunny({
          libraryId: libId,
          apiKey,
          source: rec.videoUrl ?? '',
          title: rec.title,
          collection: rec.channel.slug,
          tags: ['omnicast', rec.channel.slug, String(rec.sourceType)],
        });
        await prisma.recording.update({
          where: { id: rec.id },
          data: {
            videoUrl: result.playbackUrl,
            // Keep the original as fallback so the player can chain
            // primary → fallback if Bunny ever hiccups.
            fallbackUrl: rec.videoUrl,
            videoBucketPath: `bunny:${result.videoId}`,
            sourceType: 'BUNNY_CDN',
            license: 'BUNNY_SELF_HOSTED',
            sourceAttribution: `Mirrored from ${rec.sourceAttribution} onto Bunny CDN (${result.videoId})`,
            isActive: true,
            lastCheckedAt: new Date(),
            lastStatus: 'ok',
          },
        });
        mirrored += 1;
        console.log(`  ✓ ${rec.channel.slug} / ${rec.title.slice(0, 50)} → ${result.videoId}`);
      } catch (err) {
        failed += 1;
        console.warn(`  ✗ ${rec.id}: ${(err as Error).message}`);
      }
    } else {
      console.log(
        `  · would mirror: ${rec.channel.slug} / "${rec.title.slice(0, 50)}" (${rec.sourceType})`,
      );
    }
  }

  console.log(
    `\n${dryRun ? '🟡 Dry run' : '✅'} complete: ${mirrored} mirrored, ${failed} failed (of ${filtered.length} eligible)`,
  );
  if (dryRun) {
    console.log(
      '   Re-run without BUNNY_DRY_RUN=1 to actually upload. Bunny will bill storage for the mirror copies.',
    );
  }
}

function parseCli(argv: string[]): OrchestratorOptions {
  const opts: OrchestratorOptions = {};
  for (const arg of argv) {
    if (arg.startsWith('--channel=')) opts.channelSlug = arg.slice(10);
    else if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice(8));
    else if (arg === '--dry-run') opts.dryRun = true;
  }
  return opts;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

// Unused — keep TS happy with the import.
void ({} as BunnyUploadResult);

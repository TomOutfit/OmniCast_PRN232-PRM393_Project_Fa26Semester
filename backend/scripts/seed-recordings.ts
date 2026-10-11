// ============================================================
// OmniCast - Recordings Seed (v2.1 — 2026-10-09)
// ============================================================
//
// Reads the curated catalog in `./catalog-data.ts` and upserts
// one `Recording` row per catalog entry. The catalog is the single
// source of truth for license/source/attribution metadata; this
// file only handles persistence.
//
// After the seed runs, run:
//   • scripts/orchestrate-bunny.ts  — mirrors PEXELS entries to
//                                     Bunny CDN and updates the
//                                     `videoUrl` + `fallbackUrl`.
//   • scripts/health-check.ts       — probes each URL and flips
//                                     `isActive` based on the result.
//
// Why split into 3 scripts? Each one is independently re-runnable
// in production. The catalog can change without re-uploading to
// Bunny, and the health check can run on a cron without re-seeding.
// ============================================================

import { PrismaClient, ContentSource, ExternalPlatform } from '@prisma/client';
import {
  expandAll,
  TOTAL_CHANNELS,
  TOTAL_ENTRIES_AFTER_EXPANSION,
  type CatalogRow,
} from './catalog-data';

const prisma = new PrismaClient();

// ============================================================
// URL → ExternalPlatform mapping
// ============================================================
//
// The Prisma `ExternalPlatform` enum doesn't have a 1:1 mapping
// with `StreamSourceType`. We bridge them here so the seed can
// store the correct platform for the player to dispatch on.
function platformForRow(row: CatalogRow): ExternalPlatform {
  const lower = row.videoUrl.toLowerCase();
  if (row.sourceType === 'YOUTUBE_EMBED') return 'EMBED_IFRAME' as ExternalPlatform;
  if (row.sourceType === 'YOUTUBE_DIRECT') return 'YOUTUBE' as ExternalPlatform;
  if (row.sourceType === 'VIMEO') return 'VIMEO' as ExternalPlatform;
  if (row.sourceType === 'TWITCH') return 'TWITCH' as ExternalPlatform;
  if (lower.includes('.m3u8') || lower.includes('.ism/')) {
    return 'CUSTOM_HLS' as ExternalPlatform;
  }
  if (lower.includes('.mpd') || lower.includes('.dash')) {
    return 'CUSTOM_HLS' as ExternalPlatform;
  }
  return 'CUSTOM_MP4' as ExternalPlatform;
}

async function main() {
  console.log('🌱 Seeding Recording library from catalog-data.ts…');
  console.log(`   catalog: ${TOTAL_CHANNELS} channels × ${TOTAL_ENTRIES_AFTER_EXPANSION} expanded rows`);

  const channels = await prisma.liveChannel.findMany({
    select: { id: true, slug: true, name: true, category: true },
  });
  const slugMap = new Map(channels.map((c) => [c.slug, c]));
  const missing: string[] = [];

  let upserted = 0;
  let skipped = 0;
  const licenseCounts = new Map<string, number>();
  const sourceTypeCounts = new Map<string, number>();

  for (const row of expandAll()) {
    const channel = slugMap.get(row.channelSlug);
    if (!channel) {
      missing.push(row.channelSlug);
      skipped += 1;
      continue;
    }

    licenseCounts.set(
      String(row.license),
      (licenseCounts.get(String(row.license)) ?? 0) + 1,
    );
    sourceTypeCounts.set(
      String(row.sourceType),
      (sourceTypeCounts.get(String(row.sourceType)) ?? 0) + 1,
    );

    await prisma.recording.upsert({
      where: { id: row.id },
      update: {
        // Keep `videoUrl` / `fallbackUrl` updates idempotent. The
        // Bunny orchestrator may have replaced these with mirrored
        // CDN URLs — we don't want to clobber that here.
        title: row.title,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        sourceType: row.sourceType,
        license: row.license,
        sourceAttribution: row.sourceAttribution,
        thumbnailAttribution: row.thumbnailAttribution,
        tags: row.tags,
        category: channel.category,
      },
      create: {
        id: row.id,
        title: row.title,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        contentSource: 'EXTERNAL' as ContentSource,
        externalPlatform: platformForRow(row),
        externalUrl: row.videoUrl,
        videoUrl: row.videoUrl,
        videoBucketPath: `catalog:${row.channelSlug}:${row.sourceType}`,
        duration: row.duration,
        channelId: channel.id,
        category: channel.category,
        sourceType: row.sourceType,
        license: row.license,
        sourceAttribution: row.sourceAttribution,
        thumbnailAttribution: row.thumbnailAttribution,
        tags: row.tags,
        isPublished: true,
        isActive: true,
      },
    });
    upserted += 1;
  }

  console.log(
    `✅ Upserted ${upserted} recordings (${skipped} skipped) across ${slugMap.size} channels.`,
  );
  console.log('\n   License distribution:');
  for (const [lic, count] of [...licenseCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`     · ${lic.padEnd(28)} ${count}`);
  }
  console.log('\n   SourceType distribution:');
  for (const [st, count] of [...sourceTypeCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`     · ${st.padEnd(28)} ${count}`);
  }

  if (missing.length > 0) {
    const unique = Array.from(new Set(missing));
    console.warn(
      `\n⚠️  ${unique.length} channel slugs referenced by the catalog do not exist in DB:\n     ${unique.join(', ')}`,
    );
    console.warn('   Run prisma/seed.ts first to create the channels.');
  }

  console.log('\nNext steps:');
  console.log('  1. npx ts-node scripts/orchestrate-bunny.ts  — mirror Pexels clips to Bunny');
  console.log('  2. npx ts-node scripts/health-check.ts       — probe URLs + flip isActive');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

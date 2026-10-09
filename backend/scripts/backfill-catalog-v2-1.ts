// ============================================================
// backfill-catalog-v2-1.ts
// Backfills the v2.1 fields (sourceType, license, sourceAttribution)
// on EXISTING Recording rows. The previous seed inserted the rows
// with random UUIDs, so a re-seed would create ~145 duplicates
// (one per catalog entry). This script instead walks every existing
// row, infers the metadata from the URL pattern + a small set of
// heuristics on the title, and UPDATEs in place.
//
// Idempotent: re-running only updates rows whose v2.1 fields are
// still null / UNKNOWN, so the script is safe to re-run after a
// partial migration.
//
// Run:
//   npx ts-node scripts/backfill-catalog-v2-1.ts
// ============================================================

import { PrismaClient, ContentLicense, StreamSourceType } from '@prisma/client';

const prisma = new PrismaClient();

// Mirror of `inferSourceTypeFromUrl` in live-studio.service.ts.
// Kept inline so the backfill doesn't drag in the entire studio
// service (and so it can run before/after the migration step).
function inferSourceTypeFromUrl(url: string | null): StreamSourceType {
  if (!url) return StreamSourceType.UPLOADED_LOCAL;
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com/embed/') || lower.includes('youtu.be/')) {
    return StreamSourceType.YOUTUBE_EMBED;
  }
  if (lower.includes('youtube.com/watch')) return StreamSourceType.YOUTUBE_DIRECT;
  if (lower.includes('vimeo.com')) return StreamSourceType.VIMEO;
  if (lower.includes('twitch.tv')) return StreamSourceType.TWITCH;
  if (lower.includes('pexels.com') || lower.includes('pscpstatic.com')) {
    return StreamSourceType.PEXELS;
  }
  if (lower.includes('archive.org')) return StreamSourceType.ARCHIVE_ORG;
  if (lower.includes('blender.org') || lower.includes('durian.blender')) {
    return StreamSourceType.BLENDER_CC;
  }
  if (lower.includes('commondatastorage.googleapis.com')) {
    return StreamSourceType.GOOGLE_SAMPLE;
  }
  if (lower.includes('w3schools.com')) return StreamSourceType.W3_SAMPLE;
  if (lower.includes('samplelib.com')) return StreamSourceType.SAMPLELIB;
  if (lower.includes('cloudinary.com')) return StreamSourceType.CLOUDINARY_DEMO;
  if (lower.includes('test-streams.mux.dev') || lower.includes('stream.mux.com')) {
    return StreamSourceType.MUX_TEST;
  }
  if (lower.includes('unified-streaming.com') || lower.includes('bitdash-a.akamaihd.net')) {
    return StreamSourceType.UNIFIED_TEST;
  }
  if (lower.includes('b-cdn.net') || lower.includes('bunny')) {
    return StreamSourceType.BUNNY_CDN;
  }
  if (lower.startsWith('/uploads/') || lower.includes('/uploads/')) {
    return StreamSourceType.UPLOADED_LOCAL;
  }
  return StreamSourceType.UPLOADED_LOCAL;
}

function inferLicenseFromMeta(
  url: string | null,
  tags: string[] | null,
  title: string | null,
  externalPlatform: string | null,
): ContentLicense {
  const lower = (url ?? '').toLowerCase();
  const tagStr = (tags ?? []).join(' ').toLowerCase();
  const titleLower = (title ?? '').toLowerCase();

  // Self-recorded clips — published from the Live Studio (mobile
  // camera capture) live on Bunny CDN.
  if (
    externalPlatform === 'CUSTOM_MP4' ||
    tagStr.includes('self-recorded') ||
    tagStr.includes('self_recorded') ||
    titleLower.startsWith('self-record')
  ) {
    return ContentLicense.BUNNY_SELF_HOSTED;
  }

  // Bunny CDN mirrored copies of Pexels / Blender / Archive content
  // still carry the upstream license.
  if (lower.includes('b-cdn.net') || lower.includes('bunny')) {
    if (lower.includes('pexels')) return ContentLicense.PEXELS_LICENSE;
    if (lower.includes('blender')) return ContentLicense.BLENDER_OPEN_MOVIE;
    if (lower.includes('archive')) return ContentLicense.CC0_PUBLIC_DOMAIN;
    return ContentLicense.BUNNY_SELF_HOSTED;
  }

  if (lower.includes('pexels.com') || lower.includes('pscpstatic.com')) {
    return ContentLicense.PEXELS_LICENSE;
  }
  if (lower.includes('archive.org')) return ContentLicense.CC0_PUBLIC_DOMAIN;
  if (lower.includes('blender.org') || lower.includes('durian.blender')) {
    return ContentLicense.BLENDER_OPEN_MOVIE;
  }
  // Test fixtures — DEV_ONLY so the publish gate continues to
  // require an explicit opt-in to broadcast them.
  if (
    lower.includes('test-streams.mux.dev') ||
    lower.includes('test-streams.akamaized.net') ||
    lower.includes('demo.unified-streaming.com') ||
    lower.includes('w3schools.com') ||
    lower.includes('samplelib.com') ||
    lower.includes('cloudinary.com/demo') ||
    lower.includes('commondatastorage.googleapis.com')
  ) {
    return ContentLicense.DEV_ONLY_TEST_FIXTURE;
  }
  if (lower.includes('unified-streaming.com') || lower.includes('bitdash-a.akamaihd.net')) {
    return ContentLicense.DEV_ONLY_TEST_FIXTURE;
  }
  // YouTube / Twitch / Vimeo — commercial broadcasters. The
  // studio publish-gate will refuse these anyway, so mark them
  // UNKNOWN so an explicit override is required.
  if (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('twitch.tv') ||
    lower.includes('vimeo.com')
  ) {
    return ContentLicense.UNKNOWN;
  }
  // Catch-all: any non-trivial URL with no recognised license
  // defaults to UNKNOWN so the gate stays strict.
  return ContentLicense.UNKNOWN;
}

function defaultAttribution(
  sourceType: StreamSourceType,
  license: ContentLicense,
): string {
  if (sourceType === StreamSourceType.PEXELS) {
    return 'Video by Pexels (Pexels License — miễn phí thương mại)';
  }
  if (sourceType === StreamSourceType.BLENDER_CC) {
    return 'Blender Foundation — Creative Commons BY 3.0';
  }
  if (sourceType === StreamSourceType.ARCHIVE_ORG) {
    return 'Internet Archive — Public Domain';
  }
  if (sourceType === StreamSourceType.BUNNY_CDN || sourceType === StreamSourceType.UPLOADED_LOCAL) {
    return 'Nội dung tự host (Bunny CDN / Self-Recorded)';
  }
  if (license === ContentLicense.CC0_PUBLIC_DOMAIN) {
    return 'Public Domain (CC0)';
  }
  return '';
}

async function main() {
  const total = await prisma.recording.count();
  console.log(`▶ Backfill v2.1 metadata on ${total} existing Recording rows…`);

  let updated = 0;
  let skipped = 0;
  const sourceTypeCounts = new Map<string, number>();
  const licenseCounts = new Map<string, number>();

  // Stream in chunks so we don't blow the heap on 1.3k rows.
  const CHUNK = 200;
  type RowSnapshot = {
    id: string;
    title: string;
    videoUrl: string | null;
    externalUrl: string | null;
    externalPlatform: string | null;
    sourceType: StreamSourceType | null;
    license: ContentLicense | null;
    sourceAttribution: string | null;
    tags: string[];
  };
  let cursor: string | undefined = undefined;
  while (true) {
    const rows: RowSnapshot[] = await prisma.recording.findMany({
      where: cursor ? { id: { gt: cursor } } : {},
      orderBy: { id: 'asc' },
      take: CHUNK,
      select: {
        id: true,
        title: true,
        videoUrl: true,
        externalUrl: true,
        externalPlatform: true,
        sourceType: true,
        license: true,
        sourceAttribution: true,
        tags: true,
        // Only update rows whose v2.1 fields are still null/UNKNOWN
        // — preserves any explicit operator override from a manual
        // Studio session.
      },
    });
    if (rows.length === 0) break;

    for (const r of rows) {
      if (r.sourceType && r.license && r.license !== 'UNKNOWN' && r.sourceAttribution) {
        skipped += 1;
        continue;
      }
      const url = r.videoUrl ?? r.externalUrl;
      const sourceType = inferSourceTypeFromUrl(url);
      const license = inferLicenseFromMeta(
        url,
        r.tags,
        r.title,
        r.externalPlatform,
      );
      const attribution = defaultAttribution(sourceType, license);

      await prisma.recording.update({
        where: { id: r.id },
        data: {
          sourceType,
          license,
          sourceAttribution: attribution || null,
        },
      });
      updated += 1;
      sourceTypeCounts.set(sourceType, (sourceTypeCounts.get(sourceType) ?? 0) + 1);
      licenseCounts.set(license, (licenseCounts.get(license) ?? 0) + 1);
    }

    cursor = rows[rows.length - 1].id;
    process.stdout.write(`\r  · processed ${updated + skipped} / ${total}…`);
  }
  process.stdout.write('\n');

  console.log(`\n✅ Backfill complete: ${updated} updated, ${skipped} skipped (already had v2.1 metadata).`);
  console.log('\n   SourceType distribution:');
  for (const [st, count] of [...sourceTypeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     · ${st.padEnd(28)} ${count}`);
  }
  console.log('\n   License distribution:');
  for (const [lic, count] of [...licenseCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     · ${lic.padEnd(28)} ${count}`);
  }
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

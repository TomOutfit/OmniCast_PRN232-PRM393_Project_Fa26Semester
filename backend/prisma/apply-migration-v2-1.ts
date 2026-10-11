// ============================================================
// apply-migration-v2-1.ts
// Applies the Catalog v2.1 schema changes to the live database.
// Run once after pulling the migration:
//
//   cd backend
//   npx ts-node prisma/apply-migration-v2-1.ts
//
// Safe to re-run: every statement is idempotent.
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStep {
  label: string;
  sql: string;
}

const STEPS: MigrationStep[] = [
  // --- Step 1: create the v2.1 enum types if they don't exist yet.
  // The original migration set (001_init.sql … 004_*.sql) ran
  // before the v2.1 schema was designed, so the enums are missing
  // from the live DB even though Prisma's generated client knows
  // about them. We create them here in a single DO block so the
  // statement is idempotent (re-runs are no-ops).
  {
    label: 'Enum StreamSourceType',
    sql: `DO $$ BEGIN
            CREATE TYPE "StreamSourceType" AS ENUM (
              'YOUTUBE_EMBED', 'PEXELS', 'ARCHIVE_ORG', 'BLENDER_CC',
              'GOOGLE_SAMPLE', 'W3_SAMPLE', 'SAMPLELIB', 'CLOUDINARY_DEMO',
              'MUX_TEST', 'UNIFIED_TEST', 'BUNNY_CDN', 'UPLOADED_LOCAL',
              'TMDB_TRAILER', 'YOUTUBE_DIRECT', 'VIMEO', 'TWITCH'
            );
          EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  },
  {
    label: 'Enum ContentLicense',
    sql: `DO $$ BEGIN
            CREATE TYPE "ContentLicense" AS ENUM (
              'PEXELS_LICENSE', 'CC0_PUBLIC_DOMAIN', 'CC_BY_3', 'CC_BY_4',
              'BLENDER_OPEN_MOVIE', 'BUNNY_SELF_HOSTED', 'DEMO_PRODUCTION_OK',
              'DEV_ONLY_TEST_FIXTURE', 'UNKNOWN'
            );
          EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  },
  // --- Step 2: add the columns to Recording.
  {
    label: 'Recording.sourceType StreamSourceType?',
    sql: `ALTER TABLE "Recording"
            ADD COLUMN IF NOT EXISTS "sourceType" "StreamSourceType"`,
  },
  {
    label: 'Recording.license ContentLicense default UNKNOWN',
    sql: `ALTER TABLE "Recording"
            ADD COLUMN IF NOT EXISTS "license" "ContentLicense"
            NOT NULL DEFAULT 'UNKNOWN'`,
  },
  {
    label: 'Recording.sourceAttribution VARCHAR(500)?',
    sql: `ALTER TABLE "Recording"
            ADD COLUMN IF NOT EXISTS "sourceAttribution" VARCHAR(500)`,
  },
  {
    label: 'Recording.fallbackUrl VARCHAR(500)?',
    sql: `ALTER TABLE "Recording"
            ADD COLUMN IF NOT EXISTS "fallbackUrl" VARCHAR(500)`,
  },
  {
    label: 'Recording.thumbnailAttribution VARCHAR(500)?',
    sql: `ALTER TABLE "Recording"
            ADD COLUMN IF NOT EXISTS "thumbnailAttribution" VARCHAR(500)`,
  },
  {
    label: 'Recording.isActive BOOL default TRUE',
    sql: `ALTER TABLE "Recording"
            ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE`,
  },
  {
    label: 'Recording.lastCheckedAt TIMESTAMP(3)?',
    sql: `ALTER TABLE "Recording"
            ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3)`,
  },
  {
    label: 'Recording.lastStatus VARCHAR(20)?',
    sql: `ALTER TABLE "Recording"
            ADD COLUMN IF NOT EXISTS "lastStatus" VARCHAR(20)`,
  },
  // --- Step 3: add the supporting indexes.
  {
    label: 'Recording_isActive_lastCheckedAt_idx',
    sql: `CREATE INDEX IF NOT EXISTS "Recording_isActive_lastCheckedAt_idx"
            ON "Recording"("isActive", "lastCheckedAt")`,
  },
  {
    label: 'Recording_license_idx',
    sql: `CREATE INDEX IF NOT EXISTS "Recording_license_idx"
            ON "Recording"("license")`,
  },
  {
    label: 'Recording_sourceType_idx',
    sql: `CREATE INDEX IF NOT EXISTS "Recording_sourceType_idx"
            ON "Recording"("sourceType")`,
  },
];

async function main() {
  console.log('▶ Catalog v2.1 migration');
  for (const step of STEPS) {
    process.stdout.write(`  · ${step.label} … `);
    try {
      await prisma.$executeRawUnsafe(step.sql);
      console.log('OK');
    } catch (err) {
      console.log('FAIL');
      throw err;
    }
  }

  // Verify by introspecting information_schema.
  const cols = await prisma.$queryRawUnsafe<
    Array<{ column_name: string; data_type: string }>
  >(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Recording'
        AND column_name IN (
          'sourceType','license','sourceAttribution','fallbackUrl',
          'thumbnailAttribution','isActive','lastCheckedAt','lastStatus'
        )
      ORDER BY column_name;`,
  );

  console.log('\n✅ All statements applied.');
  console.log('\nRecording new columns:');
  for (const c of cols) {
    console.log(`  · ${c.column_name.padEnd(28)} ${c.data_type}`);
  }

  const idx = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
    `SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'Recording'
        AND indexname IN (
          'Recording_isActive_lastCheckedAt_idx',
          'Recording_license_idx',
          'Recording_sourceType_idx'
        )
      ORDER BY indexname;`,
  );
  console.log('\nNew indexes:');
  for (const i of idx) {
    console.log(`  · ${i.indexname}`);
  }

  console.log('\nNext steps:');
  console.log('  1. npx prisma generate           — refresh the typed client');
  console.log('  2. npx ts-node scripts/seed-recordings.ts — populate v2.1 fields');
  console.log('  3. npx ts-node scripts/orchestrate-bunny.ts — mirror Pexels to Bunny');
  console.log('  4. npx ts-node scripts/health-check.ts     — flip isActive from probe results');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

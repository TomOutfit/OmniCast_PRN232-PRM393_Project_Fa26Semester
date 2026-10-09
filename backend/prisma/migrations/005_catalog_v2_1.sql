-- ============================================================
-- 005_catalog_v2_1.sql
-- Catalog v2.1 — adds the licensing / fallback-chain columns to
-- the `Recording` table. Required by the Studio publish-gate and
-- the mobile player fallback chain.
--
-- Idempotent: every statement is `IF NOT EXISTS` (or wrapped in
-- a DO block) so the file is safe to re-run on a partially-
-- migrated DB. The script-level wrapper `prisma/apply-migration-
-- v2-1.ts` runs each step in order and prints a verification
-- report at the end.
-- ============================================================

-- Step 1 — create the v2.1 enum types if they don't exist yet.
-- The original migration set (001_init.sql … 004_*.sql) ran
-- before the v2.1 schema was designed, so the enums are missing
-- from the live DB even though Prisma's generated client knows
-- about them.
DO $$ BEGIN
  CREATE TYPE "StreamSourceType" AS ENUM (
    'YOUTUBE_EMBED', 'PEXELS', 'ARCHIVE_ORG', 'BLENDER_CC',
    'GOOGLE_SAMPLE', 'W3_SAMPLE', 'SAMPLELIB', 'CLOUDINARY_DEMO',
    'MUX_TEST', 'UNIFIED_TEST', 'BUNNY_CDN', 'UPLOADED_LOCAL',
    'TMDB_TRAILER', 'YOUTUBE_DIRECT', 'VIMEO', 'TWITCH'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ContentLicense" AS ENUM (
    'PEXELS_LICENSE', 'CC0_PUBLIC_DOMAIN', 'CC_BY_3', 'CC_BY_4',
    'BLENDER_OPEN_MOVIE', 'BUNNY_SELF_HOSTED', 'DEMO_PRODUCTION_OK',
    'DEV_ONLY_TEST_FIXTURE', 'UNKNOWN'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Step 2 — add the columns to Recording.
ALTER TABLE "Recording"
  ADD COLUMN IF NOT EXISTS "sourceType" "StreamSourceType";

ALTER TABLE "Recording"
  ADD COLUMN IF NOT EXISTS "license" "ContentLicense" NOT NULL DEFAULT 'UNKNOWN';

ALTER TABLE "Recording"
  ADD COLUMN IF NOT EXISTS "sourceAttribution" VARCHAR(500);

ALTER TABLE "Recording"
  ADD COLUMN IF NOT EXISTS "fallbackUrl" VARCHAR(500);

ALTER TABLE "Recording"
  ADD COLUMN IF NOT EXISTS "thumbnailAttribution" VARCHAR(500);

ALTER TABLE "Recording"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "Recording"
  ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3);

ALTER TABLE "Recording"
  ADD COLUMN IF NOT EXISTS "lastStatus" VARCHAR(20);

-- Step 3 — add the supporting indexes for the EPG filler and
-- Studio picker.
CREATE INDEX IF NOT EXISTS "Recording_isActive_lastCheckedAt_idx"
  ON "Recording"("isActive", "lastCheckedAt");

CREATE INDEX IF NOT EXISTS "Recording_license_idx"
  ON "Recording"("license");

CREATE INDEX IF NOT EXISTS "Recording_sourceType_idx"
  ON "Recording"("sourceType");

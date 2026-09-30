-- ============================================================
-- 003_live_event_reactions.sql
-- Extend the existing `Reaction` table so it can target either a
-- `Recording` (current behaviour) or a `LiveEvent` (new). The two
-- foreign-key columns are nullable; a CHECK constraint guarantees at
-- least one is set so we never store orphan reactions.
-- ============================================================

-- Drop the old strict unique constraint that referenced `recordingId`.
ALTER TABLE "Reaction" DROP CONSTRAINT IF EXISTS "Reaction_userId_recordingId_type_key";

-- Drop the old NOT NULL on recordingId.
ALTER TABLE "Reaction" ALTER COLUMN "recordingId" DROP NOT NULL;

-- Add the new nullable liveEventId column with FK.
ALTER TABLE "Reaction"
  ADD COLUMN IF NOT EXISTS "liveEventId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Reaction_liveEventId_fkey'
  ) THEN
    ALTER TABLE "Reaction"
      ADD CONSTRAINT "Reaction_liveEventId_fkey"
      FOREIGN KEY ("liveEventId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE;
  END IF;
END$$;

-- Re-create the recording unique index (allows multiple NULLs in PG).
CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_user_recording_type_unique"
  ON "Reaction" ("userId", "recordingId", "type");

-- New unique constraint for live events.
CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_user_live_event_type_unique"
  ON "Reaction" ("userId", "liveEventId", "type");

-- Index for the live-event query path.
CREATE INDEX IF NOT EXISTS "Reaction_liveEventId_idx"
  ON "Reaction" ("liveEventId");

-- Guard against orphan reactions (exactly one target must be set).
ALTER TABLE "Reaction"
  DROP CONSTRAINT IF EXISTS "Reaction_target_check";

ALTER TABLE "Reaction"
  ADD CONSTRAINT "Reaction_target_check"
  CHECK (
    ("recordingId" IS NOT NULL AND "liveEventId" IS NULL)
    OR ("recordingId" IS NULL AND "liveEventId" IS NOT NULL)
  );

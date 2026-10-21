-- ============================================================
-- 011_comment_live_event.sql
-- Adds `liveEventId` column on `Comment` so live stream comments
-- attach directly to `LiveEvent` instead of being jumbled into
-- recordings.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.
-- ============================================================

ALTER TABLE "Comment"
  ADD COLUMN IF NOT EXISTS "liveEventId" UUID;

CREATE INDEX IF NOT EXISTS "idx_comment_live_event"
  ON "Comment" ("liveEventId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Comment_liveEventId_fkey'
  ) THEN
    ALTER TABLE "Comment"
      ADD CONSTRAINT "Comment_liveEventId_fkey"
      FOREIGN KEY ("liveEventId")
      REFERENCES "LiveEvent"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION;
  END IF;
END $$;

-- ============================================================
-- 004_watchlist_and_curator.sql
-- Adds Watchlist and AiCuratorReport tables and fixes liveEventId UUID FK on Reaction
-- ============================================================

ALTER TABLE "Reaction" DROP CONSTRAINT IF EXISTS "Reaction_userId_recordingId_type_key";
ALTER TABLE "Reaction" ALTER COLUMN "recordingId" DROP NOT NULL;
ALTER TABLE "Reaction" DROP COLUMN IF EXISTS "liveEventId" CASCADE;
ALTER TABLE "Reaction" ADD COLUMN "liveEventId" UUID;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_liveEventId_fkey" FOREIGN KEY ("liveEventId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_user_recording_type_unique" ON "Reaction" ("userId", "recordingId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_user_live_event_type_unique" ON "Reaction" ("userId", "liveEventId", "type");
CREATE INDEX IF NOT EXISTS "Reaction_liveEventId_idx" ON "Reaction" ("liveEventId");
ALTER TABLE "Reaction" DROP CONSTRAINT IF EXISTS "Reaction_target_check";
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_target_check" CHECK (
  ("recordingId" IS NOT NULL AND "liveEventId" IS NULL) OR
  ("recordingId" IS NULL AND "liveEventId" IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS "Watchlist" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "programId" UUID NOT NULL,
  "channelId" UUID,
  "note" VARCHAR(500),
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Watchlist_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE,
  CONSTRAINT "Watchlist_userId_programId_key" UNIQUE ("userId", "programId")
);
CREATE INDEX IF NOT EXISTS "Watchlist_userId_addedAt_idx" ON "Watchlist"("userId", "addedAt");
CREATE INDEX IF NOT EXISTS "Watchlist_programId_idx" ON "Watchlist"("programId");

CREATE TABLE IF NOT EXISTS "AiCuratorReport" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "programId" UUID NOT NULL,
  "broadcastSuitability" VARCHAR(20) NOT NULL,
  "suggestedTimeSlot" VARCHAR(100) NOT NULL,
  "targetAudienceVibe" VARCHAR(500) NOT NULL,
  "riskWarnings" VARCHAR(1000) NOT NULL,
  "sentimentAnalysis" JSONB NOT NULL,
  "complianceAssessment" JSONB NOT NULL,
  "aiModelVersion" VARCHAR(100) NOT NULL,
  "tokenUsed" INTEGER,
  "processingTimeMs" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiCuratorReport_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE,
  CONSTRAINT "AiCuratorReport_programId_createdAt_key" UNIQUE ("programId", "createdAt")
);
CREATE INDEX IF NOT EXISTS "AiCuratorReport_programId_createdAt_idx" ON "AiCuratorReport"("programId", "createdAt");

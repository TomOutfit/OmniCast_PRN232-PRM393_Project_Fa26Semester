-- ============================================================
-- OmniCast Migration 002 — External Ingest Sources
-- Adds Twitch broadcaster mapping + YouTube channel mapping to LiveChannel
-- Adds idempotency unique constraint to LiveEvent
-- ============================================================

-- 1. LiveChannel: add ingest source mapping columns
ALTER TABLE "LiveChannel"
  ADD COLUMN IF NOT EXISTS "twitchBroadcasterId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "youtubeChannelId" VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_live_channel_twitch ON "LiveChannel"("twitchBroadcasterId");
CREATE INDEX IF NOT EXISTS idx_live_channel_youtube ON "LiveChannel"("youtubeChannelId");

-- 2. LiveEvent: idempotency for ingest workers
-- NULL values are not considered equal in PostgreSQL unique indexes,
-- so multiple events with NULL externalId on the same channel+platform remain allowed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_live_event_channel_platform_external
  ON "LiveEvent" ("channelId", "externalPlatform", "externalId");

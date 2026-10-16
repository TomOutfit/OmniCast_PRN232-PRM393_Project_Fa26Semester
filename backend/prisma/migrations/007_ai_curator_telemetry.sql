-- ============================================================
-- 007_ai_curator_telemetry.sql
-- Adds two columns used by AiCuratorService telemetry:
--   1. `LiveEvent.lastAppliedAt` — timestamp of the last
--      `applyCuration()` call against this event. Enables cooldown
--      windows on the curator UI ("recently curated" badges) and
--      dashboards slicing by recency.
--   2. `AiCuratorReport.cached` + `AiCuratorReport.cachedAt` —
--      mirrors the in-memory `cached` flag the service returns to
--      clients. Used by `AiCuratorStatsService.computeCacheHitRate`
--      to compute a real cache hit rate (was previously hard-coded
--      to 0 because the column didn't exist).
--
-- Both ALTER TABLE statements use `ADD COLUMN IF NOT EXISTS` so the
-- migration is idempotent and safe to re-run on a partially-migrated
-- instance.
-- ============================================================

-- ----- 1. LiveEvent.lastAppliedAt ---------------------------------
ALTER TABLE "LiveEvent"
  ADD COLUMN IF NOT EXISTS "lastAppliedAt" TIMESTAMP(6);

CREATE INDEX IF NOT EXISTS "idx_live_event_last_applied_at"
  ON "LiveEvent" ("lastAppliedAt");

-- ----- 2. AiCuratorReport.cached + cachedAt ------------------------
ALTER TABLE "AiCuratorReport"
  ADD COLUMN IF NOT EXISTS "cached"   BOOLEAN         DEFAULT false;

ALTER TABLE "AiCuratorReport"
  ADD COLUMN IF NOT EXISTS "cachedAt" TIMESTAMP(6);

CREATE INDEX IF NOT EXISTS "idx_ai_curator_report_cached"
  ON "AiCuratorReport" ("cached");

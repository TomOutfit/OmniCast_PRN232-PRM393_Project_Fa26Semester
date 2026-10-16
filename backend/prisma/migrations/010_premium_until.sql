-- ============================================================
-- 010_premium_until.sql
-- Adds the `premiumUntil` column on `User` so the mobile VIP
-- subscription can grant time-boxed server-side entitlement.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.
-- ============================================================

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "premiumUntil" TIMESTAMP;

CREATE INDEX IF NOT EXISTS "idx_user_premium_until"
  ON "User" ("premiumUntil");

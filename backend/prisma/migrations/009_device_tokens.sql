-- ============================================================
-- 009_device_tokens.sql
-- Stores mobile FCM device tokens so the backend can push to
-- users on Android (FCM) and iOS (APNs-via-FCM).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DevicePlatform') THEN
    CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "DeviceToken" (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"    UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token       VARCHAR(500) UNIQUE NOT NULL,
  platform    "DevicePlatform" NOT NULL DEFAULT 'ANDROID',
  "appVersion" VARCHAR(50),
  "deviceName" VARCHAR(120),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_device_token_user"
  ON "DeviceToken" ("userId");

CREATE INDEX IF NOT EXISTS "idx_device_token_updated"
  ON "DeviceToken" ("updatedAt");

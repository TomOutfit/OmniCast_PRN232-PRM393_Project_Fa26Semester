-- ============================================================
-- 006_newsletter_subscribers.sql
-- Adds the `NewsletterSubscriber` table backing the footer
-- email signup form. Idempotent: uses IF NOT EXISTS so it's
-- safe to re-run on a partially-migrated DB.
-- ============================================================

-- Step 1 — Create the table
CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
  "id"                  UUID            NOT NULL DEFAULT uuid_generate_v4(),
  "email"               VARCHAR(255)    NOT NULL,
  "userId"              UUID,
  "topics"              TEXT[]          NOT NULL DEFAULT ARRAY['weekly_schedule']::TEXT[],
  "locale"              VARCHAR(10)     NOT NULL DEFAULT 'vi',
  "isConfirmed"         BOOLEAN         NOT NULL DEFAULT false,
  "confirmedAt"         TIMESTAMP(6),
  "unsubscribeToken"    VARCHAR(64)     UNIQUE,
  "unsubscribedAt"      TIMESTAMP(6),
  "source"              VARCHAR(50),
  "lastSentAt"          TIMESTAMP(6),
  "ipAddress"           VARCHAR(50),
  "userAgent"           VARCHAR(500),
  "createdAt"           TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- Step 2 — Indexes (match schema.prisma @@index hints)
CREATE INDEX IF NOT EXISTS "idx_newsletter_email"        ON "NewsletterSubscriber" ("email");
CREATE INDEX IF NOT EXISTS "idx_newsletter_user"         ON "NewsletterSubscriber" ("userId");
CREATE INDEX IF NOT EXISTS "idx_newsletter_unsubscribed" ON "NewsletterSubscriber" ("unsubscribedAt");

-- Step 3 — Optional FK to User (loose, ON DELETE SET NULL so that
-- removing a user account doesn't take their newsletter row with it).
DO $$ BEGIN
  ALTER TABLE "NewsletterSubscriber"
    ADD CONSTRAINT "NewsletterSubscriber_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Step 4 — updatedAt trigger so the column is bumped automatically
-- on UPDATE. Mirrors the trigger pattern used by other tables.
CREATE OR REPLACE FUNCTION "NewsletterSubscriber_set_updatedAt"()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "NewsletterSubscriber_updatedAt_trigger"
  ON "NewsletterSubscriber";

CREATE TRIGGER "NewsletterSubscriber_updatedAt_trigger"
  BEFORE UPDATE ON "NewsletterSubscriber"
  FOR EACH ROW
  EXECUTE FUNCTION "NewsletterSubscriber_set_updatedAt"();

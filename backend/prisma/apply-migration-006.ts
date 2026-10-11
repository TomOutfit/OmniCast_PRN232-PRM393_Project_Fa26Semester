// ============================================================
// apply-migration-006.ts
// Applies the NewsletterSubscriber migration to the live DB.
// Run once after pulling the migration:
//
//   cd backend
//   npx ts-node prisma/apply-migration-006.ts
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
  {
    label: 'Table NewsletterSubscriber',
    sql: `CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
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
          );`,
  },
  {
    label: 'Index idx_newsletter_email',
    sql: `CREATE INDEX IF NOT EXISTS "idx_newsletter_email"
            ON "NewsletterSubscriber" ("email");`,
  },
  {
    label: 'Index idx_newsletter_user',
    sql: `CREATE INDEX IF NOT EXISTS "idx_newsletter_user"
            ON "NewsletterSubscriber" ("userId");`,
  },
  {
    label: 'Index idx_newsletter_unsubscribed',
    sql: `CREATE INDEX IF NOT EXISTS "idx_newsletter_unsubscribed"
            ON "NewsletterSubscriber" ("unsubscribedAt");`,
  },
  {
    label: 'FK NewsletterSubscriber.userId -> User.id',
    sql: `DO $$ BEGIN
            ALTER TABLE "NewsletterSubscriber"
              ADD CONSTRAINT "NewsletterSubscriber_userId_fkey"
              FOREIGN KEY ("userId")
              REFERENCES "User"("id")
              ON DELETE SET NULL
              ON UPDATE NO ACTION;
          EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  },
  {
    label: 'updatedAt trigger function',
    sql: `CREATE OR REPLACE FUNCTION "NewsletterSubscriber_set_updatedAt"()
            RETURNS TRIGGER AS $func$
            BEGIN
              NEW."updatedAt" = CURRENT_TIMESTAMP;
              RETURN NEW;
            END;
            $func$ LANGUAGE plpgsql;`,
  },
  {
    label: 'updatedAt trigger',
    sql: `DROP TRIGGER IF EXISTS "NewsletterSubscriber_updatedAt_trigger"
            ON "NewsletterSubscriber";
          CREATE TRIGGER "NewsletterSubscriber_updatedAt_trigger"
            BEFORE UPDATE ON "NewsletterSubscriber"
            FOR EACH ROW
            EXECUTE FUNCTION "NewsletterSubscriber_set_updatedAt"();`,
  },
];

async function main() {
  for (const step of STEPS) {
    console.log('▶', step.label);
    await prisma.$executeRawUnsafe(step.sql);
  }
  console.log('\n✅ Migration 006 applied.\n');

  // Verification report — proves the schema is correct.
  const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'NewsletterSubscriber'
       ORDER BY ordinal_position;`,
  );
  console.log('NewsletterSubscriber columns:');
  for (const c of cols) console.log('  -', c.column_name);

  const idx = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
    `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename  = 'NewsletterSubscriber'
       ORDER BY indexname;`,
  );
  console.log('\nNewsletterSubscriber indexes:');
  for (const i of idx) console.log('  -', i.indexname);

  const count = await prisma.newsletterSubscriber.count();
  console.log(`\nCurrent row count: ${count}`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

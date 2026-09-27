// Apply migration 002 by splitting the SQL into individual statements
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATEMENTS = [
  `ALTER TABLE "LiveChannel"
     ADD COLUMN IF NOT EXISTS "twitchBroadcasterId" VARCHAR(100)`,
  `ALTER TABLE "LiveChannel"
     ADD COLUMN IF NOT EXISTS "youtubeChannelId" VARCHAR(100)`,
  `CREATE INDEX IF NOT EXISTS idx_live_channel_twitch
     ON "LiveChannel"("twitchBroadcasterId")`,
  `CREATE INDEX IF NOT EXISTS idx_live_channel_youtube
     ON "LiveChannel"("youtubeChannelId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_live_event_channel_platform_external
     ON "LiveEvent" ("channelId", "externalPlatform", "externalId")`,
];

async function main() {
  for (const sql of STATEMENTS) {
    const tag = sql.split('\n')[0].trim().slice(0, 70);
    console.log('▶', tag);
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('\n✅ All migration statements applied.');

  // Verify
  const cols = await prisma.$queryRawUnsafe<Array<{column_name: string}>>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='LiveChannel'
       AND column_name IN ('twitchBroadcasterId','youtubeChannelId')
     ORDER BY column_name;`,
  );
  console.log('LiveChannel new columns:', cols.map((c) => c.column_name));

  const idx = await prisma.$queryRawUnsafe<Array<{indexname: string}>>(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname='public' AND tablename='LiveEvent'
       AND indexname='uq_live_event_channel_platform_external';`,
  );
  console.log('Unique index:', idx[0]?.indexname ?? 'MISSING');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

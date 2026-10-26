import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('▶ Adding walletBalance to "User" table...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "walletBalance" BIGINT DEFAULT 0;
  `);

  console.log('▶ Creating "StreamDonation" table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StreamDonation" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "eventId" UUID REFERENCES "LiveEvent"("id") ON DELETE SET NULL,
      "donorId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
      "donorName" VARCHAR(255) NOT NULL,
      "streamerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "amount" INT NOT NULL,
      "paymentMethod" VARCHAR(50) NOT NULL,
      "giftEmoji" VARCHAR(10) NOT NULL DEFAULT '🎉',
      "giftTier" VARCHAR(100),
      "message" VARCHAR(500),
      "qrPayload" VARCHAR(1000),
      "transferSyntax" VARCHAR(100),
      "isSandbox" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(6) NOT NULL DEFAULT now()
    );
  `);

  console.log('▶ Creating indexes for StreamDonation...');
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_stream_donation_streamer" ON "StreamDonation"("streamerId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_stream_donation_event" ON "StreamDonation"("eventId");
  `);

  console.log('✅ Migration applied successfully.');

  // Verify
  const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string; data_type: string }>>(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'walletBalance';`
  );
  console.log('User walletBalance column:', cols);

  const donationCols = await prisma.$queryRawUnsafe<Array<{ column_name: string; data_type: string }>>(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'StreamDonation' ORDER BY column_name;`
  );
  console.log('StreamDonation columns:', donationCols.map(c => `${c.column_name} (${c.data_type})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

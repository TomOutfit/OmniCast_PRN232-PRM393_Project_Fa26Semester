CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "StreamDonation" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "eventId" UUID,
  "donorId" UUID,
  "donorName" VARCHAR(255) NOT NULL,
  "streamerId" UUID NOT NULL,
  "amount" INTEGER NOT NULL,
  "paymentMethod" VARCHAR(50) NOT NULL,
  "paymentStatus" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  "payosOrderCode" INTEGER,
  "payosPaymentLinkId" VARCHAR(100),
  "payosCheckoutUrl" VARCHAR(1000),
  "payosStatusTokenHash" VARCHAR(64),
  "giftEmoji" VARCHAR(10) NOT NULL DEFAULT '🎉',
  "giftTier" VARCHAR(100),
  "message" VARCHAR(500),
  "qrPayload" VARCHAR(1000),
  "transferSyntax" VARCHAR(100),
  "isSandbox" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'LiveEvent') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public' AND constraint_name = 'StreamDonation_eventId_fkey'
    ) THEN
      ALTER TABLE "StreamDonation"
        ADD CONSTRAINT "StreamDonation_eventId_fkey"
        FOREIGN KEY ("eventId") REFERENCES "LiveEvent"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public' AND constraint_name = 'StreamDonation_donorId_fkey'
    ) THEN
      ALTER TABLE "StreamDonation"
        ADD CONSTRAINT "StreamDonation_donorId_fkey"
        FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public' AND constraint_name = 'StreamDonation_streamerId_fkey'
    ) THEN
      ALTER TABLE "StreamDonation"
        ADD CONSTRAINT "StreamDonation_streamerId_fkey"
        FOREIGN KEY ("streamerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
  END IF;
END $$;

ALTER TABLE "StreamDonation"
  ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS "payosOrderCode" INTEGER,
  ADD COLUMN IF NOT EXISTS "payosPaymentLinkId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "payosCheckoutUrl" VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS "payosStatusTokenHash" VARCHAR(64);

CREATE INDEX IF NOT EXISTS "idx_stream_donation_streamer" ON "StreamDonation" ("streamerId");
CREATE INDEX IF NOT EXISTS "idx_stream_donation_event" ON "StreamDonation" ("eventId");

CREATE UNIQUE INDEX IF NOT EXISTS "StreamDonation_payosOrderCode_key"
  ON "StreamDonation" ("payosOrderCode");

CREATE UNIQUE INDEX IF NOT EXISTS "StreamDonation_payosStatusTokenHash_key"
  ON "StreamDonation" ("payosStatusTokenHash");

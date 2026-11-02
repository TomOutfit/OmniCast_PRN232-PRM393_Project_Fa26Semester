ALTER TABLE "StreamDonation"
  ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS "payosOrderCode" INTEGER,
  ADD COLUMN IF NOT EXISTS "payosPaymentLinkId" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "payosCheckoutUrl" VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS "payosStatusTokenHash" VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS "StreamDonation_payosOrderCode_key"
  ON "StreamDonation" ("payosOrderCode");

CREATE UNIQUE INDEX IF NOT EXISTS "StreamDonation_payosStatusTokenHash_key"
  ON "StreamDonation" ("payosStatusTokenHash");

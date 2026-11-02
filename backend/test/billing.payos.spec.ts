import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import { BillingService } from '../src/billing/billing.service';

test('PayOS webhook credits a donation once and broadcasts it once', async () => {
  const checksumKey = 'test-checksum-key';
  const paymentData = { amount: 10000, code: '00', orderCode: 123456789 };
  const signature = createHmac('sha256', checksumKey)
    .update('amount=10000&code=00&orderCode=123456789')
    .digest('hex');
  const donation = {
    id: 'donation-1',
    amount: paymentData.amount,
    streamerId: 'streamer-1',
    eventId: 'event-1',
    paymentStatus: 'PENDING',
    donorId: 'donor-1',
    donorName: 'Viewer',
    giftEmoji: '🎉',
    giftTier: 'Super Chat',
    message: 'Hello',
    createdAt: new Date(),
  };
  let walletBalance = 0;
  let broadcasts = 0;
  const prisma = {
    streamDonation: {
      findUnique: async () => ({ ...donation }),
    },
    $transaction: async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        streamDonation: {
          updateMany: async () => {
            if (donation.paymentStatus !== 'PENDING') return { count: 0 };
            donation.paymentStatus = 'COMPLETED';
            return { count: 1 };
          },
        },
        user: {
          update: async () => {
            walletBalance += donation.amount;
            return { id: donation.streamerId, fullName: 'Streamer', walletBalance: BigInt(walletBalance) };
          },
        },
        notification: { create: async () => undefined },
        auditLog: { create: async () => undefined },
      }),
  };
  const config = {
    get: (key: string) => key === 'PAYOS_CHECKSUM_KEY' ? checksumKey : 'test',
  };
  const gateway = {
    notifyDonationReceived: () => { broadcasts += 1; },
  };
  const service = new BillingService(prisma as any, config as any, gateway as any);
  const webhook = {
    code: '00',
    success: true,
    data: paymentData,
    signature,
  };

  const first = await service.handlePayosWebhook(webhook);
  const duplicate = await service.handlePayosWebhook(webhook);

  assert.equal(first.status, 'COMPLETED');
  assert.equal(duplicate.status, 'COMPLETED');
  assert.equal(walletBalance, 10000);
  assert.equal(broadcasts, 1);
});

import { PrismaClient } from '@prisma/client';
import { BillingService } from '../src/billing/billing.service';
import { ConfigService } from '@nestjs/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Starting Sandbox Live Donation Integration Test...');

  // 1. Pick a live event
  const event = await prisma.liveEvent.findFirst({
    include: {
      channel: {
        include: { owner: true }
      }
    }
  });

  if (!event) {
    throw new Error('No live event found to test with.');
  }

  const streamer = event.channel?.owner;
  if (!streamer) {
    throw new Error('Live event has no channel owner.');
  }

  console.log(`📡 Selected Event: "${event.title}" (ID: ${event.id})`);
  console.log(`🎙️ Streamer / Creator: "${streamer.fullName}" (ID: ${streamer.id}, Email: ${streamer.email})`);

  const initialBalance = Number((streamer as any).walletBalance ?? 0);
  console.log(`💰 Streamer Initial Virtual Balance: ${initialBalance.toLocaleString('vi-VN')} ₫`);

  // Mock gateway for service test
  const mockGateway: any = {
    notifyDonationReceived: (payload: any) => {
      console.log('🔔 [WebSocket Broadcast] live:donation:received emitted:', {
        amount: payload.amount,
        donor: payload.donorName,
        streamer: payload.streamerName,
        balance: payload.streamerWalletBalance
      });
    }
  };

  const configService = new ConfigService();
  const billingService = new BillingService(prisma as any, configService, mockGateway);

  // 2. Test getStreamerPaymentInfo
  console.log('\n🔍 Testing getStreamerPaymentInfo...');
  const paymentInfo = await billingService.getStreamerPaymentInfo(event.id);
  console.log('Payment Info Result:', {
    streamerName: paymentInfo.streamerName,
    bankName: paymentInfo.bankName,
    bankAccount: paymentInfo.bankAccount,
    accountHolder: paymentInfo.accountHolder,
    syntax: paymentInfo.transferSyntax,
  });

  // 3. Test 4 Sandbox payment methods donation:
  const testAmounts = [
    { method: 'momo', amount: 50000, emoji: '🍕', tier: 'Pizza tiệc tùng' },
    { method: 'vnpay', amount: 100000, emoji: '🎆', tier: 'Pháo hoa VIP' },
    { method: 'zalopay', amount: 20000, emoji: '🧋', tier: 'Trà sữa' },
    { method: 'card', amount: 200000, emoji: '🚀', tier: 'Tên lửa siêu cấp' },
  ];

  let accumulated = 0;
  for (const item of testAmounts) {
    console.log(`\n💸 Testing Sandbox Donation via ${item.method.toUpperCase()} (${item.amount.toLocaleString('vi-VN')} ₫)...`);
    const donationRes = await billingService.processSandboxDonation({
      eventId: event.id,
      donorName: `Khán giả Test ${item.method.toUpperCase()}`,
      amount: item.amount,
      paymentMethod: item.method,
      giftEmoji: item.emoji,
      giftTier: item.tier,
      message: `Ủng hộ qua cổng ${item.method.toUpperCase()} Sandbox!`,
    });

    console.log(`✅ Result: ${donationRes.notification}`);
    console.log(`   Streamer new balance returned: ${donationRes.streamer.walletBalance.toLocaleString('vi-VN')} ₫`);
    accumulated += item.amount;
  }

  // 4. Verify in DB directly
  const refreshedStreamer = await prisma.user.findUnique({
    where: { id: streamer.id },
  });
  const expectedBalance = initialBalance + accumulated;
  const actualBalance = Number((refreshedStreamer as any)?.walletBalance ?? 0);

  console.log(`\n📊 Verification:`);
  console.log(`   Initial Balance:  ${initialBalance.toLocaleString('vi-VN')} ₫`);
  console.log(`   Total Donated:    +${accumulated.toLocaleString('vi-VN')} ₫`);
  console.log(`   Expected Balance: ${expectedBalance.toLocaleString('vi-VN')} ₫`);
  console.log(`   Actual DB Balance: ${actualBalance.toLocaleString('vi-VN')} ₫`);

  if (actualBalance === expectedBalance) {
    console.log('🎉 SUCCESS: Streamer account was correctly credited with simulated funds!');
  } else {
    throw new Error(`Balance mismatch: expected ${expectedBalance}, got ${actualBalance}`);
  }

  // 5. Test getUserWallet
  console.log('\n💼 Testing getUserWallet for Streamer...');
  const wallet = await billingService.getUserWallet(streamer.id);
  console.log('Wallet Summary:', {
    streamer: wallet.fullName,
    walletBalance: wallet.walletBalance.toLocaleString('vi-VN') + ' ₫',
    totalReceived: wallet.stats.totalReceivedVnd.toLocaleString('vi-VN') + ' ₫',
    receivedCount: wallet.stats.receivedCount,
    latestDonations: wallet.receivedDonations
      .slice(0, 4)
      .map(
        (d: any) =>
          `${d.donorName}: ${d.amount.toLocaleString('vi-VN')}đ via ${d.paymentMethod}`,
      ),
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

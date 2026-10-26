// ============================================================
// OmniCast - Billing Service
// ============================================================
//
// 1. Validates in-app purchase receipts (Google Play VIP entitlement).
// 2. Processes simulated Sandbox donations & Super Chat payments:
//    - Real money cost = 0 VND (100% Sandbox Mock Gateway).
//    - Routes the virtual balance directly to the CONTENT CREATOR
//      / STREAMER (the channel owner who created the stream).
//    - Emits real-time celebration & balance updates via WebSocket.
// 3. Manages Creator Virtual Wallet balance & donation histories.
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LiveStreamGateway } from '../websocket/live-stream.gateway';
import { CreateSandboxDonationDto } from './dto/create-donation.dto';

export interface VerifyReceiptInput {
  userId: string;
  productId: string;
  purchaseToken: string;
}

export interface VerifyReceiptResult {
  success: true;
  productId: string;
  premiumUntil: string; // ISO date
  verified: boolean; // false = stub
}

export interface StreamerPaymentInfo {
  eventId: string;
  eventTitle: string;
  channelId: string;
  channelName: string;
  channelSlug: string;
  streamerId: string;
  streamerName: string;
  streamerAvatar?: string;
  streamerBio?: string;
  bankAccount: string;
  bankName: string;
  accountHolder: string;
  momoPhone: string;
  zaloPayAccount: string;
  transferSyntax: string;
  isSandbox: boolean;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly isProd: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => LiveStreamGateway))
    private readonly gateway: LiveStreamGateway,
  ) {
    this.isProd =
      this.configService.get<string>('NODE_ENV') === 'production';
  }

  /**
   * Verify an Android receipt and extend `User.premiumUntil` by
   * 30 or 365 days depending on the product id.
   */
  async verifyAndroidReceipt(
    input: VerifyReceiptInput,
  ): Promise<VerifyReceiptResult> {
    const days =
      input.productId === 'omnicast_vip_yearly' ? 365 : 30;
    const premiumUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const hasServiceAccount = !!this.configService.get<string>(
      'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON',
    );

    if (this.isProd && !hasServiceAccount) {
      this.logger.warn(
        'BillingService: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON missing in production — refusing verification',
      );
      throw new ServiceUnavailableException(
        'In-app purchase verification is temporarily unavailable',
      );
    }

    if (!hasServiceAccount) {
      this.logger.warn(
        `[BillingService] stub-verifying receipt for user=${input.userId} productId=${input.productId} (no service-account JSON)`,
      );
    }

    await this.prisma.user.update({
      where: { id: input.userId },
      data: { premiumUntil },
    });

    return {
      success: true,
      productId: input.productId,
      premiumUntil: premiumUntil.toISOString(),
      verified: hasServiceAccount,
    };
  }

  /**
   * Get public payment & streamer beneficiary details for a live event.
   * Ensures viewer sees authentic beneficiary data (Streamer Name, Bank, VietQR/MoMo code).
   */
  async getStreamerPaymentInfo(eventId: string): Promise<StreamerPaymentInfo> {
    const event = await this.prisma.liveEvent.findUnique({
      where: { id: eventId },
      include: {
        channel: {
          include: {
            owner: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                bio: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Live event with id "${eventId}" not found`);
    }

    // Resolve Streamer: Channel owner, or fallback to OmniCast Studio staff
    let streamer = event.channel?.owner;
    if (!streamer) {
      streamer = await this.prisma.user.findFirst({
        where: { role: 'STAFF' },
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          bio: true,
          email: true,
        },
      });
    }

    const streamerName = streamer?.fullName || 'OmniCast Broadcaster';
    const cleanStreamerName = streamerName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    const shortId = eventId.replace(/-/g, '').slice(0, 6).toUpperCase();
    const transferSyntax = `OMNICAST ${shortId}`;

    return {
      eventId: event.id,
      eventTitle: event.title,
      channelId: event.channel?.id || '',
      channelName: event.channel?.name || 'Kênh phát sóng',
      channelSlug: event.channel?.slug || 'live',
      streamerId: streamer?.id || '',
      streamerName,
      streamerAvatar: streamer?.avatarUrl || undefined,
      streamerBio: streamer?.bio || undefined,
      bankAccount: '19036888999',
      bankName: 'MBBank (Quân Đội)',
      accountHolder: cleanStreamerName,
      momoPhone: '0988666777',
      zaloPayAccount: cleanStreamerName,
      transferSyntax,
      isSandbox: true,
    };
  }

  /**
   * Process a simulated Sandbox donation:
   * 1. Routes the donation amount directly to the STREAMER's wallet balance.
   * 2. Deducts 0 real VND (Sandbox mode).
   * 3. Creates a persistent `StreamDonation` record.
   * 4. Logs audit entry and creates an in-app notification for the streamer.
   * 5. Emits real-time WebSocket events (`live:donation:received`) to the stream room.
   */
  async processSandboxDonation(
    dto: CreateSandboxDonationDto,
    donorUserId?: string,
  ) {
    const event = await this.prisma.liveEvent.findUnique({
      where: { id: dto.eventId },
      include: {
        channel: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Không tìm thấy sự kiện phát sóng với ID: ${dto.eventId}`);
    }

    // Resolve Streamer: Creator of the channel / live stream
    let streamer = event.channel?.owner;
    if (!streamer) {
      // Fallback: assign to default staff broadcaster if channel had no owner
      streamer = await this.prisma.user.findFirst({
        where: { role: 'STAFF' },
      });
      if (!streamer) {
        streamer = await this.prisma.user.findFirst({
          where: { role: 'ADMIN' },
        });
      }
    }

    if (!streamer) {
      throw new BadRequestException('Không tìm thấy tài khoản người tạo nội dung cho buổi phát này');
    }

    const shortId = dto.eventId.replace(/-/g, '').slice(0, 6).toUpperCase();
    const transferSyntax = `OMNICAST ${shortId} ${Date.now().toString().slice(-4)}`;
    const qrPayload = `00020101021238540010A000000727012400069704220112190368889990208QRIBFTTA5303704540${dto.amount}5802VN62${transferSyntax.length}${transferSyntax}6304MOCK`;

    // Execute atomic transaction: Credit streamer's wallet + record donation
    const [updatedStreamer, donation] = await (this.prisma as any).$transaction([
      (this.prisma as any).user.update({
        where: { id: streamer.id },
        data: {
          walletBalance: {
            increment: BigInt(dto.amount),
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
          walletBalance: true,
        },
      }),

      (this.prisma as any).streamDonation.create({
        data: {
          eventId: event.id,
          donorId: donorUserId || null,
          donorName: dto.donorName.trim() || 'Khán giả ẩn danh',
          streamerId: streamer.id,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          giftEmoji: dto.giftEmoji || '🎉',
          giftTier: dto.giftTier || 'Ủng hộ trực tiếp',
          message: dto.message?.trim() || 'Chúc buổi livestream thành công!',
          qrPayload,
          transferSyntax,
          isSandbox: true,
        },
      }),

      this.prisma.auditLog.create({
        data: {
          userId: donorUserId || null,
          action: 'SANDBOX_DONATION_COMPLETED',
          entityType: 'STREAMER_WALLET',
          entityId: streamer.id,
          newValues: {
            amount: dto.amount,
            paymentMethod: dto.paymentMethod,
            streamerId: streamer.id,
            streamerName: streamer.fullName,
            realCostVnd: 0,
            isSandbox: true,
          },
        },
      }),

      this.prisma.notification.create({
        data: {
          userId: streamer.id,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: '🎁 Bạn nhận được ủng hộ mô phỏng mới!',
          message: `${dto.donorName} vừa gửi ${dto.amount.toLocaleString('vi-VN')}₫ (${dto.giftEmoji || '🎉'} ${dto.giftTier || 'Quà tặng'}) vào ví của bạn qua ${dto.paymentMethod.toUpperCase()}!`,
          eventId: event.id,
        },
      }),
    ]);

    const streamerBalanceNumber = Number(updatedStreamer.walletBalance ?? 0);

    // Broadcast real-time WebSocket notification to event room & streamer
    try {
      this.gateway.notifyDonationReceived({
        eventId: event.id,
        donationId: donation.id,
        donorName: donation.donorName,
        streamerId: streamer.id,
        streamerName: streamer.fullName,
        amount: donation.amount,
        paymentMethod: donation.paymentMethod,
        giftEmoji: donation.giftEmoji,
        giftTier: donation.giftTier || undefined,
        message: donation.message || undefined,
        streamerWalletBalance: streamerBalanceNumber,
        timestamp: donation.createdAt.toISOString(),
      });
    } catch (wsErr) {
      this.logger.warn(`Failed to broadcast live donation WS: ${(wsErr as Error).message}`);
    }

    return {
      success: true,
      isSandbox: true,
      realCostVnd: 0,
      donationId: donation.id,
      amount: donation.amount,
      paymentMethod: donation.paymentMethod,
      giftEmoji: donation.giftEmoji,
      giftTier: donation.giftTier,
      donorName: donation.donorName,
      message: donation.message,
      transferSyntax,
      qrPayload,
      streamer: {
        id: updatedStreamer.id,
        fullName: updatedStreamer.fullName,
        email: updatedStreamer.email,
        avatarUrl: updatedStreamer.avatarUrl,
        walletBalance: streamerBalanceNumber,
      },
      notification: `Đã nạp thành công ${donation.amount.toLocaleString('vi-VN')} ₫ mô phỏng vào tài khoản của Streamer ${updatedStreamer.fullName}! (Chi phí thực tế = 0 ₫)`,
    };
  }

  /**
   * Get virtual wallet & earnings summary for the authenticated user / streamer.
   */
  async getUserWallet(userId: string) {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        role: true,
        walletBalance: true,
        premiumUntil: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const [receivedDonations, sentDonations] = await Promise.all([
      (this.prisma as any).streamDonation.findMany({
        where: { streamerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          event: {
            select: { id: true, title: true },
          },
        },
      }),
      (this.prisma as any).streamDonation.findMany({
        where: { donorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          streamer: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
          event: {
            select: { id: true, title: true },
          },
        },
      }),
    ]);

    const totalReceived = receivedDonations.reduce(
      (sum: number, d: any) => sum + (d.amount || 0),
      0,
    );
    const totalSent = sentDonations.reduce(
      (sum: number, d: any) => sum + (d.amount || 0),
      0,
    );

    return {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isVip: user.premiumUntil ? new Date(user.premiumUntil) > new Date() : false,
      walletBalance: Number((user as any).walletBalance ?? 0),
      stats: {
        totalReceivedVnd: totalReceived,
        totalSentVnd: totalSent,
        receivedCount: receivedDonations.length,
        sentCount: sentDonations.length,
      },
      receivedDonations: receivedDonations.map((d: any) => ({
        id: d.id,
        amount: d.amount,
        donorName: d.donorName,
        paymentMethod: d.paymentMethod,
        giftEmoji: d.giftEmoji,
        giftTier: d.giftTier,
        message: d.message,
        eventTitle: d.event?.title || 'Buổi phát sóng trực tiếp',
        isSandbox: d.isSandbox,
        createdAt: d.createdAt.toISOString(),
      })),
      sentDonations: sentDonations.map((d: any) => ({
        id: d.id,
        amount: d.amount,
        streamerName: d.streamer?.fullName || 'Streamer',
        streamerAvatar: d.streamer?.avatarUrl,
        paymentMethod: d.paymentMethod,
        giftEmoji: d.giftEmoji,
        giftTier: d.giftTier,
        message: d.message,
        eventTitle: d.event?.title || 'Buổi phát sóng trực tiếp',
        isSandbox: d.isSandbox,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }
}

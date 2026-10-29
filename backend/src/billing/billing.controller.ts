// ============================================================
// OmniCast - Billing Controller
// ============================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { VerifyAndroidReceiptDto } from './dto/verify-receipt.dto';
import { CreateSandboxDonationDto } from './dto/create-donation.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('verify-android-receipt')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Verify a Google Play in-app purchase receipt and stamp `premiumUntil` on the user.',
  })
  async verifyAndroid(
    @Request() req: any,
    @Body() dto: VerifyAndroidReceiptDto,
  ) {
    return this.billing.verifyAndroidReceipt({
      userId: req.user.sub,
      productId: dto.productId,
      purchaseToken: dto.purchaseToken,
    });
  }

  @Get('event-streamer/:eventId')
  @ApiOperation({
    summary:
      'Get public payment & beneficiary info of the Streamer/Creator for a live event.',
  })
  @ApiParam({
    name: 'eventId',
    description: 'UUID of the live event',
    example: '002614cc-38b7-4711-8f01-1982acc46626',
  })
  async getStreamerPaymentInfo(@Param('eventId') eventId: string) {
    return this.billing.getStreamerPaymentInfo(eventId);
  }

  @Post('live-donation/sandbox')
  @ApiOperation({
    summary:
      'Process a 100% simulated sandbox live donation. The virtual funds are credited directly to the Streamer (content creator), with 0 real VND deducted.',
  })
  async processSandboxDonation(
    @Request() req: any,
    @Body() dto: CreateSandboxDonationDto,
  ) {
    // If request contains an authenticated user, link their user ID as donor
    let donorUserId = req.user?.sub || undefined;
    if (!donorUserId && req.headers?.authorization) {
      try {
        const token = req.headers.authorization.replace(/^Bearer\s+/i, '');
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload?.sub) donorUserId = payload.sub;
        }
      } catch (_) {}
    }
    return this.billing.processSandboxDonation(dto, donorUserId);
  }

  @Post('wallet/topup-sandbox')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Top up virtual VND into user wallet for testing sandbox donations and purchases.',
  })
  async topupSandbox(@Request() req: any, @Body() dto: { amount?: number }) {
    return this.billing.topupUserWallet(req.user.sub, dto.amount || 100000);
  }

  @Get('wallet')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Get creator virtual wallet balance, statistics, and received/sent donation records.',
  })
  async getUserWallet(@Request() req: any) {
    return this.billing.getUserWallet(req.user.sub);
  }
}

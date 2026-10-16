// ============================================================
// OmniCast - Billing Controller
// ============================================================

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { VerifyAndroidReceiptDto } from './dto/verify-receipt.dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('verify-android-receipt')
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
}

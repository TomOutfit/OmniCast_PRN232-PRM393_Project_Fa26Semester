// ============================================================
// OmniCast - Billing Receipt Verification DTOs
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export enum VipProductId {
  OMNICAST_VIP_MONTHLY = 'omnicast_vip_monthly',
  OMNICAST_VIP_YEARLY = 'omnicast_vip_yearly',
}

export class VerifyAndroidReceiptDto {
  @ApiProperty({
    example: 'omnicast_vip_monthly',
    enum: Object.values(VipProductId),
  })
  @IsString()
  productId: string;

  @ApiProperty({
    description:
      'Raw purchase token from the Google Play Developer API. In dev ' +
      'we accept a fake token; in production this is validated server-side.',
  })
  @IsString()
  purchaseToken: string;
}

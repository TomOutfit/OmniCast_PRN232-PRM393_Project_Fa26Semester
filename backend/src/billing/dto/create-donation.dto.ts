// ============================================================
// OmniCast - Create Sandbox Donation DTO
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class CreateSandboxDonationDto {
  @ApiProperty({
    description: 'UUID of the live event being watched',
    example: '002614cc-38b7-4711-8f01-1982acc46626',
  })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({
    description: 'Display name of the donor',
    example: 'Khán giả OmniCast',
  })
  @IsString()
  @IsNotEmpty()
  donorName: string;

  @ApiProperty({
    description: 'Donation amount in VND (Simulated sandbox amount)',
    example: 50000,
  })
  @IsNumber()
  @Min(1000)
  @Max(50000000)
  amount: number;

  @ApiProperty({
    description: 'Payment method chosen (1 of 4 mock apps)',
    example: 'momo',
    enum: ['momo', 'vnpay', 'zalopay', 'card'],
  })
  @IsString()
  @IsIn(['momo', 'vnpay', 'zalopay', 'card'])
  paymentMethod: string;

  @ApiProperty({
    description: 'Gift emoji icon',
    example: '🍕',
    required: false,
  })
  @IsString()
  @IsOptional()
  giftEmoji?: string;

  @ApiProperty({
    description: 'Gift tier label',
    example: 'Pizza tiệc tùng',
    required: false,
  })
  @IsString()
  @IsOptional()
  giftTier?: string;

  @ApiProperty({
    description: 'Super chat message content',
    example: 'Chúc buổi livestream thành công rực rỡ!',
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;
}

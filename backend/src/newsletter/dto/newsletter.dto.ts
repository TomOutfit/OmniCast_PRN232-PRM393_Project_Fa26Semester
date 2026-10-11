// ============================================================
// OmniCast - Newsletter DTOs
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsIn, MaxLength, IsArray } from 'class-validator';

export class SubscribeNewsletterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Topics the user wants to receive — defaults to weekly_schedule',
    type: [String],
    example: ['weekly_schedule', 'ai_curator_picks', 'studio_updates'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsIn(['vi', 'en'])
  @IsOptional()
  locale?: 'vi' | 'en';

  @ApiPropertyOptional({
    description: 'Source for analytics — footer, settings, modal, etc.',
    example: 'footer',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;
}

export class SubscribeNewsletterResponseDto {
  @ApiProperty() success: true;
  @ApiProperty({
    description: 'true if newly subscribed, false if already existed',
  })
  alreadySubscribed: boolean;
  @ApiProperty() email: string;
  @ApiProperty() locale: string;
  @ApiProperty() topics: string[];
}

export class UnsubscribeNewsletterDto {
  @ApiProperty({
    description: 'Opaque unsubscribe token — sent in every email',
  })
  @IsString()
  token: string;
}

export class UnsubscribeResponseDto {
  @ApiProperty() success: true;
  @ApiProperty() email: string;
}

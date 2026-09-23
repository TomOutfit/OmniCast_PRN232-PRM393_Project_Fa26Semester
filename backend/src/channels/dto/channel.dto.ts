// ============================================================
// OmniCast - Channels DTOs
// ============================================================

import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
  MaxLength,
  IsEnum,
  IsArray,
} from 'class-validator';
import { LiveCategory } from '@prisma/client';

export class CreateChannelDto {
  @ApiProperty({ example: 'Omni Sport', description: 'Channel name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'omni-sport', description: 'URL-friendly slug' })
  @IsString()
  @MaxLength(255)
  slug: string;

  @ApiPropertyOptional({ example: 'Kênh thể thao hàng đầu' })
  @IsString()
  @IsOptional()
  @MaxLength(1500)
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.omnicast.tv/logos/omni-sport.png' })
  @IsString()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.omnicast.tv/badges/omni-sport.png' })
  @IsString()
  @IsOptional()
  @IsUrl()
  badgeUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.omnicast.tv/banners/omni-sport.jpg' })
  @IsString()
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiProperty({ enum: LiveCategory, example: LiveCategory.SPORTS })
  @IsEnum(LiveCategory)
  category: LiveCategory;

  @ApiPropertyOptional({ example: 'vi' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({ example: 'Vietnam' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}

export class UpdateChannelDto extends PartialType(CreateChannelDto) {}

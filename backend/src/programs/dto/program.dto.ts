// ============================================================
// OmniCast - Programs DTOs
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
  IsInt,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EventStatus,
  StreamQuality,
  ContentSource,
  ExternalPlatform,
  ContentType,
  LiveCategory,
} from '@prisma/client';

// ============================================================
// LIVE EVENT DTOs
// ============================================================

export class CreateLiveEventDto {
  @ApiProperty({ example: 'Championship Final 2026' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty()
  @IsEnum(EventStatus)
  status: EventStatus;

  @ApiProperty({ example: '2026-09-30T20:00:00Z' })
  @IsString()
  scheduledAt: string;

  @ApiPropertyOptional({ example: 120 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(1440)
  duration?: number;

  @ApiPropertyOptional({ enum: StreamQuality })
  @IsEnum(StreamQuality)
  @IsOptional()
  quality?: StreamQuality;

  @ApiPropertyOptional({ enum: ContentSource })
  @IsEnum(ContentSource)
  @IsOptional()
  streamSource?: ContentSource;

  @ApiPropertyOptional({ enum: ExternalPlatform })
  @IsEnum(ExternalPlatform)
  @IsOptional()
  externalPlatform?: ExternalPlatform;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  streamUrl?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  chatEnabled?: boolean;
}

export class UpdateLiveEventDto extends PartialType(CreateLiveEventDto) {}

// ============================================================
// RECORDING DTOs
// ============================================================

export class CreateRecordingDto {
  @ApiProperty({ example: 'Best Moments - Championship' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty({ example: 3600, description: 'Duration in seconds' })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiPropertyOptional({ enum: ContentSource })
  @IsEnum(ContentSource)
  @IsOptional()
  contentSource?: ContentSource;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalUrl?: string;

  @ApiPropertyOptional({ enum: ContentType })
  @IsEnum(ContentType)
  @IsOptional()
  contentType?: ContentType;

  @ApiPropertyOptional({ enum: StreamQuality })
  @IsEnum(StreamQuality)
  @IsOptional()
  quality?: StreamQuality;

  @ApiPropertyOptional({ enum: LiveCategory })
  @IsEnum(LiveCategory)
  @IsOptional()
  category?: LiveCategory;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}

export class UpdateRecordingDto extends PartialType(CreateRecordingDto) {}

// ============================================================
// OmniCast - Schedule Preflight DTOs
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PreflightEventDto {
  @ApiProperty({
    description:
      'Optional client-side reference ID, echoed back in the response so the UI can map conflicts to specific rows.',
    required: false,
  })
  @IsString()
  @IsOptional()
  clientRef?: string;

  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty({ example: '2026-09-30T20:00:00Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ example: 120 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(1440)
  duration?: number;
}

export class PreflightRequestDto {
  @ApiProperty({ type: [PreflightEventDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PreflightEventDto)
  events: PreflightEventDto[];
}

export class PreflightConflictDto {
  @ApiProperty()
  clientRef: string | null;

  @ApiProperty()
  channelId: string;

  @ApiProperty()
  channelName: string;

  @ApiProperty()
  conflictingEventId: string;

  @ApiProperty()
  conflictingEventTitle: string;

  @ApiProperty()
  conflictingScheduledAt: string;

  @ApiProperty({
    description: 'Overlap window in minutes (0 if no overlap).',
  })
  overlapMinutes: number;
}

export class PreflightResponseDto {
  @ApiProperty()
  totalEvents: number;

  @ApiProperty()
  totalConflicts: number;

  @ApiProperty({ type: [PreflightConflictDto] })
  conflicts: PreflightConflictDto[];
}

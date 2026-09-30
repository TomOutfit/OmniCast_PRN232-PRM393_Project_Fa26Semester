// ============================================================
// OmniCast - EPG Day Query DTO
// ============================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class EpgDayQueryDto {
  @ApiPropertyOptional({
    description: 'ISO date (YYYY-MM-DD). Defaults to today (UTC).',
    example: '2026-09-28',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string;

  @ApiPropertyOptional({
    description:
      'Comma-separated list of channel IDs. Defaults to all active channels.',
    example: 'channel-id-1,channel-id-2',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : value,
  )
  channelIds?: string;
}

// ============================================================
// OmniCast - EPG Day Query DTO
// ============================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
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
      'Channel IDs to include. Accepts a single comma-separated string '
      + '(`?channelIds=a,b`) or repeated params (`?channelIds=a&channelIds=b`). '
      + 'Defaults to all active channels when omitted.',
    example: 'channel-id-1,channel-id-2',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value
        .map((s: unknown) => String(s).trim())
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return value;
  })
  // We type this as `string[]` because the `@Transform` above always
  // returns an array of trimmed channel IDs. The previous `string`
    // annotation was misleading and caused the controller's
    // `typeof === 'string'` branch to never fire (NestJS applied the
    // transform before the controller executed).
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  channelIds?: string[] | string;
}

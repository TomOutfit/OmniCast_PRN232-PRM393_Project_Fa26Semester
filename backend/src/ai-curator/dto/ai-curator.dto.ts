// ============================================================
// OmniCast - AI Curator DTOs
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CurateContentDto {
  @ApiProperty({ description: 'Program/Event ID to curate' })
  @IsString()
  programId: string;

  @ApiPropertyOptional({ description: 'Force refresh even if cached report exists' })
  @IsBoolean()
  @IsOptional()
  forceRefresh?: boolean;
}

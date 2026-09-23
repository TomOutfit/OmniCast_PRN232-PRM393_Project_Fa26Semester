// ============================================================
// OmniCast - Search DTOs
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query string' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ enum: ['all', 'channels', 'programs', 'recordings'] })
  @IsEnum(['all', 'channels', 'programs', 'recordings'])
  @IsOptional()
  type?: 'all' | 'channels' | 'programs' | 'recordings';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: ['relevance', 'recent', 'popular'] })
  @IsEnum(['relevance', 'recent', 'popular'])
  @IsOptional()
  sortBy?: 'relevance' | 'recent' | 'popular';
}

// ============================================================
// OmniCast - AI Curator DTOs
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  IsDateString,
  IsIn,
  IsInt,
  Max,
  Min,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Maximum number of tags accepted on a preview payload. Mirrors the
 * frontend's `LIMITS.AI_TAGS_MAX` and the `TAGS_MAX` column limit.
 */
export const AI_TAGS_MAX = 20;

/**
 * Mode 1 — Curate an EXISTING live event (program already saved in DB).
 * Used by `POST /ai-curator/curate` and `POST /ai-curator/analyze/:programId`.
 */
export class CurateContentDto {
  @ApiProperty({
    description: 'ID of an existing LiveEvent (program) to curate',
  })
  @IsString()
  programId: string;

  @ApiPropertyOptional({
    description: 'Force re-running the model even if a cached report exists',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  forceRefresh?: boolean;
}

/**
 * Mode 2 — Preview / "ad-hoc" analysis. The frontend sends the raw
 * program fields without persisting them first. The model still produces
 * a full report; we never write to the DB in this mode. The mobile
 * "draft" flow uses this endpoint before a Staff member commits a record.
 *
 * Used by `POST /ai-curator/analyze` (no programId).
 */
export class AnalyzeContentPreviewDto {
  @ApiProperty({ description: 'Programme title (3–200 chars)' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ description: 'Programme description (max 5,000 chars)' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Category of the parent channel (e.g. MUSIC)' })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({ description: 'ISO 639-1 code of the broadcast language' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({
    description: 'ISO timestamp of the planned air time (used by the editorial agent)',
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Optional tags to enrich the sentiment prompt' })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(AI_TAGS_MAX)
  tags?: string[];

  @ApiPropertyOptional({
    description:
      'Program duration in seconds. Used to judge pacing and to pick a time slot that can actually hold the program.',
    minimum: 0,
    maximum: 86400,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(86400)
  duration?: number;

  @ApiPropertyOptional({ description: 'Display name of the parent channel' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  channelName?: string;
}

/**
 * Apply previously-generated AI suggestions to a LiveEvent.
 * Only fields that are present in the payload will be written.
 *
 * Used by `POST /ai-curator/apply/:programId`.
 */
export class ApplyCurationDto {
  @ApiPropertyOptional({
    description: 'Override `scheduledAt` with the AI-suggested slot',
  })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Set the program status (e.g. SCHEDULED → LIVE)',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Replace the description with a curator-improved blurb',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  /**
   * If true, the report is marked as "applied" in the audit log.
   * Used to gate the `lastAppliedAt` timestamp on the program.
   */
  @ApiPropertyOptional({ description: 'Mark this suggestion as applied', default: true })
  @IsBoolean()
  @IsOptional()
  markApplied?: boolean;
}

/**
 * Query DTO for `GET /ai-curator/stats`. Accepts an optional period
 * (defaults to `week` on the controller side). Validation rules keep
 * the value restricted to the three supported buckets.
 */
export class StatsQueryDto {
  @ApiPropertyOptional({
    description: 'Time window for stats (default: week)',
    enum: ['day', 'week', 'month'],
    default: 'week',
  })
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  period?: 'day' | 'week' | 'month';
}

/**
 * Helper payload to share validation rules. We avoid creating a
 * validator class for the path param — NestJS auto-coerces UUIDs into
 * strings — so this file is the single source of truth for the three
 * payload shapes.
 */
export const AI_CURATE_TITLE_MIN = 3;
export const AI_CURATE_TITLE_MAX = 200;
export const AI_CURATE_DESCRIPTION_MAX = 5000;

// Silence the unused-import lint for `ValidateIf`, which we keep
// available for future cross-field rules without forcing a refactor.
void ValidateIf;
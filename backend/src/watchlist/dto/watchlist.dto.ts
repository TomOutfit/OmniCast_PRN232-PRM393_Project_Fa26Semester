// ============================================================
// OmniCast - Watchlist DTOs
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class AddWatchlistItemDto {
  @ApiProperty({
    description: 'ID of the LiveEvent to add',
    example: 'uuid-of-program',
  })
  @IsString()
  programId: string;

  @ApiPropertyOptional({
    description: 'Channel ID — optional context for display',
  })
  @IsString()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}

export class WatchlistItemResponseDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  programId: string;
  @ApiProperty({ nullable: true, type: String })
  channelId: string | null;
  @ApiProperty({ nullable: true, type: String })
  note: string | null;
  @ApiProperty()
  addedAt: string;
  @ApiProperty()
  updatedAt: string;
  @ApiProperty()
  program: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    status: string;
    scheduledAt: string;
    duration: number | null;
    channel: {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
    };
  };
}

export class WatchlistListResponseDto {
  @ApiProperty()
  total: number;
  @ApiProperty({ type: [WatchlistItemResponseDto] })
  items: WatchlistItemResponseDto[];
}

export class SyncWatchlistDto {
  @ApiPropertyOptional({
    description: 'Last sync time from client (ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  lastSyncedAt?: string;

  @ApiProperty({ type: [AddWatchlistItemDto] })
  items: AddWatchlistItemDto[];
}

export class SyncWatchlistResponseDto {
  @ApiProperty()
  serverTime: string;
  @ApiProperty({ type: [WatchlistItemResponseDto] })
  upserted: WatchlistItemResponseDto[];
  @ApiProperty({ type: [String], description: 'Item IDs the client should drop (server removed them)' })
  removedIds: string[];
}

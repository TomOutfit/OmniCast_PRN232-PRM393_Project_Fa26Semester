// ============================================================
// OmniCast - EPG Now DTO
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';

export class NowPlayingProgramDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ description: 'ISO timestamp (startTime).' })
  startTime: string;

  @ApiProperty({ description: 'ISO timestamp (endTime).' })
  endTime: string;

  @ApiProperty({ description: 'Seconds elapsed since startTime.' })
  currentOffsetSeconds: number;

  @ApiProperty({ description: 'Total program duration in seconds.' })
  durationSeconds: number;

  @ApiProperty({
    description:
      'True if this slot was synthesised by the filler (recording replay / ' +
      'branded placeholder); false means a real `LiveEvent` row is on air.',
  })
  isFiller: boolean;

  @ApiProperty()
  isLive: boolean;

  @ApiProperty({
    description:
      'Either an `EventStatus` enum (when `isFiller` is false) or the ' +
      'literal string "FILLER" when the slot is a synthetic filler.',
  })
  status: EventStatus | 'FILLER';

  @ApiProperty({ type: [String] })
  tags: string[];
}

export class EpgNowResponseDto {
  @ApiProperty()
  channelId: string;

  @ApiProperty()
  channelSlug: string;

  @ApiProperty()
  channelName: string;

  @ApiProperty({ nullable: true })
  channelLogoUrl: string | null;

  @ApiProperty()
  channelCategory: string;

  @ApiProperty()
  isPremium: boolean;

  @ApiProperty({ nullable: true, type: NowPlayingProgramDto })
  program: NowPlayingProgramDto | null;

  @ApiProperty({ nullable: true, type: NowPlayingProgramDto })
  next: NowPlayingProgramDto | null;

  @ApiProperty({
    description:
      'Resolved HLS playlist URL for the player. Falls back to the ' +
      'Bunny embed safety net when nothing is scheduled.',
  })
  streamUrl: string;

  @ApiProperty()
  fallbackStreamUrl: string;

  @ApiProperty({
    description:
      'Free-form source description, useful for analytics and debug. ' +
      'One of: live-event | recording-replay | fallback.',
  })
  source: string;

  @ApiProperty()
  generatedAt: string;

  @ApiProperty({
    description:
      'True when now() ∈ [startTime, endTime). False during a gap.',
  })
  isOnAir: boolean;
}
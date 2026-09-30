// ============================================================
// OmniCast - EPG Response DTOs
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';

export class EpgProgramItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty({ enum: EventStatus })
  status: EventStatus;

  @ApiProperty({ nullable: true, type: String })
  thumbnailUrl: string | null;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  category: string;

  @ApiProperty({
    description:
      'True when this slot was synthesised by the EPG service to fill a ' +
      'gap between real live events (so the 24-hour grid is never empty). ' +
      'False means the slot corresponds to a real `LiveEvent` row.',
  })
  isFiller: boolean;

  @ApiProperty({
    nullable: true,
    description:
      'Origin of the filler. `recording-replay` means the slot is replaying ' +
      'a previously-published Recording; `channel-branding` means no ' +
      'recordings are available so the slot is a static branded placeholder. ' +
      'Null when `isFiller` is false.',
  })
  fillerKind: 'recording-replay' | 'channel-branding' | null;

  @ApiProperty({
    nullable: true,
    description:
      'ID of the underlying Recording when `fillerKind` is `recording-replay`.',
  })
  sourceRecordingId: string | null;
}

export class EpgDayResponseDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  generatedAt: string;

  @ApiProperty()
  totalChannels: number;

  @ApiProperty()
  totalPrograms: number;

  @ApiProperty({
    description:
      'Per-channel programs scheduled to start between 00:00 and 23:59 UTC of the requested date.',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        channelId: { type: 'string' },
        channelName: { type: 'string' },
        channelLogoUrl: { type: 'string', nullable: true },
        channelCategory: { type: 'string' },
        programs: {
          type: 'array',
          items: { $ref: '#/components/schemas/EpgProgramItemDto' },
        },
      },
    },
  })
  channels: Array<{
    channelId: string;
    channelName: string;
    channelLogoUrl: string | null;
    channelCategory: string;
    programs: EpgProgramItemDto[];
  }>;
}

export class EpgNowNextProgramDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  title: string;
  @ApiProperty()
  startTime: string;
  @ApiProperty()
  endTime: string;
  @ApiProperty({ description: 'Percent of program already aired (0-100)' })
  elapsedPercent: number;
}

export class EpgSnapshotChannelDto {
  @ApiProperty()
  channelId: string;
  @ApiProperty()
  channelName: string;
  @ApiProperty({ nullable: true, type: String })
  channelLogoUrl: string | null;
  @ApiProperty()
  channelCategory: string;
  @ApiProperty({ nullable: true, type: EpgNowNextProgramDto })
  now: EpgNowNextProgramDto | null;
  @ApiProperty({ nullable: true, type: EpgNowNextProgramDto })
  next: EpgNowNextProgramDto | null;
}

export class EpgSnapshotResponseDto {
  @ApiProperty()
  generatedAt: string;

  @ApiProperty({ description: 'Snapshot is cached for 60s' })
  cacheTtlSeconds: number;

  @ApiProperty({ type: [EpgSnapshotChannelDto] })
  channels: EpgSnapshotChannelDto[];
}

// ============================================================
// OmniCast - Notifications DTOs
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export type NotificationTypeFilter =
  | 'ALL'
  | 'NEW_FOLLOWER'
  | 'NEW_VIDEO'
  | 'LIVE_START'
  | 'LIVE_ENDED'
  | 'COMMENT_REPLY'
  | 'COMMENT_MENTION'
  | 'REACTION'
  | 'SYSTEM_ANNOUNCEMENT';

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Filter by read state — true/false/all',
    enum: ['all', 'unread', 'read'],
  })
  @IsIn(['all', 'unread', 'read'])
  @IsOptional()
  filter?: 'all' | 'unread' | 'read' = 'all';
}

export class NotificationItemDto {
  @ApiProperty() id: string;
  @ApiProperty() type: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) message: string | null;
  @ApiProperty({ nullable: true }) actionUrl: string | null;
  @ApiProperty({ nullable: true }) actorId: string | null;
  @ApiProperty({ nullable: true }) actorName: string | null;
  @ApiProperty({ nullable: true }) actorAvatarUrl: string | null;
  @ApiProperty({ nullable: true }) eventId: string | null;
  @ApiProperty({ nullable: true }) recordingId: string | null;
  @ApiProperty({ nullable: true }) channelId: string | null;
  @ApiProperty() isRead: boolean;
  @ApiProperty({ nullable: true }) readAt: string | null;
  @ApiProperty() createdAt: string;
}

export class NotificationListResponseDto {
  @ApiProperty() total: number;
  @ApiProperty() unreadCount: number;
  @ApiProperty({ type: [NotificationItemDto] }) items: NotificationItemDto[];
}

export class UnreadCountResponseDto {
  @ApiProperty() unreadCount: number;
}

export class MarkReadResponseDto {
  @ApiProperty() success: true;
  @ApiProperty() updated: number;
}

// ============================================================
// OmniCast - Social DTOs (Comments & Reactions)
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReactionType } from '@prisma/client';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Great match!',
    description: 'Comment text content',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @ApiProperty({
    required: false,
    description: 'Parent comment id (for replies)',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class ToggleReactionDto {
  @ApiProperty({ enum: ReactionType, example: ReactionType.HEART })
  @IsEnum(ReactionType)
  type: ReactionType;
}

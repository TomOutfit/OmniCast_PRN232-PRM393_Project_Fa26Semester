// ============================================================
// OmniCast - Users DTOs
// ============================================================

import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsString()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiProperty({ example: 'Movie enthusiast and tech lover', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;
}

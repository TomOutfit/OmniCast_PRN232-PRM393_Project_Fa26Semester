// ============================================================
// OmniCast - Cloudinary Sign DTO
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class SignUploadDto {
  @ApiProperty({
    description:
      'Slug of the channel the upload will be associated with. ' +
      'Cloudinary will store the file under ' +
      '`omnicast-studio/<channelSlug>/`.',
    example: 'sport-1',
  })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-_]{0,63}$/, {
    message:
      'channelSlug must be lowercase, start with a letter or digit, ' +
      'and only contain [a-z0-9-_] (max 64 chars).',
  })
  channelSlug: string;

  @ApiProperty({
    description:
      'Display title for the recording. Used as the Cloudinary ' +
      '`public_id` stem so the file is easy to find in the Media ' +
      'Library later. The extension is stripped automatically.',
    example: 'Highlight V-League 2026 - tran chung ket',
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description:
      'Optional tags attached to the asset. Cloudinary will index ' +
      'these so the Studio can filter the library by tag.',
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description:
      'Override the per-file byte cap. Defaults to 100 MB ' +
      '(Cloudinary free-tier hard cap).',
    minimum: 1024,
    maximum: 100 * 1024 * 1024,
  })
  @IsOptional()
  @IsInt()
  @Min(1024)
  maxBytes?: number;
}

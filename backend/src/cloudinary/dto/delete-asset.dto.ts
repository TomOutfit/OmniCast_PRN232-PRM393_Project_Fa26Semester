// ============================================================
// OmniCast - Cloudinary Delete Asset DTO
// ============================================================
//
// Used by `DELETE /uploads/cloudinary/asset` so the web Studio
// can roll back an orphan asset when the register / curate-live
// step fails *after* the file has already been pushed to the
// Cloudinary CDN, or when the user cancels a mid-flight upload.
//
// `publicId` is the value Cloudinary returned in the signed
// payload (or in the upload response). It must NOT include the
// file extension — Cloudinary stores public_id without it.
//
// `resourceType` defaults to `video` because that is the only
// type Studio currently signs. Other types are accepted for
// parity with the mobile flow but are not surfaced in the Studio
// UI yet.
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const RESOURCE_TYPES = ['video', 'image', 'raw', 'auto'] as const;

export class DeleteAssetDto {
  @ApiProperty({
    description:
      'Cloudinary `public_id` of the asset to delete (without the ' +
      'file extension). Returned by `POST /uploads/cloudinary/sign` ' +
      'and by the Cloudinary upload response.',
    example: 'omnicast-studio/sport-1/highlight-v-league',
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9_\-\/]{1,255}$/, {
    message:
      'publicId must only contain letters, digits, underscore, ' +
      'hyphen, and forward slash (max 255 chars).',
  })
  publicId!: string;

  @ApiPropertyOptional({
    description:
      'Cloudinary resource type. Defaults to `video` which is what ' +
      'Studio currently signs. Other types accepted for parity.',
    enum: RESOURCE_TYPES,
    default: 'video',
  })
  @IsOptional()
  @IsIn(RESOURCE_TYPES)
  resourceType?: 'video' | 'image' | 'raw' | 'auto';

  @ApiPropertyOptional({
    description:
      'Optional caller-supplied reason for the deletion. Logged on the ' +
      'server side to help audit orphan cleanups.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
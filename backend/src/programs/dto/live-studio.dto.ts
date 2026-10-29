// ============================================================
// OmniCast - Live Studio DTOs
// ============================================================
//
// Request/response shapes for the Studio API. The Studio is the
// control surface used by Staff/Admin to:
//
//   1. Push curated content (viral) on a channel — pick one or
//      more existing recordings and mark them as LIVE NOW.
//   2. Stop a curated live event.
//   3. Upload a self-recorded video (mobile camera capture) and
//      either save it as a Recording or push it LIVE immediately.
//
// Anti-piracy: only `contentSource = UPLOADED` or `GENERATED` and
// non-blacklisted `externalPlatform` are accepted as broadcast
// sources. YouTube / Twitch / Vimeo / Dailymotion / Facebook / TikTok
// embeds are REJECTED on the Studio surface — see
// `LiveStudioService.assertBroadcastAllowed`.
// ============================================================

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  Max,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ExternalPlatform } from '@prisma/client';

/**
 * We can't use the default `IsUrl` decorator because `validator.js`
 * (the underlying lib) rejects `http://localhost:3000/...` since
 * `localhost` has no TLD. The Studio "Tự ghi hình" flow returns
 * exactly that shape when running against a local dev server, so
 * we install a thin custom check that accepts:
 *   • http(s)://anything      (incl. localhost / 127.0.0.1 / IPs)
 *   • rtmp://, rtsp://, mms:// (rare but legitimate for live ingest)
 *
 * Anything else (e.g. javascript:, file://) is still rejected.
 */
@ValidatorConstraint({ name: 'isLooseUrl', async: false })
export class IsLooseUrl implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return value.trim().length > 0;
  }
  defaultMessage(): string {
    return '$property must be a valid media link or URL address.';
  }
}

// ============================================================
// 1. Curate Live (chọn nội dung phát lên màn hình)
// ============================================================

export class CurateLiveDto {
  @ApiProperty({
    description:
      'Channel slug (preferred) or UUID that the curated live event ' +
      'will be broadcast on. Must reference an active channel.',
    example: 'sport-1',
  })
  @IsString()
  channelId: string;

  @ApiProperty({
    description:
      'Recording IDs to play as the curated live broadcast. Each ID ' +
      'must belong to the same channel and have `contentSource` in ' +
      '`UPLOADED`/`GENERATED`. Anti-piracy guard rejects YouTube/' +
      'Twitch/Vimeo/etc.',
    type: [String],
    example: ['2a6057c6-8474-8035-baa7-386cfab781c7'],
  })
  @IsArray()
  @IsString({ each: true })
  recordingIds: string[];

  @ApiPropertyOptional({
    description:
      'Override title. If omitted, the first recording\'s title is used.',
    example: 'Live: Khám phá đại dương',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Optional description shown above the player.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Custom media host or full stream URL (for WAN / tunnel / LAN custom host)',
  })
  @IsOptional()
  @IsString()
  streamUrl?: string;

  @ApiPropertyOptional({
    description: 'Custom MediaMTX host (IP or domain)',
  })
  @IsOptional()
  @IsString()
  mediaHost?: string;

  @ApiPropertyOptional({
    description:
      'Thumbnail override. Defaults to the first recording\'s thumbnail.',
  })
  @IsOptional()
  @Validate(IsLooseUrl)
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description:
      'Slot length in **minutes**. Defaults to the longest recording ' +
      'duration. Min 10, max 1440 (24h).',
    example: 90,
    minimum: 10,
    maximum: 1440,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null ? Math.round(Number(value)) : value))
  @IsInt()
  @Min(1)
  @Max(1440)
  duration?: number;

  @ApiPropertyOptional({
    description:
      'Opt in to broadcasting DEV_ONLY_TEST_FIXTURE entries. Set to ' +
      '`true` on non-prod environments to test broadcasts with test streams.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowDevLicense?: boolean;
}

// ============================================================
// 5. Webcam Live (phát trực tiếp bằng camera qua WebRTC/WHIP)
// ============================================================
//
// The Studio can publish the operator's browser camera straight
// into MediaMTX over WHIP. No file, no upload, no Cloudinary —
// the stream is live from the moment the button is pressed.
//
// The backend does NOT proxy any media bytes. It only:
//   1. hands the browser the WHIP/HLS URLs (ingest config), and
//   2. creates / ends the `LiveEvent` row so the existing viewer
//      pages, chat, reactions and viewer-count all keep working.

export class WebcamLiveStartDto {
  @ApiProperty({
    description:
      'Channel slug (preferred) or UUID that will carry the live ' +
      'camera feed. The slug is also used as the MediaMTX path, so ' +
      'the WHIP endpoint is `<whipUrl>/<slug>/whip`.',
    example: 'sport-1',
  })
  @IsString()
  @MaxLength(120)
  channelSlug: string;

  @ApiPropertyOptional({
    description: 'Title of the live event shown in the viewer room.',
    example: 'Trực tiếp từ camera Studio',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Optional description shown above the player.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Custom media host or full stream URL (for WAN / tunnel / LAN custom host)',
  })
  @IsOptional()
  @IsString()
  streamUrl?: string;

  @ApiPropertyOptional({
    description: 'Custom MediaMTX host (IP or domain)',
  })
  @IsOptional()
  @IsString()
  mediaHost?: string;
}

export class WebcamLiveStopDto {
  @ApiProperty({
    description: 'Id of the `LiveEvent` returned by the start call.',
  })
  @IsString()
  eventId: string;
}

// ============================================================
// 2. Stop Live (kết thúc phát sóng)
// ============================================================

export class StopLiveDto {
  @ApiPropertyOptional({
    description:
      'If true, the event is moved to ON_DEMAND instead of ENDED so ' +
      'viewers can re-watch it.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  keepAsVod?: boolean;
}

// ============================================================
// 4b. Add to library (mở rộng kho nội dung từ URL)
// ============================================================
//
// Staff/Admin paste any reachable MP4 / HLS / direct video URL and
// drop it into the broadcastable library for a channel. The
// endpoint runs a HEAD probe against the URL so we never persist
// a recording whose source is dead. This complements
// `uploadSelfRecord` (which takes a multipart upload) by allowing
// zero-byte-add operations on content that already lives in
// storage somewhere else (Mux, Bunny, a CDN, a customer's bucket).
// ============================================================

export class AddToLibraryDto {
  @ApiProperty({
    description:
      'Channel slug (preferred) or UUID. The new recording will be ' +
      'associated with this channel and become selectable in the ' +
      'Studio "Chọn nội dung" picker.',
    example: 'sport-1',
  })
  @IsString()
  channelId: string;

  @ApiProperty({
    description: 'Display title for the new library entry.',
    example: 'Trực tiếp bóng đá V-League vòng 12 — Highlight 30 phút',
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description:
      'Direct URL or media link to the video file.',
    example: 'https://cdn.example.com/sport/highlight-vleague-12.mp4',
  })
  @IsString()
  videoUrl: string;

  @ApiPropertyOptional({
    description:
      'Optional poster / thumbnail URL. Defaults to a generic channel ' +
      'banner if omitted.',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Optional description shown in the picker UI.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiProperty({
    description:
      'Length of the video in seconds. Used for EPG grid sizing and ' +
      'duration hint to the player.',
    example: 1800,
  })
  @Transform(({ value }) => (value !== undefined && value !== null ? Math.round(Number(value)) : value))
  @IsInt()
  @Min(1)
  @Type(() => Number)
  duration: number;

  @ApiPropertyOptional({
    description:
      'Searchable tags. The Studio picker uses these to group entries ' +
      'and the EPG filler uses them for relevance scoring.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description:
      'Force the platform classification. If omitted, the backend ' +
      'sniffs the URL pattern (.m3u8 → CUSTOM_HLS, .mp4 → CUSTOM_MP4, ' +
      'YouTube → EMBED_IFRAME). Use this to override the default.',
    enum: ExternalPlatform,
  })
  @IsOptional()
  @IsEnum(ExternalPlatform)
  platform?: ExternalPlatform;

  @ApiPropertyOptional({
    description:
      'Publish state. `true` (default) → immediately selectable in ' +
      'the Studio picker. `false` → saved as a Staff/Admin draft.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional override for the inferred `sourceType`. If omitted, ' +
      'the Studio derives it from the URL pattern (Pexels / Mux / ' +
      'Bunny / …). Set this when the auto-detection gets it wrong.',
    enum: ['YOUTUBE_EMBED', 'PEXELS', 'ARCHIVE_ORG', 'BLENDER_CC', 'BUNNY_CDN', 'UPLOADED_LOCAL'],
  })
  @IsOptional()
  @IsString()
  sourceTypeOverride?: string;

  @ApiPropertyOptional({
    description:
      'Optional override for the inferred `license`. Defaults to the ' +
      'URL-pattern inference. Use `DEV_ONLY_TEST_FIXTURE` together ' +
      'with `allowDevLicense=true` for non-prod test fixtures.',
    enum: ['PEXELS_LICENSE', 'CC0_PUBLIC_DOMAIN', 'BLENDER_OPEN_MOVIE', 'BUNNY_SELF_HOSTED', 'DEMO_PRODUCTION_OK', 'DEV_ONLY_TEST_FIXTURE', 'UNKNOWN'],
  })
  @IsOptional()
  @IsString()
  licenseOverride?: string;

  @ApiPropertyOptional({
    description:
      'Opt in to publishing DEV_ONLY_TEST_FIXTURE entries. Set to ' +
      '`true` on a non-prod env to seed test streams (samplelib, ' +
      'Cloudinary demo, Mux test, …). Refused on production builds.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowDevLicense?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional credit line shown in the player overlay (e.g. "Video ' +
      'by John Doe, Pexels"). If omitted, a sensible default is ' +
      'generated from the sourceType/license.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceAttribution?: string;
}

// ============================================================
// 3. Self-Record Upload (tự ghi hình nội dung livestream)
// ============================================================

export enum StudioSelfRecordVisibility {
  IMEDIA = 'IMMEDIATE',
  ISCHEDULED = 'SCHEDULED',
  IPRIVATE = 'PRIVATE',
}

export class SelfRecordUploadDto {
  @ApiProperty({
    description:
      'Channel slug (preferred) or UUID. The self-recorded video ' +
      'will be associated with this channel.',
    example: 'sport-1',
  })
  @IsString()
  channelId: string;

  @ApiProperty({
    description: 'Title for the recorded clip.',
    example: 'Trực tiếp từ studio — phỏng vấn HLV Pep Guardiola',
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Optional description.' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiProperty({
    description:
      'URL to the recorded video file (HTTP/HTTPS, Blob URL, CDN, or direct download link). The URL is stored as `Recording.videoUrl`.',
    example: 'https://storage.omnicast.dev/uploads/abc123.mp4',
  })
  @IsString()
  videoUrl: string;

  @ApiPropertyOptional({
    description:
      'Thumbnail (poster) URL — first frame of the recording if ' +
      'omitted.',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'Length of the recording in seconds.',
    example: 1800,
  })
  @Transform(({ value }) => (value !== undefined && value !== null ? Math.round(Number(value)) : value))
  @IsInt()
  @Min(1)
  @Type(() => Number)
  duration: number;

  @ApiPropertyOptional({
    description:
      'Tags to make the recording discoverable in search/EPG.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    enum: StudioSelfRecordVisibility,
    description:
      'What to do with the upload: `IMMEDIATE` → mark as LIVE NOW, ' +
      '`SCHEDULED` → publish as Recording but not live, `PRIVATE` → ' +
      'save as draft (Staff/Admin only, hidden from viewers).',
    default: StudioSelfRecordVisibility.ISCHEDULED,
  })
  @IsOptional()
  @IsEnum(StudioSelfRecordVisibility)
  visibility?: StudioSelfRecordVisibility;
}

// ============================================================
// 4c. Add from Catalog (thêm nhanh từ danh mục nguồn công khai)
// ============================================================
//
// Pairs with the catalog endpoint
// `GET /programs/studio/catalog/streams`. Operator picks one of
// the curated public-domain / royalty-free sources, the backend
// resolves the catalog id → entry → persists as a `Recording`
// row scoped to the chosen channel. Title / description /
// publish-state can be overridden on the fly.
// ============================================================

export class AddFromCatalogDto {
  @ApiProperty({
    description:
      'Channel slug (preferred) or UUID. The new recording will be ' +
      'associated with this channel and become selectable in the ' +
      'Studio "Chọn nội dung" picker.',
    example: 'sport-1',
  })
  @IsString()
  channelId: string;

  @ApiProperty({
    description:
      'Stable catalog id returned by `GET /programs/studio/catalog/streams`. ' +
      'Resolved against `StudioCatalogService.findById()`.',
    example: 'cat-1xb4d3a',
  })
  @IsString()
  catalogId: string;

  @ApiPropertyOptional({
    description:
      'Override the catalog entry\'s title. Useful when the catalog ' +
      'title is generic ("Mux Test Stream — Big Buck Bunny") but the ' +
      'operator wants it branded ("Highlight bóng đá — Big Buck Bunny").',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description:
      'Override the catalog entry\'s description (max 3000 chars).',
    maxLength: 3000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Publish state. `true` (default) → immediately selectable in ' +
      'the Studio picker. `false` → saved as a Staff/Admin draft.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional override for the inferred `sourceType`. If omitted, ' +
      'the Studio derives it from the URL pattern (Pexels / Mux / ' +
      'Bunny / …). Set this when the auto-detection gets it wrong.',
    enum: ['YOUTUBE_EMBED', 'PEXELS', 'ARCHIVE_ORG', 'BLENDER_CC', 'BUNNY_CDN', 'UPLOADED_LOCAL'],
  })
  @IsOptional()
  @IsString()
  sourceTypeOverride?: string;

  @ApiPropertyOptional({
    description:
      'Optional override for the inferred `license`. Defaults to the ' +
      'URL-pattern inference. Use `DEV_ONLY_TEST_FIXTURE` together ' +
      'with `allowDevLicense=true` for non-prod test fixtures.',
    enum: ['PEXELS_LICENSE', 'CC0_PUBLIC_DOMAIN', 'BLENDER_OPEN_MOVIE', 'BUNNY_SELF_HOSTED', 'DEMO_PRODUCTION_OK', 'DEV_ONLY_TEST_FIXTURE', 'UNKNOWN'],
  })
  @IsOptional()
  @IsString()
  licenseOverride?: string;

  @ApiPropertyOptional({
    description:
      'Opt in to publishing DEV_ONLY_TEST_FIXTURE entries. Set to ' +
      '`true` on a non-prod env to seed test streams (samplelib, ' +
      'Cloudinary demo, Mux test, …). Refused on production builds.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowDevLicense?: boolean;

  @ApiPropertyOptional({
    description:
      'Optional credit line shown in the player overlay (e.g. "Video ' +
      'by John Doe, Pexels"). If omitted, a sensible default is ' +
      'generated from the sourceType/license.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceAttribution?: string;
}
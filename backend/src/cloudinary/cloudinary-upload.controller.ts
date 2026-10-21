// ============================================================
// OmniCast - Cloudinary Upload Controller
// ============================================================
//
// The mobile Studio "TỰ GHI HÌNH" (self-record) flow hits the
// Vercel 4.5 MB body limit if we proxy the file through the API.
// This controller exposes a signed-upload flow that lets the
// mobile client PUT the file straight to Cloudinary, then call
// `addToLibrary` with the resulting `secure_url`.
//
// Endpoints:
//
//   0. GET  /uploads/cloudinary/health   (this file)
//        — Operator-facing health snapshot. Returns whether the
//          service is configured plus non-sensitive identifiers
//          (cloud name, default folder). No secrets are exposed.
//
//   1. POST /uploads/cloudinary/sign
//        — Returns a signed payload. The client then POSTs the
//          file to `uploadUrl` with the signature in the form
//          body. Cloudinary replies with a JSON envelope that
//          contains the public `secure_url`.
//
//   2. POST /uploads/cloudinary/server
//        — Server-side fallback. Caller sends a multipart file
//          to the API, the API forwards to Cloudinary. Capped at
//          4.5 MB (Vercel body limit) so this is only useful for
//          very small clips or admin web tools.
//
// Endpoints 1 & 2 are Staff/Admin only, matching the rest of the
// Studio surface. The health endpoint is open to the same group
// so mobile Studio can show a clear "Cloudinary not configured"
// banner without trying a real sign request first.
// ============================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CloudinaryService } from './cloudinary.service';
import { SignUploadDto } from './dto/sign-upload.dto';
import { DeleteAssetDto } from './dto/delete-asset.dto';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
@Controller('uploads/cloudinary')
export class CloudinaryUploadController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  // ============================================================
  // 0. Health snapshot
  // ============================================================
  //
  // Mobile Studio calls this on screen mount to decide whether
  // to show the "Cloudinary not configured" banner or proceed
  // to the sign/upload flow. Returns only non-sensitive data so
  // it is safe to surface to staff/admin.

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Trạng thái cấu hình Cloudinary (không lộ secret). Trả về ' +
      '`configured`, `cloudName`, `defaultFolder` để mobile / admin ' +
      'dashboard biết trước khi thử sign/upload.',
  })
  @ApiResponse({
    status: 200,
    description:
      '200 OK — health snapshot, never includes apiKey / apiSecret / URL',
  })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  health() {
    const status = this.cloudinary.getStatus();
    return {
      success: true,
      data: status,
      message: status.configured
        ? `Cloudinary đã sẵn sàng cho cloud "${status.cloudName}".`
        : 'Cloudinary chưa được cấu hình trên server. Thêm CLOUDINARY_URL ' +
          'hoặc CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET ' +
          'vào backend/.env rồi khởi động lại API.',
    };
  }

  // ============================================================
  // 1. Sign a direct-upload payload
  // ============================================================
  //
  // The mobile client sends the desired `channelSlug` and a
  // `title` (used as the public_id stem). The response includes
  // everything the client needs to call Cloudinary's
  // `auto/upload` endpoint directly.
  //
  // Flow on the mobile side:
  //   a. POST /uploads/cloudinary/sign
  //      → { uploadUrl, signature, apiKey, timestamp, folder, publicId, ... }
  //   b. multipart POST to `uploadUrl`:
  //        file=<bytes>
  //        api_key=<apiKey>
  //        timestamp=<timestamp>
  //        signature=<signature>
  //        folder=<folder>
  //        public_id=<publicId>
  //      → Cloudinary replies with a JSON envelope:
  //        { secure_url, public_id, bytes, duration, ... }
  //   c. POST /programs/studio/recordings/library
  //        { channelId, title, videoUrl: secure_url, duration, ... }
  //      → Studio persists the recording.

  @Post('sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Ký một payload upload trực tiếp lên Cloudinary. Mobile sẽ dùng ' +
      'payload này để POST file thẳng lên `https://api.cloudinary.com/...` ' +
      'mà không cần đi qua Vercel (bypass giới hạn 4.5 MB body size).',
  })
  @ApiResponse({
    status: 200,
    description: '200 OK — Signed payload, mobile uploads directly to Cloudinary',
  })
  @ApiResponse({
    status: 401,
    description: '401 Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: '403 Forbidden',
  })
  @ApiResponse({
    status: 503,
    description: '503 — Cloudinary chưa được cấu hình trên server',
  })
  sign(@Body() dto: SignUploadDto, @Request() req: any) {
    const payload = this.cloudinary.signDirectUpload({
      channelSlug: dto.channelSlug,
      originalName: dto.title,
      tags: ['studio-self-record', `user:${req.user.sub}`, ...(dto.tags ?? [])],
      context: {
        channel: dto.channelSlug,
        uploadedBy: req.user.sub,
        source: 'mobile-studio-recorder',
      },
      maxBytes: dto.maxBytes,
    });
    return {
      success: true,
      data: payload,
      message:
        'Đã ký payload. Gọi POST trực tiếp tới `uploadUrl` với các trường ' +
        'trong payload + file binary, Cloudinary sẽ trả về `secure_url`.',
    };
  }

  // ============================================================
  // 2. Server-side upload (fallback for small files)
  // ============================================================
  //
  // For small clips (< 4.5 MB) the mobile app can fall back to
  // posting the file to the API, which forwards to Cloudinary.
  // This is the path used by the existing web admin tool.

  @Post('server')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      // Match the Vercel body limit so callers see a clear error
      // instead of a 413 from the platform.
      limits: { fileSize: 4 * 1024 * 1024 + 512 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        channelSlug: { type: 'string' },
        title: { type: 'string' },
        tags: { type: 'string', description: 'Comma-separated tag list' },
      },
      required: ['file', 'channelSlug'],
    },
  })
  @ApiOperation({
    summary:
      'Server-side upload nhỏ (≤ 4.5 MB). Mobile thường dùng `/sign` để ' +
      'upload thẳng lên Cloudinary; endpoint này chỉ dành cho file nhỏ ' +
      'hoặc web admin tool.',
  })
  @ApiResponse({ status: 201, description: '201 Created — Cloudinary envelope' })
  @ApiResponse({ status: 400, description: '400 — Empty or too-large file' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  @ApiResponse({
    status: 503,
    description: '503 — Cloudinary chưa được cấu hình trên server',
  })
  async uploadServer(
    @UploadedFile()
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @Body('channelSlug') channelSlug: string,
    @Body('title') title: string,
    @Body('tags') tagsCsv: string | undefined,
    @Request() req: any,
  ) {
    if (!file) {
      throw new Error('No file uploaded under field "file".');
    }
    if (!channelSlug) {
      throw new Error('Missing "channelSlug" form field.');
    }
    const tags = (tagsCsv ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await this.cloudinary.uploadFromBuffer(file.buffer, {
      folder: `${channelSlug}/server-uploads`,
      publicId: (title || file.originalname || 'untitled').slice(0, 80),
      resourceType: 'video',
      tags: ['studio-server-upload', `user:${req.user.sub}`, ...tags],
      context: {
        channel: channelSlug,
        uploadedBy: req.user.sub,
        source: 'mobile-studio-server',
        originalName: file.originalname,
      },
    });

    return {
      success: true,
      data: result,
    };
  }

  // ============================================================
  // 3. Delete an asset (orphan cleanup + user cancel)
  // ============================================================
  //
  // When the web Studio uploads a file directly to Cloudinary
  // and then the register / curate-live step fails — or the user
  // cancels mid-flight — we need a way to roll the asset back so
  // Cloudinary doesn't accumulate orphans. The frontend catches
  // both situations and calls this endpoint fire-and-forget; we
  // log the reason and respond with `{ result: 'ok' | 'not found' }`.
  //
  // "not found" is treated as success because the desired state
  // (asset is gone) is already true. The 503 still fires if
  // Cloudinary credentials are missing — that is a real failure.

  @Delete('asset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Xoá một asset đã upload lên Cloudinary (dùng để rollback ' +
      'khi register/curate-live thất bại, hoặc khi người dùng huỷ ' +
      'upload giữa chừng).',
  })
  @ApiResponse({
    status: 200,
    description: '200 OK — asset deleted (or already gone)',
  })
  @ApiResponse({ status: 400, description: '400 — Invalid publicId' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  @ApiResponse({
    status: 503,
    description: '503 — Cloudinary chưa được cấu hình trên server',
  })
  async deleteAsset(
    @Body() dto: DeleteAssetDto,
    @Request() req: any,
  ) {
    const result = await this.cloudinary.deleteAsset(
      dto.publicId,
      dto.resourceType ?? 'video',
      req.user.sub,
      dto.reason,
    );
    return {
      success: true,
      data: result,
      message:
        result.result === 'ok'
          ? `Đã xoá asset ${dto.publicId} trên Cloudinary.`
          : `Asset ${dto.publicId} không tồn tại trên Cloudinary.`,
    };
  }
}

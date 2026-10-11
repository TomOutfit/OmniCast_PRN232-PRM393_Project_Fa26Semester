// ============================================================
// OmniCast - Studio Catalog Controller
// ============================================================
//
// REST surface for the Studio "Danh mục nguồn" picker.
// Staff/Admin only — same gate as the rest of the Studio.
//
// Endpoints:
//   GET /programs/studio/catalog/streams
//     → list all catalog entries, optional filters:
//       ?channel=<slug>          → only entries themed for that channel
//       ?verified=true           → only entries probed-ok from our env
//       ?search=<text>           → free-text search across title/tags
//
//   GET /programs/studio/catalog/streams/:id
//     → fetch a single catalog entry (used to prefill the add form).
// ============================================================

import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StudioCatalogService } from './studio-catalog.service';

@ApiTags('studio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
@Controller('programs/studio/catalog')
export class StudioCatalogController {
  constructor(
    private readonly catalog: StudioCatalogService,
  ) {}

  @Get('streams')
  @ApiOperation({
    summary:
      'Danh mục nguồn video công khai (HLS / MP4) mà Studio có thể ' +
      'stream ngay. Mỗi entry gắn sẵn danh sách channel phù hợp, ' +
      'thumbnail, license. Lọc theo channel để chỉ hiển thị các ' +
      'nguồn khớp theme của kênh đang chọn.',
  })
  @ApiQuery({
    name: 'channel',
    required: false,
    type: String,
    description: 'Channel slug — only entries themed for that channel',
  })
  @ApiQuery({
    name: 'verified',
    required: false,
    type: Boolean,
    description: 'Only entries HEAD-probed ok from our env',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Free-text search across title / description / tags / source',
  })
  @ApiResponse({ status: 200, description: '200 OK — Catalog' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  listStreams(
    @Query('channel') channel?: string,
    @Query('verified') verified?: string,
    @Query('search') search?: string,
  ) {
    const verifiedOnly =
      typeof verified === 'string' &&
      ['1', 'true', 'yes'].includes(verified.toLowerCase());

    const items = this.catalog.listForChannel(channel, {
      verifiedOnly,
      search,
    });
    return {
      total: items.length,
      summary: this.catalog.summarize(items),
      items,
    };
  }

  @Get('streams/:id')
  @ApiOperation({
    summary: 'Lookup a single catalog entry by its stable id.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Catalog entry' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  @ApiResponse({ status: 404, description: '404 Not Found' })
  getStream(@Param('id') id: string) {
    const entry = this.catalog.findById(id);
    if (!entry) {
      throw new NotFoundException(`Catalog entry not found: ${id}`);
    }
    return entry;
  }
}
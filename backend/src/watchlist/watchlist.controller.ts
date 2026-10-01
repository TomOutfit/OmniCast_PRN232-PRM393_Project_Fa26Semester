// ============================================================
// OmniCast - Watchlist Controller
// ============================================================

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { WatchlistService } from './watchlist.service';
import {
  AddWatchlistItemDto,
  SyncWatchlistDto,
} from './dto/watchlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('watchlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  @ApiOperation({
    summary:
      "List current user's watchlist. Pass upcomingOnly=true to only see future/LIVE events sorted by scheduledAt ASC.",
  })
  @ApiQuery({ name: 'upcomingOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: '200 OK — User watchlist retrieved' })
  @ApiResponse({ status: 401, description: '401 Unauthorized — Missing JWT' })
  async list(@Request() req: any, @Query('upcomingOnly') upcomingOnly?: string) {
    return this.watchlistService.list(req.user.sub, {
      upcomingOnly: String(upcomingOnly).toLowerCase() === 'true',
    });
  }

  @Get('grouped')
  @ApiOperation({
    summary:
      'Watchlist grouped into upcoming / live / past for the 3-tab UI.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Grouped watchlist tabs data' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async grouped(@Request() req: any) {
    return this.watchlistService.listGrouped(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Add a program to the watchlist.' })
  @ApiResponse({ status: 201, description: '201 Created — Program added to watchlist' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Program not found' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async add(@Request() req: any, @Body() dto: AddWatchlistItemDto) {
    return this.watchlistService.add(req.user.sub, dto);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Bulk sync — used by Mobile after offline mutations. Returns upserted items + items the client should drop.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Watchlist synchronized' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Invalid sync payload' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async sync(@Request() req: any, @Body() dto: SyncWatchlistDto) {
    return this.watchlistService.sync(req.user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a single item from the watchlist.' })
  @ApiResponse({ status: 200, description: '200 OK — Watchlist item removed' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 404, description: '404 Not Found — Watchlist item not found' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.watchlistService.remove(req.user.sub, id);
  }
}

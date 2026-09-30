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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  async grouped(@Request() req: any) {
    return this.watchlistService.listGrouped(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Add a program to the watchlist.' })
  async add(@Request() req: any, @Body() dto: AddWatchlistItemDto) {
    return this.watchlistService.add(req.user.sub, dto);
  }

  @Post('sync')
  @ApiOperation({
    summary:
      'Bulk sync — used by Mobile after offline mutations. Returns upserted items + items the client should drop.',
  })
  async sync(@Request() req: any, @Body() dto: SyncWatchlistDto) {
    return this.watchlistService.sync(req.user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a single item from the watchlist.' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.watchlistService.remove(req.user.sub, id);
  }
}

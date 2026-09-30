// ============================================================
// OmniCast - Programs Controller
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';
import {
  CreateLiveEventDto,
  UpdateLiveEventDto,
  CreateRecordingDto,
  UpdateRecordingDto,
} from './dto/program.dto';
import { EpgDayQueryDto } from './dto/epg-day-query.dto';
import { PreflightRequestDto } from './dto/preflight.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('programs')
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  // ============================================================
  // LIVE EVENTS
  // ============================================================

  @Post('live-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new live event (Staff/Admin only)' })
  async createLiveEvent(
    @Body() createDto: CreateLiveEventDto,
    @Request() req: any,
  ) {
    return this.programsService.createLiveEvent(createDto, req.user.sub);
  }

  @Get('live-events')
  @ApiOperation({ summary: 'Get all live events with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'channelId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  async findAllLiveEvents(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('channelId') channelId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.programsService.findAllLiveEvents({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      channelId,
      status: status as any,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  @Get('live-events/live-now')
  @ApiOperation({ summary: 'Get all currently live events' })
  async getLiveNow() {
    return this.programsService.getLiveNow();
  }

  @Post('live-events/preflight')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Dry-run schedule check (1–100 events). Returns conflicts without committing, so Staff can preview before saving.',
  })
  async preflight(@Body() body: PreflightRequestDto) {
    const conflicts = await this.programsService.preflightEvents(
      body.events.map((e) => ({
        clientRef: e.clientRef,
        channelId: e.channelId,
        scheduledAt: new Date(e.scheduledAt),
        duration: e.duration,
      })),
    );
    return {
      totalEvents: body.events.length,
      totalConflicts: conflicts.length,
      conflicts,
    };
  }

  // ============================================================
  // EPG (Electronic Program Guide)
  // ============================================================

  @Get('epg/day')
  @ApiOperation({
    summary:
      'EPG for a single day (UTC), grouped by channel. Cached 60s.',
  })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'channelIds', required: false, type: String })
  async getEpgByDay(@Query() query: EpgDayQueryDto) {
    const channelIds =
      typeof query.channelIds === 'string'
        ? query.channelIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    return this.programsService.findEpgByDay({
      date: query.date ? new Date(`${query.date}T00:00:00Z`) : new Date(),
      channelIds,
    });
  }

  @Get('epg/snapshot')
  @ApiOperation({
    summary:
      'Now + Next snapshot for every active channel. Cached 60s.',
  })
  async getEpgSnapshot() {
    return this.programsService.getChannelSnapshots();
  }

  @Get('live-events/:id')
  @ApiOperation({ summary: 'Get live event by ID' })
  async findLiveEventById(@Param('id') id: string) {
    return this.programsService.findLiveEventById(id);
  }

  @Post('live-events/:id/view')
  @ApiOperation({
    summary:
      'Increment viewer count for a live event. Best-effort — duplicate calls within a session are cheap.',
  })
  async incrementLiveEventView(@Param('id') id: string) {
    return this.programsService.incrementLiveEventView(id);
  }

  @Post('live-events/:id/share')
  @ApiOperation({
    summary: 'Increment share counter for a live event.',
  })
  async incrementLiveEventShare(@Param('id') id: string) {
    return this.programsService.incrementLiveEventShare(id);
  }

  @Patch('live-events/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update live event (Staff/Admin only)' })
  async updateLiveEvent(
    @Param('id') id: string,
    @Body() updateDto: UpdateLiveEventDto,
    @Request() req: any,
  ) {
    return this.programsService.updateLiveEvent(id, updateDto, req.user.sub);
  }

  @Delete('live-events/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete live event (Staff/Admin only)' })
  async deleteLiveEvent(@Param('id') id: string, @Request() req: any) {
    return this.programsService.deleteLiveEvent(id, req.user.sub);
  }

  // ============================================================
  // RECORDINGS / VOD
  // ============================================================

  @Post('recordings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new recording/VOD (Staff/Admin only)' })
  async createRecording(
    @Body() createDto: CreateRecordingDto,
    @Request() req: any,
  ) {
    return this.programsService.createRecording(createDto, req.user.sub);
  }

  @Get('recordings')
  @ApiOperation({ summary: 'Get all recordings with filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'channelId', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAllRecordings(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('channelId') channelId?: string,
    @Query('category') category?: string,
    @Query('isFeatured') isFeatured?: boolean,
    @Query('search') search?: string,
  ) {
    return this.programsService.findAllRecordings({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      channelId,
      category,
      isFeatured,
      search,
    });
  }

  @Get('recordings/:id')
  @ApiOperation({ summary: 'Get recording by ID' })
  async findRecordingById(@Param('id') id: string) {
    return this.programsService.findRecordingById(id);
  }

  @Post('recordings/:id/view')
  @ApiOperation({
    summary:
      'Increment view counter for a recording. Idempotent — safe to call once per session.',
  })
  async incrementRecordingView(@Param('id') id: string) {
    return this.programsService.incrementRecordingView(id);
  }

  @Post('recordings/:id/share')
  @ApiOperation({
    summary:
      'Increment share counter. Idempotent for a single user action; clients should debounce.',
  })
  async incrementRecordingShare(@Param('id') id: string) {
    return this.programsService.incrementRecordingShare(id);
  }

  @Get('recordings/:id/similar')
  @ApiOperation({
    summary:
      'Return up to N related recordings for the given recording. Currently uses the same channel as a strong relevance signal; cross-channel ranking can be layered on later.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findSimilarRecordings(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.programsService.findSimilarRecordings(
      id,
      Math.min(Math.max(Number(limit) || 6, 1), 20),
    );
  }

  @Patch('recordings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update recording/VOD (Staff/Admin only)' })
  async updateRecording(
    @Param('id') id: string,
    @Body() updateDto: UpdateRecordingDto,
    @Request() req: any,
  ) {
    return this.programsService.updateRecording(id, updateDto, req.user.sub);
  }

  @Delete('recordings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete recording/VOD (Staff/Admin only)' })
  async deleteRecording(@Param('id') id: string, @Request() req: any) {
    return this.programsService.deleteRecording(id, req.user.sub);
  }
}

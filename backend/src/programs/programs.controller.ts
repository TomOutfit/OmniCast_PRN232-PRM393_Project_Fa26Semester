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
      page: Number(page),
      limit: Number(limit),
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

  @Get('live-events/:id')
  @ApiOperation({ summary: 'Get live event by ID' })
  async findLiveEventById(@Param('id') id: string) {
    return this.programsService.findLiveEventById(id);
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
      page: Number(page),
      limit: Number(limit),
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
}

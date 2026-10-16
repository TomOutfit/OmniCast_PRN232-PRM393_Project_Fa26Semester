// ============================================================
// OmniCast - AI Curator Controller
// ============================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AiCuratorService } from './ai-curator.service';
import { AiCuratorStatsService, StatsPeriod } from './ai-curator-stats.service';
import {
  AnalyzeContentPreviewDto,
  ApplyCurationDto,
  CurateContentDto,
  StatsQueryDto,
} from './dto/ai-curator.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('ai-curator')
@Controller('ai-curator')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT access token' })
@ApiResponse({ status: 403, description: 'Forbidden - requires STAFF or ADMIN role' })
export class AiCuratorController {
  constructor(
    private readonly aiCuratorService: AiCuratorService,
    private readonly statsService: AiCuratorStatsService,
  ) {}

  /**
   * Mode 1 — Curate an EXISTING program. Looks the program up in DB,
   * runs the 3-agent pipeline, persists the report. Caches by default.
   */
  @Post('curate')
  @HttpCode(HttpStatus.OK)
  @Roles('STAFF', 'ADMIN')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Run AI content curation on an existing program (Staff/Admin only)',
  })
  @ApiResponse({ status: 200, description: 'AI curation completed successfully' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async curateContent(
    @Body() curateDto: CurateContentDto,
    @Request() req: any,
  ) {
    return this.aiCuratorService.curateContent(curateDto, req.user.sub);
  }

  /**
   * Mode 1 — Alias for `POST /curate` with the programId in the URL.
   * Kept for backward compatibility with the older Web client.
   */
  @Post('analyze/:programId')
  @HttpCode(HttpStatus.OK)
  @Roles('STAFF', 'ADMIN')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Analyze an EXISTING program (Staff/Admin only). Path-param variant of /curate.',
  })
  @ApiResponse({ status: 200, description: 'AI analysis completed successfully' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async analyzeExisting(
    @Param('programId') programId: string,
    @Request() req: any,
  ) {
    return this.aiCuratorService.curateContent(
      { programId, forceRefresh: false },
      req.user.sub,
    );
  }

  /**
   * Mode 2 — Preview / ad-hoc analysis. The client sends raw fields
   * (title, description, tags, channel info). Nothing is persisted.
   *
   * NOTE: this route MUST be declared AFTER `analyze/:programId` so
   * NestJS doesn't treat `analyze` as the literal programId.
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @Roles('STAFF', 'ADMIN')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Run an AI preview analysis on raw program fields without saving the program first (Staff/Admin only)',
  })
  @ApiResponse({ status: 200, description: 'AI preview analysis completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  async analyzePreview(
    @Body() dto: AnalyzeContentPreviewDto,
    @Request() req: any,
  ) {
    return this.aiCuratorService.analyzePreview(dto, req.user.sub);
  }

  /**
   * Mode 3 — Apply a previously-generated report to the program.
   * Updates fields the curator explicitly chose to apply.
   */
  @Post('apply/:programId')
  @HttpCode(HttpStatus.OK)
  @Roles('STAFF', 'ADMIN')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Apply AI-curator suggestions (scheduledAt / status / description) to an existing program',
  })
  @ApiResponse({ status: 200, description: 'Curation applied successfully' })
  @ApiResponse({ status: 400, description: 'Empty payload — nothing to apply' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async applyCuration(
    @Param('programId') programId: string,
    @Body() dto: ApplyCurationDto,
    @Request() req: any,
  ) {
    return this.aiCuratorService.applyCuration(programId, dto, req.user.sub);
  }

  /**
   * History of recent reports for a program.
   */
  @Get('history/:programId')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Get curation history for a program' })
  @ApiResponse({ status: 200, description: 'Curation history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async getCurationHistory(@Param('programId') programId: string) {
    return this.aiCuratorService.getCurationHistory(programId);
  }

  /**
   * Aggregated dashboard stats over a recent time window.
   * No throttling — the dashboard polls this every few seconds.
   */
  @Get('stats')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({
    summary:
      'Get aggregate dashboard stats for the AI curator pipeline (Staff/Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Stats summary returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid `period` value' })
  async getStats(@Query() query: StatsQueryDto) {
    const period: StatsPeriod = query.period ?? 'week';
    return this.statsService.getStats(period);
  }
}
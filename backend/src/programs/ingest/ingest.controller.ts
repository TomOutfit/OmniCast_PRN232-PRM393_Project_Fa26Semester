// ============================================================
// OmniCast - Ingest Controller (Admin)
// Manual triggers for Content Aggregator, YouTube, Twitch, and TMDB.
// ============================================================

import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { LiveCategory, UserRole } from '@prisma/client';
import { YoutubeIngestService } from './youtube-ingest.service';
import { YoutubeRssIngestService } from './youtube-rss-ingest.service';
import { TwitchIngestService } from './twitch-ingest.service';
import { TmdbEnrichmentService } from './tmdb-enrichment.service';
import { ContentAggregatorService } from './content-aggregator.service';

@ApiTags('ingest')
@ApiBearerAuth()
@Controller('programs/ingest')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing credentials' })
@ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
export class IngestController {
  constructor(
    private readonly contentAggregator: ContentAggregatorService,
    private readonly youtubeIngest: YoutubeIngestService,
    private readonly youtubeRssIngest: YoutubeRssIngestService,
    private readonly twitchIngest: TwitchIngestService,
    private readonly tmdbEnrichment: TmdbEnrichmentService,
  ) {}

  // ============================================================
  // CONTENT AGGREGATOR ENDPOINTS
  // ============================================================

  @Get('status')
  @ApiOperation({
    summary: 'Get health, configuration status and mappings for all 12 category sources',
  })
  @ApiResponse({ status: 200, description: 'Aggregator status retrieved successfully' })
  async getAggregatorStatus() {
    return this.contentAggregator.getStatus();
  }

  @Post('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger a full aggregator ingest run across all active channels',
  })
  @ApiResponse({ status: 200, description: 'Aggregator pipeline triggered successfully' })
  async runAllAggregator(@Request() req: any) {
    const userId = req.user?.sub || 'ADMIN';
    return this.contentAggregator.runAll(userId);
  }

  @Post('category/:category')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'category', enum: LiveCategory })
  @ApiOperation({
    summary: 'Trigger an aggregator ingest run for a specific channel category',
  })
  @ApiResponse({ status: 200, description: 'Category ingestion completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid channel category' })
  async runCategory(
    @Param('category') category: LiveCategory,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || 'ADMIN';
    return this.contentAggregator.runForCategory(category, userId);
  }

  @Post('channel/:channelId')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'channelId', description: 'Channel ID or Slug' })
  @ApiOperation({
    summary: 'Trigger an aggregator ingest run for a single channel',
  })
  @ApiResponse({ status: 200, description: 'Channel ingestion completed successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async runChannel(
    @Param('channelId') channelId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || 'ADMIN';
    return this.contentAggregator.runForChannel(channelId, userId);
  }

  // ============================================================
  // LEGACY / PLATFORM-SPECIFIC INGEST ENDPOINTS
  // ============================================================

  @Post('youtube')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger a YouTube Data API ingest run for all YouTube-backed events',
  })
  @ApiResponse({ status: 200, description: 'YouTube ingest completed successfully' })
  async runYoutube() {
    return {
      source: 'youtube',
      ...(await this.youtubeIngest.runOnce()),
    };
  }

  @Post('youtube-rss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Trigger a YouTube RSS ingest run — public feed, no API key required',
  })
  @ApiResponse({ status: 200, description: 'YouTube RSS ingest completed successfully' })
  async runYoutubeRss() {
    return {
      source: 'youtube-rss',
      ...(await this.youtubeRssIngest.runOnce()),
    };
  }

  @Post('twitch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger a Twitch Helix schedule ingest for all Twitch-mapped channels',
  })
  @ApiResponse({ status: 200, description: 'Twitch ingest completed successfully' })
  async runTwitch() {
    return {
      source: 'twitch',
      ...(await this.twitchIngest.runOnce()),
    };
  }

  @Post('tmdb/event')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enrich a single LiveEvent with TMDB metadata' })
  @ApiResponse({ status: 200, description: 'LiveEvent enriched successfully' })
  @ApiResponse({ status: 404, description: 'LiveEvent not found' })
  async enrichEvent(@Body() body: { eventId: string }) {
    const enriched = await this.tmdbEnrichment.enrichLiveEvent(body.eventId);
    return { entity: 'LiveEvent', id: body.eventId, enriched };
  }

  @Post('tmdb/recording')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enrich a single Recording with TMDB metadata' })
  @ApiResponse({ status: 200, description: 'Recording enriched successfully' })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  async enrichRecording(@Body() body: { recordingId: string }) {
    const enriched = await this.tmdbEnrichment.enrichRecording(
      body.recordingId,
    );
    return { entity: 'Recording', id: body.recordingId, enriched };
  }
}

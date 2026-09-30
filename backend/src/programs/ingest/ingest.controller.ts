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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { LiveCategory, UserRole } from '@prisma/client';
import { YoutubeIngestService } from './youtube-ingest.service';
import { YoutubeRssIngestService } from './youtube-rss-ingest.service';
import { TwitchIngestService } from './twitch-ingest.service';
import { TmdbEnrichmentService } from './tmdb-enrichment.service';
import { ContentAggregatorService } from './content-aggregator.service';

@ApiTags('Ingest (Admin)')
@ApiBearerAuth()
@Controller('programs/ingest')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
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
  async getAggregatorStatus() {
    return this.contentAggregator.getStatus();
  }

  @Post('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger a full aggregator ingest run across all active channels',
  })
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
  async runTwitch() {
    return {
      source: 'twitch',
      ...(await this.twitchIngest.runOnce()),
    };
  }

  @Post('tmdb/event')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enrich a single LiveEvent with TMDB metadata' })
  async enrichEvent(@Body() body: { eventId: string }) {
    const enriched = await this.tmdbEnrichment.enrichLiveEvent(body.eventId);
    return { entity: 'LiveEvent', id: body.eventId, enriched };
  }

  @Post('tmdb/recording')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enrich a single Recording with TMDB metadata' })
  async enrichRecording(@Body() body: { recordingId: string }) {
    const enriched = await this.tmdbEnrichment.enrichRecording(
      body.recordingId,
    );
    return { entity: 'Recording', id: body.recordingId, enriched };
  }
}

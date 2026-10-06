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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { CreateCommentDto, ToggleReactionDto } from './dto/social.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('social')
@Controller()
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // ============================================================
  // COMMENTS
  // ============================================================

  @Get(['recordings/:id/comments', 'programs/recordings/:id/comments'])
  @ApiOperation({ summary: 'List comments for a recording' })
  @ApiParam({ name: 'id', description: 'Recording UUID', example: '2a6057c6-8474-8035-baa7-386cfab781c7' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '200 OK — Paginated comments list' })
  @ApiResponse({ status: 404, description: '404 Not Found — Recording not found' })
  async listComments(
    @Param('id') recordingId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.listCommentsByRecording(recordingId, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Post(['recordings/:id/comments', 'programs/recordings/:id/comments'])
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment on a recording' })
  @ApiParam({ name: 'id', description: 'Recording UUID', example: '2a6057c6-8474-8035-baa7-386cfab781c7' })
  @ApiResponse({ status: 201, description: '201 Created — Comment posted' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Empty content' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden — Comments disabled on channel' })
  @ApiResponse({ status: 404, description: '404 Not Found — Recording or parent comment not found' })
  async createComment(
    @Param('id') recordingId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: any,
  ) {
    return this.socialService.createComment(recordingId, req.user.sub, dto);
  }

  @Get(['live-events/:id/comments', 'programs/live-events/:id/comments'])
  @ApiOperation({ summary: 'List comments for a live event' })
  @ApiParam({ name: 'id', description: 'Live event UUID', example: '207ce17f-082c-469e-a51e-da274ef20734' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '200 OK — Paginated comments list' })
  @ApiResponse({ status: 404, description: '404 Not Found — Live event not found' })
  async listLiveEventComments(
    @Param('id') liveEventId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.listCommentsByLiveEvent(liveEventId, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Post(['live-events/:id/comments', 'programs/live-events/:id/comments'])
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment on a live event' })
  @ApiParam({ name: 'id', description: 'Live event UUID', example: '207ce17f-082c-469e-a51e-da274ef20734' })
  @ApiResponse({ status: 201, description: '201 Created — Comment posted' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Empty content' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 404, description: '404 Not Found — Live event not found' })
  async createLiveEventComment(
    @Param('id') liveEventId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: any,
  ) {
    return this.socialService.createCommentOnLiveEvent(liveEventId, req.user.sub, dto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment (owner or admin)' })
  @ApiParam({ name: 'id', description: 'Comment UUID', example: '440e2f0a-66c1-4058-8ebe-f2c5e84f6165' })
  @ApiResponse({ status: 200, description: '200 OK — Comment deleted' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden — Not comment owner or admin' })
  @ApiResponse({ status: 404, description: '404 Not Found — Comment not found' })
  async deleteComment(@Param('id') id: string, @Request() req: any) {
    return this.socialService.deleteComment(
      id,
      req.user.sub,
      req.user.role,
    );
  }

  // ============================================================
  // REACTIONS
  // ============================================================

  @Get(['recordings/:id/reactions', 'programs/recordings/:id/reactions'])
  @ApiOperation({ summary: 'Get aggregated reactions for a recording' })
  @ApiParam({ name: 'id', description: 'Recording UUID', example: '2a6057c6-8474-8035-baa7-386cfab781c7' })
  @ApiResponse({ status: 200, description: '200 OK — Aggregated reaction counts' })
  @ApiResponse({ status: 404, description: '404 Not Found — Recording not found' })
  async listReactions(@Param('id') recordingId: string) {
    return this.socialService.listReactionsByRecording(recordingId);
  }

  @Post(['recordings/:id/reactions', 'programs/recordings/:id/reactions'])
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle a reaction on a recording' })
  @ApiParam({ name: 'id', description: 'Recording UUID', example: '2a6057c6-8474-8035-baa7-386cfab781c7' })
  @ApiResponse({ status: 200, description: '200 OK — Reaction toggled' })
  @ApiResponse({ status: 201, description: '201 Created — Reaction added' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Invalid reaction type enum' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 404, description: '404 Not Found — Recording not found' })
  async toggleReaction(
    @Param('id') recordingId: string,
    @Body() dto: ToggleReactionDto,
    @Request() req: any,
  ) {
    return this.socialService.toggleReactionByRecording(
      recordingId,
      req.user.sub,
      dto.type,
    );
  }

  // ---- LiveEvent mirror of the above ----

  @Get(['live-events/:id/reactions', 'programs/live-events/:id/reactions'])
  @ApiOperation({ summary: 'Get aggregated reactions for a live event' })
  @ApiParam({ name: 'id', description: 'Live Event UUID', example: '207ce17f-082c-469e-a51e-da274ef20734' })
  @ApiResponse({ status: 200, description: '200 OK — Aggregated live reaction counts' })
  @ApiResponse({ status: 404, description: '404 Not Found — Live event not found' })
  async listLiveEventReactions(@Param('id') liveEventId: string) {
    return this.socialService.listReactionsByLiveEvent(liveEventId);
  }

  @Post(['live-events/:id/reactions', 'programs/live-events/:id/reactions'])
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle a reaction on a live event' })
  @ApiParam({ name: 'id', description: 'Live Event UUID', example: '207ce17f-082c-469e-a51e-da274ef20734' })
  @ApiResponse({ status: 200, description: '200 OK — Reaction toggled' })
  @ApiResponse({ status: 201, description: '201 Created — Reaction added' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Invalid reaction type enum' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 404, description: '404 Not Found — Live event not found' })
  async toggleLiveEventReaction(
    @Param('id') liveEventId: string,
    @Body() dto: ToggleReactionDto,
    @Request() req: any,
  ) {
    return this.socialService.toggleReactionByLiveEvent(
      liveEventId,
      req.user.sub,
      dto.type,
    );
  }
}

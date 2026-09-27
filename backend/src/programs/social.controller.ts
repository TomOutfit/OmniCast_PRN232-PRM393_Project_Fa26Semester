// ============================================================
// OmniCast - Social Controller (Comments & Reactions)
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

  @Get('recordings/:id/comments')
  @ApiOperation({ summary: 'List comments for a recording' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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

  @Post('recordings/:id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment on a recording' })
  async createComment(
    @Param('id') recordingId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: any,
  ) {
    return this.socialService.createComment(recordingId, req.user.sub, dto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment (owner or admin)' })
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

  @Get('recordings/:id/reactions')
  @ApiOperation({ summary: 'Get aggregated reactions for a recording' })
  async listReactions(@Param('id') recordingId: string) {
    return this.socialService.listReactionsByRecording(recordingId);
  }

  @Post('recordings/:id/reactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle a reaction on a recording' })
  async toggleReaction(
    @Param('id') recordingId: string,
    @Body() dto: ToggleReactionDto,
    @Request() req: any,
  ) {
    return this.socialService.toggleReaction(
      recordingId,
      req.user.sub,
      dto.type,
    );
  }
}

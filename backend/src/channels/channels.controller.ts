// ============================================================
// OmniCast - Channels Controller
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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { HttpCode, HttpStatus } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto, UpdateChannelDto } from './dto/channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new channel (Staff/Admin only)' })
  @ApiResponse({ status: 201, description: '201 Created — Channel created successfully' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Validation failed or invalid payload' })
  @ApiResponse({ status: 401, description: '401 Unauthorized — Missing or invalid JWT' })
  @ApiResponse({ status: 403, description: '403 Forbidden — Requires STAFF or ADMIN role' })
  @ApiResponse({ status: 409, description: '409 Conflict — Channel slug or name already exists' })
  async create(@Body() createChannelDto: CreateChannelDto, @Request() req: any) {
    return this.channelsService.create(createChannelDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all channels with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: '200 OK — Paginated channels list retrieved' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Invalid query parameters' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
    @Query('isFeatured') isFeatured?: boolean,
    @Query('search') search?: string,
  ) {
    return this.channelsService.findAll({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      category: category as any,
      isActive,
      isFeatured,
      search,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all channel categories with count' })
  @ApiResponse({ status: 200, description: '200 OK — List of categories with counts' })
  async getCategories() {
    return this.channelsService.getCategories();
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get channel by slug' })
  @ApiResponse({ status: 200, description: '200 OK — Channel details by slug' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel slug does not exist' })
  async findBySlug(@Param('slug') slug: string) {
    return this.channelsService.findBySlug(slug);
  }

  @Get('followed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get channels followed by current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '200 OK — Followed channels list' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async getFollowedChannels(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.channelsService.getFollowedChannels(req.user.sub, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID' })
  @ApiResponse({ status: 200, description: '200 OK — Channel details by ID' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel ID does not exist' })
  async findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Get(':id/followers')
  @ApiOperation({ summary: 'Get followers of a channel' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '200 OK — Followers list' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel does not exist' })
  async getFollowers(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.channelsService.getFollowers(id, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a channel' })
  @ApiResponse({ status: 201, description: '201 Created — Channel followed' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel does not exist' })
  async followChannel(@Param('id') id: string, @Request() req: any) {
    return this.channelsService.followChannel(id, req.user.sub);
  }

  @Post(':id/unfollow')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a channel' })
  @ApiResponse({ status: 200, description: '200 OK — Channel unfollowed' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel does not exist' })
  async unfollowChannel(@Param('id') id: string, @Request() req: any) {
    return this.channelsService.unfollowChannel(id, req.user.sub);
  }

  @Get(':id/is-following')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user is following a channel' })
  @ApiResponse({ status: 200, description: '200 OK — Follow boolean status' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel does not exist' })
  async isFollowing(@Param('id') id: string, @Request() req: any) {
    return this.channelsService.isFollowing(id, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update channel (Staff/Admin only)' })
  @ApiResponse({ status: 200, description: '200 OK — Channel updated' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Invalid update payload' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden — Requires STAFF or ADMIN role' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel does not exist' })
  @ApiResponse({ status: 409, description: '409 Conflict — Channel slug collision' })
  async update(
    @Param('id') id: string,
    @Body() updateChannelDto: UpdateChannelDto,
  ) {
    return this.channelsService.update(id, updateChannelDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete channel (Staff/Admin only)' })
  @ApiResponse({ status: 200, description: '200 OK — Channel deleted' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden — Requires STAFF or ADMIN role' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel does not exist' })
  async remove(@Param('id') id: string) {
    return this.channelsService.remove(id);
  }
}

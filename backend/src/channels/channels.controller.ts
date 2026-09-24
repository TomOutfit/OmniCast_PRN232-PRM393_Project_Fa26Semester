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
} from '@nestjs/swagger';
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
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
    @Query('isFeatured') isFeatured?: boolean,
    @Query('search') search?: string,
  ) {
    return this.channelsService.findAll({
      page: Number(page),
      limit: Number(limit),
      category: category as any,
      isActive,
      isFeatured,
      search,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all channel categories with count' })
  async getCategories() {
    return this.channelsService.getCategories();
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get channel by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.channelsService.findBySlug(slug);
  }

  @Get('followed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get channels followed by current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFollowedChannels(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.channelsService.getFollowedChannels(req.user.sub, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID' })
  async findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Get(':id/followers')
  @ApiOperation({ summary: 'Get followers of a channel' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFollowers(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.channelsService.getFollowers(id, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a channel' })
  async followChannel(@Param('id') id: string, @Request() req: any) {
    return this.channelsService.followChannel(id, req.user.sub);
  }

  @Post(':id/unfollow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a channel' })
  async unfollowChannel(@Param('id') id: string, @Request() req: any) {
    return this.channelsService.unfollowChannel(id, req.user.sub);
  }

  @Get(':id/is-following')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user is following a channel' })
  async isFollowing(@Param('id') id: string, @Request() req: any) {
    return this.channelsService.isFollowing(id, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update channel (Staff/Admin only)' })
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
  async remove(@Param('id') id: string) {
    return this.channelsService.remove(id);
  }
}

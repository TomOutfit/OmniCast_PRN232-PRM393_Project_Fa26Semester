// ============================================================
// OmniCast - Users Controller
// ============================================================

import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT access token' })
@ApiResponse({ status: 403, description: 'Forbidden - insufficient user permissions' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  async getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.sub);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get current user statistics (viewer or staff)' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  async getMyStats(@Request() req: any) {
    return this.usersService.getUserStats(req.user.sub);
  }

  @Get('me/follows')
  @ApiOperation({ summary: 'Get channels followed by current user' })
  @ApiResponse({ status: 200, description: 'Followed channels retrieved successfully' })
  async getMyFollows(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getFollowedChannels(req.user.sub, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid profile update payload' })
  async updateProfile(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.sub, updateUserDto);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password incorrect or new password invalid' })
  async changePassword(
    @Request() req: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(req.user.sub, dto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiResponse({ status: 200, description: 'User list retrieved successfully' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      role,
    });
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User ID not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/deactivate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activate user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role specified' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateRole(@Param('id') id: string, @Body('role') role: string) {
    return this.usersService.updateRole(id, role);
  }
}

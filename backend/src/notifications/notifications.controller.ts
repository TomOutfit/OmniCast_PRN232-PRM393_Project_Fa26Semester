// ============================================================
// OmniCast - Notifications Controller
// ============================================================

import {
  Controller,
  Get,
  Post,
  Delete,
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
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto/notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // Notifications
  // ============================================================

  @Get('me/notifications')
  @ApiOperation({
    summary: "List the current user's notifications (most-recent first).",
  })
  @ApiResponse({ status: 200, description: '200 OK — Notifications list' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async list(@Request() req: any, @Query() query: ListNotificationsQueryDto) {
    return this.notifications.list(req.user.sub, {
      limit: query.limit,
      offset: query.offset,
      filter: query.filter,
    });
  }

  @Get('me/notifications/unread-count')
  @ApiOperation({
    summary: 'Cheap endpoint for the bell badge — returns just the unread count.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Unread count' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async unreadCount(@Request() req: any) {
    return this.notifications.unreadCount(req.user.sub);
  }

  @Post('me/notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark every notification as read for the current user.' })
  @ApiResponse({ status: 200, description: '200 OK — All marked as read' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async markAllRead(@Request() req: any) {
    return this.notifications.markAllRead(req.user.sub);
  }

  @Post('me/notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read.' })
  @ApiResponse({ status: 200, description: '200 OK — Notification marked as read' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async markOneRead(@Request() req: any, @Param('id') id: string) {
    return this.notifications.markOneRead(req.user.sub, id);
  }

  @Delete('me/notifications/:id')
  @ApiOperation({ summary: 'Delete a single notification.' })
  @ApiResponse({ status: 200, description: '200 OK — Notification removed' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async removeOne(@Request() req: any, @Param('id') id: string) {
    return this.notifications.removeOne(req.user.sub, id);
  }

  // ============================================================
  // Device tokens (FCM)
  // ============================================================

  @Post('me/device-tokens')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register / refresh the current device\u2019s FCM token.',
  })
  async registerDeviceToken(
    @Request() req: any,
    @Body()
    body: { token: string; platform?: 'ANDROID' | 'IOS' | 'WEB'; appVersion?: string; deviceName?: string },
  ) {
    if (!body?.token) {
      return { success: false, message: 'token is required' };
    }
    await this.prisma.deviceToken.upsert({
      where: { token: body.token },
      update: {
        userId: req.user.sub,
        platform: (body.platform as any) ?? 'ANDROID',
        appVersion: body.appVersion ?? undefined,
        deviceName: body.deviceName ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        token: body.token,
        userId: req.user.sub,
        platform: (body.platform as any) ?? 'ANDROID',
        appVersion: body.appVersion ?? undefined,
        deviceName: body.deviceName ?? undefined,
      },
    });
    return { success: true };
  }

  @Delete('me/device-tokens/:token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a device token (logout / uninstall).' })
  async deleteDeviceToken(@Request() req: any, @Param('token') token: string) {
    await this.prisma.deviceToken.deleteMany({
      where: { userId: req.user.sub, token },
    });
    return { success: true };
  }
}

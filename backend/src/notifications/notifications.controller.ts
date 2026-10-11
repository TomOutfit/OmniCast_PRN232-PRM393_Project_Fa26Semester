// ============================================================
// OmniCast - Notifications Controller
// ============================================================

import {
  Controller,
  Get,
  Post,
  Delete,
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
import { ListNotificationsQueryDto } from './dto/notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
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

  @Get('unread-count')
  @ApiOperation({
    summary: 'Cheap endpoint for the bell badge — returns just the unread count.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Unread count' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async unreadCount(@Request() req: any) {
    return this.notifications.unreadCount(req.user.sub);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark every notification as read for the current user.' })
  @ApiResponse({ status: 200, description: '200 OK — All marked as read' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async markAllRead(@Request() req: any) {
    return this.notifications.markAllRead(req.user.sub);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read.' })
  @ApiResponse({ status: 200, description: '200 OK — Notification marked as read' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async markOneRead(@Request() req: any, @Param('id') id: string) {
    return this.notifications.markOneRead(req.user.sub, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a single notification.' })
  @ApiResponse({ status: 200, description: '200 OK — Notification removed' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  async removeOne(@Request() req: any, @Param('id') id: string) {
    return this.notifications.removeOne(req.user.sub, id);
  }
}

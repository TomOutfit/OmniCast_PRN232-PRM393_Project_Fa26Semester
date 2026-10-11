// ============================================================
// OmniCast - Admin Controller
// ============================================================

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

export class BroadcastAnnouncementDto {
  @ApiProperty({ example: 'Bảo trì hệ thống định kỳ', description: 'Tiêu đề thông báo' })
  title: string;

  @ApiProperty({ example: 'Hệ thống sẽ bảo trì nâng cấp trong vòng 30 phút.', description: 'Nội dung thông báo' })
  message: string;

  @ApiProperty({ required: false, example: 'https://omnicast.tv/notice/1', description: 'Đường dẫn liên kết chi tiết' })
  actionUrl?: string;
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
@ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get aggregated system analytics overview (Admin only)' })
  @ApiResponse({ status: 200, description: 'System analytics overview retrieved successfully' })
  async getOverview() {
    return this.adminService.getOverview();
  }

  @Post('system/announcement')
  @ApiOperation({ summary: 'Broadcast system announcement to all active users (Admin only)' })
  @ApiResponse({ status: 201, description: 'System announcement sent successfully' })
  async broadcastAnnouncement(
    @Request() req: any,
    @Body() dto: BroadcastAnnouncementDto,
  ) {
    if (!dto.title || !dto.message) {
      throw new BadRequestException('Tiêu đề và nội dung thông báo không được để trống');
    }
    return this.adminService.broadcastAnnouncement(
      req.user?.sub,
      dto.title,
      dto.message,
      dto.actionUrl,
    );
  }
}

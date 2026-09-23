// ============================================================
// OmniCast - Audit Logger Controller
// ============================================================

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditLoggerService } from './audit-logger.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('audit-logger')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditLoggerController {
  constructor(private readonly auditLoggerService: AuditLoggerService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all audit logs (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.auditLoggerService.findAll({
      page: Number(page),
      limit: Number(limit),
      userId,
      action,
      entityType,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  @Get('entity/:entityType/:entityId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLoggerService.findByEntity(entityType, entityId);
  }

  @Get('user/:userId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get audit logs for a specific user' })
  async findByUser(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditLoggerService.findByUser(userId, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('recent')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get recent audit logs' })
  async getRecentActivity(@Query('limit') limit?: number) {
    return this.auditLoggerService.getRecentActivity(Number(limit) || 10);
  }

  @Get('stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get audit action statistics' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getActionStats(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.auditLoggerService.getActionStats(
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }
}

// ============================================================
// OmniCast - Audit Logger Controller
// ============================================================

import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AuditLoggerService } from './audit-logger.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('audit-logger')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid credentials' })
@ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
export class AuditLoggerController {
  constructor(private readonly auditLoggerService: AuditLoggerService) {}

  @Get('export')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Export audit logs as CSV or JSON (Admin only)' })
  @ApiResponse({ status: 200, description: 'Audit log export downloaded successfully' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'] })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async exportLogs(
    @Res() res: any,
    @Query('format') format = 'csv',
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: number,
  ) {
    const logs = await this.auditLoggerService.exportLogs({
      action,
      entityType,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      limit: limit ? Number(limit) : 1000,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="omnicast-audit-logs-${timestamp}.json"`,
      );
      return res.send(JSON.stringify(logs, null, 2));
    }

    // CSV format
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="omnicast-audit-logs-${timestamp}.csv"`,
    );

    const headers = [
      'id',
      'createdAt',
      'action',
      'entityType',
      'entityId',
      'userId',
      'userEmail',
      'ipAddress',
    ];
    const csvRows = [headers.join(',')];
    for (const log of logs) {
      const row = [
        `"${log.id || ''}"`,
        `"${log.createdAt ? (log.createdAt as any).toISOString() : ''}"`,
        `"${log.action || ''}"`,
        `"${log.entityType || ''}"`,
        `"${log.entityId || ''}"`,
        `"${log.userId || ''}"`,
        `"${(log.userEmail || '').replace(/"/g, '""')}"`,
        `"${log.ipAddress || ''}"`,
      ];
      csvRows.push(row.join(','));
    }
    return res.send(csvRows.join('\n'));
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all audit logs (Admin only)' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
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
      page: Number(page) || 1,
      limit: Number(limit) || 50,
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
  @ApiResponse({ status: 200, description: 'Entity audit logs retrieved successfully' })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLoggerService.findByEntity(entityType, entityId);
  }

  @Get('user/:userId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get audit logs for a specific user' })
  @ApiResponse({ status: 200, description: 'User audit logs retrieved successfully' })
  async findByUser(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditLoggerService.findByUser(userId, {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    });
  }

  @Get('recent')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get recent audit logs' })
  @ApiResponse({ status: 200, description: 'Recent audit logs retrieved successfully' })
  async getRecentActivity(@Query('limit') limit?: number) {
    return this.auditLoggerService.getRecentActivity(Number(limit) || 10);
  }

  @Get('stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get audit action statistics' })
  @ApiResponse({ status: 200, description: 'Audit action statistics retrieved successfully' })
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

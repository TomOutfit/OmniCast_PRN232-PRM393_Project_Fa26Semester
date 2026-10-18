import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './prisma.health';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API and database health status' })
  @ApiResponse({ status: 200, description: 'All health checks passed (database connected)' })
  @ApiResponse({ status: 503, description: 'Service Unavailable - Database or dependent service unhealthy' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }

  @Get('ping')
  @ApiOperation({ summary: 'Simple liveness ping endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('db-pool')
  @ApiOperation({ summary: 'Inspect PostgreSQL & Supavisor database connection pool metrics' })
  @ApiResponse({ status: 200, description: 'Live connection pool metrics' })
  async getDbPoolStatus() {
    return this.prisma.getPoolMetrics();
  }
}

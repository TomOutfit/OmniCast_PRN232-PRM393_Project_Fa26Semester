// ============================================================
// OmniCast - Audit Logger gRPC Microservice: Health Check
// ============================================================
//
// HTTP `/health` endpoint that does NOT speak gRPC — useful for
// Render's uptime probe and for Docker healthcheck.
// ============================================================

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch (_) {
      dbOk = false;
    }
    return {
      status: dbOk ? 'ok' : 'degraded',
      service: 'audit-logger',
      db: dbOk ? 'reachable' : 'unreachable',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

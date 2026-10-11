// ============================================================
// OmniCast - Stream Health Controller
// ============================================================
//
// Public read endpoints (stats) + admin-only write endpoints
// (manual probe trigger). Lives at `/programs/health/*` so it
// shares the same path prefix as the rest of the Programs API.
// ============================================================

import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  StreamHealthCheckService,
  type HealthStats,
} from './stream-health-check.service';

@ApiTags('programs')
@Controller('programs/health')
export class StreamHealthController {
  constructor(private readonly health: StreamHealthCheckService) {}

  /** Cheap read endpoint — Studio dashboard polls every 30s. */
  @Get('stats')
  @ApiOperation({
    summary:
      'Stream health snapshot (counts by license + sourceType, ' +
      'totals). Cheap — no probes are run. Safe to poll from the ' +
      'Studio dashboard every 30s.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Health stats snapshot' })
  async stats(): Promise<HealthStats> {
    return this.health.getStats();
  }

  /** Admin-only: probe a single recording synchronously. */
  @Post('recordings/:id/probe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Manually trigger a probe for a single recording. Returns the ' +
      'ProbeResult and persists `isActive` + `lastStatus` to the DB.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Probe result' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  @ApiResponse({ status: 404, description: '404 Not Found' })
  async probe(@Param('id') id: string) {
    return this.health.checkRecording(id);
  }

  /** Admin-only: trigger a full sweep (default 500 records). */
  @Post('sweep')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STAFF', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Manually trigger a probe sweep. `batch` defaults to 500; pass ' +
      '`includeInactive=true` to also re-probe rows that are already ' +
      'flagged `isActive=false`. The cron jobs run automatically, this ' +
      'endpoint is for ops debugging.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Sweep summary' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  async sweep(
    @Query('batch') batch?: number,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.health.sweep({
      batch: batch ? Number(batch) : undefined,
      includeInactive: includeInactive === 'true',
    });
  }
}

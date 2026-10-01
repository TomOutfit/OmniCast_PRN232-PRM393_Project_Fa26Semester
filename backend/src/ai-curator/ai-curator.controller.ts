// ============================================================
// OmniCast - AI Curator Controller
// ============================================================

import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AiCuratorService } from './ai-curator.service';
import { CurateContentDto } from './dto/ai-curator.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('ai-curator')
@Controller('ai-curator')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT access token' })
@ApiResponse({ status: 403, description: 'Forbidden - requires STAFF or ADMIN role' })
export class AiCuratorController {
  constructor(private readonly aiCuratorService: AiCuratorService) {}

  @Post('curate')
  @HttpCode(HttpStatus.OK)
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({
    summary: 'Run AI content curation on a program (Staff/Admin only)',
  })
  @ApiResponse({ status: 200, description: 'AI curation completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid curation payload or parameters' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async curateContent(@Body() curateDto: CurateContentDto, @Request() req: any) {
    return this.aiCuratorService.curateContent(curateDto, req.user.sub);
  }

  @Post('analyze/:programId')
  @HttpCode(HttpStatus.OK)
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({
    summary: 'Analyze program with AI curator (Staff/Admin only) - Alias for /curate',
  })
  @ApiResponse({ status: 200, description: 'AI analysis completed successfully' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async analyzeContent(@Param('programId') programId: string, @Request() req: any) {
    return this.aiCuratorService.curateContent({ programId, forceRefresh: false }, req.user.sub);
  }

  @Get('history/:programId')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Get curation history for a program' })
  @ApiResponse({ status: 200, description: 'Curation history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async getCurationHistory(@Param('programId') programId: string) {
    return this.aiCuratorService.getCurationHistory(programId);
  }
}

// ============================================================
// OmniCast - AI Curator Controller
// ============================================================

import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiCuratorService } from './ai-curator.service';
import { CurateContentDto } from './dto/ai-curator.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('ai-curator')
@Controller('ai-curator')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AiCuratorController {
  constructor(private readonly aiCuratorService: AiCuratorService) {}

  @Post('curate')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({
    summary: 'Run AI content curation on a program (Staff/Admin only)',
  })
  async curateContent(@Body() curateDto: CurateContentDto, @Request() req: any) {
    return this.aiCuratorService.curateContent(curateDto, req.user.sub);
  }

  @Get('history/:programId')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Get curation history for a program' })
  async getCurationHistory(@Param('programId') programId: string) {
    return this.aiCuratorService.getCurationHistory(programId);
  }
}

// ============================================================
// OmniCast - Newsletter Controller
// ------------------------------------------------------------
// Public POST /newsletter/subscribe — anyone can sign up.
// POST /newsletter/unsubscribe is public too (uses opaque token
// from the email body, no auth needed).
// GET /newsletter/subscribers is ADMIN-only.
// ============================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { NewsletterService } from './newsletter.service';
import {
  SubscribeNewsletterDto,
  UnsubscribeNewsletterDto,
} from './dto/newsletter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Request as ExpressRequest } from 'express';

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Post('subscribe')
  // Anti-spam — 5 signups per minute per IP, well above any
  // legitimate use case but slow enough to defeat bots.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Subscribe an email to the OmniCast weekly EPG digest. Idempotent — safe to retry.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Subscribed (or already)' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Invalid email' })
  @ApiResponse({ status: 429, description: '429 Too Many Requests' })
  async subscribe(
    @Body() dto: SubscribeNewsletterDto,
    @Req() req: ExpressRequest,
  ) {
    const user = (req as any).user;
    return this.newsletter.subscribe(dto, {
      userId: user?.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Soft-unsubscribe by token (token is sent in every email). Public — no auth required.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Unsubscribed' })
  @ApiResponse({ status: 404, description: '404 — Invalid token' })
  async unsubscribe(@Body() dto: UnsubscribeNewsletterDto) {
    return this.newsletter.unsubscribe(dto.token);
  }

  @Get('subscribers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List newsletter subscribers (Admin only).' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'includeUnsubscribed', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: '200 OK — Subscriber list' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden — Admin only' })
  async list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('includeUnsubscribed') includeUnsubscribed?: string,
  ) {
    return this.newsletter.listSubscribers({
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      includeUnsubscribed: String(includeUnsubscribed).toLowerCase() === 'true',
    });
  }
}

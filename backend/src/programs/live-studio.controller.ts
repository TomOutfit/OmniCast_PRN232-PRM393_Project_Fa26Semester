// ============================================================
// OmniCast - Live Studio Controller
// ============================================================
//
// HTTP surface for the Studio feature. All endpoints are gated to
// Staff/Admin only.
//
// Mounted under `/programs/studio` so it sits next to the live
// events / recordings API but doesn't pollute the public namespace.
// ============================================================

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { LiveStudioService } from './live-studio.service';
import { StudioCatalogService } from './studio-catalog.service';
import { StorageService } from './storage.service';
import { SocialService } from './social.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CurateLiveDto,
  AddToLibraryDto,
  AddFromCatalogDto,
  SelfRecordUploadDto,
  StopLiveDto,
} from './dto/live-studio.dto';
import { LiveStreamGateway } from '../websocket/live-stream.gateway';

// ============================================================
// DTOs for Mobile Push-to-Live
// ============================================================

class MobilePushToLiveDto {
  channelSlug: string;
  title: string;
  streamKey: string; // WebRTC stream key
  thumbnailUrl?: string;
}

class MobileStopLiveDto {
  eventId?: string;
  channelSlug: string;
}

@ApiTags('studio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
@Controller('programs/studio')
export class LiveStudioController {
  constructor(
    private readonly studioService: LiveStudioService,
    private readonly catalog: StudioCatalogService,
    private readonly storage: StorageService,
    private readonly configService: ConfigService,
    private readonly liveStreamGateway: LiveStreamGateway,
    private readonly socialService: SocialService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // 0a. Mobile Push-to-Live: Start streaming from mobile camera
  // ============================================================

  @Post('live/mobile/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Mobile broadcaster notifies backend when starting a live stream. ' +
      'Backend broadcasts to all connected viewers via WebSocket.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Live started' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Invalid payload' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden — Not Staff/Admin' })
  async mobilePushToLive(@Body() dto: MobilePushToLiveDto, @Request() req: any) {
    const eventId = `mobile-${Date.now()}-${dto.channelSlug}`;
    const mediaMtxWsUrl = this.configService.get('MEDIAMTX_WS_URL', 'ws://localhost:8889');
    
    // Construct HLS URL for viewers
    const mediaMtxHlsUrl = this.configService.get('MEDIAMTX_HLS_URL', 'http://localhost:8888');
    const hlsUrl = `${mediaMtxHlsUrl}/${dto.channelSlug}/live.m3u8`;
    
    // Construct WebRTC URL for viewers to connect
    const webrtcUrl = `${mediaMtxWsUrl}/${dto.channelSlug}`;

    // Broadcast to all viewers via WebSocket
    this.liveStreamGateway.notifyLiveStarted(dto.channelSlug, {
      eventId,
      title: dto.title,
      streamUrl: webrtcUrl,
      hlsUrl: hlsUrl,
      thumbnailUrl: dto.thumbnailUrl,
      startedAt: new Date().toISOString(),
      duration: 0, // Live has no scheduled end
    });

    // Also log to audit
    await this.studioService.logLiveEvent({
      eventType: 'LIVE_STARTED',
      channelSlug: dto.channelSlug,
      eventId,
      userId: req.user.sub,
      metadata: { title: dto.title, source: 'mobile' },
    });

    return {
      success: true,
      eventId,
      channelSlug: dto.channelSlug,
      hlsUrl,
      webrtcUrl,
      message: 'Live stream started. Viewers are being notified.',
    };
  }

  // ============================================================
  // 0b. Mobile Push-to-Live: Stop streaming
  // ============================================================

  @Post('live/mobile/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Mobile broadcaster notifies backend when stopping a live stream. ' +
      'Backend broadcasts to all connected viewers via WebSocket.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Live stopped' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Invalid payload' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden — Not Staff/Admin' })
  async mobileStopLive(@Body() dto: MobileStopLiveDto, @Request() req: any) {
    // Broadcast to all viewers via WebSocket
    this.liveStreamGateway.notifyLiveStopped(dto.channelSlug, {
      eventId: dto.eventId || 'unknown',
      reason: 'broadcaster_ended',
      stoppedAt: new Date().toISOString(),
    });

    // Also log to audit
    await this.studioService.logLiveEvent({
      eventType: 'LIVE_STOPPED',
      channelSlug: dto.channelSlug,
      eventId: dto.eventId,
      userId: req.user.sub,
      metadata: { source: 'mobile' },
    });

    return {
      success: true,
      channelSlug: dto.channelSlug,
      message: 'Live stream stopped. Viewers are being notified.',
    };
  }

  // ============================================================
  // 0c. Get all active live streams (for viewer app)
  // ============================================================

  @Get('live/active')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all currently active live streams across all channels.',
  })
  @ApiResponse({ status: 200, description: '200 OK — List of active live streams' })
  async getActiveLiveStreams() {
    const activeStreams = await this.studioService.getActiveLiveStreams();
    return {
      total: activeStreams.length,
      streams: activeStreams,
    };
  }

  // ============================================================
  // 0. Get stream URL (public - no auth required)
  // ============================================================

  @Get('stream-url/:channelSlug')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get the current stream URL for a channel. Returns live stream ' +
      'URL if Admin/Staff is currently broadcasting, otherwise returns ' +
      'the fallback playlist URL. This endpoint is public so viewers ' +
      'can get stream URLs without authentication.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Stream URL info' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel not found' })
  async getStreamUrl(@Param('channelSlug') channelSlug: string) {
    const liveEvent = await this.studioService.getCurrentLiveEvent(channelSlug);

    const mediaMtxHlsUrl = this.configService.get('MEDIAMTX_HLS_URL', 'http://localhost:8888');
    const channelHlsUrl = `${mediaMtxHlsUrl}/${channelSlug}/live.m3u8`;

    if (liveEvent) {
      return {
        isLive: true,
        type: 'live',
        streamUrl: liveEvent.streamUrl || channelHlsUrl,
        hlsUrl: channelHlsUrl,
        eventId: liveEvent.id,
        title: liveEvent.title,
        description: liveEvent.description,
        thumbnailUrl: liveEvent.thumbnailUrl,
        startedAt: liveEvent.startedAt?.toISOString(),
        duration: liveEvent.duration,
        viewerCount: liveEvent.viewerCount || 0,
      };
    }

    return {
      isLive: false,
      type: 'vod',
      streamUrl: null,
      message: 'No live event currently active',
    };
  }

  private isUuid(val?: string): boolean {
    return !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  }

  // ============================================================
  // 0d. Get live event interaction snapshot (fallback before socket connects)
  // ============================================================

  @Get('events/:eventId/interaction')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get live event interaction snapshot (realtime viewer count, comments, reactions).',
  })
  async getLiveInteraction(@Param('eventId') eventId: string) {
    if (!eventId || !this.isUuid(eventId)) {
      return {
        eventId,
        title: 'Live Stream',
        description: null,
        thumbnailUrl: null,
        status: 'LIVE',
        streamUrl: null,
        channel: null,
        startedAt: new Date().toISOString(),
        duration: 0,
        viewerCount: this.liveStreamGateway.getEventRoomSize(eventId) || 0,
        comments: [],
        reactions: {},
        totalReactions: 0,
      };
    }

    const [event, commentsRes, reactionsRes] = await Promise.all([
      this.prisma.liveEvent.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          status: true,
          streamUrl: true,
          viewerCount: true,
          likeCount: true,
          commentCount: true,
          startedAt: true,
          duration: true,
          channel: {
            select: {
              id: true,
              slug: true,
              name: true,
              logoUrl: true,
              category: true,
              subcategory: true,
              bannerColor: true,
            },
          },
        },
      }).catch(() => null),
      this.socialService
        .listCommentsByLiveEvent(eventId, { limit: 50 })
        .catch(() => ({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } })),
      this.socialService
        .listReactionsByLiveEvent(eventId)
        .catch(() => ({ data: {}, total: 0 })),
    ]);

    if (!event) {
      return {
        eventId,
        title: 'Live Stream',
        description: null,
        thumbnailUrl: null,
        status: 'LIVE',
        streamUrl: null,
        channel: null,
        startedAt: new Date().toISOString(),
        duration: 0,
        viewerCount: this.liveStreamGateway.getEventRoomSize(eventId) || 0,
        comments: commentsRes?.data || [],
        reactions: reactionsRes?.data || {},
        totalReactions: reactionsRes?.total || 0,
      };
    }

    const realtimeViewerCount = this.liveStreamGateway.getEventRoomSize(eventId);
    const viewerCount = Math.max(realtimeViewerCount, event.viewerCount || 0);

    return {
      eventId: event.id,
      title: event.title,
      description: event.description,
      thumbnailUrl: event.thumbnailUrl,
      status: event.status,
      streamUrl: event.streamUrl,
      channel: event.channel,
      startedAt: event.startedAt?.toISOString(),
      duration: event.duration,
      viewerCount,
      comments: commentsRes?.data || [],
      reactions: reactionsRes?.data || {},
      totalReactions: reactionsRes?.total || 0,
    };
  }

  // ============================================================
  // 1. List recordings the Studio can broadcast
  // ============================================================

  @Get('channels/:channelId/recordings')
  @ApiOperation({
    summary:
      'List recordings on a channel that the Studio is allowed to ' +
      'broadcast as LIVE. External platforms (YouTube, Twitch, ' +
      'Vimeo, etc.) are filtered out so the picker UI cannot even ' +
      'show them.',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'all', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: '200 OK — Broadcastable recordings' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel not found' })
  async listBroadcastableRecordings(
    @Param('channelId') channelId: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('all') all?: string,
  ) {
    const isAll = all === 'true' || channelId === 'all';
    const items = await this.studioService.listBroadcastableRecordings(
      channelId,
      { search, limit, allOmnicast: isAll },
    );
    return { total: items.length, items };
  }

  // ============================================================
  // 2. Curate live (chọn nội dung phát lên màn hình)
  // ============================================================

  @Post('curate-live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Push one or more existing recordings as LIVE NOW on a channel. ' +
      'Ends any in-flight live event on the same channel so we never ' +
      'have two concurrent broadcasts. Anti-piracy guard rejects ' +
      'YouTube/Twitch/Vimeo/etc. sources.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Live event created' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Invalid payload' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden — Recording blocked by anti-piracy guard' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel or recording missing' })
  async curateLive(@Body() dto: CurateLiveDto, @Request() req: any) {
    return this.studioService.curateLive(dto, req.user.sub);
  }

  // ============================================================
  // 3. Stop live (kết thúc phát sóng)
  // ============================================================

  @Post('live-events/:eventId/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'End a curated live event. With `keepAsVod=true` the event ' +
      'moves to ON_DEMAND so viewers can re-watch it.',
  })
  @ApiResponse({ status: 200, description: '200 OK — Live event ended' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Event not live' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  @ApiResponse({ status: 404, description: '404 Not Found — Live event missing' })
  async stopLive(
    @Param('eventId') eventId: string,
    @Body() dto: StopLiveDto,
    @Request() req: any,
  ) {
    return this.studioService.stopLive(eventId, req.user.sub, dto);
  }

  // ============================================================
  // 4. Add to library (mở rộng kho nội dung từ URL bất kỳ)
  // ============================================================

  @Post('recordings/library')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Thêm một video từ URL bất kỳ (MP4 / HLS / direct file) vào kho ' +
      'nội dung broadcastable của một kênh. Backend HEAD-checks URL ' +
      'trước khi lưu để bảo đảm nguồn còn sống. Nguồn thương mại ' +
      '(YouTube, Twitch, Vimeo, Facebook, TikTok, Dailymotion) vẫn bị ' +
      'từ chối — chỉ chấp nhận MP4/HLS self-hosted hoặc CDN tự do.',
  })
  @ApiResponse({ status: 201, description: '201 Created — Recording persisted' })
  @ApiResponse({ status: 400, description: '400 Bad Request — URL not reachable' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden — Blocked platform' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel not found' })
  async addToLibrary(@Body() dto: AddToLibraryDto, @Request() req: any) {
    return this.studioService.addToLibrary(dto, req.user.sub);
  }

  // ============================================================
  // 4b. Add from catalog (one-click từ danh mục nguồn công khai)
  // ============================================================
  //
  // The Studio UI shows a curated list of public-domain / royalty-
  // free video sources (Mux test streams, Cloudinary samples,
  // Internet Archive, etc.). The operator picks one and clicks
  // "Thêm vào kênh" — this endpoint persists the catalog entry
  // as a `Recording` row scoped to the chosen channel, with
  // operator-overridable display labels. The result is
  // immediately selectable in the "Chọn nội dung" picker so the
  // operator can stream it on the very next "PHÁT SÓNG" click.

  @Post('recordings/library/from-catalog')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Thêm một video từ danh mục nguồn công khai vào kho nội dung ' +
      'broadcastable của kênh. Probe bỏ qua cho các nguồn CDN đáng ' +
      'tin cậy (Mux / Cloudinary / Archive / ...) — đã được kiểm ' +
      'định tại thời điểm build catalog.',
  })
  @ApiResponse({ status: 201, description: '201 Created — Recording persisted' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Invalid payload' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  @ApiResponse({ status: 404, description: '404 Not Found — Catalog entry or channel missing' })
  async addFromCatalog(@Body() dto: AddFromCatalogDto, @Request() req: any) {
    const entry = this.catalog.findById(dto.catalogId);
    if (!entry) {
      throw new NotFoundException(
        `Catalog entry not found: ${dto.catalogId}`,
      );
    }
    return this.studioService.addFromCatalog(
      entry,
      dto.channelId,
      req.user.sub,
      {
        overrideTitle: dto.title,
        overrideDescription: dto.description,
        isPublished: dto.isPublished,
      },
    );
  }

  // ============================================================
  // 5. Self-record upload (tự ghi hình nội dung livestream)
  // ============================================================

  @Post('recordings/upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Upload a self-recorded clip (mobile camera capture). With ' +
      '`visibility=IMMEDIATE` the clip is also pushed LIVE NOW on the ' +
      'channel. `SCHEDULED` publishes as a normal Recording. `PRIVATE` ' +
      'saves a Staff-only draft.',
  })
  @ApiResponse({ status: 201, description: '201 Created — Recording persisted (and optionally live)' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Invalid payload' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  @ApiResponse({ status: 404, description: '404 Not Found — Channel not found' })
  async uploadSelfRecord(
    @Body() dto: SelfRecordUploadDto,
    @Request() req: any,
  ) {
    return this.studioService.uploadSelfRecord(dto, req.user.sub);
  }

  // ============================================================
  // 6. Self-record file upload (multipart)
  // ============================================================
  // Mobile clients call this with a `multipart/form-data` payload
  // containing the actual video file. The backend stores the
  // bytes through `StorageService` and returns the public URL.
  // The mobile app then chains that URL into
  // `POST /programs/studio/recordings/upload` to persist the
  // Recording metadata and (optionally) push it LIVE.
  @Post('recordings/upload/file')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      // 500 MB cap — students record 5-15 min clips at 1080p.
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary:
      'Upload a self-recorded video file (multipart). Returns a ' +
      'public URL the mobile app then passes to ' +
      '`/programs/studio/recordings/upload` as `videoUrl`.',
  })
  @ApiResponse({ status: 201, description: '201 Created — File saved' })
  @ApiResponse({ status: 400, description: '400 Bad Request — Missing file or too large' })
  @ApiResponse({ status: 401, description: '401 Unauthorized' })
  @ApiResponse({ status: 403, description: '403 Forbidden' })
  async uploadSelfRecordFile(
    @UploadedFile() file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    @Request() req: any,
  ) {
    if (!file) {
      throw new Error('No file uploaded under field "file".');
    }
    // Build the request's origin (e.g. `https://omnicast-api.vercel.app`)
    // so the returned `url` is absolute and clients can stream it
    // without a separate config step. `req.headers.host` works behind
    // Vercel/Heroku proxies; the `x-forwarded-proto` header carries
    // the original scheme when running behind a TLS-terminating load
    // balancer.
    const proto =
      (req.headers['x-forwarded-proto'] as string | undefined)?.split(
        ',',
      )[0] || req.protocol || 'http';
    const host =
      (req.headers['x-forwarded-host'] as string | undefined) ||
      req.headers.host;
    const publicBaseUrl = host ? `${proto}://${host}` : undefined;

    const saved = await this.storage.saveBuffer(file.buffer, {
      prefix: 'self-record',
      originalName: file.originalname,
      publicBaseUrlOverride: publicBaseUrl,
    });
    return {
      url: saved.url,
      size: saved.size,
      storageKey: saved.storageKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
    };
  }
}
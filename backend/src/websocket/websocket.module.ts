// ============================================================
// OmniCast - WebSocket Module
// ============================================================
//
// Provides real-time WebSocket communication for live streaming.
// Exports LiveStreamGateway for use by other modules (e.g., LiveStudioService).
// ============================================================

import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LiveStreamGateway } from './live-stream.gateway';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [LiveStreamGateway],
  exports: [LiveStreamGateway],
})
export class WebsocketModule {}

// ============================================================
// OmniCast - WebSocket Module
// ============================================================
//
// Provides real-time WebSocket communication for live streaming.
// Exports LiveStreamGateway for use by other modules (e.g., LiveStudioService).
// ============================================================

import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LiveStreamGateway } from './live-stream.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgramsModule } from '../programs/programs.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => ProgramsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '30d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [LiveStreamGateway],
  exports: [LiveStreamGateway],
})
export class WebsocketModule {}

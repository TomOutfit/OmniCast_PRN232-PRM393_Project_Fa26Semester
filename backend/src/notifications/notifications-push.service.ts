// ============================================================
// OmniCast - Push Notifications Service (FCM)
// ============================================================
//
// Sends Firebase Cloud Messaging payloads to the user's registered
// device tokens. Only loaded when `FIREBASE_SERVICE_ACCOUNT_JSON`
// env is set — otherwise this is a no-op and the existing in-app
// notification table continues to work.
//
// Reads device tokens from `DeviceToken` (`009_device_tokens.sql`).
// ============================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  type: 'PROGRAM_REMINDER' | 'LIVE_STARTED' | 'GENERIC';
  userId?: string;     // Optional: send to a specific user
  tokens?: string[];   // Optional: send to a known list of tokens
  title: string;
  body: string;
  data?: Record<string, string>;
  programId?: string;
}

interface FirebaseAdminLike {
  apps: { length: number };
  initializeApp: (opts: any) => any;
  credential: { cert: (creds: any) => any };
  messaging: () => { 
    send: (msg: any) => Promise<string>;
    sendEachForMulticast: (msg: any) => Promise<{ 
      successCount: number; 
      failureCount: number;
      responses: Array<{ success: boolean; error?: any; messageId?: string }>;
    }>;
  };
}

@Injectable()
export class NotificationsPushService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsPushService.name);
  private admin: FirebaseAdminLike | null = null;
  private enabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const credsRaw =
      this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!credsRaw) {
      this.logger.log(
        'NotificationsPushService: FIREBASE_SERVICE_ACCOUNT_JSON not set → push notifications disabled',
      );
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = (await import('firebase-admin').catch(() => null)) as any;
      if (!admin) {
        this.logger.warn(
          'firebase-admin not installed; install with `npm i firebase-admin` to enable FCM',
        );
        return;
      }
      if (admin.apps.length === 0) {
        const credentials = JSON.parse(credsRaw);
        admin.initializeApp({ credential: admin.credential.cert(credentials) });
      }
      this.admin = admin;
      this.enabled = true;
      this.logger.log('NotificationsPushService: FCM enabled');
    } catch (err) {
      this.logger.warn(
        `Failed to initialise Firebase Admin SDK; push disabled: ${err}`,
      );
    }
  }

  /**
   * Send a push notification to a user (all their devices) or to a
   * specific token list. Multi-cast via `sendEachForMulticast` when
   * >1 token, single `send` otherwise.
   */
  async send(payload: PushPayload): Promise<{ sent: number; errors: number }> {
    if (!this.enabled || !this.admin) {
      // Soft-fail: in-app notifications continue to work via the
      // existing `Notification` table; FCM is optional.
      this.logger.debug(
        `[push disabled] would have sent "${payload.title}" to user=${payload.userId}`,
      );
      return { sent: 0, errors: 0 };
    }

    const tokens = await this.resolveTokens(payload);
    if (tokens.length === 0) return { sent: 0, errors: 0 };

    const message: any = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        type: payload.type,
        ...(payload.programId ? { programId: payload.programId } : {}),
        ...(payload.data ?? {}),
      },
      android: {
        priority: 'high' as const,
        notification: { channelId: 'omnicast_default' },
      },
      apns: {
        payload: {
          aps: { sound: 'default' },
        },
      },
    };

    try {
      const response = await this.admin.messaging().sendEachForMulticast(message);
      const errors = response.responses.filter((r: any) => r.error).length;
      this.logger.log(
        `[push] sent ${response.successCount} ok / ${errors} errors`,
      );
      return { sent: response.successCount, errors };
    } catch (err) {
      this.logger.warn(`FCM send failed: ${err}`);
      return { sent: 0, errors: tokens.length };
    }
  }

  /**
   * Wire-up hook for the watchlist reminder worker. Fired 15 minutes
   * before `scheduledAt` for any program that the user has on their
   * watchlist.
   */
  async sendProgramReminder(opts: { userId: string; programId: string; title: string; scheduledAt: Date }) {
    const body = `Chương trình "${opts.title}" sẽ bắt đầu lúc ${opts.scheduledAt.toLocaleTimeString('vi-VN')} (khoảng 15 phút nữa).`;
    return this.send({
      type: 'PROGRAM_REMINDER',
      userId: opts.userId,
      title: 'Sắp tới giờ xem 📺',
      body,
      programId: opts.programId,
    });
  }

  private async resolveTokens(payload: PushPayload): Promise<string[]> {
    if (payload.tokens && payload.tokens.length > 0) {
      return payload.tokens;
    }
    if (!payload.userId) return [];

    try {
      const rows = await this.prisma.deviceToken.findMany({
        where: { userId: payload.userId },
        select: { token: true },
      });
      return rows.map((r: any) => r.token);
    } catch (_) {
      // `DeviceToken` table might not exist yet (migration 009 not
      // applied). Return empty — caller will treat it as "no devices".
      return [];
    }
  }
}

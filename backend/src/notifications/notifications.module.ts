// ============================================================
// OmniCast - Notifications Module
// ============================================================

import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsPushService } from './notifications-push.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsPushService],
  exports: [NotificationsService, NotificationsPushService],
})
export class NotificationsModule {}

// ============================================================
// OmniCast - Admin Module
// ============================================================

import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLoggerModule } from '../audit-logger/audit-logger.module';

@Module({
  imports: [PrismaModule, AuditLoggerModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule { }

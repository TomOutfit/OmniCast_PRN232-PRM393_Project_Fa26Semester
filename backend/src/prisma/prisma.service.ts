// ============================================================
// OmniCast - Prisma Service (Database Client)
// ============================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function getDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Optimize Supabase URL for serverless connection pooling
  if (url.includes('pooler.supabase.com')) {
    // Switch from session port 5432 to transaction pooler port 6543
    url = url.replace(':5432/', ':6543/');
    if (!url.includes('pgbouncer=true')) {
      url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true&connection_limit=1';
    } else if (!url.includes('connection_limit=')) {
      url += '&connection_limit=1';
    }
  }
  return url;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const dbUrl = getDatabaseUrl();
    super({
      ...(dbUrl && { datasources: { db: { url: dbUrl } } }),
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Soft delete helper
  async softDelete(model: any, id: string) {
    return model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

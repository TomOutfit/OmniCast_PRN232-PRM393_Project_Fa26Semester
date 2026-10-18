// ============================================================
// OmniCast - Prisma Service (Database Client)
// ============================================================

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export function optimizeDatabaseUrl(rawUrl?: string): string | undefined {
  const urlStr = rawUrl || process.env.DATABASE_URL;
  if (!urlStr) return undefined;

  try {
    const parsed = new URL(urlStr);

    // Optimize Supabase URL for connection pooling
    if (parsed.hostname.includes('pooler.supabase.com') || parsed.hostname.includes('supabase.com')) {
      // Switch from session port 5432 to transaction pooler port 6543
      if (parsed.port === '5432' || !parsed.port) {
        parsed.port = '6543';
      }

      // Always enable pgbouncer transaction mode
      parsed.searchParams.set('pgbouncer', 'true');

      // Set connection limit: 1 for serverless, 5 for standalone server / dev
      const isServerless =
        Boolean(process.env.VERCEL) ||
        Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
        Boolean(process.env.LAMBDA_TASK_ROOT) ||
        (typeof process.cwd === 'function' && process.cwd().startsWith('/var/task'));

      const defaultLimit = isServerless ? '1' : (process.env.DB_POOL_LIMIT || '5');
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', defaultLimit);
      }

      // Add pool and connect timeouts to fail fast instead of hanging connections
      if (!parsed.searchParams.has('pool_timeout')) {
        parsed.searchParams.set('pool_timeout', '15');
      }
      if (!parsed.searchParams.has('connect_timeout')) {
        parsed.searchParams.set('connect_timeout', '10');
      }
    }

    const finalUrl = parsed.toString();
    // Keep process.env.DATABASE_URL in sync so any raw PrismaClient instantiations inherit this
    process.env.DATABASE_URL = finalUrl;
    return finalUrl;
  } catch {
    return urlStr;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const dbUrl = optimizeDatabaseUrl();
    super({
      ...(dbUrl && { datasources: { db: { url: dbUrl } } }),
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    let attempts = 5;
    while (attempts > 0) {
      try {
        await this.$connect();
        return;
      } catch (err) {
        attempts--;
        if (attempts === 0) throw err;
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Inspect active PostgreSQL and Supavisor pool connections.
   */
  async getPoolMetrics() {
    try {
      const maxConnRows: any = await this.$queryRawUnsafe(`SHOW max_connections;`);
      const maxConnections = Number(maxConnRows?.[0]?.max_connections) || 60;

      const activeRows: any = await this.$queryRawUnsafe(`
        SELECT 
          pid,
          application_name,
          state,
          ROUND(EXTRACT(EPOCH FROM (NOW() - state_change))::numeric, 1) as idle_seconds
        FROM pg_stat_activity 
        WHERE datname = current_database();
      `);

      const total = activeRows.length;
      const idle = activeRows.filter((r: any) => r.state === 'idle').length;
      const active = activeRows.filter((r: any) => r.state === 'active').length;

      const byApp: Record<string, number> = {};
      for (const r of activeRows) {
        const app = r.application_name || 'unknown';
        byApp[app] = (byApp[app] || 0) + 1;
      }

      const usagePercent = Math.round((total / maxConnections) * 1000) / 10;
      const status = usagePercent > 80 ? 'CRITICAL' : usagePercent > 50 ? 'WARNING' : 'HEALTHY';

      return {
        status,
        totalConnections: total,
        maxConnections,
        activeConnections: active,
        idleConnections: idle,
        usagePercent,
        poolerPort: 6543,
        poolerMode: 'TRANSACTION_POOLER',
        byApplication: byApp,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'UNKNOWN',
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Soft delete helper
  async softDelete(model: any, id: string) {
    return model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

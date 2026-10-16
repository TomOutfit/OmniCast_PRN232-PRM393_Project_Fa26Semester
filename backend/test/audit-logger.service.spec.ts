/**
 * OmniCast - Audit Logger service unit tests
 *
 * Focuses on the new `findByEntityType` method that filters by
 * `entityType` (without requiring `entityId`) and supports optional
 * action / userId / from / to filters.
 *
 * Run via: `npm run test`
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AuditLoggerService } from '../src/audit-logger/audit-logger.service';

interface AuditLogRow {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
}

class FakePrisma {
  public rows: AuditLogRow[] = [];

  auditLog = {
    findMany: async (args: any) => {
      const where = args?.where ?? {};
      const filtered = this.rows.filter((r) => {
        if (where.entityType !== undefined && r.entityType !== where.entityType) {
          return false;
        }
        if (where.entityId !== undefined && r.entityId !== where.entityId) {
          return false;
        }
        if (where.action !== undefined && r.action !== where.action) {
          return false;
        }
        if (where.userId !== undefined && r.userId !== where.userId) {
          return false;
        }
        if (where.createdAt) {
          if (where.createdAt.gte && r.createdAt < where.createdAt.gte) {
            return false;
          }
          if (where.createdAt.lte && r.createdAt > where.createdAt.lte) {
            return false;
          }
        }
        return true;
      });
      // Default sort: createdAt desc
      const sorted = filtered.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      const skip = args?.skip ?? 0;
      const take = args?.take ?? sorted.length;
      return sorted.slice(skip, skip + take);
    },
  };

  user = {
    findUnique: async () => null,
  };
}

function makeService() {
  const prisma = new FakePrisma();
  const service = new AuditLoggerService(prisma as any, { get: () => null } as any);
  return { service, prisma };
}

function seed(prisma: FakePrisma, rows: Partial<AuditLogRow>[]) {
  prisma.rows = rows.map((r, i) => ({
    id: r.id ?? `log-${i}`,
    userId: r.userId ?? 'user-1',
    action: r.action ?? 'AI_CURATION_COMPLETE',
    entityType: r.entityType ?? 'AiCuratorReport',
    entityId: r.entityId ?? `entity-${i}`,
    createdAt: r.createdAt ?? new Date(Date.now() - i * 1000),
  }));
}

// ---------------------------------------------------------------
// findByEntityType()
// ---------------------------------------------------------------

test('findByEntityType returns only logs with the requested entityType', async () => {
  const { service, prisma } = makeService();
  seed(prisma, [
    { entityType: 'AiCuratorReport', action: 'AI_CURATION_COMPLETE' },
    { entityType: 'LiveEvent', action: 'AI_CURATION_APPLIED' },
    { entityType: 'AiCuratorReport', action: 'AI_CURATION_PREVIEW' },
    { entityType: 'User', action: 'USER_CREATED' },
  ]);

  const out = await service.findByEntityType('AiCuratorReport');

  assert.equal(out.length, 2);
  for (const row of out) {
    assert.equal(row.entityType, 'AiCuratorReport');
  }
});

test('findByEntityType honours the optional action filter', async () => {
  const { service, prisma } = makeService();
  seed(prisma, [
    { entityType: 'AiCuratorReport', action: 'AI_CURATION_COMPLETE' },
    { entityType: 'AiCuratorReport', action: 'AI_CURATION_PREVIEW' },
    { entityType: 'AiCuratorReport', action: 'AI_CURATION_APPLIED' },
  ]);

  const out = await service.findByEntityType('AiCuratorReport', {
    action: 'AI_CURATION_PREVIEW',
  });

  assert.equal(out.length, 1);
  assert.equal(out[0].action, 'AI_CURATION_PREVIEW');
});

test('findByEntityType honours the optional userId filter', async () => {
  const { service, prisma } = makeService();
  seed(prisma, [
    { entityType: 'AiCuratorReport', userId: 'alice' },
    { entityType: 'AiCuratorReport', userId: 'bob' },
    { entityType: 'AiCuratorReport', userId: 'alice' },
  ]);

  const out = await service.findByEntityType('AiCuratorReport', {
    userId: 'alice',
  });

  assert.equal(out.length, 2);
  for (const row of out) {
    assert.equal(row.userId, 'alice');
  }
});

test('findByEntityType orders results by createdAt desc', async () => {
  const { service, prisma } = makeService();
  seed(prisma, [
    { entityType: 'AiCuratorReport', createdAt: new Date('2026-01-01') },
    { entityType: 'AiCuratorReport', createdAt: new Date('2026-01-05') },
    { entityType: 'AiCuratorReport', createdAt: new Date('2026-01-03') },
  ]);

  const out = await service.findByEntityType('AiCuratorReport');

  assert.equal(out[0].createdAt.toISOString(), '2026-01-05T00:00:00.000Z');
  assert.equal(out[2].createdAt.toISOString(), '2026-01-01T00:00:00.000Z');
});

test('findByEntityType returns an empty array when nothing matches', async () => {
  const { service, prisma } = makeService();
  seed(prisma, [
    { entityType: 'LiveEvent', action: 'EVENT_UPDATED' },
  ]);

  const out = await service.findByEntityType('AiCuratorReport');
  assert.deepEqual(out, []);
});

test('findByEntityType honours skip / take pagination', async () => {
  const { service, prisma } = makeService();
  const rows = Array.from({ length: 10 }, (_, i) => ({
    entityType: 'AiCuratorReport',
    createdAt: new Date(Date.now() - i * 1000),
  }));
  seed(prisma, rows);

  const page2 = await service.findByEntityType('AiCuratorReport', {
    skip: 3,
    take: 4,
  });

  assert.equal(page2.length, 4);
});

test('findByEntityType honours from / to date range', async () => {
  const { service, prisma } = makeService();
  seed(prisma, [
    { entityType: 'AiCuratorReport', createdAt: new Date('2026-01-01') },
    { entityType: 'AiCuratorReport', createdAt: new Date('2026-01-15') },
    { entityType: 'AiCuratorReport', createdAt: new Date('2026-02-01') },
  ]);

  const out = await service.findByEntityType('AiCuratorReport', {
    from: new Date('2026-01-10'),
    to: new Date('2026-01-20'),
  });

  assert.equal(out.length, 1);
  assert.equal(out[0].createdAt.toISOString(), '2026-01-15T00:00:00.000Z');
});

test('findByEntityType does NOT also require entityId', async () => {
  // Regression: the existing findByEntity requires entityId too; the
  // new method must work without it.
  const { service, prisma } = makeService();
  seed(prisma, [
    {
      entityType: 'AiCuratorReport',
      entityId: 'report-1',
      action: 'AI_CURATION_COMPLETE',
    },
    {
      entityType: 'AiCuratorReport',
      entityId: null,
      action: 'AI_CURATION_PREVIEW',
    },
  ]);

  const out = await service.findByEntityType('AiCuratorReport');
  assert.equal(out.length, 2);
});
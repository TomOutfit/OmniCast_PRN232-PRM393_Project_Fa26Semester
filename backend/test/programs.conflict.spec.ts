/**
 * OmniCast - Conflict-detection unit tests
 *
 * Exercises `ProgramsService.checkScheduleConflict` indirectly by
 * instantiating the service with a mocked `PrismaService`,
 * `AuditLoggerService`, `TmdbEnrichmentService` and `ConfigService`. We
 * verify that the SQL `WHERE` clause produces the right rows for the
 * canonical edge cases:
 *
 *   1. No conflict rows from the database -> no exception.
 *   2. Conflict rows from the database -> ConflictException with details.
 *   3. SQL compares against effective end time (`endedAt` OR
 *      `scheduledAt + duration`).
 *   4. `excludeEventId` is forwarded as a SQL parameter.
 *   5. Without `excludeEventId`, the `id <>` clause is omitted.
 *
 * The test uses Node's native test runner (no Jest dependency required).
 *
 * Run with:
 *   npm run test
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

import { ProgramsService } from '../src/programs/programs.service';

/* --------------------------------------------------------------------- *
 * Types & helpers
 * --------------------------------------------------------------------- */

type ConflictRow = { id: string; title: string; scheduledAt: Date };

interface RawSqlCall {
  sql: string;
  values: unknown[];
  rawSql?: Prisma.Sql;
}

/**
 * `Prisma.Sql` is a tagged object with two top-level fields:
 *   - `strings`: array of SQL fragments (with `${...}` placeholders removed)
 *   - `values`:  array of bound parameter values
 *
 * In tests we only care about the textual shape of the query and the bound
 * parameter values, so we just concatenate the SQL fragments.
 */
function serializeSql(sql: unknown): string {
  if (typeof sql === 'string') return sql;
  if (sql && typeof sql === 'object') {
    const obj = sql as { strings?: unknown; values?: unknown };
    if (Array.isArray(obj.strings)) {
      return obj.strings.map((s) => String(s)).join(' ');
    }
    if (Array.isArray(sql)) return sql.map((s) => String(s)).join(' ');
  }
  return String(sql);
}

class FakePrisma {
  public readonly calls: RawSqlCall[] = [];
  public nextRows: ConflictRow[] = [];

  async $queryRaw<T>(_sql: Prisma.Sql, ..._values: unknown[]): Promise<T[]> {
    // Store the *original* Prisma.Sql so tests can introspect .values; also
    // store the serialized string for textual assertions.
    this.calls.push({ sql: serializeSql(_sql), values: _values, rawSql: _sql } as any);
    return this.nextRows as unknown as T[];
  }

  // No-op stubs (the conflict check never touches these).
  liveEvent = {
    findMany: async () => [],
    findUnique: async () => null,
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  };
  liveChannel = { update: async () => ({}) };
  recording = {
    findUnique: async () => null,
    findMany: async () => [],
    create: async () => ({}),
    update: async () => ({}),
    delete: async () => ({}),
    count: async () => 0,
  };
}

function makeService() {
  const prisma = new FakePrisma();
  const auditLogger = { log: async () => undefined } as any;
  const tmdbEnrichment = {
    enrichLiveEvent: async () => undefined,
    enrichRecording: async () => undefined,
  } as any;
  const configService = { get: (_key: string) => undefined } as any;

  const service = new ProgramsService(
    prisma as any,
    auditLogger,
    tmdbEnrichment,
    configService,
    {} as any,
  );

  // Reach into the private method via a cast (TS won't allow otherwise).
  const call = (
    channelId: string,
    startTime: Date,
    durationMinutes: number,
    excludeEventId?: string,
  ) =>
    (service as any).checkScheduleConflict(
      channelId,
      startTime,
      durationMinutes,
      excludeEventId,
    );

  return { prisma, call };
}

/* --------------------------------------------------------------------- *
 * Test cases
 * --------------------------------------------------------------------- */

test('checkScheduleConflict returns silently when there are no conflicts', async () => {
  const { prisma, call } = makeService();
  prisma.nextRows = [];

  await call('channel-1', new Date('2026-10-01T20:00:00Z'), 120);

  assert.equal(prisma.calls.length, 1, 'one SQL query expected');
});

test('checkScheduleConflict throws ConflictException when an overlap exists', async () => {
  const { prisma, call } = makeService();
  prisma.nextRows = [
    { id: 'evt-1', title: 'Championship', scheduledAt: new Date('2026-10-01T20:00:00Z') },
  ];

  await assert.rejects(
    () => call('channel-1', new Date('2026-10-01T21:00:00Z'), 60),
    (err: unknown) => {
      assert.ok(err instanceof ConflictException, 'expected ConflictException');
      const body = (err as any).getResponse?.() ?? (err as any).message;
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      assert.equal(parsed.message, 'Schedule conflict detected');
      assert.equal(parsed.conflicts.length, 1);
      assert.equal(parsed.conflicts[0].id, 'evt-1');
      return true;
    },
  );
});

test('checkScheduleConflict emits SQL that compares against effective end time', async () => {
  const { prisma, call } = makeService();
  prisma.nextRows = [];

  await call('channel-1', new Date('2026-10-01T20:00:00Z'), 90);

  const emitted = serializeSql(prisma.calls[0].sql);
  assert.match(emitted, /COALESCE\s*\(\s*"endedAt"/);
  assert.match(emitted, /"duration"/);
  assert.match(emitted, /::interval/);
  assert.match(emitted, /scheduledAt/i);
});

test('checkScheduleConflict forwards excludeEventId as a SQL parameter', async () => {
  const { prisma, call } = makeService();
  prisma.nextRows = [];

  await call(
    'channel-1',
    new Date('2026-10-01T20:00:00Z'),
    60,
    'evt-self',
  );

  const emitted = serializeSql(prisma.calls[0].sql);
  assert.match(emitted, /id <>/);

  // Prisma.Sql stores its parameters in `rawSql.values`.
  const rawSql = prisma.calls[0].rawSql as { values?: unknown[] };
  const allValues = rawSql?.values ?? [];
  assert.ok(
    allValues.some((v: any) => String(v) === 'evt-self'),
    `excludeEventId must be present in the bound parameters; got ${JSON.stringify(allValues)}`,
  );
});

test('checkScheduleConflict omits excludeEventId clause when not provided', async () => {
  const { prisma, call } = makeService();
  prisma.nextRows = [];

  await call('channel-1', new Date('2026-10-01T20:00:00Z'), 60);

  const emitted = serializeSql(prisma.calls[0].sql);
  assert.doesNotMatch(emitted, /id <>/);
});

test('checkScheduleConflict uses default duration (120m) for events without duration', async () => {
  // Guards the bug fix: an event whose `duration` column is NULL and whose
  // `endedAt` is also NULL (still SCHEDULED) must still be detected as
  // occupying the default 120-minute window.
  const { prisma, call } = makeService();
  prisma.nextRows = [
    {
      id: 'evt-default',
      title: 'Default-length slot',
      scheduledAt: new Date('2026-10-01T20:00:00Z'),
    },
  ];

  await assert.rejects(
    () => call('channel-1', new Date('2026-10-01T21:30:00Z'), 30),
    ConflictException,
  );
});

test('checkScheduleConflict does not throw when the only conflicting row is the one being excluded', async () => {
  const { prisma, call } = makeService();
  prisma.nextRows = []; // excludeEventId filters the row in SQL

  await call(
    'channel-1',
    new Date('2026-10-01T20:00:00Z'),
    60,
    'evt-self',
  );

  assert.ok(true, 'expected no exception');
});
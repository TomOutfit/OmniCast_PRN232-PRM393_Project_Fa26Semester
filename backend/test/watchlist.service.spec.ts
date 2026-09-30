/**
 * OmniCast - Watchlist service unit tests
 *
 * Covers the core service methods (list / listGrouped / add / remove /
 * sync) by injecting a fake PrismaService. The goal is to verify the
 * business rules:
 *
 *   - list() filters correctly when upcomingOnly is true (default 120min
 *     duration fallback, LIVE items always kept).
 *   - listGrouped() buckets items into upcoming/live/past correctly.
 *   - add() rejects unknown program IDs and upserts the rest.
 *   - remove() guards against deleting another user's items.
 *   - sync() reconciles upserts and returns removed IDs that are no
 *     longer present in the local snapshot.
 *
 * Run via: `npm run test`
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WatchlistService } from '../src/watchlist/watchlist.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// ---------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------

const fakeUserId = 'user-1';

function buildRow(overrides: Partial<any> = {}) {
  const baseRow = {
    id: overrides.id ?? 'wl-1',
    userId: overrides.userId ?? fakeUserId,
    programId: overrides.programId ?? 'prog-1',
    channelId: overrides.channelId ?? 'channel-1',
    note: overrides.note ?? null,
    addedAt: overrides.addedAt ?? new Date('2026-09-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-09-01T00:00:00Z'),
    program: {
      id: overrides.programId ?? 'prog-1',
      title: 'Champions League Final',
      thumbnailUrl: 'https://img/thumb.jpg',
      status: 'SCHEDULED',
      scheduledAt: overrides.scheduledAt ?? new Date('2026-12-31T20:00:00Z'),
      duration: overrides.duration ?? 120,
      channel: {
        id: 'channel-1',
        name: 'Sports HD',
        slug: 'sports-hd',
        logoUrl: null,
      },
    },
  };
  return baseRow;
}

class FakePrisma {
  public readonly rows: any[] = [];
  public upsertCalls: any[] = [];
  public deleteCalls: any[] = [];
  public findFirstCalls: any[] = [];
  public findManyCalls: any[] = [];

  watchlist = {
    findMany: async (args: any) => {
      this.findManyCalls.push(args);
      return this.rows;
    },
    findFirst: async (args: any) => {
      this.findFirstCalls.push(args);
      return this.rows.find(
        (r) => r.id === args.where.id && r.userId === args.where.userId,
      );
    },
    upsert: async (args: any) => {
      this.upsertCalls.push(args);
      const existing = this.rows.find((r) => r.userId === fakeUserId && r.programId === args.where.userId_programId.programId);
      if (existing) {
        Object.assign(existing, args.update ?? {});
        return existing;
      }
      const created = {
        id: `wl-${this.rows.length + 1}`,
        userId: fakeUserId,
        ...args.create,
        addedAt: new Date(),
        updatedAt: new Date(),
        program: {
          ...buildRow({ programId: args.where.userId_programId.programId }).program,
          ...(args.create?.program ?? {}),
        },
      };
      this.rows.push(created);
      return created;
    },
    delete: async (args: any) => {
      this.deleteCalls.push(args);
      const idx = this.rows.findIndex((r) => r.id === args.where.id);
      if (idx >= 0) this.rows.splice(idx, 1);
      return {};
    },
  };

  liveEvent = {
    findUnique: async (args: any) => {
      // Pretend only programs that start with "prog" exist
      return args.where.id.startsWith('prog')
        ? { id: args.where.id, channelId: 'channel-1' }
        : null;
    },
  };
}

function makeService(rows: any[] = []) {
  const prisma = new FakePrisma();
  prisma.rows.push(...rows);
  const auditLogger = { log: async () => undefined } as any;
  const service = new WatchlistService(prisma as any, auditLogger);
  return { service, prisma };
}

// ---------------------------------------------------------------------
// list()
// ---------------------------------------------------------------------

test('list returns all items when upcomingOnly is false', async () => {
  const { service } = makeService([
    buildRow({ programId: 'prog-1', scheduledAt: new Date('2020-01-01T00:00:00Z') }),
    buildRow({ programId: 'prog-2', scheduledAt: new Date('2099-01-01T00:00:00Z') }),
  ]);
  const out = await service.list(fakeUserId);
  assert.equal(out.total, 2);
  assert.equal(out.items.length, 2);
});

test('list filters out past programs when upcomingOnly is true', async () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { service } = makeService([
    buildRow({ programId: 'prog-past', scheduledAt: past }),
    buildRow({ programId: 'prog-future', scheduledAt: future }),
  ]);
  const out = await service.list(fakeUserId, { upcomingOnly: true });
  assert.equal(out.total, 1);
  assert.equal(out.items[0].programId, 'prog-future');
});

test('list keeps LIVE programs even when scheduledAt is in the past', async () => {
  const past = new Date(Date.now() - 60 * 60 * 1000);
  const { service } = makeService([
    buildRow({
      programId: 'prog-live',
      scheduledAt: past,
      duration: 180,
    }),
  ]);
  // Mark it LIVE
  service['prisma'].rows[0].program.status = 'LIVE';
  const out = await service.list(fakeUserId, { upcomingOnly: true });
  assert.equal(out.total, 1, 'LIVE items must be kept even when upcomingOnly=true');
});

// ---------------------------------------------------------------------
// listGrouped()
// ---------------------------------------------------------------------

test('listGrouped buckets items into upcoming/live/past correctly', async () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();
  const liveStart = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
  const { service } = makeService([
    buildRow({ programId: 'prog-upcoming', scheduledAt: future }),
    buildRow({ programId: 'prog-past', scheduledAt: past }),
    buildRow({ programId: 'prog-live', scheduledAt: liveStart, duration: 90 }),
  ]);
  service['prisma'].rows.find((r) => r.programId === 'prog-live').program.status = 'LIVE';

  const out = await service.listGrouped(fakeUserId);
  assert.equal(out.upcoming.length, 1);
  assert.equal(out.upcoming[0].programId, 'prog-upcoming');
  assert.equal(out.live.length, 1);
  assert.equal(out.live[0].programId, 'prog-live');
  assert.equal(out.past.length, 1);
  assert.equal(out.past[0].programId, 'prog-past');
});

// ---------------------------------------------------------------------
// add()
// ---------------------------------------------------------------------

test('add throws BadRequestException when program does not exist', async () => {
  const { service } = makeService([]);
  await assert.rejects(
    () => service.add(fakeUserId, { programId: 'missing-id' }),
    (err: unknown) => {
      assert.ok(err instanceof BadRequestException);
      return true;
    },
  );
});

test('add upserts an item and returns the DTO', async () => {
  const { service, prisma } = makeService([]);
  const out = await service.add(fakeUserId, {
    programId: 'prog-new',
    note: 'Must watch!',
  });
  assert.equal(out.programId, 'prog-new');
  assert.equal(out.note, 'Must watch!');
  assert.equal(prisma.upsertCalls.length, 1);
});

test('add reuses existing row when adding the same program twice', async () => {
  const { service, prisma } = makeService([
    buildRow({ id: 'wl-existing', programId: 'prog-dup' }),
  ]);
  await service.add(fakeUserId, { programId: 'prog-dup' });
  // Still only one row in storage
  assert.equal(prisma.rows.length, 1);
  assert.equal(prisma.rows[0].id, 'wl-existing');
});

// ---------------------------------------------------------------------
// remove()
// ---------------------------------------------------------------------

test('remove throws NotFoundException for another user\'s item', async () => {
  const { service } = makeService([
    buildRow({ id: 'wl-other', userId: 'someone-else', programId: 'prog-1' }),
  ]);
  await assert.rejects(
    () => service.remove(fakeUserId, 'wl-other'),
    NotFoundException,
  );
});

test('remove deletes and returns success', async () => {
  const { service, prisma } = makeService([
    buildRow({ id: 'wl-del', programId: 'prog-1' }),
  ]);
  const out = await service.remove(fakeUserId, 'wl-del');
  assert.deepEqual(out, { message: 'Removed from watchlist' });
  assert.equal(prisma.deleteCalls.length, 1);
});

// ---------------------------------------------------------------------
// sync()
// ---------------------------------------------------------------------

test('sync upserts all provided items and skips ones without programId', async () => {
  const { service } = makeService([]);
  const out = await service.sync(fakeUserId, {
    items: [
      { programId: 'prog-a' },
      { programId: 'prog-b' },
      { programId: '' } as any, // should be skipped
    ],
  });
  assert.equal(out.upserted.length, 2);
  assert.ok(out.upserted.every((i) => i.programId.startsWith('prog-')));
});

test('sync returns removedIds for items deleted server-side', async () => {
  const serverDeletedAt = new Date();
  const { service, prisma } = makeService([
    buildRow({
      id: 'wl-stale-1',
      programId: 'prog-stale',
      addedAt: serverDeletedAt,
    }),
  ]);
  // lastSyncedAt is older than the row -> row counts as added since sync
  const older = new Date(serverDeletedAt.getTime() - 60_000);
  const out = await service.sync(fakeUserId, {
    lastSyncedAt: older.toISOString(),
    items: [{ programId: 'prog-other' }],
  });
  assert.ok(out.removedIds.includes('wl-stale-1'));
});

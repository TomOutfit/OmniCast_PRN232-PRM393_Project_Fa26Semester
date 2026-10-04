/**
 * OmniCast - Programs service counter tests
 *
 * Focuses on the counter methods (`incrementLiveEventShare`,
 * `incrementLiveEventView`, `incrementRecordingShare`,
 * `incrementRecordingView`, `incrementViewCount`). These are the most
 * frequently called paths (every page mount / share button click) so
 * they have to behave correctly when:
 *
 *   - the row exists (counter increments, returns new value)
 *   - the row has been deleted (returns nulls instead of throwing,
 *     so the UI keeps working after a soft-delete race)
 *
 * Run via: `npm run test`
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';

import { ProgramsService } from '../src/programs/programs.service';

// ---------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------

class CounterFakePrisma {
  public liveEventStore = new Map<string, any>();
  public recordingStore = new Map<string, any>();
  public liveEventUpdateCalls: any[] = [];
  public recordingUpdateCalls: any[] = [];

  liveEvent = {
    update: async (args: any) => {
      this.liveEventUpdateCalls.push(args);
      const row = this.liveEventStore.get(args.where.id);
      if (!row) {
        throw new Prisma.PrismaClientKnownRequestError(
          'not found',
          { code: 'P2025', clientVersion: 'test' },
        );
      }
      // Naive apply of the `data` increment expression for the test
      for (const [field, expr] of Object.entries(args.data)) {
        if (expr && typeof expr === 'object' && 'increment' in expr) {
          row[field] = (row[field] ?? 0) + expr.increment;
        } else {
          row[field] = expr;
        }
      }
      // Return only the fields that were selected
      if (args.select) {
        const out: any = { id: row.id };
        for (const k of Object.keys(args.select)) out[k] = row[k];
        return out;
      }
      return row;
    },
  };
  recording = {
    update: async (args: any) => {
      this.recordingUpdateCalls.push(args);
      const row = this.recordingStore.get(args.where.id);
      if (!row) {
        throw new Prisma.PrismaClientKnownRequestError(
          'not found',
          { code: 'P2025', clientVersion: 'test' },
        );
      }
      for (const [field, expr] of Object.entries(args.data)) {
        if (expr && typeof expr === 'object' && 'increment' in expr) {
          row[field] = (row[field] ?? 0) + expr.increment;
        } else {
          row[field] = expr;
        }
      }
      if (args.select) {
        const out: any = { id: row.id };
        for (const k of Object.keys(args.select)) out[k] = row[k];
        return out;
      }
      return row;
    },
  };
}

function makeService() {
  const prisma = new CounterFakePrisma();
  const auditLogger = { log: async () => undefined } as any;
  const tmdbEnrichment = {
    enrichLiveEvent: async () => undefined,
    enrichRecording: async () => undefined,
  } as any;
  const configService = { get: () => undefined } as any;
  const service = new ProgramsService(
    prisma as any,
    auditLogger,
    tmdbEnrichment,
    configService,
    {} as any,
  );
  return { service, prisma };
}

// ---------------------------------------------------------------------
// Live event counter
// ---------------------------------------------------------------------

test('incrementLiveEventView increments viewerCount for an existing event', async () => {
  const { service, prisma } = makeService();
  prisma.liveEventStore.set('evt-1', { id: 'evt-1', viewerCount: 10 });
  const out = await service.incrementLiveEventView('evt-1');
  assert.deepEqual(out, { id: 'evt-1', viewerCount: 11 });
});

test('incrementLiveEventView returns null viewerCount when row missing', async () => {
  const { service } = makeService();
  const out = await service.incrementLiveEventView('gone');
  assert.deepEqual(out, { id: 'gone', viewerCount: null });
});

test('incrementLiveEventShare increments shareCount for an existing event', async () => {
  const { service, prisma } = makeService();
  prisma.liveEventStore.set('evt-2', { id: 'evt-2', shareCount: 0 });
  const out = await service.incrementLiveEventShare('evt-2');
  assert.deepEqual(out, { id: 'evt-2', shareCount: 1 });
});

test('incrementLiveEventShare returns null shareCount when row missing', async () => {
  const { service } = makeService();
  const out = await service.incrementLiveEventShare('gone');
  assert.deepEqual(out, { id: 'gone', shareCount: null });
});

// ---------------------------------------------------------------------
// Recording counter
// ---------------------------------------------------------------------

test('incrementViewCount increments a recording view counter', async () => {
  const { service, prisma } = makeService();
  prisma.recordingStore.set('rec-1', { id: 'rec-1', viewCount: 100 });
  const out = await service.incrementViewCount('rec-1');
  assert.equal(out?.viewCount, 101);
});

test('incrementRecordingShare returns the new share count', async () => {
  const { service, prisma } = makeService();
  prisma.recordingStore.set('rec-2', { id: 'rec-2', shareCount: 5 });
  const out = await service.incrementRecordingShare('rec-2');
  assert.deepEqual(out, { id: 'rec-2', shareCount: 6 });
});

test('incrementRecordingShare returns null shareCount when row missing', async () => {
  const { service } = makeService();
  const out = await service.incrementRecordingShare('gone');
  assert.deepEqual(out, { id: 'gone', shareCount: null });
});

test('incrementRecordingView (legacy alias) increments view count', async () => {
  const { service, prisma } = makeService();
  prisma.recordingStore.set('rec-3', { id: 'rec-3', viewCount: 0 });
  const out = await service.incrementRecordingView('rec-3');
  // Alias delegates to incrementViewCount which returns the full row
  assert.equal(out.viewCount, 1);
});

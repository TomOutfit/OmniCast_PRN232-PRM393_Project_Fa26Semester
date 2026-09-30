/**
 * OmniCast - EPG schedule filler unit tests
 *
 * Verifies the four pillars of the filler:
 *   1. Seeded reproducibility — same (date, channel) => same schedule.
 *   2. Variety — adjacent days produce different orders.
 *   3. Genre matching — same-category recordings are preferred, with a
 *      fallback when nothing matches.
 *   4. Episode splitting — recordings longer than LONG_PROGRAM_SECONDS
 *      are split into multiple "Tập N" entries.
 *   5. Replay cap — the same recording/episode does not loop more than
 *      MAX_REPEATS_PER_ITEM_PER_DAY times per day.
 *   6. Non-empty grid — every returned list spans the full 24 hours
 *      with no gaps.
 *
 * Run via: `npm run test`
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  EpScheduleFillerService,
  type FillerRecording,
} from '../src/programs/epg-filler.service';

const service = new EpScheduleFillerService();

// ---------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------

function makeRecording(over: Partial<FillerRecording> = {}): FillerRecording {
  return {
    id: over.id ?? 'rec-1',
    title: over.title ?? 'Rec 1',
    thumbnailUrl: over.thumbnailUrl ?? null,
    duration: over.duration ?? 60 * 60, // 60 minutes default
    tags: over.tags ?? [],
    category: over.category ?? 'SPORTS',
  };
}

function dayAt(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

const CHANNEL = { id: 'channel-a', name: 'Sports HD', category: 'SPORTS' };

// ---------------------------------------------------------------------
// Episode splitting
// ---------------------------------------------------------------------

test('splitRecordingsIntoEpisodes leaves short recordings as a single episode', () => {
  const eps = service.splitRecordingsIntoEpisodes([
    makeRecording({ id: 'r-short', duration: 60 * 60 }), // 60min
  ]);
  assert.equal(eps.length, 1);
  assert.equal(eps[0].totalEpisodes, 1);
  assert.equal(eps[0].episodeNumber, 1);
  assert.equal(eps[0].originId, 'r-short');
});

test('splitRecordingsIntoEpisodes splits a 3h recording into 4 episodes of 45m', () => {
  const eps = service.splitRecordingsIntoEpisodes([
    makeRecording({ id: 'r-long', title: 'Movie', duration: 3 * 60 * 60 }),
  ]);
  assert.equal(eps.length, 4);
  assert.deepEqual(
    eps.map((e) => e.episodeNumber),
    [1, 2, 3, 4],
  );
  // The first three episodes are 45min; the last one is 45min too (3h / 45 = 4)
  for (const ep of eps) {
    assert.equal(ep.durationSeconds, 45 * 60);
  }
  // Titles get the "Tập N" suffix
  assert.equal(eps[0].title, 'Movie — Tập 1');
  assert.equal(eps[3].title, 'Movie — Tập 4');
  // Origin IDs all point at the same recording
  for (const ep of eps) assert.equal(ep.originId, 'r-long');
});

test('splitRecordingsIntoEpisodes handles a 100-min recording as 3 episodes', () => {
  const eps = service.splitRecordingsIntoEpisodes([
    makeRecording({ id: 'r-edge', duration: 100 * 60 }),
  ]);
  assert.equal(eps.length, 3);
  // 100 / 45 = 2.22 -> ceil = 3 episodes
  assert.equal(eps[2].durationSeconds, 100 * 60 - 2 * 45 * 60); // 10 minutes
});

// ---------------------------------------------------------------------
// Genre matching
// ---------------------------------------------------------------------

test('pickGenreMatchedPool prefers same-category episodes', () => {
  const eps = service.splitRecordingsIntoEpisodes([
    makeRecording({ id: 'r-sports', category: 'SPORTS' }),
    makeRecording({ id: 'r-movie', category: 'MOVIES' }),
    makeRecording({ id: 'r-news', category: 'NEWS' }),
  ]);
  const pool = service.pickGenreMatchedPool(eps, 'SPORTS', []);
  assert.equal(pool.length, 1);
  assert.equal(pool[0].originId, 'r-sports');
});

test('pickGenreMatchedPool falls back to every recording when nothing matches', () => {
  const eps = service.splitRecordingsIntoEpisodes([
    makeRecording({ id: 'r-movie', category: 'MOVIES' }),
  ]);
  const recordings = [makeRecording({ id: 'r-movie', category: 'MOVIES' })];
  const pool = service.pickGenreMatchedPool(eps, 'SPORTS', recordings);
  // No SPORTS episodes; the fallback rebuilds the pool from raw recordings
  assert.equal(pool.length, 1);
  assert.equal(pool[0].originId, 'r-movie');
});

// ---------------------------------------------------------------------
// Seeded shuffle
// ---------------------------------------------------------------------

test('shuffleDeterministic is reproducible for the same seed', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  const a = service.shuffleDeterministic(arr, 12345);
  const b = service.shuffleDeterministic(arr, 12345);
  assert.deepEqual(a, b);
});

test('shuffleDeterministic differs for different seeds', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  const a = service.shuffleDeterministic(arr, 1);
  const b = service.shuffleDeterministic(arr, 2);
  assert.notDeepEqual(a, b);
});

test('computeSeed changes with the day', () => {
  const d1 = dayAt(2026, 10, 1);
  const d2 = dayAt(2026, 10, 2);
  assert.notEqual(
    service.computeSeed(d1.getTime(), 'channel-x'),
    service.computeSeed(d2.getTime(), 'channel-x'),
  );
});

test('computeSeed changes with the channel', () => {
  const d = dayAt(2026, 10, 1);
  assert.notEqual(
    service.computeSeed(d.getTime(), 'channel-x'),
    service.computeSeed(d.getTime(), 'channel-y'),
  );
});

// ---------------------------------------------------------------------
// expandChannelSchedule — happy paths
// ---------------------------------------------------------------------

test('expandChannelSchedule fills the entire 24h grid with branded placeholders when the library is too small', () => {
  const date = dayAt(2026, 10, 1);
  const recordings = [
    makeRecording({ id: 'r1', category: 'SPORTS', duration: 60 * 60 }),
    makeRecording({ id: 'r2', category: 'SPORTS', duration: 60 * 60 }),
    makeRecording({ id: 'r3', category: 'SPORTS', duration: 60 * 60 }),
  ];
  const out = service.expandChannelSchedule({
    channel: CHANNEL,
    date,
    realPrograms: [],
    recordings,
  });

  // 24h is fully covered — first slot at midnight, last slot ends at
  // midnight tomorrow, no gaps in between.
  assert.equal(out[0].startTime, date.toISOString());
  assert.equal(
    out[out.length - 1].endTime,
    new Date(date.getTime() + 24 * 3600 * 1000).toISOString(),
  );
  for (let i = 1; i < out.length; i++) {
    assert.equal(
      out[i].startTime,
      out[i - 1].endTime,
      `gap between slot ${i - 1} and ${i}`,
    );
  }
  // Library was small (3 * 2 = 6 replay slots) so the remaining hours
  // must come from branded placeholders. Both kinds are `isFiller` so
  // every emitted slot has that flag.
  const replays = out.filter((p) => p.fillerKind === 'recording-replay');
  const branded = out.filter((p) => p.fillerKind === 'channel-branding');
  assert.ok(replays.length > 0, 'must emit at least some replays');
  assert.ok(branded.length > 0, 'must emit branded placeholders when library is exhausted');
  assert.equal(replays.length + branded.length, out.length);
});

test('expandChannelSchedule honours replay cap for a small library', () => {
  const date = dayAt(2026, 10, 1);
  const recordings = [
    makeRecording({ id: 'only-one', category: 'SPORTS', duration: 60 * 60 }),
  ];
  const out = service.expandChannelSchedule({
    channel: CHANNEL,
    date,
    realPrograms: [],
    recordings,
  });

  // 1 recording * 2 repeats = 2 filler slots. Beyond that we can't pick
  // any more episodes so the loop terminates early.
  const replaySlots = out.filter(
    (p) => p.sourceRecordingOrigin === 'only-one',
  );
  assert.equal(replaySlots.length, 2, 'must respect MAX_REPEATS_PER_ITEM_PER_DAY');
});

test('expandChannelSchedule reproduces the same schedule for the same (date, channel)', () => {
  const date = dayAt(2026, 10, 1);
  const recordings = [
    makeRecording({ id: 'r1', category: 'SPORTS', duration: 60 * 60 }),
    makeRecording({ id: 'r2', category: 'SPORTS', duration: 60 * 60 }),
  ];
  const a = service.expandChannelSchedule({
    channel: CHANNEL,
    date,
    realPrograms: [],
    recordings,
  });
  const b = service.expandChannelSchedule({
    channel: CHANNEL,
    date,
    realPrograms: [],
    recordings,
  });
  assert.deepEqual(
    a.map((p) => p.id),
    b.map((p) => p.id),
  );
});

test('expandChannelSchedule produces a different order for adjacent days', () => {
  const recordings = [
    makeRecording({ id: 'r1', category: 'SPORTS' }),
    makeRecording({ id: 'r2', category: 'SPORTS' }),
    makeRecording({ id: 'r3', category: 'SPORTS' }),
    makeRecording({ id: 'r4', category: 'SPORTS' }),
  ];
  const a = service.expandChannelSchedule({
    channel: CHANNEL,
    date: dayAt(2026, 10, 1),
    realPrograms: [],
    recordings,
  });
  const b = service.expandChannelSchedule({
    channel: CHANNEL,
    date: dayAt(2026, 10, 2),
    realPrograms: [],
    recordings,
  });
  // Same length (both fill 24h) but different first-filler origin
  assert.equal(a.length, b.length);
  assert.notDeepEqual(
    a.filter((p) => p.isFiller).map((p) => p.sourceRecordingOrigin),
    b.filter((p) => p.isFiller).map((p) => p.sourceRecordingOrigin),
  );
});

test('expandChannelSchedule places real events at their exact times', () => {
  const date = dayAt(2026, 10, 1);
  const recordings = [
    makeRecording({ id: 'r1', category: 'SPORTS', duration: 60 * 60 }),
  ];
  const realStart = new Date(date);
  realStart.setUTCHours(20, 0, 0, 0); // 20:00
  const realEnd = new Date(realStart);
  realEnd.setUTCHours(22, 0, 0, 0); // 22:00

  const out = service.expandChannelSchedule({
    channel: CHANNEL,
    date,
    realPrograms: [
      {
        id: 'live-1',
        title: 'Live Football',
        startTime: realStart.toISOString(),
        endTime: realEnd.toISOString(),
        status: 'SCHEDULED' as any,
        thumbnailUrl: null,
        durationMinutes: 120,
        tags: [],
        category: 'SPORTS',
      },
    ],
    recordings,
  });

  const real = out.find((p) => p.id === 'live-1');
  assert.ok(real, 'real event must be present');
  assert.equal(real!.startTime, realStart.toISOString());
  assert.equal(real!.endTime, realEnd.toISOString());
  assert.equal(real!.isFiller, false);
  // Real event should be flanked by fillers (00-20 and 22-24)
  const fillers = out.filter((p) => p.isFiller);
  assert.ok(fillers.length > 0, 'must emit fillers around the real event');
});

// ---------------------------------------------------------------------
// Long programs / episode splitting in the integrated output
// ---------------------------------------------------------------------

test('expandChannelSchedule surfaces long programmes as separate episodes', () => {
  const date = dayAt(2026, 10, 1);
  const recordings = [
    makeRecording({
      id: 'r-movie',
      title: 'Long Movie',
      duration: 3 * 60 * 60, // 3 hours
      category: 'SPORTS',
    }),
  ];
  const out = service.expandChannelSchedule({
    channel: { ...CHANNEL, category: 'MOVIES' },
    date,
    realPrograms: [],
    recordings,
  });
  // The 3h recording is split into 4 episodes of 45m. The replay cap is
  // per-origin so at most 2 episodes of the same recording play in one
  // day. The shuffle decides which 2 episodes those are.
  const episodes = out.filter(
    (p) =>
      p.sourceRecordingOrigin === 'r-movie' &&
      /^Long Movie — Tập /.test(p.title),
  );
  assert.equal(episodes.length, 2, 'exactly two episodes fit per day');
  // Every emitted episode must use the "Tập N" labelling.
  for (const ep of episodes) {
    assert.match(ep.title, /^Long Movie — Tập \d+$/);
  }
});

// ---------------------------------------------------------------------
// pickNextEpisode
// ---------------------------------------------------------------------

test('pickNextEpisode returns the first candidate under the replay cap', () => {
  const eps = service.splitRecordingsIntoEpisodes([
    makeRecording({ id: 'r1' }),
    makeRecording({ id: 'r2' }),
  ]);
  const used = new Map<string, number>();
  const picked = service.pickNextEpisode(eps, used);
  assert.ok(picked);
  assert.equal(picked!.originId, 'r1');
});

test('pickNextEpisode skips items that already hit the cap', () => {
  const eps = service.splitRecordingsIntoEpisodes([
    makeRecording({ id: 'r1' }),
    makeRecording({ id: 'r2' }),
  ]);
  const used = new Map<string, number>([
    ['r1', service.MAX_REPEATS_PER_ITEM_PER_DAY],
  ]);
  const picked = service.pickNextEpisode(eps, used);
  assert.ok(picked);
  assert.equal(picked!.originId, 'r2');
});

test('pickNextEpisode returns null when every item is capped', () => {
  const eps = service.splitRecordingsIntoEpisodes([
    makeRecording({ id: 'r1' }),
  ]);
  const used = new Map<string, number>([
    ['r1', service.MAX_REPEATS_PER_ITEM_PER_DAY],
  ]);
  assert.equal(service.pickNextEpisode(eps, used), null);
});

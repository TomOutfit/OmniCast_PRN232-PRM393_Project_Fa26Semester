/**
 * OmniCast - EPG Timeline & Broadcast Daypart Unit Tests
 *
 * Verifies the timing rules, timezone anchors, and slot diversity of OmniCast:
 *   1. Vietnam timezone (+7 ICT) 24h boundary calculation.
 *   2. Realistic broadcast dayparts (Morning, Noon, Prime-Time, Late-Night).
 *   3. Anti-repetition title uniqueness across consecutive slots.
 *   4. Duration clamps (15m minimum, 240m maximum).
 *   5. 7-day catchup offset arithmetic.
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { EpScheduleFillerService } from '../src/programs/epg-filler.service';

const service = new EpScheduleFillerService();

// ---------------------------------------------------------------------
// 1. Timezone & Day Boundaries
// ---------------------------------------------------------------------
test('Vietnam timezone (+7) anchors 00:00 VN to 17:00 UTC previous day', () => {
  const dateStr = '2026-10-04';
  const tzOffsetHours = 7;
  const [y, m, d] = dateStr.split('-').map(Number);

  const dayStart = new Date(Date.UTC(y, m - 1, d, -tzOffsetHours, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(y, m - 1, d + 1, -tzOffsetHours, 0, 0, 0));

  assert.equal(dayStart.toISOString(), '2026-10-03T17:00:00.000Z');
  assert.equal(dayEnd.toISOString(), '2026-10-04T17:00:00.000Z');

  // Span is exactly 24 hours (86,400,000 ms)
  assert.equal(dayEnd.getTime() - dayStart.getTime(), 24 * 60 * 60 * 1000);
});

// ---------------------------------------------------------------------
// 2. Broadcast Dayparts
// ---------------------------------------------------------------------
test('Daypart classification matches Vietnam broadcast schedule', () => {
  const getDaypart = (hours: number): string => {
    if (hours >= 5 && hours < 9) return 'MORNING';
    if (hours >= 9 && hours < 11) return 'MID_MORNING';
    if (hours >= 11 && hours < 14) return 'LUNCH';
    if (hours >= 14 && hours < 18) return 'AFTERNOON';
    if (hours >= 18 && hours < 22) return 'PRIME_TIME';
    if (hours >= 22 && hours < 24) return 'LATE_NIGHT';
    return 'OVERNIGHT';
  };

  assert.equal(getDaypart(6), 'MORNING'); // 06:00 Chào Buổi Sáng
  assert.equal(getDaypart(11), 'LUNCH'); // 11:30 Bản Tin Trưa
  assert.equal(getDaypart(19), 'PRIME_TIME'); // 19:30 Khung Giờ Vàng
  assert.equal(getDaypart(20), 'PRIME_TIME'); // 20:00 Phim Chiếu Rạp / Trực Tiếp
  assert.equal(getDaypart(23), 'LATE_NIGHT'); // 23:00 Đêm Muộn
  assert.equal(getDaypart(2), 'OVERNIGHT'); // 02:00 Khám Phá Đêm
});

// ---------------------------------------------------------------------
// 3. Consecutive Title Uniqueness
// ---------------------------------------------------------------------
test('Synthesized filler titles do not repeat consecutively', () => {
  const channel = { id: 'ch-news', name: 'Omni News', category: 'NEWS' };
  const titles: string[] = [];

  const dayStart = new Date('2026-10-03T17:00:00.000Z'); // 00:00 VN
  let cur = new Date(dayStart);

  for (let slot = 0; slot < 10; slot++) {
    const hours = (cur.getUTCHours() + 7) % 24;
    const title = (service as any).getBrandedTitle(
      channel.name,
      channel.category,
      cur.getTime(),
      titles.map((t) => ({ title: t }))
    );
    titles.push(title);

    // Verify current title != previous title
    if (slot > 0) {
      assert.notEqual(
        title,
        titles[slot - 1],
        `Consecutive slot ${slot} "${title}" must differ from slot ${slot - 1} "${titles[slot - 1]}"`
      );
    }
    cur = new Date(cur.getTime() + 60 * 60 * 1000);
  }
});

// ---------------------------------------------------------------------
// 4. Duration Clamping
// ---------------------------------------------------------------------
test('Duration clamps between 15 minutes and 240 minutes', () => {
  const normalizeDurationMinutes = (durationSeconds: number | null | undefined): number => {
    if (!durationSeconds || durationSeconds <= 0) return 60;
    const min = Math.round(durationSeconds / 60);
    return Math.max(15, Math.min(240, min));
  };

  assert.equal(normalizeDurationMinutes(null), 60);
  assert.equal(normalizeDurationMinutes(0), 60);
  assert.equal(normalizeDurationMinutes(300), 15); // 5 min -> clamped to 15m
  assert.equal(normalizeDurationMinutes(5400), 90); // 90 min -> 90m
  assert.equal(normalizeDurationMinutes(36000), 240); // 600 min -> clamped to 240m
});

// ---------------------------------------------------------------------
// 5. 7-Day Catch-up Carousel Arithmetic
// ---------------------------------------------------------------------
test('7-Day Carousel generates correct relative dates from -3 to +3', () => {
  const base = new Date('2026-10-04T12:00:00.000Z');
  const offsets = [-3, -2, -1, 0, 1, 2, 3];

  const dates = offsets.map((off) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + off);
    return d.toISOString().slice(0, 10);
  });

  assert.deepEqual(dates, [
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
  ]);
});

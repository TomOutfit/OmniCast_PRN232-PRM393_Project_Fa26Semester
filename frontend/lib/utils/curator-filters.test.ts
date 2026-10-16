/**
 * OmniCast - AI Curator filter + pagination helpers
 *
 * Pure-function coverage for `lib/utils/curator-filters.ts`:
 *   - filterCuratorRows (search + status filter)
 *   - paginateRows     (slicing + clamping)
 *   - totalPages       (Math.ceil with floor of 1)
 *
 * Run with: `npx vitest run lib/utils/curator-filters.test.ts`
 */

import { describe, it, expect } from 'vitest';
import {
  filterCuratorRows,
  paginateRows,
  totalPages,
  type CuratorRowShape,
} from './curator-filters';

function makeRow(overrides: Partial<CuratorRowShape> = {}): CuratorRowShape {
  return {
    id: 'p-1',
    title: 'Vòng quay may mắn',
    description: 'Game show hấp dẫn',
    category: 'SHOW',
    channelName: 'VTV1',
    scheduledAt: '2026-10-01T20:00:00Z',
    status: 'SCHEDULED',
    ...overrides,
  };
}

const ROWS: CuratorRowShape[] = [
  makeRow({ id: 'p-1', title: 'Vòng quay may mắn', channelName: 'VTV1', status: 'SCHEDULED' }),
  makeRow({ id: 'p-2', title: 'Thời sự 19h', channelName: 'VTV1', status: 'LIVE' }),
  makeRow({ id: 'p-3', title: 'Phim cuối tuần', description: 'Phim hành động Mỹ', channelName: 'VTV3', status: 'SCHEDULED' }),
  makeRow({ id: 'p-4', title: 'Talk show', channelName: 'HTV7', status: 'ENDED' }),
  makeRow({ id: 'p-5', title: 'Vòng tròn âm nhạc', channelName: 'VTV3', status: 'CANCELLED' }),
];

describe('filterCuratorRows', () => {
  it('returns all rows when query and status are neutral', () => {
    expect(filterCuratorRows(ROWS, '', 'all')).toHaveLength(5);
  });

  it('filters by title (case-insensitive substring)', () => {
    const result = filterCuratorRows(ROWS, 'vòng', 'all');
    expect(result.map((r) => r.id)).toEqual(['p-1', 'p-5']);
  });

  it('filters by description', () => {
    const result = filterCuratorRows(ROWS, 'hành động', 'all');
    expect(result.map((r) => r.id)).toEqual(['p-3']);
  });

  it('filters by channelName', () => {
    const result = filterCuratorRows(ROWS, 'HTV7', 'all');
    expect(result.map((r) => r.id)).toEqual(['p-4']);
  });

  it('combines status filter and search', () => {
    const result = filterCuratorRows(ROWS, 'vòng', 'SCHEDULED');
    expect(result.map((r) => r.id)).toEqual(['p-1']);
  });

  it('returns empty when status does not match anything', () => {
    expect(filterCuratorRows(ROWS, '', 'ON_DEMAND')).toEqual([]);
  });

  it('trims whitespace from query', () => {
    expect(filterCuratorRows(ROWS, '   vòng   ', 'all')).toHaveLength(2);
  });

  it('does not crash when fields are undefined', () => {
    const sparse = [makeRow({ id: 'p-x', title: '', description: '', channelName: '' })];
    expect(filterCuratorRows(sparse, 'vòng', 'all')).toEqual([]);
  });
});

describe('paginateRows', () => {
  const many: CuratorRowShape[] = Array.from({ length: 60 }, (_, i) =>
    makeRow({ id: `r-${i}` }),
  );

  it('returns empty array when rows are empty', () => {
    expect(paginateRows([], 1, 25)).toEqual([]);
  });

  it('caps visible rows at pageSize', () => {
    const page1 = paginateRows(many, 1, 25);
    expect(page1).toHaveLength(25);
    expect(page1[0].id).toBe('r-0');
    expect(page1[24].id).toBe('r-24');
  });

  it('returns the remaining slice on the last page', () => {
    const page3 = paginateRows(many, 3, 25);
    expect(page3).toHaveLength(10); // 60 - 2*25
    expect(page3[0].id).toBe('r-50');
  });

  it('clamps page beyond the end back to the last page', () => {
    const result = paginateRows(many, 99, 25);
    expect(result).toHaveLength(10);
    expect(result[0].id).toBe('r-50');
  });

  it('clamps page below 1 up to page 1', () => {
    const result = paginateRows(many, 0, 25);
    expect(result[0].id).toBe('r-0');
    expect(result).toHaveLength(25);
  });
});

describe('totalPages', () => {
  it('returns at least 1 even when there are zero rows', () => {
    expect(totalPages([], 25)).toBe(1);
  });

  it('ceils fractional pages', () => {
    expect(totalPages(Array.from({ length: 51 }), 25)).toBe(3);
  });

  it('returns 1 when rows fit in one page', () => {
    expect(totalPages(Array.from({ length: 20 }), 25)).toBe(1);
  });

  it('returns 1 when pageSize is non-positive (defensive)', () => {
    expect(totalPages(Array.from({ length: 100 }), 0)).toBe(1);
    expect(totalPages(Array.from({ length: 100 }), -5)).toBe(1);
  });
});
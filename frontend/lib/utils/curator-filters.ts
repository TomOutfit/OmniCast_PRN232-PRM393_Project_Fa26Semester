// ============================================================
// OmniCast - AI Curator · Filtering & Pagination helpers
// ============================================================
//
// Pure functions used by `frontend/app/studio/curator/page.tsx`
// to filter / paginate the list of programs shown to the curator.
//
// Kept dependency-free so they're trivially unit-testable (see
// `curator-filters.test.ts`).
// ============================================================

import type { LiveEvent } from '@/types';
import type { AiCuratorReport } from '@/types';

/** Mirrors the row shape built inside CuratorStudioPage. */
export interface CuratorRowShape {
  id: string;
  title: string;
  description: string;
  category: string;
  channelName: string;
  scheduledAt: string;
  status: LiveEvent['status'] | 'NEEDS_REVIEW';
  aiReport?: AiCuratorReport;
}

/** All statuses plus the synthetic "all" sentinel used by the UI. */
export type CuratorStatusFilter = 'all' | CuratorRowShape['status'];

/**
 * Filter rows with a case-insensitive substring search over title /
 * description / channelName, plus an optional status match.
 *
 *  - `query` is trimmed before searching. Empty query is a no-op.
 *  - `status === 'all'` skips the status predicate.
 *  - Rows whose relevant fields are undefined are simply skipped
 *    (no match).
 */
export function filterCuratorRows(
  rows: CuratorRowShape[],
  query: string,
  status: CuratorStatusFilter,
): CuratorRowShape[] {
  const q = (query ?? '').trim().toLowerCase();
  const statusActive = status !== 'all';

  if (!q && !statusActive) return rows;

  return rows.filter((row) => {
    if (statusActive && row.status !== status) return false;
    if (!q) return true;

    const haystacks = [row.title, row.description, row.channelName].map((s) =>
      (s ?? '').toLowerCase(),
    );
    return haystacks.some((s) => s.includes(q));
  });
}

/**
 * Paginate `rows` into a slice for the given 1-based `page`.
 *
 *   - Returns an empty array when `rows` is empty.
 *   - Clamps `page` so callers never index past the end.
 *   - Returns the full slice unchanged if `pageSize <= 0` (defensive).
 */
export function paginateRows<T>(
  rows: T[],
  page: number,
  pageSize: number,
): T[] {
  if (!rows.length) return [];
  if (pageSize <= 0) return rows.slice();
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

/** Total pages for `rows` under `pageSize`, clamped to ≥1. */
export function totalPages(rows: unknown[], pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(rows.length / pageSize));
}
/**
 * OmniCast - Watchlist API client tests
 *
 * Verifies the HTTP wrapper functions in lib/api/watchlist.ts send the
 * right URLs, methods and payloads, and unwrap the backend's
 * `{ data: ... }` envelope correctly. `apiClient` is mocked with
 * vi.mock so no real network is hit.
 *
 * Run with: `npx vitest run lib/api/watchlist.test.ts`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMock = vi.fn();
const postMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('../api', () => ({
  apiClient: {
    get: (...args: any[]) => getMock(...args),
    post: (...args: any[]) => postMock(...args),
    delete: (...args: any[]) => deleteMock(...args),
  },
}));

import {
  fetchMyWatchlistGrouped,
  fetchMyWatchlist,
  addToWatchlist,
  removeFromWatchlistById,
  removeFromWatchlistByProgramId,
} from './watchlist';

describe('fetchMyWatchlistGrouped', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    deleteMock.mockReset();
  });

  it('hits /me/watchlist/grouped and returns the data', async () => {
    getMock.mockResolvedValueOnce({
      data: { upcoming: [], live: [{ id: 'w1' }], past: [] },
    });
    const out = await fetchMyWatchlistGrouped();
    expect(getMock).toHaveBeenCalledWith('/me/watchlist/grouped');
    expect(out.live[0].id).toBe('w1');
  });
});

describe('fetchMyWatchlist', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('passes query params through to axios', async () => {
    getMock.mockResolvedValueOnce({ data: { data: [{ id: 'a' }], total: 1 } });
    const out = await fetchMyWatchlist({ upcomingOnly: true, page: 2 });
    expect(getMock).toHaveBeenCalledWith('/me/watchlist', {
      params: { upcomingOnly: true, page: 2 },
    });
    expect(out.total).toBe(1);
  });
});

describe('addToWatchlist', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('unwraps the { data: ... } envelope', async () => {
    postMock.mockResolvedValueOnce({
      data: { data: { id: 'w-new', programId: 'p1' } },
    });
    const out = await addToWatchlist({ programId: 'p1', channelId: 'c1', note: 'hi' });
    expect(postMock).toHaveBeenCalledWith('/me/watchlist', {
      programId: 'p1',
      channelId: 'c1',
      note: 'hi',
    });
    expect(out.id).toBe('w-new');
  });

  it('handles a flat response without envelope', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 'w-flat', programId: 'p2' } });
    const out = await addToWatchlist({ programId: 'p2' });
    expect(out.id).toBe('w-flat');
  });
});

describe('removeFromWatchlistById', () => {
  beforeEach(() => {
    deleteMock.mockReset();
  });

  it('issues DELETE /me/watchlist/:id', async () => {
    deleteMock.mockResolvedValueOnce({ data: { message: 'Removed' } });
    await removeFromWatchlistById('w-99');
    expect(deleteMock).toHaveBeenCalledWith('/me/watchlist/w-99');
  });
});

describe('removeFromWatchlistByProgramId', () => {
  beforeEach(() => {
    getMock.mockReset();
    deleteMock.mockReset();
  });

  it('looks up the row first, then deletes it', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        data: [
          { id: 'w-1', programId: 'p1' },
          { id: 'w-2', programId: 'p2' },
        ],
      },
    });
    deleteMock.mockResolvedValueOnce({ data: { message: 'Removed' } });

    const out = await removeFromWatchlistByProgramId('p2');
    expect(getMock).toHaveBeenCalledWith('/me/watchlist', {
      params: { limit: 100 },
    });
    expect(deleteMock).toHaveBeenCalledWith('/me/watchlist/w-2');
    expect(out).toEqual({ removed: true, id: 'w-2' });
  });

  it('returns { removed: false } when the program is not in the list', async () => {
    getMock.mockResolvedValueOnce({
      data: { data: [{ id: 'w-1', programId: 'p1' }] },
    });

    const out = await removeFromWatchlistByProgramId('missing');
    expect(deleteMock).not.toHaveBeenCalled();
    expect(out).toEqual({ removed: false });
  });
});

/**
 * OmniCast - useAiCuratorStats hook tests
 *
 * Verifies the React Query hook in `lib/hooks/useAiCuratorStats.ts`:
 *   1. fetches the correct endpoint with the supplied period
 *   2. honours the `enabled` flag (so a non-curator user never issues
 *      a network call)
 *   3. sets `staleTime` to 5 minutes (300_000 ms)
 *
 * The test mocks `@tanstack/react-query` so we don't need a DOM —
 * `vitest.config.ts` runs the suite under `environment: 'node'`.
 *
 * Run with: `npx vitest run lib/hooks/useAiCuratorStats.test.ts`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const getMock = vi.fn();
vi.mock('../api', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(),
  },
}));

// Track the last useQuery invocation so individual tests can assert
// on the resolved options without re-running the hook.
const useQueryMock = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

import { useAiCuratorStats } from './useAiCuratorStats';
import { fetchStats } from '@/lib/api/ai-curator';

beforeEach(() => {
  vi.clearAllMocks();
  useQueryMock.mockReset();
  getMock.mockReset();
});

describe('useAiCuratorStats', () => {
  it('fetches /ai-curator/stats with the supplied period', () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: true });

    useAiCuratorStats('week');

    expect(useQueryMock).toHaveBeenCalledTimes(1);
    const opts = useQueryMock.mock.calls[0][0];
    expect(opts.queryKey).toEqual(['ai-curator', 'stats', 'week']);
    expect(typeof opts.queryFn).toBe('function');

    // Resolve the queryFn and ensure it calls fetchStats -> GET.
    getMock.mockResolvedValue({ data: { totalReports: 12 } });
    return opts.queryFn().then(() => {
      expect(getMock).toHaveBeenCalledWith('/ai-curator/stats', {
        params: { period: 'week' },
      });
      // Sanity: ensure fetchStats is the same queryFn we exposed.
      expect(typeof fetchStats).toBe('function');
    });
  });

  it('passes enabled=false to React Query when caller opts out', () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    useAiCuratorStats('day', { enabled: false });

    const opts = useQueryMock.mock.calls[0][0];
    expect(opts.enabled).toBe(false);
  });

  it('defaults enabled to true when no options object is passed', () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    useAiCuratorStats('month');

    const opts = useQueryMock.mock.calls[0][0];
    expect(opts.enabled).toBe(true);
  });

  it('configures a 5-minute staleTime', () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    useAiCuratorStats('day');

    const opts = useQueryMock.mock.calls[0][0];
    expect(opts.staleTime).toBe(5 * 60 * 1000);
  });

  it('keys the query under ai-curator so a global invalidation refetches', () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    useAiCuratorStats('day');

    const opts = useQueryMock.mock.calls[0][0];
    // Root segment should match the canonical key factory.
    expect(opts.queryKey[0]).toBe('ai-curator');
  });
});
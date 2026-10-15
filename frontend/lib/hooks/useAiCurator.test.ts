/**
 * OmniCast - AI Curator API client tests
 *
 * Verifies the HTTP client functions in `lib/api/ai-curator.ts` send
 * the right URLs, methods, and payloads, and correctly unwrap the
 * backend's envelope. No React required — pure unit tests.
 *
 * Note: the React Query hooks in `lib/hooks/useAiCurator.ts` are thin
 * wrappers around these API functions; the hook-level behavior
 * (cache management, invalidation) is exercised by integration tests
 * or manual QA.
 *
 * Run with: `npx vitest run lib/hooks/useAiCurator.test.ts`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const postMock = vi.fn();
const getMock = vi.fn();

vi.mock('../api', () => ({
  apiClient: {
    post: (...args: unknown[]) => postMock(...args),
    get: (...args: unknown[]) => getMock(...args),
  },
}));

import {
  analyzeContent,
  curateExistingProgram,
  applyCuration,
  fetchCurationHistory,
} from '@/lib/api/ai-curator';

beforeEach(() => {
  vi.clearAllMocks();
  postMock.mockReset();
  getMock.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ─── analyzeContent (Mode 2 — preview) ───────────────────────────────────────

describe('analyzeContent', () => {
  it('POSTs to /ai-curator/analyze with the given payload', async () => {
    postMock.mockResolvedValue({
      data: {
        broadcastSuitability: 'PRIME_TIME',
        suggestedTimeSlot: '21:00',
        targetAudienceVibe: 'general',
        riskWarnings: null,
        sentimentAnalysis: { overallSentiment: 'positive', hypeLevel: 'high', audienceEngagement: 80 },
        complianceAssessment: { isAgeRestricted: false, ageRating: 'PG', flaggedContent: [], recommendedBroadcastWindow: 'EVENING' },
        aiModelVersion: 'gpt-4o',
        processingTimeMs: 1500,
      },
    });

    const result = await analyzeContent({
      title: 'My Program',
      description: 'A show',
      scheduledAt: '2026-10-01T20:00:00Z',
      channelName: 'VTV1',
      tags: ['news'],
      language: 'vi',
    });

    expect(postMock).toHaveBeenCalledWith('/ai-curator/analyze', {
      title: 'My Program',
      description: 'A show',
      scheduledAt: '2026-10-01T20:00:00Z',
      channelName: 'VTV1',
      tags: ['news'],
      language: 'vi',
    });
    expect(result.broadcastSuitability).toBe('PRIME_TIME');
    expect(result.aiModelVersion).toBe('gpt-4o');
  });

  it('omits optional fields when not provided', async () => {
    postMock.mockResolvedValue({
      data: {
        broadcastSuitability: 'STANDARD',
        suggestedTimeSlot: '20:00',
        targetAudienceVibe: 'family',
        riskWarnings: null,
        sentimentAnalysis: { overallSentiment: 'neutral', hypeLevel: 'medium', audienceEngagement: 50 },
        complianceAssessment: { isAgeRestricted: false, ageRating: 'G', flaggedContent: [], recommendedBroadcastWindow: 'DAY' },
        aiModelVersion: 'test',
        processingTimeMs: 10,
      },
    });

    await analyzeContent({ title: 'Minimal' });

    expect(postMock).toHaveBeenCalledWith('/ai-curator/analyze', {
      title: 'Minimal',
    });
  });
});

// ─── curateExistingProgram (Mode 1 — persist report) ─────────────────────────

describe('curateExistingProgram', () => {
  it('POSTs to /ai-curator/curate with programId and forceRefresh', async () => {
    postMock.mockResolvedValue({
      data: {
        id: 'r-1',
        programId: 'p-1',
        createdBy: 'user-1',
        createdAt: '2026-10-01T00:00:00Z',
        tokenUsed: 200,
        cached: false,
        broadcastSuitability: 'PRIME_TIME',
        suggestedTimeSlot: '21:00',
        targetAudienceVibe: 'general',
        riskWarnings: null,
        sentimentAnalysis: { overallSentiment: 'positive', hypeLevel: 'high', audienceEngagement: 80 },
        complianceAssessment: { isAgeRestricted: false, ageRating: 'PG', flaggedContent: [], recommendedBroadcastWindow: 'EVENING' },
        aiModelVersion: 'gpt-4o',
        processingTimeMs: 1500,
      },
    });

    const result = await curateExistingProgram({
      programId: 'p-1',
      forceRefresh: true,
    });

    expect(postMock).toHaveBeenCalledWith('/ai-curator/curate', {
      programId: 'p-1',
      forceRefresh: true,
    });
    expect(result.id).toBe('r-1');
    expect(result.cached).toBe(false);
  });

  it('defaults forceRefresh to undefined (false) when omitted', async () => {
    postMock.mockResolvedValue({
      data: {
        id: 'r-2',
        programId: 'p-1',
        createdBy: null,
        createdAt: '2026-10-01T00:00:00Z',
        tokenUsed: null,
        cached: true,
        broadcastSuitability: 'STANDARD',
        suggestedTimeSlot: '20:00',
        targetAudienceVibe: 'family',
        riskWarnings: null,
        sentimentAnalysis: { overallSentiment: 'neutral', hypeLevel: 'medium', audienceEngagement: 50 },
        complianceAssessment: { isAgeRestricted: false, ageRating: 'G', flaggedContent: [], recommendedBroadcastWindow: 'DAY' },
        aiModelVersion: 'heuristic-fallback-v1',
        processingTimeMs: 5,
      },
    });

    await curateExistingProgram({ programId: 'p-1' });

    expect(postMock).toHaveBeenCalledWith('/ai-curator/curate', {
      programId: 'p-1',
    });
  });
});

// ─── applyCuration (Mode 3 — push fields back) ────────────────────────────────

describe('applyCuration', () => {
  it('POSTs to /ai-curator/apply/:programId with payload', async () => {
    postMock.mockResolvedValue({
      data: {
        programId: 'p-1',
        appliedFields: ['scheduledAt'],
        updatedAt: '2026-10-01T00:00:00Z',
        channel: { id: 'c-1', name: 'VTV1' },
      },
    });

    const result = await applyCuration('p-1', {
      scheduledAt: '2026-10-01T20:00:00Z',
    });

    expect(postMock).toHaveBeenCalledWith('/ai-curator/apply/p-1', {
      scheduledAt: '2026-10-01T20:00:00Z',
    });
    expect(result.appliedFields).toContain('scheduledAt');
    expect(result.channel.name).toBe('VTV1');
  });

  it('sends description field in payload', async () => {
    postMock.mockResolvedValue({
      data: {
        programId: 'p-1',
        appliedFields: ['description'],
        updatedAt: '2026-10-01T00:00:00Z',
        channel: { id: 'c-1', name: 'VTV1' },
      },
    });

    await applyCuration('p-1', {
      description: 'Updated family-friendly description',
    });

    expect(postMock).toHaveBeenCalledWith('/ai-curator/apply/p-1', {
      description: 'Updated family-friendly description',
    });
  });

  it('sends both fields when both are provided', async () => {
    postMock.mockResolvedValue({
      data: {
        programId: 'p-1',
        appliedFields: ['scheduledAt', 'description'],
        updatedAt: '2026-10-01T00:00:00Z',
        channel: { id: 'c-1', name: 'VTV1' },
      },
    });

    await applyCuration('p-1', {
      scheduledAt: '2026-10-01T20:00:00Z',
      description: 'New description',
      markApplied: true,
    });

    expect(postMock).toHaveBeenCalledWith('/ai-curator/apply/p-1', {
      scheduledAt: '2026-10-01T20:00:00Z',
      description: 'New description',
      markApplied: true,
    });
  });
});

// ─── fetchCurationHistory ─────────────────────────────────────────────────────

describe('fetchCurationHistory', () => {
  it('GETs /ai-curator/history/:programId', async () => {
    getMock.mockResolvedValue({
      data: [
        {
          id: 'h-1',
          programId: 'p-1',
          createdBy: 'u-1',
          createdAt: '2026-10-01T00:00:00Z',
          tokenUsed: 100,
          cached: false,
          broadcastSuitability: 'PRIME_TIME',
          suggestedTimeSlot: '21:00',
          targetAudienceVibe: 'general',
          riskWarnings: null,
          sentimentAnalysis: { overallSentiment: 'positive', hypeLevel: 'high', audienceEngagement: 80 },
          complianceAssessment: { isAgeRestricted: false, ageRating: 'PG', flaggedContent: [], recommendedBroadcastWindow: 'EVENING' },
          aiModelVersion: 'gpt-4o',
          processingTimeMs: 1500,
        },
      ],
    });

    const result = await fetchCurationHistory('p-1');

    expect(getMock).toHaveBeenCalledWith('/ai-curator/history/p-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('h-1');
  });

  it('unwraps { data: [...] } envelope when backend wraps response', async () => {
    // Backend returns { data: [...] }, axios wraps that as
    // { data: { data: [...] } }, so destructuring gives
    // data = { data: [...] } (not an array).
    getMock.mockResolvedValue({
      data: {
        data: [
          {
            id: 'h-2',
            programId: 'p-1',
            createdBy: null,
            createdAt: '2026-10-01T00:00:00Z',
            tokenUsed: null,
            cached: true,
            broadcastSuitability: 'STANDARD',
            suggestedTimeSlot: '20:00',
            targetAudienceVibe: 'family',
            riskWarnings: null,
            sentimentAnalysis: { overallSentiment: 'neutral', hypeLevel: 'medium', audienceEngagement: 50 },
            complianceAssessment: { isAgeRestricted: false, ageRating: 'G', flaggedContent: [], recommendedBroadcastWindow: 'DAY' },
            aiModelVersion: 'heuristic-fallback-v1',
            processingTimeMs: 10,
          },
        ],
      },
    });

    const result = await fetchCurationHistory('p-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('h-2');
    expect(result[0].cached).toBe(true);
  });

  it('returns empty array when response has no data', async () => {
    getMock.mockResolvedValue({ data: {} });

    const result = await fetchCurationHistory('p-1');

    expect(result).toEqual([]);
  });

  it('handles plain array response directly', async () => {
    // axios wraps the response body in { data, ... }; backend
    // returns a plain array, so apiClient.get resolves to
    // { data: [...] }.
    getMock.mockResolvedValue({
      data: [
        {
          id: 'h-3',
          programId: 'p-1',
          createdBy: 'u-1',
          createdAt: '2026-10-01T00:00:00Z',
          tokenUsed: 50,
          cached: false,
          broadcastSuitability: 'RESTRICTED',
          suggestedTimeSlot: '23:00',
          targetAudienceVibe: 'mature',
          riskWarnings: 'Contains mature themes',
          sentimentAnalysis: { overallSentiment: 'negative', hypeLevel: 'medium', audienceEngagement: 30 },
          complianceAssessment: { isAgeRestricted: true, ageRating: 'T16', flaggedContent: ['mature-content'], recommendedBroadcastWindow: 'LATE_NIGHT' },
          aiModelVersion: 'gpt-4o',
          processingTimeMs: 2000,
        },
      ],
    });

    const result = await fetchCurationHistory('p-1');

    expect(result).toHaveLength(1);
    expect(result[0].broadcastSuitability).toBe('RESTRICTED');
    expect(result[0].riskWarnings).toBe('Contains mature themes');
  });
});
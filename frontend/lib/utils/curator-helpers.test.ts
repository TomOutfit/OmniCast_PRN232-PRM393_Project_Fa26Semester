/**
 * OmniCast - AI Curator helper unit tests
 *
 * Pure-function coverage for `lib/utils/curator-helpers.ts`:
 *   - parseSuggestedTime (HH:MM parsing on a fallback date)
 *   - truncate           (ellipsis at max length)
 *   - toReportShape      (strips DB-only fields from history rows)
 *
 * Implementation note: `parseSuggestedTime` uses the native
 * `Date#setHours(hh, mm)` API which writes LOCAL-time hours, so
 * tests assert against local-time getters. The fallback date is
 * picked at 12:00 UTC so the local day matches the intended
 * "same date" across common timezones (UTC, UTC+7, UTC-7, etc.).
 *
 * Run with: `npx vitest run lib/utils/curator-helpers.test.ts`
 */

import { describe, it, expect } from 'vitest';
import { parseSuggestedTime, truncate, toReportShape } from './curator-helpers';

// Anchor at noon UTC so the local-day boundary doesn't shift
// regardless of the host timezone.
const FALLBACK = '2026-10-01T12:00:00Z';

describe('parseSuggestedTime', () => {
  it('parses "21:00 - 23:00" correctly anchored to fallback date', () => {
    const result = parseSuggestedTime('21:00 - 23:00', FALLBACK);
    expect(result).toBeDefined();
    const d = new Date(result!);
    expect(d.getHours()).toBe(21);
    expect(d.getMinutes()).toBe(0);
    // Local date should match the fallback's local date
    const fallback = new Date(FALLBACK);
    expect(d.getFullYear()).toBe(fallback.getFullYear());
    expect(d.getMonth()).toBe(fallback.getMonth());
    expect(d.getDate()).toBe(fallback.getDate());
    // The output must round-trip back to an ISO string.
    expect(new Date(result!).toISOString()).toBe(result);
  });

  it('returns undefined for empty slot', () => {
    expect(parseSuggestedTime('', FALLBACK)).toBeUndefined();
  });

  it('returns undefined for slot without HH:MM pattern', () => {
    expect(parseSuggestedTime('tonight', FALLBACK)).toBeUndefined();
  });

  it('returns undefined for invalid fallback date', () => {
    expect(parseSuggestedTime('21:00', 'not-a-date')).toBeUndefined();
  });

  it('uses only the FIRST HH:MM (ignores end time)', () => {
    const result = parseSuggestedTime('19:00 - 23:30', FALLBACK);
    expect(new Date(result!).getHours()).toBe(19);
    expect(new Date(result!).getMinutes()).toBe(0);
  });

  it('handles single-digit hours', () => {
    const result = parseSuggestedTime('9:30', FALLBACK);
    expect(new Date(result!).getHours()).toBe(9);
    expect(new Date(result!).getMinutes()).toBe(30);
  });
});

describe('truncate', () => {
  it('truncates long strings with ellipsis', () => {
    expect(truncate('a'.repeat(100), 10)).toBe('aaaaaaaaa…');
  });

  it('returns short string unchanged when under max', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('returns empty string for undefined', () => {
    expect(truncate(undefined, 10)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('does not truncate when exactly at max', () => {
    expect(truncate('a'.repeat(10), 10)).toBe('a'.repeat(10));
  });
});

describe('toReportShape', () => {
  it('strips DB-only fields (id, programId, createdBy, createdAt)', () => {
    const history = {
      id: 'report-1',
      programId: 'program-1',
      createdBy: 'user-1',
      createdAt: '2026-10-01T00:00:00Z',
      tokenUsed: 100,
      cached: true,
      broadcastSuitability: 'PRIME_TIME' as const,
      suggestedTimeSlot: '21:00 - 23:00',
      targetAudienceVibe: 'general',
      riskWarnings: 'safe',
      sentimentAnalysis: {
        overallSentiment: 'positive' as const,
        hypeLevel: 'high' as const,
        audienceEngagement: 80,
      },
      complianceAssessment: {
        isAgeRestricted: false,
        ageRating: 'PG' as const,
        flaggedContent: [],
        recommendedBroadcastWindow: 'EVENING' as const,
      },
      aiModelVersion: 'gpt-4o',
      processingTimeMs: 1500,
    };
    const result = toReportShape(history as any);
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('programId');
    expect(result).not.toHaveProperty('createdBy');
    expect(result).not.toHaveProperty('createdAt');
    expect(result.broadcastSuitability).toBe('PRIME_TIME');
    expect(result.processingTimeMs).toBe(1500);
  });

  it('maps all report fields correctly', () => {
    const history = {
      id: 'r-1',
      programId: 'p-1',
      createdBy: 'u-1',
      createdAt: '2026-10-01T00:00:00Z',
      tokenUsed: null,
      cached: false,
      broadcastSuitability: 'STANDARD' as const,
      suggestedTimeSlot: '20:00 - 22:00',
      targetAudienceVibe: 'family',
      riskWarnings: 'none',
      sentimentAnalysis: {
        overallSentiment: 'neutral' as const,
        hypeLevel: 'medium' as const,
        audienceEngagement: 50,
      },
      complianceAssessment: {
        isAgeRestricted: true,
        ageRating: 'T16' as const,
        flaggedContent: ['violence'],
        recommendedBroadcastWindow: 'LATE_NIGHT' as const,
      },
      aiModelVersion: 'heuristic-fallback-v1',
      processingTimeMs: 12,
    };
    const result = toReportShape(history as any);
    expect(result.targetAudienceVibe).toBe('family');
    expect(result.complianceAssessment.ageRating).toBe('T16');
    expect(result.sentimentAnalysis.audienceEngagement).toBe(50);
  });
});
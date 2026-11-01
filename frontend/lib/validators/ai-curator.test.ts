import { describe, it, expect } from 'vitest';
import { aiCuratorRequestSchema } from './ai-curator';

describe('aiCuratorRequestSchema', () => {
  it('sanitizes and strips empty/whitespace strings from tags', () => {
    const input = {
      title: 'Valid Title for Curator Analysis',
      tags: ['YouTube', 'RSS', '', '   '],
    };
    const result = aiCuratorRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(['YouTube', 'RSS']);
    }
  });

  it('allows empty string for language', () => {
    const input = {
      title: 'Valid Title for Curator Analysis',
      language: '',
    };
    const result = aiCuratorRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects titles that are too short with custom Vietnamese message', () => {
    const input = {
      title: 'AB',
    };
    const result = aiCuratorRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Tiêu đề phải có ít nhất');
    }
  });
});

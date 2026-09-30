// ============================================================
// OmniCast - Comment / Reaction Validation Schemas
// ============================================================

import { z } from 'zod';
import { LIMITS } from '@/lib/constants/limits';
import type { ReactionTypeValue } from '@/types';

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(LIMITS.COMMENT_MIN, 'Bình luận không được để trống')
    .max(LIMITS.COMMENT_MAX, `Bình luận tối đa ${LIMITS.COMMENT_MAX} ký tự`),
  parentId: z.string().min(1).optional().nullable(),
});
export type CommentInput = z.infer<typeof commentSchema>;

export const REACTION_VALUES = [
  'HEART',
  'FIRE',
  'CLAP',
  'WOW',
  'SAD',
  'ANGRY',
] as const satisfies readonly ReactionTypeValue[];

export const reactionTypeSchema = z.enum(REACTION_VALUES, {
  errorMap: () => ({ message: 'Loại cảm xúc không hợp lệ' }),
});
// ============================================================
// OmniCast - Watchlist Validation Schemas
// ============================================================

import { z } from 'zod';
import { LIMITS } from '@/lib/constants/limits';

export const addToWatchlistSchema = z.object({
  programId: z.string().min(1, 'Thiếu ID chương trình'),
  channelId: z.string().min(1).optional(),
  note: z
    .string()
    .trim()
    .max(LIMITS.COMMENT_NOTE_MAX, `Ghi chú tối đa ${LIMITS.COMMENT_NOTE_MAX} ký tự`)
    .optional()
    .or(z.literal('')),
});
export type AddToWatchlistInput = z.infer<typeof addToWatchlistSchema>;

export const watchlistNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .max(LIMITS.COMMENT_NOTE_MAX, `Ghi chú tối đa ${LIMITS.COMMENT_NOTE_MAX} ký tự`)
    .optional()
    .or(z.literal('')),
});
export type WatchlistNoteInput = z.infer<typeof watchlistNoteSchema>;
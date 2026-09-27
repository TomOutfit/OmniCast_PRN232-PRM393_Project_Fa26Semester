// ============================================================
// OmniCast - External Source Contracts
// Defines the interface that every per-category external source
// service must implement. The aggregator fans out to whichever
// source matches a channel's category and upserts LiveEvents /
// Recordings via PrismaService.
//
// All methods are idempotent: re-running yields the same set of
// records thanks to the (channelId, externalPlatform, externalId)
// unique constraint on LiveEvent and a hash-based UUID for
// Recordings.
// ============================================================

import { LiveCategory } from '@prisma/client';

/**
 * Normalized LiveEvent shape produced by every source service.
 * The aggregator converts this to a Prisma liveEvent.upsert call.
 */
export interface NormalizedLiveEvent {
  externalId: string;          // unique within the source (e.g. ESPN event id, RAWG game slug)
  externalPlatform: string;    // ExternalPlatform value (CUSTOM_HLS, EMBED_IFRAME, ...)
  title: string;
  description?: string;
  thumbnailUrl?: string;
  scheduledAt: Date;
  startedAt?: Date | null;
  endedAt?: Date | null;
  duration?: number;           // seconds
  status?: 'SCHEDULED' | 'LIVE' | 'ENDED';
  viewerCount?: number;
  peakViewers?: number;
  tags?: string[];
  language?: string;
  metadata?: Record<string, unknown>;  // source-specific extra data
}

/**
 * Normalized Recording (VOD) shape.
 */
export interface NormalizedRecording {
  externalId: string;
  externalPlatform: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration: number;            // seconds
  publishedAt: Date;
  viewCount?: number;
  likeCount?: number;
  contentType?: 'VIDEO' | 'AUDIO';
  quality?: 'SD_480P' | 'HD_720P' | 'FULL_HD_1080P' | 'QHD_1440P' | 'UHD_4K' | 'AUTO';
  tags?: string[];
  sourceUrl?: string;          // direct link to the content
  metadata?: Record<string, unknown>;
}

/**
 * Result of a single source run — counts what happened.
 */
export interface SourceRunResult {
  source: string;
  category: LiveCategory;
  fetched: number;
  upserted: number;
  skipped: number;
  errors: number;
  durationMs: number;
  errorMessages?: string[];
}

/**
 * All sources extend this. Aggregator calls `fetchEvents` and
 * `fetchRecordings` per channel whose category matches.
 */
export abstract class BaseExternalSource {
  /** Display name of the source (e.g. "TheSportsDB", "TMDB"). */
  abstract readonly sourceName: string;

  /** Which LiveCategory this source handles. */
  abstract readonly category: LiveCategory;

  /** True if all required API keys are present. */
  abstract isConfigured(): boolean;

  /** Optional: which env vars this source reads. */
  readonly requiredEnvVars: readonly string[] = [];

  /**
   * Fetch upcoming + recent live events for a channel.
   * Return empty array if source has no live concept for this category.
   */
  abstract fetchEvents(channel: SourceChannelContext): Promise<NormalizedLiveEvent[]>;

  /**
   * Fetch VOD recordings for a channel.
   * Return empty array if source has no VOD concept for this category.
   */
  abstract fetchRecordings(channel: SourceChannelContext): Promise<NormalizedRecording[]>;
}

/**
 * Lightweight context handed to each source — what the source needs
 * to know about the OmniCast channel it's filling content for.
 */
export interface SourceChannelContext {
  channelId: string;
  channelSlug: string;
  channelName: string;
  category: LiveCategory;
  language: string;
  /** Free-form keywords drawn from channel tagline / description. */
  keywords: string[];
  /** Optional explicit external ID the channel has mapped (e.g. RSS channel ID). */
  externalChannelId?: string | null;
}

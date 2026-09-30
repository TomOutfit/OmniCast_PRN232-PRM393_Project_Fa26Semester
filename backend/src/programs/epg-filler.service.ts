// ============================================================
// OmniCast - EPG Schedule Filler Service
// ============================================================
//
// Why this exists
// ---------------
// `ProgramsService.findEpgByDay` builds a 24-hour grid per channel from
// real `LiveEvent` rows. Most channels only have a handful of rows per
// day, so without fillers the grid would be mostly empty. This service
// owns the *gap-filling* logic: pick recordings from the channel's
// library ("kho") and emit synthetic filler slots so the timeline is
// always fully populated.
//
// Design goals (per product spec):
//   1. **No empty days** — every channel/day grid is full 24h, so
//      frontend day filters always have content to render.
//   2. **Genre-aware random selection** — prefer recordings whose
//      `category` matches the channel's category; fall back to the whole
//      library only if no matches exist.
//   3. **Episode splitting** — long recordings (above LONG_PROGRAM_MINUTES)
//      are split into chunks of EPISODE_MINUTES so the grid exposes
//      "Tập 1 / Tập 2 / …" entries instead of one massive block.
//   4. **Limited replay** — the same recording/episode may appear at
//      most MAX_REPEATS_PER_ITEM_PER_DAY times in a single day so the
//      viewer doesn't see the same episode loop endlessly.
//   5. **Reproducible randomness** — selection uses a seeded PRNG keyed
//      on (date, channelId) so the same day always renders the same
//      schedule, but adjacent days surface different content (useful
//      for the front-end day-filter tests).
//
// Pure logic — does not touch Prisma or any I/O so it can be unit-tested
// with simple inputs (see `test/epg-filler.spec.ts`).
// ============================================================

import { Injectable } from '@nestjs/common';
import { EventStatus, LiveCategory } from '@prisma/client';

export interface FillerRecording {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  /** Total recording duration in seconds (the *whole* recording, before
   *  any episode splitting). */
  duration: number;
  tags: string[];
  category: LiveCategory | string | null;
}

export interface FillerChannel {
  id: string;
  name: string;
  category: string;
}

export interface FillerRealProgram {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  thumbnailUrl: string | null;
  durationMinutes: number;
  tags: string[];
  category: string;
}

export interface FillerExpandedProgram extends FillerRealProgram {
  isFiller: boolean;
  fillerKind: 'recording-replay' | 'channel-branding' | null;
  sourceRecordingId: string | null;
  /** Original recording ID this filler was derived from (used for
   *  replay-count tracking). Null for branded placeholders. */
  sourceRecordingOrigin: string | null;
}

@Injectable()
export class EpScheduleFillerService {
  // ---------------------------------------------------------------
  // Tunables — exposed as readonly fields so tests can poke at them
  // ---------------------------------------------------------------

  readonly DEFAULT_FILLER_MINUTES = 90;
  readonly MIN_SLOT_MINUTES = 15;

  /** A recording whose total duration exceeds this is considered
   *  "long" and gets split into episodes. */
  readonly LONG_PROGRAM_SECONDS = 90 * 60;

  /** Each chunk of a long recording has this duration. */
  readonly EPISODE_SECONDS = 45 * 60;

  /** Maximum number of times a single recording/episode may appear in
   *  the *same* day. Beyond this, the filler rotates to the next
   *  item in the library. If the library is exhausted, the cap is
   *  honoured and we stop picking that item. */
  readonly MAX_REPEATS_PER_ITEM_PER_DAY = 2;

  // ---------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------

  /**
   * Expand a channel's daily schedule so the grid is never empty.
   *
   * @returns A list of programs (real + filler) sorted by `startTime`.
   */
  expandChannelSchedule(opts: {
    channel: FillerChannel;
    date: Date;
    realPrograms: FillerRealProgram[];
    recordings: FillerRecording[];
  }): FillerExpandedProgram[] {
    const { channel, date, realPrograms, recordings } = opts;

    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayEnd.getTime();

    // ---- Step 1: split long recordings into episodes ----
    const episodes = this.splitRecordingsIntoEpisodes(recordings);

    // ---- Step 2: genre-aware pool ----
    const pool =
      this.pickGenreMatchedPool(episodes, channel.category, recordings);

    // ---- Step 3: shuffle the pool with a (date, channel) seed ----
    const seed = this.computeSeed(dayStartMs, channel.id);
    const shuffled = this.shuffleDeterministic(pool, seed);

    // ---- Step 4: walk the day, picking items and tracking usage ----
    const used = new Map<string, number>(); // originId -> count
    const result: FillerExpandedProgram[] = [];
    let cursorMs = dayStartMs;

    const sortedReal = [...realPrograms].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    for (const prog of sortedReal) {
      const progStartMs = new Date(prog.startTime).getTime();
      const progEndMs = new Date(prog.endTime).getTime();
      const clampedStartMs = Math.max(progStartMs, dayStartMs);
      const clampedEndMs = Math.min(progEndMs, dayEndMs);

      // Fill the gap before this event with one-or-more fillers.
      let gapCursor = cursorMs;
      while (gapCursor < clampedStartMs) {
        const slotEndMs = Math.min(
          gapCursor + this.DEFAULT_FILLER_MINUTES * 60_000,
          clampedStartMs,
        );
        if (!this.pushFiller(result, channel, gapCursor, slotEndMs, shuffled, used)) {
          break;
        }
        gapCursor = slotEndMs;
      }

      // Place the real event itself.
      result.push({
        ...prog,
        startTime: new Date(clampedStartMs).toISOString(),
        endTime: new Date(clampedEndMs).toISOString(),
        durationMinutes: Math.max(
          this.MIN_SLOT_MINUTES,
          Math.round((clampedEndMs - clampedStartMs) / 60_000),
        ),
        isFiller: false,
        fillerKind: null,
        sourceRecordingId: null,
        sourceRecordingOrigin: null,
      });
      cursorMs = Math.max(cursorMs, clampedEndMs);
    }

    // Fill the rest of the day.
    let tail = cursorMs;
    while (tail < dayEndMs) {
      const slotEndMs = Math.min(
        tail + this.DEFAULT_FILLER_MINUTES * 60_000,
        dayEndMs,
      );
      if (!this.pushFiller(result, channel, tail, slotEndMs, shuffled, used)) {
        break;
      }
      tail = slotEndMs;
    }

    return result;
  }

  // ---------------------------------------------------------------
  // Episode splitting
  // ---------------------------------------------------------------

  /**
   * Walk every recording and emit one `Episode` per chunk. Short
   * recordings (≤ LONG_PROGRAM_SECONDS) are emitted as a single
   * episode so the consumer doesn't need to special-case them.
   *
   * Each episode carries `originId` pointing back at the source
   * recording so replay-count tracking is consistent across episodes
   * of the same programme.
   */
  splitRecordingsIntoEpisodes(
    recordings: FillerRecording[],
  ): EpisodeEntry[] {
    const out: EpisodeEntry[] = [];
    for (const r of recordings) {
      if (r.duration <= this.LONG_PROGRAM_SECONDS) {
        out.push({
          episodeId: `r:${r.id}:1`,
          originId: r.id,
          title: r.title,
          thumbnailUrl: r.thumbnailUrl,
          tags: r.tags ?? [],
          category: r.category,
          durationSeconds: r.duration,
          episodeNumber: 1,
          totalEpisodes: 1,
        });
        continue;
      }
      const totalEpisodes = Math.ceil(r.duration / this.EPISODE_SECONDS);
      for (let i = 0; i < totalEpisodes; i++) {
        const remaining = r.duration - i * this.EPISODE_SECONDS;
        const thisChunk = Math.min(this.EPISODE_SECONDS, remaining);
        out.push({
          episodeId: `r:${r.id}:${i + 1}`,
          originId: r.id,
          title: `${r.title} — Tập ${i + 1}`,
          thumbnailUrl: r.thumbnailUrl,
          tags: [...(r.tags ?? []), `Tập ${i + 1}`],
          category: r.category,
          durationSeconds: thisChunk,
          episodeNumber: i + 1,
          totalEpisodes,
        });
      }
    }
    return out;
  }

  // ---------------------------------------------------------------
  // Genre matching
  // ---------------------------------------------------------------

  /**
   * Prefer episodes whose `category` matches the channel's category.
   * Returns the matching subset, or every episode (regardless of
   * category) when the channel has nothing in the matching genre.
   */
  pickGenreMatchedPool(
    episodes: EpisodeEntry[],
    channelCategory: string,
    allRecordings: FillerRecording[],
  ): EpisodeEntry[] {
    if (episodes.length === 0) return episodes;
    const matching = episodes.filter(
      (e) => e.category != null && String(e.category) === channelCategory,
    );
    if (matching.length > 0) return matching;
    // Fallback: regenerate the pool from raw recordings so the user
    // gets *something* even when no genre match exists.
    return this.splitRecordingsIntoEpisodes(allRecordings);
  }

  // ---------------------------------------------------------------
  // Reproducible randomness
  // ---------------------------------------------------------------

  /**
   * Seed derived from `(dayStartMs, channelId)`. Same day + same
   * channel => same schedule (testable). Different day or channel =>
   * different schedule (so adjacent day-filters surface different
   * content, fulfilling the "no empty days" + "variety" goal).
   */
  computeSeed(dayStartMs: number, channelId: string): number {
    const day = Math.floor(dayStartMs / 86_400_000);
    let h = 0;
    for (let i = 0; i < channelId.length; i++) {
      h = (h * 31 + channelId.charCodeAt(i)) >>> 0;
    }
    return (day * 1_000_003 + h) >>> 0;
  }

  /**
   * Mulberry32 — small, fast, deterministic 32-bit PRNG. Returns a
   * function that yields values in `[0, 1)`.
   */
  mulberry32(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Fisher-Yates shuffle with the seeded PRNG. Returns a new array;
   * does not mutate the input.
   */
  shuffleDeterministic<T>(arr: T[], seed: number): T[] {
    const out = [...arr];
    const rng = this.mulberry32(seed);
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  // ---------------------------------------------------------------
  // Replay limit
  // ---------------------------------------------------------------

  /**
   * Walk the shuffled pool and return the first episode whose
   * per-day replay count is below the cap. If everything is over
   * the cap (i.e. the pool is smaller than the day needs), return
   * `null` so the caller can break out of the loop.
   */
  pickNextEpisode(
    shuffled: EpisodeEntry[],
    used: Map<string, number>,
  ): EpisodeEntry | null {
    const cap = this.MAX_REPEATS_PER_ITEM_PER_DAY;
    for (const ep of shuffled) {
      const count = used.get(ep.originId) ?? 0;
      if (count < cap) return ep;
    }
    return null;
  }

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------

  /**
   * Emit a filler slot covering `[slotStartMs, slotEndMs)`. Returns
   * `true` when something was emitted, `false` when the gap is too
   * small to render (< MIN_SLOT_MINUTES) or we've already exhausted
   * every source of content.
   *
   * Selection order:
   *   1. Try a fresh episode from the library.
   *   2. If the library is exhausted (every recording has hit the
   *      replay cap), emit a **branded placeholder** so the grid is
   *      never empty — this is the safety net the spec requires.
   */
  private pushFiller(
    out: FillerExpandedProgram[],
    channel: FillerChannel,
    slotStartMs: number,
    slotEndMs: number,
    shuffled: EpisodeEntry[],
    used: Map<string, number>,
  ): boolean {
    const slotMinutes = Math.round((slotEndMs - slotStartMs) / 60_000);
    if (slotMinutes < this.MIN_SLOT_MINUTES) return false;

    const ep = this.pickNextEpisode(shuffled, used);
    if (ep) {
      used.set(ep.originId, (used.get(ep.originId) ?? 0) + 1);
      out.push({
        id: `filler-rec-${ep.originId}-ep${ep.episodeNumber}-${slotStartMs}`,
        title: ep.title,
        startTime: new Date(slotStartMs).toISOString(),
        endTime: new Date(slotEndMs).toISOString(),
        status: 'SCHEDULED' as EventStatus,
        thumbnailUrl: ep.thumbnailUrl ?? null,
        durationMinutes: slotMinutes,
        tags: [...(ep.tags ?? []), 'Replay'],
        category: channel.category,
        isFiller: true,
        fillerKind: 'recording-replay',
        sourceRecordingId: ep.originId,
        sourceRecordingOrigin: ep.originId,
      });
      return true;
    }

    // Fallback: branded placeholder. Used when the library is empty or
    // every recording has already hit the replay cap. This guarantees the
    // day is never blank, which is the whole point of the filler.
    out.push({
      id: `filler-brand-${channel.id}-${slotStartMs}`,
      title: `${channel.name} — Đang phát sóng`,
      startTime: new Date(slotStartMs).toISOString(),
      endTime: new Date(slotEndMs).toISOString(),
      status: 'SCHEDULED' as EventStatus,
      thumbnailUrl: null,
      durationMinutes: slotMinutes,
      tags: [channel.category, 'Channel Branding'],
      category: channel.category,
      isFiller: true,
      fillerKind: 'channel-branding',
      sourceRecordingId: null,
      sourceRecordingOrigin: null,
    });
    return true;
  }
}

/**
 * One playable episode. May be the whole recording (short programme) or
 * a single chunk of a long recording that was split into pieces.
 */
export interface EpisodeEntry {
  episodeId: string;
  /** Stable ID of the source recording. Multiple episodes share this. */
  originId: string;
  title: string;
  thumbnailUrl: string | null;
  tags: string[];
  category: LiveCategory | string | null;
  durationSeconds: number;
  episodeNumber: number;
  totalEpisodes: number;
}

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
    dayStart?: Date;
    dayEnd?: Date;
    realPrograms: FillerRealProgram[];
    recordings: FillerRecording[];
  }): FillerExpandedProgram[] {
    const { channel, date, realPrograms, recordings } = opts;

    const dayStart = opts.dayStart ?? (() => {
      const d = new Date(date);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    })();
    const dayEnd = opts.dayEnd ?? (() => {
      const d = new Date(dayStart);
      d.setUTCDate(d.getUTCDate() + 1);
      return d;
    })();
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

    // Fallback: branded placeholder with realistic time-of-day appropriate title.
    // Used when library is empty or every recording has hit the replay cap.
    // Guaranteed non-empty day while reflecting realistic TV broadcasting time slots.
    const title = this.getBrandedTitle(channel.name, channel.category, slotStartMs, out);
    out.push({
      id: `filler-brand-${channel.id}-${slotStartMs}`,
      title,
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

  /**
   * Determine a realistic, time-appropriate program title for synthetic filler slots.
   * Matches real Vietnamese television dayparts (UTC+7) so morning news is in morning,
   * lunch news at 11h30, prime-time at 20h, etc.
   */
  private getBrandedTitle(
    channelName: string,
    category: string,
    slotStartMs: number,
    existingPrograms: FillerExpandedProgram[],
  ): string {
    const date = new Date(slotStartMs);
    // Convert UTC to Vietnam local hour (UTC+7)
    const localHour = (date.getUTCHours() + 7) % 24;
    const cat = (category || '').toUpperCase();

    let candidate = '';
    if (localHour >= 0 && localHour < 6) {
      if (cat.includes('SPORT')) candidate = `${channelName}: Replay Trận Cầu Kinh Điển Đêm Muộn`;
      else if (cat.includes('CINE') || cat.includes('MOVIE') || cat.includes('DRAMA')) candidate = `${channelName}: Điện Ảnh Kinh Điển Đêm Khuya`;
      else if (cat.includes('NEWS') || cat.includes('BUSINESS')) candidate = `${channelName}: Ký Sự & Phóng Sự Quốc Tế Đêm`;
      else if (cat.includes('KID')) candidate = `${channelName}: Kể Chuyện Cổ Tích Ru Ngủ Bé Yêu`;
      else if (cat.includes('MUSIC') || cat.includes('ENTERTAIN')) candidate = `${channelName}: Acoustic Chillout & Nhạc Thư Giãn`;
      else candidate = `${channelName}: Tuyển Tập Đặc Sắc Đêm Muộn`;
    } else if (localHour >= 6 && localHour < 9) {
      if (cat.includes('SPORT')) candidate = `${channelName}: Điểm Tin Thể Thao Sáng 24H`;
      else if (cat.includes('NEWS') || cat.includes('BUSINESS')) candidate = `${channelName}: Chào Ngày Mới & Điểm Báo Toàn Cầu`;
      else if (cat.includes('KID')) candidate = `${channelName}: Thể Dục Vui Nhộn & Hoạt Hình Sáng`;
      else candidate = `${channelName}: Khởi Động Ngày Mới`;
    } else if (localHour >= 9 && localHour < 11) {
      if (cat.includes('SPORT')) candidate = `${channelName}: Tạp Chí Thể Thao & Đua Xe Tốc Độ`;
      else if (cat.includes('NEWS') || cat.includes('BUSINESS')) candidate = `${channelName}: Tọa Đàm Kinh Tế & Thị Trường Số`;
      else candidate = `${channelName}: Tạp Chí Chuyên Đề & Khám Phá`;
    } else if (localHour >= 11 && localHour < 14) {
      if (cat.includes('SPORT')) candidate = `${channelName}: Thể Thao Trưa & Phỏng Vấn Chuyên Sâu`;
      else if (cat.includes('NEWS') || cat.includes('BUSINESS')) candidate = `${channelName}: Thời Sự Trưa 11H30 (Toàn Cảnh)`;
      else if (cat.includes('KID')) candidate = `${channelName}: Giờ Hoạt Hình Trưa Của Bé`;
      else candidate = `${channelName}: Tiêu Điểm Buổi Trưa`;
    } else if (localHour >= 14 && localHour < 18) {
      if (cat.includes('SPORT')) candidate = `${channelName}: Quần Vợt & Bóng Chuyền Quốc Tế`;
      else if (cat.includes('CINE') || cat.includes('MOVIE') || cat.includes('DRAMA')) candidate = `${channelName}: Phim Truyền Hình & Series Chiều`;
      else if (cat.includes('ESPORT') || cat.includes('GAME')) candidate = `${channelName}: Đấu Trường Esports Chiều`;
      else candidate = `${channelName}: Chương Trình Chiều Đặc Sắc`;
    } else if (localHour >= 18 && localHour < 20) {
      if (cat.includes('SPORT')) candidate = `${channelName}: Studio Tiền Trận & Tiêu Điểm Sân Cỏ`;
      else if (cat.includes('NEWS') || cat.includes('BUSINESS')) candidate = `${channelName}: Thời Sự 19H: Bản Tin Quốc Gia`;
      else if (cat.includes('KID')) candidate = `${channelName}: Hoạt Hình Giờ Vàng Thiếu Nhi`;
      else candidate = `${channelName}: Tiêu Điểm Đầu Tối`;
    } else if (localHour >= 20 && localHour < 22) {
      if (cat.includes('SPORT')) candidate = `${channelName}: Trận Cầu Đỉnh Cao Khung Giờ Vàng`;
      else if (cat.includes('CINE') || cat.includes('MOVIE')) candidate = `${channelName}: Bom Tấn Điện Ảnh Chiếu Rạp 4K`;
      else if (cat.includes('SHOW') || cat.includes('ENTERTAIN')) candidate = `${channelName}: Mega Show Khung Giờ Vàng`;
      else if (cat.includes('ESPORT')) candidate = `${channelName}: Đại Chiến Chung Kết Esports 4K`;
      else candidate = `${channelName}: Khung Giờ Vàng Truyền Hình`;
    } else {
      if (cat.includes('SPORT')) candidate = `${channelName}: Omni Extra Time (Phỏng Vấn Sau Trận)`;
      else if (cat.includes('NEWS') || cat.includes('BUSINESS')) candidate = `${channelName}: Bản Tin Đêm: Toàn Cảnh Thế Giới 23H`;
      else if (cat.includes('CINE') || cat.includes('MOVIE')) candidate = `${channelName}: Phim Tâm Lý Ly Kỳ Đêm Muộn`;
      else candidate = `${channelName}: Tổng Hợp Sự Kiện & Đêm Muộn`;
    }

    // Ensure no two consecutive programs have the exact same title
    const lastProg = existingPrograms.length > 0 ? existingPrograms[existingPrograms.length - 1] : null;
    if (lastProg && lastProg.title === candidate) {
      return `${candidate} (Phần tiếp theo)`;
    }
    return candidate;
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

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
  videoUrl?: string | null;
  /** Total recording duration in seconds (the *whole* recording, before
   *  any episode splitting). */
  duration: number;
  tags: string[];
  category: LiveCategory | string | null;
}

export interface FillerChannel {
  id: string;
  name: string;
  slug?: string;
  category: string;
}

export interface FillerRealProgram {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  thumbnailUrl: string | null;
  streamUrl?: string | null;
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
    let lastOriginId: string | null = null;

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
        const remainingGapMin = Math.round((clampedStartMs - gapCursor) / 60_000);
        if (remainingGapMin < this.MIN_SLOT_MINUTES) {
          if (result.length > 0) {
            const last = result[result.length - 1];
            last.endTime = new Date(clampedStartMs).toISOString();
            last.durationMinutes += remainingGapMin;
          }
          break;
        }

        const ep = this.pickNextEpisode(shuffled, used, lastOriginId, gapCursor, channel.category);
        const slotDurationMin = this.getSlotDuration(ep, gapCursor, remainingGapMin, channel.category);
        const slotEndMs = Math.min(gapCursor + slotDurationMin * 60_000, clampedStartMs);

        if (!this.pushFillerSlot(result, channel, gapCursor, slotEndMs, ep, shuffled, used)) {
          break;
        }
        gapCursor = slotEndMs;
        lastOriginId = result[result.length - 1]?.sourceRecordingOrigin ?? null;
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
      lastOriginId = null;
    }

    // Fill the rest of the day.
    let tail = cursorMs;
    while (tail < dayEndMs) {
      const remainingGapMin = Math.round((dayEndMs - tail) / 60_000);
      if (remainingGapMin < this.MIN_SLOT_MINUTES) {
        if (result.length > 0) {
          const last = result[result.length - 1];
          last.endTime = new Date(dayEndMs).toISOString();
          last.durationMinutes += remainingGapMin;
        }
        break;
      }

      const ep = this.pickNextEpisode(shuffled, used, lastOriginId, tail, channel.category);
      const slotDurationMin = this.getSlotDuration(ep, tail, remainingGapMin, channel.category);
      const slotEndMs = Math.min(tail + slotDurationMin * 60_000, dayEndMs);

      if (!this.pushFillerSlot(result, channel, tail, slotEndMs, ep, shuffled, used)) {
        break;
      }
      tail = slotEndMs;
      lastOriginId = result[result.length - 1]?.sourceRecordingOrigin ?? null;
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
          videoUrl: r.videoUrl,
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
          videoUrl: r.videoUrl,
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
  // Replay limit & Time-of-day selection
  // ---------------------------------------------------------------

  /**
   * Walk the shuffled pool and return an episode whose per-day replay count
   * is below the cap. Prioritizes:
   *   1. Episodes not yet aired today (count === 0) that are NOT the previous origin
   *      and have high affinity for the current time slot.
   *   2. Any unused episode that is NOT the previous origin.
   *   3. Episodes with count < cap that are NOT the previous origin.
   *   4. Single-item library fallback.
   */
  pickNextEpisode(
    shuffled: EpisodeEntry[],
    used: Map<string, number>,
    lastOriginId?: string | null,
    currentSlotMs?: number,
    channelCategory?: string,
  ): EpisodeEntry | null {
    const cap = this.MAX_REPEATS_PER_ITEM_PER_DAY;

    const getAffinityScore = (ep: EpisodeEntry, slotMs?: number): number => {
      if (!slotMs) return 0;
      const hour = (new Date(slotMs).getUTCHours() + 7) % 24;
      const titleLower = ep.title.toLowerCase();
      const tagsLower = ep.tags.map((t) => t.toLowerCase()).join(' ');
      const text = `${titleLower} ${tagsLower}`;

      // Night (00:00 - 06:00)
      if (hour >= 0 && hour < 6) {
        if (
          text.includes('đêm') ||
          text.includes('khuya') ||
          text.includes('podcast') ||
          text.includes('sách') ||
          text.includes('ngủ') ||
          text.includes('thiền') ||
          text.includes('chill') ||
          text.includes('triết học') ||
          text.includes('tâm sự') ||
          text.includes('phim ngắn')
        ) return 10;
        if (text.includes('ôn thi') || text.includes('thpt') || text.includes('nấu ăn')) return -10;
        return 1;
      }
      // Morning (06:00 - 09:00)
      if (hour >= 6 && hour < 9) {
        if (
          text.includes('sáng') ||
          text.includes('chào ngày mới') ||
          text.includes('khởi động') ||
          text.includes('yoga') ||
          text.includes('thể dục') ||
          text.includes('tin tức') ||
          text.includes('hoạt hình') ||
          text.includes('thí nghiệm')
        ) return 10;
        return 1;
      }
      // Midday (09:00 - 11:30)
      if (hour >= 9 && hour < 11) {
        if (
          text.includes('workshop') ||
          text.includes('kỹ năng') ||
          text.includes('khám phá') ||
          text.includes('khóa học')
        ) return 10;
        return 1;
      }
      // Lunch (11:30 - 14:00)
      if (hour >= 11 && hour < 14) {
        if (
          text.includes('trưa') ||
          text.includes('nấu ăn') ||
          text.includes('ẩm thực') ||
          text.includes('món') ||
          text.includes('eat clean') ||
          text.includes('bản tin')
        ) return 10;
        return 1;
      }
      // Afternoon (14:00 - 18:00)
      if (hour >= 14 && hour < 18) {
        if (
          text.includes('ôn thi') ||
          text.includes('thpt') ||
          text.includes('toán') ||
          text.includes('lớp học') ||
          text.includes('khóa học') ||
          text.includes('ielts') ||
          text.includes('python') ||
          text.includes('thiết kế') ||
          text.includes('chiều')
        ) return 10;
        return 1;
      }
      // Prime time (18:00 - 22:30)
      if (hour >= 18 && hour < 22) {
        if (
          text.includes('trực tiếp') ||
          text.includes('đỉnh cao') ||
          text.includes('bom tấn') ||
          text.includes('chung kết') ||
          text.includes('đại chiến') ||
          text.includes('show') ||
          text.includes('vàng')
        ) return 10;
        return 1;
      }
      return 1;
    };

    // Priority 1: Unused items (count == 0) with high daypart affinity, not matching previous origin
    let bestUnused: EpisodeEntry | null = null;
    let bestUnusedScore = -999;
    for (const ep of shuffled) {
      const count = used.get(ep.originId) ?? 0;
      if (count === 0 && (!lastOriginId || ep.originId !== lastOriginId)) {
        const score = getAffinityScore(ep, currentSlotMs);
        if (score > bestUnusedScore) {
          bestUnusedScore = score;
          bestUnused = ep;
        }
      }
    }
    if (bestUnused && bestUnusedScore > -10) return bestUnused;

    // Priority 2: Any unused item (count == 0) that does not repeat the previous origin
    for (const ep of shuffled) {
      const count = used.get(ep.originId) ?? 0;
      if (count === 0 && (!lastOriginId || ep.originId !== lastOriginId)) {
        return ep;
      }
    }

    // Priority 3: Replays (count < cap), avoiding consecutive repetition
    let bestReplay: EpisodeEntry | null = null;
    let bestReplayScore = -999;
    for (const ep of shuffled) {
      const count = used.get(ep.originId) ?? 0;
      if (count < cap && (!lastOriginId || ep.originId !== lastOriginId)) {
        const score = getAffinityScore(ep, currentSlotMs);
        if (score > bestReplayScore) {
          bestReplayScore = score;
          bestReplay = ep;
        }
      }
    }
    if (bestReplay && bestReplayScore > -10) return bestReplay;

    for (const ep of shuffled) {
      const count = used.get(ep.originId) ?? 0;
      if (count < cap && (!lastOriginId || ep.originId !== lastOriginId)) {
        return ep;
      }
    }

    // Priority 4: Fallback for single-item pools
    for (const ep of shuffled) {
      const count = used.get(ep.originId) ?? 0;
      if (count < cap) return ep;
    }

    return null;
  }

  // ---------------------------------------------------------------
  // Slot Duration Determination
  // ---------------------------------------------------------------

  getSlotDuration(
    ep: EpisodeEntry | null,
    slotStartMs: number,
    remainingGapMin: number,
    channelCategory: string,
  ): number {
    let desired: number;
    if (ep && ep.durationSeconds > 0) {
      const rawMin = Math.round(ep.durationSeconds / 60);
      desired = Math.max(this.MIN_SLOT_MINUTES, Math.min(180, rawMin));
    } else {
      const hour = (new Date(slotStartMs).getUTCHours() + 7) % 24;
      const cat = (channelCategory || '').toUpperCase();
      if (hour >= 0 && hour < 6) {
        desired = cat.includes('CINE') || cat.includes('SPORT') ? 90 : 60;
      } else if (hour >= 6 && hour < 9) {
        desired = cat.includes('KID') || cat.includes('NEWS') ? 30 : 45;
      } else if (hour >= 9 && hour < 11) {
        desired = 45;
      } else if (hour >= 11 && hour < 14) {
        desired = cat.includes('NEWS') || cat.includes('KID') ? 30 : 45;
      } else if (hour >= 14 && hour < 18) {
        desired = cat.includes('CINE') ? 90 : 60;
      } else if (hour >= 18 && hour < 20) {
        desired = cat.includes('KID') ? 30 : 45;
      } else if (hour >= 20 && hour < 22) {
        desired = cat.includes('CINE') || cat.includes('SPORT') ? 90 : 60;
      } else {
        desired = 60;
      }
    }

    if (desired >= remainingGapMin) {
      return remainingGapMin;
    }
    const remainder = remainingGapMin - desired;
    if (remainder > 0 && remainder < this.MIN_SLOT_MINUTES) {
      return remainingGapMin;
    }
    return desired;
  }

  // ---------------------------------------------------------------
  // Push Filler Helpers
  // ---------------------------------------------------------------

  pushFillerSlot(
    out: FillerExpandedProgram[],
    channel: FillerChannel,
    slotStartMs: number,
    slotEndMs: number,
    ep: EpisodeEntry | null,
    shuffled: EpisodeEntry[],
    used: Map<string, number>,
  ): boolean {
    const slotMinutes = Math.round((slotEndMs - slotStartMs) / 60_000);
    if (slotMinutes < this.MIN_SLOT_MINUTES) return false;

    if (ep) {
      used.set(ep.originId, (used.get(ep.originId) ?? 0) + 1);
      out.push({
        id: `filler-rec-${ep.originId}-ep${ep.episodeNumber}-${slotStartMs}`,
        title: ep.title,
        startTime: new Date(slotStartMs).toISOString(),
        endTime: new Date(slotEndMs).toISOString(),
        status: 'SCHEDULED' as EventStatus,
        thumbnailUrl: ep.thumbnailUrl ?? null,
        streamUrl: ep.videoUrl ?? null,
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
    const title = this.getBrandedTitle(channel.name, channel.category, slotStartMs, out, channel.slug);
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

  private pushFiller(
    out: FillerExpandedProgram[],
    channel: FillerChannel,
    slotStartMs: number,
    slotEndMs: number,
    shuffled: EpisodeEntry[],
    used: Map<string, number>,
  ): boolean {
    const lastOriginId = out.length > 0 ? (out[out.length - 1].sourceRecordingOrigin ?? null) : null;
    const ep = this.pickNextEpisode(shuffled, used, lastOriginId, slotStartMs, channel.category);
    return this.pushFillerSlot(out, channel, slotStartMs, slotEndMs, ep, shuffled, used);
  }

  /**
   * Determine a realistic, time-appropriate program title for synthetic filler slots.
   * Matches real Vietnamese television dayparts (UTC+7) so morning news is in morning,
   * lunch news at 11h30, prime-time at 20h, etc. Guarantees no two consecutive programs
   * share the same title.
   */
  private getBrandedTitle(
    channelName: string,
    category: string,
    slotStartMs: number,
    existingPrograms: FillerExpandedProgram[],
    slug?: string,
  ): string {
    const date = new Date(slotStartMs);
    const localHour = (date.getUTCHours() + 7) % 24;
    const cat = (category || '').toUpperCase();
    const slotIdx = existingPrograms.length;
    const s = (slug || '').toLowerCase();
    const isSport2 = s === 'sport-2' || s === 'omni-sport-2' || channelName.includes('Sport 2') || channelName.endsWith(' 2');

    const pickTitle = (candidates: string[]): string => {
      const lastProg = existingPrograms.length > 0 ? existingPrograms[existingPrograms.length - 1] : null;
      const lastTitle = lastProg ? lastProg.title : '';

      for (let offset = 0; offset < candidates.length; offset++) {
        const chosen = candidates[(slotIdx + offset) % candidates.length];
        if (chosen !== lastTitle) {
          return chosen;
        }
      }
      return `${candidates[0]} (Tập mới)`;
    };

    // Overnight (00:00 - 06:00)
    if (localHour >= 0 && localHour < 6) {
      if (cat.includes('SPORT')) {
        if (isSport2) {
          return pickTitle([
            `${channelName}: F1 Replay: Monaco Grand Prix Siêu Tốc Độ (4K)`,
            `${channelName}: MotoGP: Những Pha Cua Tử Thần Nghiêng 65 Độ & Bứt Tốc 360km/h`,
            `${channelName}: Tuyển Tập Knock-Out Nhanh Nhất Lịch Sử UFC & Quyền Anh Thế Giới`,
            `${channelName}: Thể Thao Mạo Hiểm Red Bull: Lướt Sóng Khổng Lồ Nazare`,
          ]);
        }
        return pickTitle([
          `${channelName}: Replay Trận Cầu Siêu Kinh Điển Champions League (4K Atmos)`,
          `${channelName}: Top 10 Bàn Thắng Vàng Ngoại Hạng Anh Mọi Thời Đại`,
          `${channelName}: Huyền Thoại Sân Cỏ: Những Khoảnh Khắc Lịch Sử Bóng Đá`,
          `${channelName}: Tuyển Tập Trận Thư Hùng El Clásico Kịch Tính Nhất`,
        ]);
      }
      if (cat.includes('CINE') || cat.includes('MOVIE') || cat.includes('DRAMA')) {
        return pickTitle([
          `${channelName}: Điện Ảnh Kinh Điển Đêm Khuya`,
          `${channelName}: Phim Ngắn Độc Lập Đoạt Giải`,
          `${channelName}: Tuyển Tập Điện Ảnh Tác Giả 4K`,
          `${channelName}: Ký Sự Hậu Trường Điện Ảnh Thế Giới`,
        ]);
      }
      if (cat.includes('NEWS') || cat.includes('BUSINESS')) {
        return pickTitle([
          `${channelName}: Ký Sự & Phóng Sự Quốc Tế Đêm`,
          `${channelName}: Toàn Cảnh Kinh Tế Thế Giới 24H`,
          `${channelName}: Báo Cáo Chuyên Đề: Thị Trường Toàn Cầu`,
          `${channelName}: Hồ Sơ Tài Chính & Khởi Nghiệp Quốc Tế`,
        ]);
      }
      if (cat.includes('KID')) {
        return pickTitle([
          `${channelName}: Kể Chuyện Cổ Tích Ru Ngủ Bé Yêu`,
          `${channelName}: Khúc Hát Ru & Giai Điệu Êm Dịu`,
          `${channelName}: Hoạt Hình Thư Giãn Giấc Ngủ Bé`,
          `${channelName}: Thế Giới Cổ Tích Huyền Bí Cho Bé`,
        ]);
      }
      if (cat.includes('MUSIC') || cat.includes('ENTERTAIN')) {
        return pickTitle([
          `${channelName}: Acoustic Chillout & Nhạc Thư Giãn`,
          `${channelName}: Những Bản Tình Ca Đêm Muộn`,
          `${channelName}: Live Session: Giai Điệu Mộc`,
          `${channelName}: Âm Nhạc Không Lời & Thư Thái Tâm Hồn`,
        ]);
      }
      if (cat.includes('EDUCATION') || cat.includes('TECH') || cat.includes('DOC') || cat.includes('ART')) {
        return pickTitle([
          `${channelName}: Bài Giảng Triết Học & Tư Duy Nhân Loại`,
          `${channelName}: Khám Phá Vũ Trụ & Bí Ẩn Khoa Học`,
          `${channelName}: Sách Nói Kỹ Năng & Tư Duy Phản Biện`,
          `${channelName}: Hành Trình Văn Minh & Lịch Sử Thế Giới`,
        ]);
      }
      return pickTitle([
        `${channelName}: Tuyển Tập Đặc Sắc Đêm Muộn`,
        `${channelName}: Ký Sự Khám Phá Đêm`,
        `${channelName}: Góc Nhìn Văn Hóa & Đời Sống`,
        `${channelName}: Những Câu Chuyện Truyền Cảm Hứng`,
      ]);
    }

    // Morning (06:00 - 09:00)
    if (localHour >= 6 && localHour < 9) {
      if (cat.includes('SPORT')) {
        if (isSport2) {
          return pickTitle([
            `${channelName}: Bản Tin Thể Thao Tốc Độ & Đối Kháng: Điểm Tin F1 & UFC 24 Giờ`,
            `${channelName}: Bóng Rổ NBA: Highlights Màn Rượt Đuổi Điểm Số Nghẹt Thở`,
            `${channelName}: Quần Vợt ATP Masters 1000: Highlights Cú Đánh Winner & Ace`,
          ]);
        }
        return pickTitle([
          `${channelName}: Bản Tin Thể Thao Sáng: Điểm Tin Sân Cỏ 24 Giờ Toàn Cầu`,
          `${channelName}: Tạp Chí Ngoại Hạng Anh: Bàn Thắng & Tình Huống VAR`,
          `${channelName}: Toàn Cảnh Kết Quả Cúp C1 Châu Âu Đêm Qua`,
        ]);
      }
      if (cat.includes('NEWS') || cat.includes('BUSINESS')) {
        return pickTitle([
          `${channelName}: Chào Ngày Mới & Điểm Báo Toàn Cầu`,
          `${channelName}: Nhịp Đập Thị Trường & Mở Cửa Phiên Giao Dịch`,
          `${channelName}: Tin Tức Buổi Sáng & Dự Báo Thời Tiết Toàn Quốc`,
        ]);
      }
      if (cat.includes('KID')) {
        return pickTitle([
          `${channelName}: Thể Dục Vui Nhộn & Hoạt Hình Sáng`,
          `${channelName}: Bé Học Điều Hay Cùng Bạn Mới`,
          `${channelName}: Giờ Hoạt Hình Chào Buổi Sáng`,
        ]);
      }
      return pickTitle([
        `${channelName}: Khởi Động Ngày Mới Năng Động`,
        `${channelName}: Năng Lượng Tích Cực Mỗi Ngày`,
        `${channelName}: Chào Buổi Sáng Cùng OmniCast`,
      ]);
    }

    // Mid-Morning (09:00 - 11:30)
    if (localHour >= 9 && localHour < 11) {
      if (cat.includes('SPORT')) {
        if (isSport2) {
          return pickTitle([
            `${channelName}: Tạp Chí Kỹ Thuật F1: Mổ Xẻ Động Cơ Hybrid & Khí Động Học Cánh Gió`,
            `${channelName}: Bản Tin Đối Kháng: Cân Ký & Chạm Trán Face-Off Trước Giờ Đấu`,
          ]);
        }
        return pickTitle([
          `${channelName}: Phân Tích Chiến Thuật & Đội Hình Derby Rực Lửa`,
          `${channelName}: Ký Sự Cầu Thủ: Con Đường Trở Thành Siêu Sao`,
        ]);
      }
      if (cat.includes('NEWS') || cat.includes('BUSINESS')) {
        return pickTitle([
          `${channelName}: Tọa Đàm Kinh Tế & Thị Trường Số`,
          `${channelName}: Phân Tích Chuyên Sâu Doanh Nghiệp & Đầu Tư`,
        ]);
      }
      if (cat.includes('EDUCATION') || cat.includes('TECH')) {
        return pickTitle([
          `${channelName}: Lớp Học Kỹ Năng Số & Lập Trình Cơ Bản`,
          `${channelName}: Công Nghệ Mới & Ứng Dụng Thực Tiễn`,
        ]);
      }
      return pickTitle([
        `${channelName}: Tạp Chí Chuyên Đề & Khám Phá`,
        `${channelName}: Phong Cách Sống Hiện Đại & Sáng Tạo`,
      ]);
    }

    // Lunch (11:30 - 14:00)
    if (localHour >= 11 && localHour < 14) {
      if (cat.includes('SPORT')) {
        if (isSport2) {
          return pickTitle([
            `${channelName}: Tốc Độ Trưa: Phân Tích Đường Đua F1 & Chiến Thuật Pit-Stop`,
            `${channelName}: Phỏng Vấn Độc Quyền Tay Đua Vô Địch & Võ Sĩ Quyền Anh`,
          ]);
        }
        return pickTitle([
          `${channelName}: Bóng Đá Trưa & Phỏng Vấn Độc Quyền Huấn Luyện Viên`,
          `${channelName}: Bản Tin Chuyển Nhượng & Thị Trường Cầu Thủ`,
        ]);
      }
      if (cat.includes('NEWS') || cat.includes('BUSINESS')) {
        return pickTitle([
          `${channelName}: Thời Sự Trưa 11H30: Bản Tin Toàn Cảnh`,
          `${channelName}: Kinh Tế Trưa & Cập Nhật Giá Cả Thị Trường`,
        ]);
      }
      if (cat.includes('FOOD')) {
        return pickTitle([
          `${channelName}: Ẩm Thực Bốn Phương: Món Ngon Bữa Trưa`,
          `${channelName}: Bếp Trưởng Vào Bếp & Thực Đơn Gia Đình`,
        ]);
      }
      if (cat.includes('KID')) {
        return pickTitle([
          `${channelName}: Giờ Hoạt Hình Trưa Của Bé`,
          `${channelName}: Thế Giới Diệu Kỳ & Bài Học Vui`,
        ]);
      }
      return pickTitle([
        `${channelName}: Tiêu Điểm Buổi Trưa`,
        `${channelName}: Phút Thư Giãn Nghỉ Trưa`,
      ]);
    }

    // Afternoon (14:00 - 18:00)
    if (localHour >= 14 && localHour < 18) {
      if (cat.includes('SPORT')) {
        if (isSport2) {
          return pickTitle([
            `${channelName}: Trực Tiếp Quần Vợt Grand Slam: Vòng Bán Kết Đỉnh Cao (4K HDR)`,
            `${channelName}: Bóng Chuyền Nữ VNL: Trận Thư Hùng Kinh Điển Châu Á`,
          ]);
        }
        return pickTitle([
          `${channelName}: Trực Tiếp V-League: Trận Cầu Tâm Điểm Vòng Đấu`,
          `${channelName}: Cúp C1 Châu Á AFC Champions League: Vòng Bảng 4K`,
        ]);
      }
      if (cat.includes('CINE') || cat.includes('MOVIE') || cat.includes('DRAMA')) {
        return pickTitle([
          `${channelName}: Phim Truyền Hình & Series Chiều`,
          `${channelName}: Điện Ảnh Gia Đình Giờ Chiều`,
        ]);
      }
      if (cat.includes('EDUCATION')) {
        return pickTitle([
          `${channelName}: Ôn Thi THPT Quốc Gia: Chuyên Đề Tổng Ôn`,
          `${channelName}: Workshop Khoa Học & Kỹ Năng Thực Hành`,
        ]);
      }
      if (cat.includes('ESPORT') || cat.includes('GAME')) {
        return pickTitle([
          `${channelName}: Đấu Trường Esports Chiều: Vòng Bảng`,
          `${channelName}: Trận Đấu Thử Thách Game Thủ`,
        ]);
      }
      return pickTitle([
        `${channelName}: Chương Trình Chiều Đặc Sắc`,
        `${channelName}: Tạp Chí Văn Hóa & Nghệ Thuật Chiều`,
      ]);
    }

    // Early Evening (18:00 - 20:00)
    if (localHour >= 18 && localHour < 20) {
      if (cat.includes('SPORT')) {
        if (isSport2) {
          return pickTitle([
            `${channelName}: Studio Tốc Độ: Nhận Định Chặng Phân Hạng F1 & Face-Off UFC`,
            `${channelName}: Cận Cảnh Pit-Lane & Khởi Động Trước Giờ Thượng Đài UFC`,
          ]);
        }
        return pickTitle([
          `${channelName}: Studio Tiền Trận: Siêu Kinh Điển Ngoại Hạng Anh`,
          `${channelName}: Bình Luận Trước Giờ Bóng Lăn & Đội Hình Ra Sân`,
        ]);
      }
      if (cat.includes('NEWS') || cat.includes('BUSINESS')) {
        return pickTitle([
          `${channelName}: Thời Sự 19H: Bản Tin Quốc Gia & Toàn Cầu`,
          `${channelName}: Điểm Tin 24H: Dòng Chảy Sự Kiện`,
        ]);
      }
      if (cat.includes('KID')) {
        return pickTitle([
          `${channelName}: Hoạt Hình Giờ Vàng Thiếu Nhi`,
          `${channelName}: Chuyến Phiêu Lưu Kỳ Thú Cùng Siêu Nhân Nhí`,
        ]);
      }
      return pickTitle([
        `${channelName}: Tiêu Điểm Đầu Tối`,
        `${channelName}: Bản Tin Chiều Tối & Gia Đình`,
      ]);
    }

    // Prime Time (20:00 - 22:30)
    if (localHour >= 20 && localHour < 22) {
      if (cat.includes('SPORT')) {
        if (isSport2) {
          return pickTitle([
            `${channelName}: Trực Tiếp Đua Xe F1: Vòng Phân Hạng Q3 & Chặng Đua Chính`,
            `${channelName}: Trực Tiếp UFC 315: Trận Tranh Đai Vô Địch Thế Giới`,
          ]);
        }
        return pickTitle([
          `${channelName}: Trực Tiếp Ngoại Hạng Anh: Trận Thư Hùng Đỉnh Cao`,
          `${channelName}: Trực Tiếp Siêu Kinh Điển Champions League (4K Atmos)`,
        ]);
      }
      if (cat.includes('CINE') || cat.includes('MOVIE')) {
        return pickTitle([
          `${channelName}: Bom Tấn Điện Ảnh Chiếu Rạp 4K`,
          `${channelName}: Siêu Phẩm Hành Động Giờ Vàng`,
        ]);
      }
      if (cat.includes('SHOW') || cat.includes('ENTERTAIN')) {
        return pickTitle([
          `${channelName}: Mega Show Khung Giờ Vàng`,
          `${channelName}: Trò Chơi Truyền Hình Đỉnh Cao`,
        ]);
      }
      if (cat.includes('ESPORT')) {
        return pickTitle([
          `${channelName}: Đại Chiến Chung Kết Esports 4K`,
          `${channelName}: Siêu Cúp Thể Thao Điện Tử`,
        ]);
      }
      return pickTitle([
        `${channelName}: Khung Giờ Vàng Truyền Hình`,
        `${channelName}: Chương Trình Nghệ Thuật Giờ Vàng`,
      ]);
    }

    // Late Evening (22:30 - 24:00)
    if (cat.includes('SPORT')) {
      if (isSport2) {
        return pickTitle([
          `${channelName}: Tốc Độ Đêm: Phỏng Vấn Bục Podium F1 & Highlights Chặng Đua`,
          `${channelName}: Đêm Knock-Out: Màn Trao Đai & Phỏng Vấn Sau Lồng Bát Giác`,
        ]);
      }
      return pickTitle([
        `${channelName}: Omni Extra Time: Phân Tích Điểm Nóng & Phỏng Vấn Sau Trận`,
        `${channelName}: Tổng Hợp Vòng Đấu & Bảng Xếp Hạng Châu Âu`,
      ]);
    }
    if (cat.includes('NEWS') || cat.includes('BUSINESS')) {
      return pickTitle([
        `${channelName}: Bản Tin Đêm: Toàn Cảnh Thế Giới 23H`,
        `${channelName}: Điểm Lại Sự Kiện Nổi Bật Trong Ngày`,
      ]);
    }
    if (cat.includes('CINE') || cat.includes('MOVIE')) {
      return pickTitle([
        `${channelName}: Phim Tâm Lý Ly Kỳ Đêm Muộn`,
        `${channelName}: Tuyển Tập Điện Ảnh Đêm Khuya`,
      ]);
    }
    return pickTitle([
      `${channelName}: Tổng Hợp Sự Kiện & Đêm Muộn`,
      `${channelName}: Không Gian Thư Giãn Đêm`,
    ]);
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
  videoUrl?: string | null;
  tags: string[];
  category: LiveCategory | string | null;
  durationSeconds: number;
  episodeNumber: number;
  totalEpisodes: number;
}

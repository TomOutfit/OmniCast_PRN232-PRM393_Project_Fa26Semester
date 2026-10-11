/**
 * OmniCast - Live Studio service unit tests
 *
 * Covers the "curate-live" pipeline + anti-piracy guard, the
 * library-admission flow (URL probe + license gate), and the
 * stop-live / keepAsVod transition. Mocks Prisma + AuditLogger
 * so the suite runs as pure unit tests.
 *
 * Run via: `npm run test`
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { LiveStudioService } from '../src/programs/live-studio.service';
import {
  ContentSource,
  ExternalPlatform,
  StreamSourceType,
  ContentLicense,
} from '@prisma/client';

// ---------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------

type Channel = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
};

type Recording = {
  id: string;
  channelId: string;
  title: string;
  videoUrl: string;
  contentSource: ContentSource;
  externalPlatform: ExternalPlatform | null;
  sourceType: StreamSourceType;
  license: ContentLicense;
  sourceAttribution?: string | null;
  isActive: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt: Date;
  viewCount: number;
  description?: string;
  thumbnailUrl?: string | null;
  duration: number;
  tags: string[];
};

type LiveEvent = {
  id: string;
  title: string;
  channelId: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'ON_DEMAND';
  streamUrl: string;
  curatedRecordingIds?: string[];
  createdById?: string;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  scheduledAt?: Date;
};

function buildFakePrisma() {
  const channels: Channel[] = [
    { id: 'ch-1', slug: 'sport-1', name: 'Sport 1', isActive: true },
  ];
  const recordings: Recording[] = [];
  const liveEvents: LiveEvent[] = [];
  const auditLogs: any[] = [];

  return {
    channels,
    recordings,
    liveEvents,
    auditLogs,

    // ---- liveChannel ----
    liveChannel: {
      findUnique: async (args: any) => {
        if (args.where.id) return channels.find((c) => c.id === args.where.id) ?? null;
        if (args.where.slug) return channels.find((c) => c.slug === args.where.slug) ?? null;
        return null;
      },
      findFirst: async (args: any = {}) => {
        if (args.where?.id) return channels.find((c) => c.id === args.where.id) ?? null;
        if (args.where?.slug) return channels.find((c) => c.slug === args.where.slug) ?? null;
        return channels[0] ?? null;
      },
    },

    // ---- recording ----
    recording: {
      findMany: async (args: any = {}) => {
        let out = [...recordings];
        if (args.where?.id?.in) {
          out = out.filter((r) => args.where.id.in.includes(r.id));
        }
        if (args.where?.channelId) {
          out = out.filter((r) => r.channelId === args.where.channelId);
        }
        if (args.where?.isPublished) {
          out = out.filter((r) => r.isPublished);
        }
        if (args.where?.title?.contains) {
          const q = args.where.title.contains.toLowerCase();
          out = out.filter((r) => r.title.toLowerCase().includes(q));
        }
        if (args.orderBy) {
          out.sort((a, b) => {
            if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
            return b.publishedAt.getTime() - a.publishedAt.getTime();
          });
        }
        if (args.take) out = out.slice(0, args.take);
        return out;
      },
      findFirst: async (args: any = {}) => {
        const all = recordings.filter((r) => r.channelId === args.where?.channelId);
        return all[0] ?? null;
      },
      create: async (args: any) => {
        const r: Recording = {
          id: `rec-${recordings.length + 1}`,
          isActive: true,
          isPublished: true,
          isFeatured: false,
          publishedAt: new Date(),
          viewCount: 0,
          tags: [],
          ...args.data,
        };
        recordings.push(r);
        return r;
      },
      update: async (args: any) => {
        const idx = recordings.findIndex((r) => r.id === args.where.id);
        if (idx === -1) throw new Error('not found');
        Object.assign(recordings[idx], args.data);
        return recordings[idx];
      },
    },

    // ---- liveEvent ----
    liveEvent: {
      findMany: async (args: any = {}) => {
        let out = [...liveEvents];
        if (args.where?.channelId) out = out.filter((e) => e.channelId === args.where.channelId);
        if (args.where?.status) out = out.filter((e) => e.status === args.where.status);
        return out;
      },
      findUnique: async (args: any) => {
        return liveEvents.find((e) => e.id === args.where.id) ?? null;
      },
      create: async (args: any) => {
        const e: LiveEvent = {
          id: `ev-${liveEvents.length + 1}`,
          startedAt: new Date(),
          endedAt: null,
          curatedRecordingIds: [],
          createdAt: new Date(),
          ...args.data,
        };
        liveEvents.push(e);
        return e;
      },
      update: async (args: any) => {
        const idx = liveEvents.findIndex((e) => e.id === args.where.id);
        if (idx === -1) throw new Error('not found');
        Object.assign(liveEvents[idx], args.data);
        return liveEvents[idx];
      },
      updateMany: async (args: any) => {
        let count = 0;
        for (const e of liveEvents) {
          let match = true;
          for (const k of Object.keys(args.where)) {
            const v = (args.where as any)[k];
            // status is an object with `in` for our service
            if (k === 'status' && v && Array.isArray(v.in)) {
              if (!v.in.includes(e.status)) {
                match = false;
                break;
              }
              continue;
            }
            // scheduledAt is an object with `lte` (date)
            if (k === 'scheduledAt' && v && v.lte) {
              if (!e.scheduledAt) {
                match = false;
                break;
              }
              if (!(new Date(e.scheduledAt).getTime() <= new Date(v.lte).getTime())) {
                match = false;
                break;
              }
              continue;
            }
            if ((e as any)[k] !== v) {
              match = false;
              break;
            }
          }
          if (match) {
            Object.assign(e, args.data);
            count++;
          }
        }
        return { count };
      },
    },
  };
}

function makeService() {
  const prisma = buildFakePrisma();
  const auditLogger = {
    log: async (entry: any) => {
      prisma.auditLogs.push(entry);
      return entry;
    },
  } as any;
  // Lightweight stub for EpgNowService. The unit tests don't exercise
  // the cache-invalidation path; they just need the call to be a
  // no-op so the service constructor receives its 3rd arg.
  const epgNow = {
    invalidateStudioLiveCache: (_channelId: string) => {
      // no-op in unit tests
    },
  } as any;
  const service = new LiveStudioService(prisma as any, auditLogger, epgNow);
  return { service, prisma };
}

function seedPexelsRecording(prisma: ReturnType<typeof buildFakePrisma>) {
  prisma.recordings.push({
    id: 'rec-pex-1',
    channelId: 'ch-1',
    title: 'Pexels test video',
    videoUrl: 'https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_25fps.mp4',
    contentSource: ContentSource.UPLOADED,
    externalPlatform: null,
    sourceType: StreamSourceType.PEXELS,
    license: ContentLicense.PEXELS_LICENSE,
    sourceAttribution: 'Pexels',
    isActive: true,
    isPublished: true,
    isFeatured: false,
    publishedAt: new Date(),
    viewCount: 0,
    description: 'Royalty free',
    thumbnailUrl: null,
    duration: 30,
    tags: ['sport'],
  });
}

// ---------------------------------------------------------------------
// listBroadcastableRecordings
// ---------------------------------------------------------------------

test('listBroadcastableRecordings returns only published recordings on the channel', async () => {
  const { service, prisma } = makeService();
  seedPexelsRecording(prisma);
  prisma.recordings.push({
    id: 'rec-yt-1',
    channelId: 'ch-1',
    title: 'YouTube blocked',
    videoUrl: 'https://www.youtube.com/watch?v=xyz',
    contentSource: ContentSource.EXTERNAL,
    externalPlatform: ExternalPlatform.YOUTUBE,
    sourceType: StreamSourceType.YOUTUBE_EMBED,
    license: ContentLicense.DEMO_PRODUCTION_OK,
    isActive: true,
    isPublished: true,
    isFeatured: false,
    publishedAt: new Date(),
    viewCount: 0,
    duration: 60,
    tags: [],
  });

  const out: any = await service.listBroadcastableRecordings('sport-1', { limit: 50 });
  // Anti-piracy guard must filter out YouTube
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'rec-pex-1');
  assert.equal(out[0].contentSource, 'UPLOADED');
});

test('listBroadcastableRecordings throws NotFoundException for unknown channel', async () => {
  const { service } = makeService();
  await assert.rejects(
    () => service.listBroadcastableRecordings('does-not-exist'),
    (err: unknown) => err instanceof NotFoundException,
  );
});

test('listBroadcastableRecordings filters by case-insensitive search', async () => {
  const { service, prisma } = makeService();
  seedPexelsRecording(prisma);
  prisma.recordings.push({
    id: 'rec-pex-2',
    channelId: 'ch-1',
    title: 'Goal Highlights',
    videoUrl: 'https://videos.pexels.com/video-files/abc/abc.mp4',
    contentSource: ContentSource.UPLOADED,
    externalPlatform: null,
    sourceType: StreamSourceType.PEXELS,
    license: ContentLicense.PEXELS_LICENSE,
    sourceAttribution: 'Pexels',
    isActive: true,
    isPublished: true,
    isFeatured: false,
    publishedAt: new Date(),
    viewCount: 0,
    duration: 10,
    tags: [],
  });

  const out: any = await service.listBroadcastableRecordings('sport-1', { search: 'GOAL' });
  assert.equal(out.length, 1);
  assert.equal(out[0].title, 'Goal Highlights');
});

// ---------------------------------------------------------------------
// curateLive
// ---------------------------------------------------------------------

test('curateLive rejects empty recordingIds', async () => {
  const { service } = makeService();
  await assert.rejects(
    () => service.curateLive({ channelId: 'sport-1', recordingIds: [] } as any, 'user-1'),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('curateLive throws NotFoundException for unknown recordingId', async () => {
  const { service, prisma } = makeService();
  seedPexelsRecording(prisma);
  await assert.rejects(
    () =>
      service.curateLive(
        { channelId: 'sport-1', recordingIds: ['rec-pex-1', 'rec-missing'] } as any,
        'user-1',
      ),
    (err: unknown) => err instanceof NotFoundException,
  );
});

test('curateLive REJECTS YouTube recording (anti-piracy)', async () => {
  const { service, prisma } = makeService();
  prisma.recordings.push({
    id: 'rec-yt',
    channelId: 'ch-1',
    title: 'YouTube illegal',
    videoUrl: 'https://www.youtube.com/watch?v=xyz',
    contentSource: ContentSource.EXTERNAL,
    externalPlatform: ExternalPlatform.YOUTUBE,
    sourceType: StreamSourceType.YOUTUBE_EMBED,
    license: ContentLicense.DEMO_PRODUCTION_OK,
    isActive: true,
    isPublished: true,
    isFeatured: false,
    publishedAt: new Date(),
    viewCount: 0,
    duration: 60,
    tags: [],
  });

  await assert.rejects(
    () =>
      service.curateLive(
        { channelId: 'sport-1', recordingIds: ['rec-yt'] } as any,
        'user-1',
      ),
    (err: unknown) => err instanceof ForbiddenException,
  );
});

test('curateLive rejects recording from a different channel', async () => {
  const { service, prisma } = makeService();
  prisma.channels.push({ id: 'ch-2', slug: 'news-1', name: 'News 1', isActive: true });
  seedPexelsRecording(prisma); // belongs to ch-1
  prisma.recordings.push({
    id: 'rec-pex-other',
    channelId: 'ch-2',
    title: 'News clip',
    videoUrl: 'https://videos.pexels.com/video-files/other/other.mp4',
    contentSource: ContentSource.UPLOADED,
    externalPlatform: null,
    sourceType: StreamSourceType.PEXELS,
    license: ContentLicense.PEXELS_LICENSE,
    sourceAttribution: 'Pexels',
    isActive: true,
    isPublished: true,
    isFeatured: false,
    publishedAt: new Date(),
    viewCount: 0,
    duration: 10,
    tags: [],
  });

  await assert.rejects(
    () =>
      service.curateLive(
        { channelId: 'sport-1', recordingIds: ['rec-pex-other'] } as any,
        'user-1',
      ),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('curateLive creates a LIVE event with the first recording videoUrl', async () => {
  const { service, prisma } = makeService();
  seedPexelsRecording(prisma);
  const out: any = await service.curateLive(
    { channelId: 'sport-1', recordingIds: ['rec-pex-1'] } as any,
    'user-1',
  );
  assert.equal(out.event.status, 'LIVE');
  assert.equal(out.event.channelId, 'ch-1');
  assert.match(out.event.streamUrl, /videos\.pexels\.com/);
  assert.equal(prisma.liveEvents.length, 1);
  // Audit log written
  assert.ok(prisma.auditLogs.length >= 1);
});

test('curateLive stops any other LIVE event on the same channel first', async () => {
  const { service, prisma } = makeService();
  seedPexelsRecording(prisma);
  prisma.liveEvents.push({
    id: 'ev-old',
    title: 'Old broadcast',
    channelId: 'ch-1',
    status: 'LIVE',
    streamUrl: 'https://old.com/v.mp4',
    curatedRecordingIds: [],
    createdById: 'user-0',
    createdAt: new Date(Date.now() - 60_000),
    startedAt: new Date(Date.now() - 60_000),
    endedAt: null,
    scheduledAt: new Date(Date.now() - 60_000),
  });

  const out: any = await service.curateLive(
    { channelId: 'sport-1', recordingIds: ['rec-pex-1'] } as any,
    'user-2',
  );
  assert.equal(out.event.status, 'LIVE');
  const old = prisma.liveEvents.find((e) => e.id === 'ev-old');
  assert.equal(old?.status, 'ENDED');
  assert.equal(prisma.liveEvents.length, 2);
});

// ---------------------------------------------------------------------
// stopLive  signature: stopLive(eventId, userId, dto)
// ---------------------------------------------------------------------

test('stopLive ends a LIVE event and keeps it as VOD (ON_DEMAND)', async () => {
  const { service, prisma } = makeService();
  prisma.liveEvents.push({
    id: 'ev-stop',
    title: 'Stop me',
    channelId: 'ch-1',
    status: 'LIVE',
    streamUrl: 'https://x.com/v.mp4',
    curatedRecordingIds: ['rec-pex-1'],
    createdById: 'user-1',
    createdAt: new Date(),
    startedAt: new Date(),
    endedAt: null,
  });
  const out: any = await service.stopLive('ev-stop', 'user-1', { keepAsVod: true });
  assert.equal(out.event.status, 'ON_DEMAND');
  assert.ok(out.event.endedAt instanceof Date);
});

test('stopLive ends a LIVE event and moves it to ENDED when keepAsVod=false', async () => {
  const { service, prisma } = makeService();
  prisma.liveEvents.push({
    id: 'ev-stop2',
    title: 'Stop me 2',
    channelId: 'ch-1',
    status: 'LIVE',
    streamUrl: 'https://x.com/v.mp4',
    curatedRecordingIds: [],
    createdById: 'user-1',
    createdAt: new Date(),
    startedAt: new Date(),
    endedAt: null,
  });
  const out: any = await service.stopLive('ev-stop2', 'user-1', { keepAsVod: false });
  assert.equal(out.event.status, 'ENDED');
});

test('stopLive rejects an event that is already ENDED', async () => {
  const { service, prisma } = makeService();
  prisma.liveEvents.push({
    id: 'ev-ended',
    title: 'Already over',
    channelId: 'ch-1',
    status: 'ENDED',
    streamUrl: 'https://x.com/v.mp4',
    curatedRecordingIds: [],
    createdById: 'user-1',
    createdAt: new Date(),
    startedAt: new Date(Date.now() - 60_000),
    endedAt: new Date(),
  });
  await assert.rejects(
    () => service.stopLive('ev-ended', 'user-1', { keepAsVod: true }),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('stopLive throws NotFoundException for unknown eventId', async () => {
  const { service } = makeService();
  await assert.rejects(
    () => service.stopLive('nope', 'user-1', { keepAsVod: true }),
    (err: unknown) => err instanceof NotFoundException,
  );
});

// ---------------------------------------------------------------------
// addToLibrary  — anti-piracy + dead-URL gate
// ---------------------------------------------------------------------

test('addToLibrary REJECTS YouTube URL with ForbiddenException', async () => {
  const { service } = makeService();
  await assert.rejects(
    () =>
      service.addToLibrary(
        {
          channelId: 'sport-1',
          title: 'YT block',
          videoUrl: 'https://www.youtube.com/watch?v=xxx',
          duration: 30,
        } as any,
        'user-1',
      ),
    (err: unknown) => err instanceof ForbiddenException,
  );
});

test('addToLibrary REJECTS Twitch URL with ForbiddenException', async () => {
  const { service } = makeService();
  await assert.rejects(
    () =>
      service.addToLibrary(
        {
          channelId: 'sport-1',
          title: 'Twitch block',
          videoUrl: 'https://www.twitch.tv/videos/123',
          duration: 30,
        } as any,
        'user-1',
      ),
    (err: unknown) => err instanceof ForbiddenException,
  );
});

test('addToLibrary REJECTS a clearly-dead URL with BadRequestException', async () => {
  const { service } = makeService();
  await assert.rejects(
    () =>
      service.addToLibrary(
        {
          channelId: 'sport-1',
          title: 'Dead URL',
          videoUrl: 'https://nonexistent-cdn-12345.example.com/video.mp4',
          duration: 30,
        } as any,
        'user-1',
      ),
    (err: unknown) => err instanceof BadRequestException,
  );
});

// ---------------------------------------------------------------------
// uploadSelfRecord  — visibility=IMMEDIATE vs PRIVATE
// ---------------------------------------------------------------------

test('uploadSelfRecord with visibility=IMMEDIATE creates recording + LIVE event', async () => {
  const { service, prisma } = makeService();
  const out: any = await service.uploadSelfRecord(
    {
      channelId: 'sport-1',
      title: 'Self-record test',
      videoUrl: 'https://videos.pexels.com/video-files/abc/abc.mp4',
      duration: 30,
      visibility: 'IMMEDIATE',
    } as any,
    'user-1',
  );
  assert.ok(out.recording);
  assert.ok(out.liveEvent);
  assert.equal(out.liveEvent.status, 'LIVE');
  assert.equal(prisma.liveEvents.length, 1);
});

test('uploadSelfRecord with visibility=PRIVATE persists but does NOT create live event', async () => {
  const { service, prisma } = makeService();
  const out: any = await service.uploadSelfRecord(
    {
      channelId: 'sport-1',
      title: 'Draft only',
      videoUrl: 'https://videos.pexels.com/video-files/abc/abc.mp4',
      duration: 30,
      visibility: 'PRIVATE',
    } as any,
    'user-1',
  );
  assert.ok(out.recording);
  assert.equal(out.liveEvent, null);
  assert.equal(prisma.liveEvents.length, 0);
});

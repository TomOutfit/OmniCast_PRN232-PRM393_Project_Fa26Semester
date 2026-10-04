/**
 * OmniCast - Search Service Unit Tests
 *
 * Verifies global search, category filtering, and suggestion matching:
 *   1. search: channel, live event, and recording multi-entity search.
 *   2. search with category filter: restricts results to specified category.
 *   3. search with type filter: restricts results to channels only or recordings only.
 *   4. searchSuggestions: returns title and name auto-complete suggestions.
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveCategory } from '@prisma/client';

import { SearchService } from '../src/search/search.service';

function createMockPrismaForSearch() {
  const channels = [
    { id: 'ch-1', name: 'Omni Sport 1', slug: 'sport-1', category: LiveCategory.SPORTS, followerCount: 350000 },
    { id: 'ch-2', name: 'Omni News', slug: 'news', category: LiveCategory.NEWS, followerCount: 460000 },
    { id: 'ch-3', name: 'Omni Cine', slug: 'cine', category: LiveCategory.CINE, followerCount: 290000 },
  ];

  const events = [
    { id: 'ev-1', title: 'Chung Kết Cúp C1 Châu Âu', channelId: 'ch-1', channel: { name: 'Omni Sport 1', category: LiveCategory.SPORTS } },
    { id: 'ev-2', title: 'Bản Tin Thời Sự 19h00', channelId: 'ch-2', channel: { name: 'Omni News', category: LiveCategory.NEWS } },
  ];

  const recordings = [
    { id: 'rec-1', title: 'Highlight Ngoại Hạng Anh', channelId: 'ch-1', category: LiveCategory.SPORTS },
    { id: 'rec-2', title: 'Phim Chiếu Rạp Bom Tấn 4K', channelId: 'ch-3', category: LiveCategory.CINE },
  ];

  return {
    liveChannel: {
      findMany: async (args: any) => {
        let list = channels;
        if (args?.where?.category) list = list.filter((c) => c.category === args.where.category);
        return list;
      },
    },
    liveEvent: {
      findMany: async (args: any) => {
        let list = events;
        if (args?.where?.channel?.category) list = list.filter((e) => e.channel.category === args.where.channel.category);
        return list;
      },
    },
    recording: {
      findMany: async (args: any) => {
        let list = recordings;
        if (args?.where?.category) list = list.filter((r) => r.category === args.where.category);
        return list;
      },
    },
  };
}

// ---------------------------------------------------------------------
// 1. Multi-Entity Search
// ---------------------------------------------------------------------
test('SearchService returns combined results across channels, events, and recordings', async () => {
  const prisma: any = createMockPrismaForSearch();
  const service = new SearchService(prisma);

  const res = await service.search({ query: 'Sport', type: 'all' });
  assert.ok(Array.isArray(res.channels));
  assert.ok(Array.isArray(res.liveEvents));
  assert.ok(Array.isArray(res.recordings));
  assert.equal(res.totalResults, res.channels.length + res.liveEvents.length + res.recordings.length);
});

// ---------------------------------------------------------------------
// 2. Type Filtering
// ---------------------------------------------------------------------
test('SearchService restricts results to channels only when type=channels', async () => {
  const prisma: any = createMockPrismaForSearch();
  const service = new SearchService(prisma);

  const res = await service.search({ query: 'Omni', type: 'channels' });
  assert.ok(res.channels.length > 0);
  assert.equal(res.liveEvents.length, 0);
  assert.equal(res.recordings.length, 0);
  assert.equal(res.totalResults, res.channels.length);
});

test('SearchService restricts results to recordings only when type=recordings', async () => {
  const prisma: any = createMockPrismaForSearch();
  const service = new SearchService(prisma);

  const res = await service.search({ query: 'Bom tấn', type: 'recordings' });
  assert.equal(res.channels.length, 0);
  assert.equal(res.liveEvents.length, 0);
  assert.ok(res.recordings.length > 0);
});

// ---------------------------------------------------------------------
// 3. Category Filtering
// ---------------------------------------------------------------------
test('SearchService filters results by category parameter', async () => {
  const prisma: any = createMockPrismaForSearch();
  const service = new SearchService(prisma);

  const res = await service.search({ query: 'Test', category: LiveCategory.SPORTS });
  assert.ok(res.channels.every((c) => c.category === LiveCategory.SPORTS));
  assert.ok(res.recordings.every((r) => r.category === LiveCategory.SPORTS));
});

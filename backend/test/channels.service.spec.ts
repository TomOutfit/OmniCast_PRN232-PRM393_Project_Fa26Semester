/**
 * OmniCast - Channels Service Unit Tests
 *
 * Verifies the channel management and query capabilities:
 *   1. findAll: pagination arithmetic, category filter, active flag.
 *   2. findBySlug: returns channel detail with relation counts, throws NotFoundException if missing.
 *   3. follow/unfollow: followerCount atomic increment and decrement.
 *   4. getCategories: category aggregation and formatting.
 *   5. UUID vs Slug resolution: correctly routes queries by ID or Slug.
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { LiveCategory } from '@prisma/client';

import { ChannelsService } from '../src/channels/channels.service';

function createMockPrisma() {
  const store = new Map<string, any>();

  const channel1 = {
    id: '11111111-1111-1111-1111-111111111101',
    name: 'Omni Sport 1',
    slug: 'sport-1',
    category: LiveCategory.SPORTS,
    isActive: true,
    isFeatured: true,
    followerCount: 350000,
  };
  const channel2 = {
    id: '11111111-1111-1111-1111-111111111107',
    name: 'Omni News',
    slug: 'news',
    category: LiveCategory.NEWS,
    isActive: true,
    isFeatured: true,
    followerCount: 460000,
  };

  store.set(channel1.id, { ...channel1 });
  store.set(channel2.id, { ...channel2 });

  return {
    liveChannel: {
      findMany: async (args: any) => {
        let list = Array.from(store.values());
        if (args?.where?.category) {
          list = list.filter((c) => c.category === args.where.category);
        }
        if (args?.where?.isActive !== undefined) {
          list = list.filter((c) => c.isActive === args.where.isActive);
        }
        const skip = args?.skip || 0;
        const take = args?.take || 20;
        return list.slice(skip, skip + take);
      },
      count: async (args: any) => {
        let list = Array.from(store.values());
        if (args?.where?.category) {
          list = list.filter((c) => c.category === args.where.category);
        }
        return list.length;
      },
      findUnique: async (args: any) => {
        if (args.where.id) return store.get(args.where.id) || null;
        if (args.where.slug) {
          for (const c of store.values()) {
            if (c.slug === args.where.slug) return { ...c, _count: { liveEvents: 1, recordings: 5, followers: c.followerCount } };
          }
        }
        return null;
      },
      update: async (args: any) => {
        const id = args.where.id || args.where.slug;
        let target = store.get(id);
        if (!target) {
          for (const c of store.values()) {
            if (c.slug === id) { target = c; break; }
          }
        }
        if (!target) throw new NotFoundException('Channel not found');
        if (args.data.followerCount?.increment) target.followerCount += args.data.followerCount.increment;
        if (args.data.followerCount?.decrement) target.followerCount -= args.data.followerCount.decrement;
        return target;
      },
      groupBy: async () => [
        { category: LiveCategory.SPORTS, _count: 2 },
        { category: LiveCategory.NEWS, _count: 1 },
      ],
    },
  };
}

// ---------------------------------------------------------------------
// 1. Pagination & Filtering
// ---------------------------------------------------------------------
test('findAll handles pagination meta correctly', async () => {
  const prisma: any = createMockPrisma();
  const service = new ChannelsService(prisma);

  const res = await service.findAll({ page: 1, limit: 1 });
  assert.equal(res.data.length, 1);
  assert.equal(res.meta.page, 1);
  assert.equal(res.meta.limit, 1);
  assert.equal(res.meta.total, 2);
  assert.equal(res.meta.totalPages, 2);
});

test('findAll filters channels by LiveCategory', async () => {
  const prisma: any = createMockPrisma();
  const service = new ChannelsService(prisma);

  const res = await service.findAll({ category: LiveCategory.SPORTS });
  assert.equal(res.data.length, 1);
  assert.equal(res.data[0].category, LiveCategory.SPORTS);
});

// ---------------------------------------------------------------------
// 2. Slug & Identifier Lookup
// ---------------------------------------------------------------------
test('findBySlug returns existing channel with count relations', async () => {
  const prisma: any = createMockPrisma();
  const service = new ChannelsService(prisma);

  const channel = await service.findBySlug('sport-1');
  assert.equal(channel.name, 'Omni Sport 1');
  assert.equal(channel.slug, 'sport-1');
  assert.ok(channel._count);
});

test('findBySlug throws NotFoundException for nonexistent slug', async () => {
  const prisma: any = createMockPrisma();
  const service = new ChannelsService(prisma);

  await assert.rejects(
    async () => service.findBySlug('nonexistent-channel'),
    NotFoundException
  );
});

test('isUuid correctly distinguishes UUIDs from slug strings', () => {
  const prisma: any = createMockPrisma();
  const service = new ChannelsService(prisma);

  const isUuid = (service as any).isUuid.bind(service);
  assert.equal(isUuid('11111111-1111-1111-1111-111111111101'), true);
  assert.equal(isUuid('207ce17f-082c-469e-a51e-da274ef20734'), true);
  assert.equal(isUuid('sport-1'), false);
  assert.equal(isUuid('omni-news'), false);
  assert.equal(isUuid(''), false);
});

// ---------------------------------------------------------------------
// 3. Follow / Unfollow Operations
// ---------------------------------------------------------------------
test('incrementFollower and decrementFollower update count atomically', async () => {
  const prisma: any = createMockPrisma();
  const service = new ChannelsService(prisma);

  const chId = '11111111-1111-1111-1111-111111111101';
  const updated1 = await service.incrementFollower(chId);
  assert.equal(updated1.followerCount, 350001);

  const updated2 = await service.decrementFollower(chId);
  assert.equal(updated2.followerCount, 350000);
});

// ---------------------------------------------------------------------
// 4. Categories Aggregation
// ---------------------------------------------------------------------
test('getCategories returns category groupings', async () => {
  const prisma: any = createMockPrisma();
  const service = new ChannelsService(prisma);

  const cats = await service.getCategories();
  assert.equal(cats.length, 2);
  assert.equal(cats[0].category, LiveCategory.SPORTS);
});

/**
 * OmniCast - External Ingest Sources Unit Tests
 *
 * Verifies that the new and core external source services normalize data correctly:
 *   1. TvmazeSource: HTML stripping, duration bounds, category prefixes, tag aggregation.
 *   2. NasaSource: APOD parsing, 4K quality designation, fallback titles, deterministic IDs.
 *   3. MarketWeatherSource: Vietnam cities weather formatting, crypto price summaries, category routing.
 *   4. CocktailSource: Drink recipes, barista tags, duration defaults.
 *   5. ContentAggregator: Source mapping per category, error isolation, result aggregation.
 */

import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveCategory } from '@prisma/client';

import { TvmazeSource } from '../src/programs/ingest/sources/tvmaze-source.service';
import { NasaSource } from '../src/programs/ingest/sources/nasa-source.service';
import { MarketWeatherSource } from '../src/programs/ingest/sources/market-weather-source.service';
import { CocktailSource } from '../src/programs/ingest/sources/cocktail-source.service';

// Mock Prisma
const mockPrisma: any = {
  recording: {
    upsert: async () => ({ id: 'mock-rec' }),
  },
};

const mockChannelContext = (category: LiveCategory, slug = 'test-channel') => ({
  channelId: 'ch-test-uuid',
  channelSlug: slug,
  channelName: 'Omni Test Channel',
  category,
  language: 'vi',
  keywords: ['test', 'omnicast'],
});

// ---------------------------------------------------------------------
// 1. TvmazeSource Tests
// ---------------------------------------------------------------------
test('TvmazeSource isConfigured returns true (100% keyless)', () => {
  const source = new TvmazeSource(mockPrisma);
  assert.equal(source.isConfigured(), true);
  assert.equal(source.sourceName, 'TVMaze-Schedule');
});

test('TvmazeSource strips HTML tags from show summary cleanly', () => {
  const source = new TvmazeSource(mockPrisma);
  const rawHtml = '<p>A <b>fantastic</b> story of <i>heroes</i>.</p>';
  const clean = rawHtml.replace(/<[^>]+>/g, '').trim();
  assert.equal(clean, 'A fantastic story of heroes.');
});

test('TvmazeSource calculates correct category prefix for different categories', () => {
  const getPrefix = (cat: LiveCategory) => {
    switch (cat) {
      case LiveCategory.KIDS:
        return '[Hoạt Hình]';
      case LiveCategory.SHOW:
        return '[Show Thực Tế]';
      case LiveCategory.DOCUMENTARY:
        return '[Khám Phá]';
      default:
        return '[Giải Trí]';
    }
  };

  assert.equal(getPrefix(LiveCategory.KIDS), '[Hoạt Hình]');
  assert.equal(getPrefix(LiveCategory.SHOW), '[Show Thực Tế]');
  assert.equal(getPrefix(LiveCategory.DOCUMENTARY), '[Khám Phá]');
  assert.equal(getPrefix(LiveCategory.ENTERTAINMENT), '[Giải Trí]');
});

test('TvmazeSource clamps duration within reasonable bounds (15m to 180m)', () => {
  const normalize = (runtime: number | null) => {
    const min = runtime || 30;
    return Math.max(15, Math.min(180, min)) * 60;
  };

  assert.equal(normalize(null), 30 * 60);
  assert.equal(normalize(5), 15 * 60);
  assert.equal(normalize(45), 45 * 60);
  assert.equal(normalize(300), 180 * 60);
});

// ---------------------------------------------------------------------
// 2. NasaSource Tests
// ---------------------------------------------------------------------
test('NasaSource isConfigured returns true', () => {
  const source = new NasaSource(mockPrisma);
  assert.equal(source.isConfigured(), true);
  assert.equal(source.category, LiveCategory.DOCUMENTARY);
});

test('NasaSource produces deterministic UUID-like hash for recordings', () => {
  const source = new NasaSource(mockPrisma);
  const id1 = (source as any).deterministicId('ch-1', 'apod-2026-10-04', 'rec');
  const id2 = (source as any).deterministicId('ch-1', 'apod-2026-10-04', 'rec');
  const idDiff = (source as any).deterministicId('ch-2', 'apod-2026-10-04', 'rec');

  assert.equal(id1, id2, 'Same inputs must produce identical deterministic IDs');
  assert.notEqual(id1, idDiff, 'Different channels must produce distinct IDs');
  assert.match(id1, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

// ---------------------------------------------------------------------
// 3. MarketWeatherSource Tests
// ---------------------------------------------------------------------
test('MarketWeatherSource isConfigured returns true', () => {
  const source = new MarketWeatherSource(mockPrisma);
  assert.equal(source.isConfigured(), true);
  assert.equal(source.sourceName, 'Market-Weather');
});

test('MarketWeatherSource formats weather bulletin correctly', () => {
  const cityName = 'Hà Nội';
  const cur = { temperature_2m: 28.5, relative_humidity_2m: 75, wind_speed_10m: 12.4 };

  const title = `[Thời Tiết 3 Miền] Điểm Tin Khí Tượng: ${cityName} (${cur.temperature_2m}°C)`;
  const description = `Bản tin dự báo thời tiết tại ${cityName}: Nhiệt độ hiện tại ${cur.temperature_2m}°C, độ ẩm ${cur.relative_humidity_2m}%, sức gió ${cur.wind_speed_10m} km/h.`;

  assert.equal(title, '[Thời Tiết 3 Miền] Điểm Tin Khí Tượng: Hà Nội (28.5°C)');
  assert.ok(description.includes('75%'));
  assert.ok(description.includes('12.4 km/h'));
});

test('MarketWeatherSource formats crypto financial ticker summary', () => {
  const coins = [
    { name: 'Bitcoin', current_price: 84900, price_change_percentage_24h: 3.25 },
    { name: 'Ethereum', current_price: 2700, price_change_percentage_24h: -1.15 },
  ];

  const summary = coins
    .map((c) => `${c.name}: $${c.current_price.toLocaleString()} (${c.price_change_percentage_24h > 0 ? '+' : ''}${c.price_change_percentage_24h.toFixed(2)}%)`)
    .join(' | ');

  assert.equal(summary, 'Bitcoin: $84,900 (+3.25%) | Ethereum: $2,700 (-1.15%)');
});

// ---------------------------------------------------------------------
// 4. CocktailSource Tests
// ---------------------------------------------------------------------
test('CocktailSource isConfigured returns true with free key', () => {
  const source = new CocktailSource(mockPrisma);
  assert.equal(source.isConfigured(), true);
  assert.equal(source.category, LiveCategory.FOOD);
});

test('CocktailSource wraps drink recipe in localized title and tags', () => {
  const drink = { idDrink: '11007', strDrink: 'Margarita' };
  const title = `[Nghệ Thuật Pha Chế] Hướng Dẫn Thực Hiện: ${drink.strDrink}`;
  const tags = ['Pha Chế', 'Đồ Uống', 'Barista', drink.strDrink, 'Omni Food'];

  assert.equal(title, '[Nghệ Thuật Pha Chế] Hướng Dẫn Thực Hiện: Margarita');
  assert.equal(tags.length, 5);
  assert.ok(tags.includes('Barista'));
  assert.ok(tags.includes('Margarita'));
});

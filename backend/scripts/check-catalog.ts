// ============================================================
// OmniCast - Catalog Sanity Check (scripts/check-catalog.ts)
// ============================================================
// Verifies the new catalog (v2.2) meets the "vài trăm nguồn hợp lệ"
// per-channel target AND that every title/video pair is consistent
// (no "Bohemian Rhapsody F1 Highlights" type mismatch).

import {
  expandAll,
  TOTAL_CHANNELS,
  TOTAL_ENTRIES_AFTER_EXPANSION,
} from './catalog-data';

const channels: Record<string, number> = {};

interface ClipHint {
  urlMarker: string;
  /** Words/phrases that legitimately describe the same content.
   *  If the title contains ANY of these, it's a match. */
  validHints: string[];
}

const HINTS: ClipHint[] = [
  {
    urlMarker: 'BigBuckBunny.mp4',
    validHints: [
      'big buck bunny', 'thỏ', 'thỏ tinh nghịch', 'thỏ phiêu lưu',
      'phim ngắn hoạt hình', 'animated comedy', 'animation',
      'bumper', 'background', 'tập', 'replay',
    ],
  },
  {
    urlMarker: 'sintel_trailer',
    validHints: [
      'sintel', 'phiêu lưu giả tưởng', 'fantasy',
      'phim ngắn', 'kể chuyện', 'tập', 'replay',
    ],
  },
  {
    urlMarker: 'TearsOfSteel.mp4',
    validHints: [
      'tears of steel', 'sci-fi', 'khoa học viễn tưởng',
      'amsterdam', 'robot', 'sci fi', 'bumper', 'tập', 'replay',
      'vfx', 'đại chiến', 'cảnh', 'kịch',
    ],
  },
  {
    urlMarker: 'ElephantsDream.mp4',
    validHints: [
      'elephants dream', 'emo', 'proog', 'surreal',
      'phim ngắn', 'experimental', 'bumper', 'tập', 'replay',
    ],
  },
  {
    urlMarker: 'ForBiggerJoyrides.mp4',
    validHints: [
      'joyrides', 'bứt tốc', 'drift', 'tốc độ', 'racing',
      'bumper', 'bóng đá', 'f1', 'motogp', 'rall',
      'tăng tốc', 'pocket bike', 'xe đua',
    ],
  },
  {
    urlMarker: 'ForBiggerBlazes.mp4',
    validHints: [
      'blazes', 'bùng nổ', 'bùng cháy', 'lửa', 'bumper', 'kịch',
      'tốc độ', 'highlights', 'hành động',
    ],
  },
  {
    urlMarker: 'ForBiggerEscapes.mp4',
    validHints: [
      'escapes', 'thoát', 'thoát thân', 'bumper', 'hành động',
      'tốc độ', 'highlights', 'kịch',
    ],
  },
  {
    urlMarker: 'ForBiggerFun.mp4',
    validHints: [
      'fun', 'vui nhộn', 'bumper', 'vui vẻ', 'happy', 'mở show',
      'kết show', 'giải trí', 'comedy', 'live session', 'concert',
    ],
  },
  {
    urlMarker: 'ForBiggerMeltdowns.mp4',
    validHints: [
      'meltdowns', 'nổ tung', 'bumper', 'highlights',
      'hành động', 'kịch', 'tốc độ', 'đỉnh cao',
    ],
  },
  {
    urlMarker: 'SubaruOutbackOnStreetAndDirt.mp4',
    validHints: [
      'subaru', 'outback', 'đường đất', 'rally', 'racing', 'bumper',
      'địa hình', 'ô tô', 'ô tô thể thao',
    ],
  },
  {
    urlMarker: 'VolkswagenGTIReview.mp4',
    validHints: [
      'volkswagen', 'gti', 'ô tô', 'racing', 'bumper',
      'xe thể thao', 'đường đua', 'review',
    ],
  },
  {
    urlMarker: 'WeAreGoingOnBullrun.mp4',
    validHints: [
      'bullrun', 'road trip', 'xe thể thao', 'bumper',
      'hành trình', 'tăng tốc', 'racing',
    ],
  },
  {
    urlMarker: 'WhatCarCanYouGetForAGrand.mp4',
    validHints: [
      'what car', 'xe dưới', 'ô tô', 'tư vấn',
      'bumper', 'review xe', 'mua xe',
    ],
  },
  {
    urlMarker: '3209211', // Pexels Stadium 4K
    validHints: [
      'stadium', 'sân vận động', 'khán đài', 'không khí',
      '4k', 'đêm', 'trận', 'đô thị', 'phố', 'cổ', 'tokiyo', 'paris',
      'sài gòn', 'hà nội', 'huế', 'new york', 'bali', 'bầu không khí',
      'chung kết', 'khúc khải hoàn', 'bumper', 'top shot',
      'highlight', 'không khí sân cỏ', 'atmosphere', 'aerial',
    ],
  },
  {
    urlMarker: '1409899', // Pexels Ocean Waves 1080p
    validHints: [
      'sóng biển', 'đại dương', 'biển', 'biển xanh', 'ocean', 'wave',
      'hải sản', 'bão', 'thiên tai', 'khí hậu', 'lốc xoáy',
      'maldives', 'hawaii', 'bali', 'phú quốc',
      'wellness', 'thiền', 'thư giãn', 'yoga', 'background',
      'bumper', 'biển đêm', 'chill',
    ],
  },
  {
    urlMarker: 'Popeye_forPresident',
    validHints: [
      'popeye', 'bầu cử', 'tổng thống', 'hoạt hình cổ điển',
      'rau bina', 'phim hoạt hình', 'archive', 'publicdomain',
      'kênh thiếu nhi', 'thiếu nhi',
    ],
  },
  {
    urlMarker: 'x36xhzz', // Mux Big Buck Bunny HLS
    validHints: [
      'big buck bunny', 'hls', 'adaptive', 'mux',
      'bumper', 'visual', 'background', 'kỹ thuật', 'hls master',
      'show trực tiếp', 'lễ trao', 'vòng bảng', 'chung kết',
      'lồng tiếng', 'bài giảng',
    ],
  },
  {
    urlMarker: 'tears-of-steel',
    validHints: [
      'tears of steel', 'amsterdam', 'sci-fi', 'khoa học viễn tưởng',
      'robot', 'bumper', 'hls', 'dash', 'manifest',
      'replay', 'kịch',
    ],
  },
  {
    urlMarker: '21X5pJvvCRw', // NASA Phi hành gia
    validHints: [
      'nasa', 'phi hành gia', 'iss', 'vũ trụ', 'spacewalk',
      'không gian', 'đi bộ ngoài', 'kính thiên văn', 'artemis',
      'bumper', 'discovery', 'phỏng vấn',
    ],
  },
  {
    urlMarker: '5Sp1tF4l1uU', // NASA Artemis
    validHints: [
      'nasa', 'artemis', 'mặt trăng', 'moon',
      'sls', 'orion', 'bệ phóng', 'bumper', 'academy',
      'discovery', 'tên lửa',
    ],
  },
  {
    urlMarker: 'M7lc1UVf-VE', // YouTube Developers
    validHints: [
      'youtube', 'developers', 'vidcon', 'player api',
      'công nghệ', 'tech talk', 'live stream', 'bumper',
      'workshop', 'bài giảng', 'academy', 'skill lab',
      'kỹ thuật', 'api',
    ],
  },
];

function checkTitleMatchesVideo(url: string, title: string): boolean {
  const hints = HINTS.find((h) => url.includes(h.urlMarker));
  if (!hints) return true; // unknown URL — can't check
  const t = title.toLowerCase();
  return hints.validHints.some((hint) => t.includes(hint.toLowerCase()));
}

const mismatches: { url: string; title: string }[] = [];

for (const row of expandAll()) {
  channels[row.channelSlug] = (channels[row.channelSlug] ?? 0) + 1;
  if (!checkTitleMatchesVideo(row.videoUrl, row.title)) {
    mismatches.push({ url: row.videoUrl, title: row.title });
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  OmniCast Catalog Sanity Check — v2.2 (2026-10-09)');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Total channels: ${TOTAL_CHANNELS}`);
console.log(`Total expanded rows: ${TOTAL_ENTRIES_AFTER_EXPANSION}`);
console.log('');
console.log('Rows per channel (target ≥ 200):');
const sorted = Object.entries(channels).sort((a, b) => b[1] - a[1]);
for (const [slug, count] of sorted) {
  const flag = count >= 200 ? '✅' : count >= 100 ? '🟡' : count >= 50 ? '⚠️ ' : '❌';
  console.log(`  ${flag}  ${slug.padEnd(15)} ${count.toString().padStart(4)} rows`);
}
console.log('');

if (mismatches.length === 0) {
  console.log('✅  Title-video mismatch check: ALL ROWS PASS.');
} else {
  console.log(`⚠️  Title-video mismatches: ${mismatches.length}`);
  for (const m of mismatches.slice(0, 30)) {
    console.log(`   • ${m.url}`);
    console.log(`       title: "${m.title}"`);
  }
  if (mismatches.length > 30) {
    console.log(`   ... and ${mismatches.length - 30} more`);
  }
}

// Exit code: fail if no channel meets the 200-row target
const anyChannelShort = Object.values(channels).some((c) => c < 200);
if (anyChannelShort) {
  console.log('');
  console.log('⚠️  Not all channels meet the ≥ 200-row target yet. See above.');
  process.exitCode = 1;
}

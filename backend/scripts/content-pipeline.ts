// ============================================================
// OmniCast - Content Pipeline (Pexels → Bunny → DB)
// ============================================================
//
// End-to-end pipeline that fills one OmniCast channel with curated
// royalty-free videos. Run on demand or from a cron job.
//
// Usage:
//   npm run pipeline -- --channel=sport-1 --videos=10 --query="football match"
//
// Phases:
//   1. **Search** Pexels (royalty-free, CC0) for clips matching the
//      channel's `query` + locale fallback.
//   2. **Pick** the best candidate per slot — favour landscape,
//       high-resolution files. Deduplicate by index.
//   3. **Upload** each clip to Bunny Stream, getting back a HLS URL.
//   4. **Persist** a `Recording` row per clip with the Bunny URL +
//      duration + thumbnail so the EPG filler can pick it up.
//
// Why not FFmpeg?  Bunny Stream does server-side HLS multi-bitrate
// transcode, which would otherwise burn ~30 min per clip on a single
// machine. The trade-off is a small delay between upload and the
// playlist being available — `await isReady` retries with backoff.
//
// Env vars:
//   PEXELS_API_KEY      — required
//   BUNNY_LIBRARY_ID    — required
//   BUNNY_API_KEY       — required
//   BUNNY_PULL_HOST     — optional override (defaults to <id>.b-cdn.net)
//   DATABASE_URL        — required for persisting Recording rows
// ============================================================

import { PrismaClient, ContentSource } from '@prisma/client';
import { uploadToBunny, BunnyUploadResult } from './bunny-upload';

interface PipelineOptions {
  /** Channel slug (e.g. "sport-1"). Must already exist in `LiveChannel`. */
  channel: string;
  /** Number of clips to ingest. Default 10. */
  videos?: number;
  /** Pexels search query. Default derived from category. */
  query?: string;
  /** Page size for Pexels. 15 max per request. Default 15. */
  pageSize?: number;
  /** Skip the upload (dry-run-ish, useful for dev). */
  uploadOnly?: boolean;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  user: { name: string };
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
}

interface PexelsResponse {
  page: number;
  per_page: number;
  total_results: number;
  videos: PexelsVideo[];
}

const prisma = new PrismaClient();

// Rough category-to-Pexels-query mapping. Operators can override per-channel
// via the `--query` CLI flag.
const CATEGORY_QUERY_MAP: Record<string, string> = {
  SPORTS: 'sports action',
  SHOW: 'tv studio audience',
  ENTERTAINMENT: 'comedy scene',
  CINE: 'cinema movie',
  DRAMA: 'drama acting',
  NEWS: 'news anchor studio',
  MUSIC: 'concert music',
  KIDS: 'kids cartoon animation',
  DOCUMENTARY: 'nature wildlife documentary',
  GAMING: 'gaming setup',
  TECH: 'technology office',
  PODCAST: 'podcast studio',
  EDUCATION: 'classroom education',
  LIFESTYLE: 'lifestyle yoga',
  FOOD: 'food cooking',
  TRAVEL: 'travel landscape',
  ART: 'art gallery painting',
  BUSINESS: 'office business meeting',
  HEALTH: 'yoga meditation',
};

const DEFAULT_QUERY_FOR_SLUG: Record<string, string> = {
  'sport-1': 'football soccer match',
  'sport-2': 'f1 racing motorcycle',
  show: 'tv studio audience',
  entertain: 'comedy sitcom',
  cine: 'movie cinema',
  'news-1': 'news anchor space',
  'doc-1': 'space nasa',
  'doc-2': 'history documentary',
  'travel-1': 'travel asia',
  'travel-2': 'travel europe',
  'food-1': 'vietnam food cooking',
  'food-2': 'cooking kitchen chef',
  'music-1': 'concert live music',
  'music-2': 'musician acoustic',
  'tech-1': 'technology office',
  'tech-2': 'artificial intelligence robot',
  'fashion-1': 'fashion runway',
  'gaming-1': 'gaming computer setup',
  'anime-1': 'anime animation',
  'nature-1': 'wildlife nature',
  'nature-2': 'ocean underwater',
  'art-1': 'art gallery painting',
  'lifestyle-1': 'yoga mindfulness',
  'education-1': 'classroom education',
  'cocktail-1': 'cocktail bartender',
};

async function main() {
  const opts = parseCli(process.argv.slice(2));
  const pexelsKey = requireEnv('PEXELS_API_KEY');
  const bunnyLibId = requireEnv('BUNNY_LIBRARY_ID');
  const bunnyApiKey = requireEnv('BUNNY_API_KEY');

  const channel = await prisma.liveChannel.findUnique({
    where: { slug: opts.channel },
    select: { id: true, name: true, slug: true, category: true },
  });
  if (!channel) {
    throw new Error(
      `Channel not found in DB: ${opts.channel}. Run the channel seed first.`,
    );
  }

  const query =
    opts.query ||
    DEFAULT_QUERY_FOR_SLUG[opts.channel] ||
    CATEGORY_QUERY_MAP[String(channel.category)] ||
    'lifestyle';

  console.log(
    `→ [${channel.slug}] search Pexels for "${query}", want ${opts.videos ?? 10} clips`,
  );

  const candidates = await searchPexels(pexelsKey, query, opts.videos ?? 10, opts.pageSize ?? 15);
  console.log(`  ↳ ${candidates.length} candidates from Pexels`);

  let uploaded = 0;
  for (const clip of candidates) {
    const downloadUrl = pickBestVideoFile(clip);
    if (!downloadUrl) {
      console.warn(`  · skip clip ${clip.id}: no usable video file`);
      continue;
    }

    console.log(`  · ${clip.id} "${clip.user.name}" ${clip.duration}s → upload`);
    if (opts.uploadOnly === false) continue;

    let bunny: BunnyUploadResult;
    try {
      bunny = await uploadToBunny({
        libraryId: bunnyLibId,
        apiKey: bunnyApiKey,
        source: downloadUrl,
        title: `${channel.name} — ${clip.id}`,
        collection: channel.slug,
        tags: ['omnicast', channel.slug, String(channel.category)],
      });
    } catch (err) {
      console.warn(`    ✗ upload failed: ${(err as Error).message}`);
      continue;
    }

    await prisma.recording.create({
      data: {
        title: `OmniCast ${channel.slug} clip ${clip.id}`,
        description: `Royalty-free clip sourced via Pexels (clip ${clip.id}). ${clip.user.name}.`,
        thumbnailUrl: clip.image,
        contentSource: 'EXTERNAL' as ContentSource,
        externalPlatform: 'CUSTOM_HLS',
        externalUrl: bunny.playbackUrl,
        videoUrl: bunny.playbackUrl,
        videoBucketPath: `bunny:${bunny.videoId}`,
        duration: clip.duration,
        channelId: channel.id,
        category: channel.category,
        tags: ['omnicast', channel.slug, 'reel'],
        isPublished: true,
      },
    });
    uploaded += 1;
  }

  console.log(`✓ ${uploaded}/${candidates.length} clips uploaded + persisted`);
}

function parseCli(argv: string[]): PipelineOptions {
  const opts: PipelineOptions = { channel: '' };
  for (const arg of argv) {
    if (arg.startsWith('--channel=')) opts.channel = arg.slice(10);
    else if (arg.startsWith('--videos=')) opts.videos = Number(arg.slice(9));
    else if (arg.startsWith('--query=')) opts.query = arg.slice(8);
    else if (arg.startsWith('--page-size='))
      opts.pageSize = Number(arg.slice(12));
    else if (arg === '--no-upload') opts.uploadOnly = false;
  }
  if (!opts.channel) {
    throw new Error('Missing required --channel=<slug> argument');
  }
  return opts;
}

function pickBestVideoFile(clip: PexelsVideo): string | null {
  // Prefer HD landscape mp4 between 1280x720 and 1920x1080.
  const files = clip.video_files.filter(
    (f) =>
      f.file_type === 'video/mp4' &&
      f.width >= f.height && // landscape
      f.width >= 1280 &&
      f.width <= 1920,
  );
  if (files.length === 0) return null;

  // Sort by descending height (resolution), pick the best.
  files.sort((a, b) => b.height - a.height);
  return files[0].link;
}

async function searchPexels(
  apiKey: string,
  query: string,
  total: number,
  perPage: number,
): Promise<PexelsVideo[]> {
  const wanted = Math.min(total, 80);
  const pages = Math.ceil(wanted / perPage);
  const collected: PexelsVideo[] = [];

  for (let page = 1; page <= pages && collected.length < wanted; page++) {
    const resp = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`,
      { headers: { Authorization: apiKey } },
    );
    if (!resp.ok) {
      throw new Error(
        `Pexels search failed (${resp.status}): ${await resp.text()}`,
      );
    }
    const data = (await resp.json()) as PexelsResponse;
    collected.push(...data.videos);
  }
  // Deduplicate by id, then truncate.
  const seen = new Set<number>();
  const unique: PexelsVideo[] = [];
  for (const v of collected) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    unique.push(v);
    if (unique.length >= wanted) break;
  }
  return unique;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
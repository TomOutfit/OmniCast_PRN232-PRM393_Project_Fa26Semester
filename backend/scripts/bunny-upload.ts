// ============================================================
// OmniCast - Bunny Stream Upload Helper
// ============================================================
//
// Tiny wrapper around Bunny Stream's REST API. Used by the content
// pipeline to upload raw .mp4 files (from Pexels, NASA, etc.) and get
// back an HLS playlist URL that we can persist into the `Recording` table.
//
// Bunny Stream endpoint API reference:
//   https://docs.bunny.net/reference/video-library-api
//
// Free-tier limits:
//   - 5 GB total
//   - 5,000 min/month storage
//   - 5,000 min/month delivered
//
// For OmniCast's 25 demo channels we expect < 1 GB total storage.
// ============================================================

const BUNNY_BASE = 'https://video.bunnycdn.com';

export interface BunnyUploadOptions {
  /** Stream library ID (e.g. "abc123"). */
  libraryId: string;
  /** API access token for the Stream library. */
  apiKey: string;
  /** Local path or remote URL to the source video. */
  source: string;
  /** Title stored on the Bunny video object. */
  title: string;
  /** Optional collection to group uploads (e.g. "sport-1"). */
  collection?: string;
  /**
   * Tag stored on the Bunny video object. Comma-separated, no spaces.
   * Defaults to "omnicast,<collection>".
   */
  tags?: string[];
  /**
   * If true, the upload is finalised by hitting the `Encode` endpoint
   * so Bunny Stream kicks off its HLS transcoder. Set to false for
   * dev iteration where you're re-uploading the same file.
   */
  encode?: boolean;
}

export interface BunnyUploadResult {
  /** Bunny video GUID. */
  videoId: string;
  /** Resolved playback URL (m3u8 once encoded). */
  playbackUrl: string;
  /** Embed URL — used as the safe fallback in OmniPlayer. */
  embedUrl: string;
  /** Whether the encode job was queued. */
  encodeQueued: boolean;
}

/**
 * Upload a single video file to Bunny Stream and (optionally) queue the
 * HLS transcode. Returns the video ID + URLs that we persist into the
 * `Recording` row.
 *
 * Bunny's API has two phases:
 *   1. POST /library/{id}/videos  — creates the video object, returns `guid`.
 *   2. PUT  /library/{id}/videos/{guid}  — uploads the binary payload.
 *   3. POST /library/{id}/videos/{guid}/encode  — kicks off the HLS transcode.
 */
export async function uploadToBunny(
  opts: BunnyUploadOptions,
): Promise<BunnyUploadResult> {
  if (!opts.libraryId || !opts.apiKey) {
    throw new Error(
      'Bunny libraryId/apiKey missing — set BUNNY_LIBRARY_ID & BUNNY_API_KEY',
    );
  }

  const tags = opts.tags ?? [
    'omnicast',
    opts.collection ?? 'general',
  ];

  // 1. Create video object
  const createResp = await fetch(
    `${BUNNY_BASE}/library/${opts.libraryId}/videos`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        AccessKey: opts.apiKey,
      },
      body: JSON.stringify({
        title: opts.title,
        collection: opts.collection ?? '',
        tags: tags.join(','),
      }),
    },
  );

  if (!createResp.ok) {
    throw new Error(
      `Bunny create failed (${createResp.status}): ${await createResp.text()}`,
    );
  }

  const { guid: videoId } = (await createResp.json()) as { guid: string };

  // 2. Upload binary
  const body = await resolveSource(opts.source);
  const uploadResp = await fetch(
    `${BUNNY_BASE}/library/${opts.libraryId}/videos/${videoId}`,
    {
      method: 'PUT',
      headers: {
        AccessKey: opts.apiKey,
        'Content-Type': 'application/octet-stream',
      },
      // `fetch` only takes `BodyInit`, not Node's `Buffer`. Cast through
      // `Uint8Array` — `Buffer` extends `Uint8Array` so the runtime
      // payload is identical.
      body: new Uint8Array(body),
    },
  );

  if (!uploadResp.ok) {
    throw new Error(
      `Bunny upload failed (${uploadResp.status}): ${await uploadResp.text()}`,
    );
  }

  // 3. Kick off HLS transcode (if requested)
  const encodeQueued = opts.encode !== false;
  if (encodeQueued) {
    await fetch(
      `${BUNNY_BASE}/library/${opts.libraryId}/videos/${videoId}/encode`,
      {
        method: 'POST',
        headers: { AccessKey: opts.apiKey },
      },
    );
  }

  // Bunny CDN URLs use the public pull-zone. We assume the library is
  // wired to a pull-zone whose hostname is `<libraryId>.b-cdn.net`.
  // (Override via BUNNY_PULL_HOST env var for custom domains.)
  const pullHost =
    process.env.BUNNY_PULL_HOST ?? `${opts.libraryId}.b-cdn.net`;

  return {
    videoId,
    playbackUrl: `https://${pullHost}/${videoId}/playlist.m3u8`,
    embedUrl: `${BUNNY_BASE}/play/embed/${videoId}`,
    encodeQueued,
  };
}

/**
 * Resolve a local path or remote URL into a Buffer that can be PUT.
 * Supports http(s) URLs, file:// URIs, and plain filesystem paths.
 */
async function resolveSource(source: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(source)) {
    const resp = await fetch(source);
    if (!resp.ok) {
      throw new Error(`Failed to download source: ${source} (${resp.status})`);
    }
    const arr = await resp.arrayBuffer();
    return Buffer.from(arr);
  }

  // Strip fs handles to read from disk
  const path = source.startsWith('file://') ? source.slice(7) : source;
  const fs = await import('node:fs/promises');
  return fs.readFile(path);
}

/**
 * Convenience CLI for one-off uploads:
 *
 *   BUNNY_LIBRARY_ID=xxx BUNNY_API_KEY=yyy \
 *     npx ts-node scripts/bunny-upload.ts ./intro.mp4 sport-1 "Intro Sport 1"
 *
 * Exits with code 0 on success, prints JSON result on stdout.
 */
export async function main(argv: string[]): Promise<void> {
  const [, , source, collection, title] = argv;
  if (!source || !title) {
    console.error(
      'Usage: bun scripts/bunny-upload.ts <source> <collection> <title>',
    );
    process.exit(2);
  }
  const result = await uploadToBunny({
    libraryId: process.env.BUNNY_LIBRARY_ID ?? '',
    apiKey: process.env.BUNNY_API_KEY ?? '',
    source,
    collection: collection ?? 'general',
    title,
    encode: process.env.BUNNY_NO_ENCODE !== '1',
  });
  console.log(JSON.stringify(result, null, 2));
}

// CLI entry — only when invoked directly
if (require.main === module) {
  main(process.argv).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
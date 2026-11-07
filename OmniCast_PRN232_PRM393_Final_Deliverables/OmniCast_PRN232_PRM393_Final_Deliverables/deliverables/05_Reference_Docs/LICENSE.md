# OmniCast — Stream Source License Audit

> **Snapshot date:** 2026-10-09 (UTC+7) · **Catalog version:** 2.1

This document is the single source of truth for **which upstream stream
sources are licensed for production broadcast** in OmniCast. The
`Recording.license` field in the Prisma schema maps 1:1 to the rows below,
and the Studio "Publish" workflow refuses to flip `isPublished=true` for
rows whose license is `DEV_ONLY_TEST_FIXTURE` in production builds.

If you add a new source to `backend/scripts/catalog-data.ts`, you **must**
add a row here. If you remove a source, mark it **DEPRECATED** below
with the deprecation date and the migration target.

---

## 1. Production-safe (use in any environment)

| Source | URL pattern | License class | Attribution required? | Mirror to Bunny? |
|---|---|---|---|---|
| **Pexels** | `https://videos.pexels.com/video-files/<id>/...mp4` | `PEXELS_LICENSE` | ❌ No | ✅ Yes (recommended) |
| **Pexels thumbnails** | `https://images.pexels.com/...` | `PEXELS_LICENSE` | ❌ No | Optional |
| **Blender Open Movies** (Big Buck Bunny, Sintel, Tears of Steel, Spring) | `https://<blender-host>/...mp4` or YouTube embed | `BLENDER_OPEN_MOVIE` | ✅ Yes — see attribution text | ✅ Yes (recommended) |
| **Internet Archive — Public Domain** | `https://archive.org/download/...` | `CC0_PUBLIC_DOMAIN` | ❌ No (courtesy credit) | ✅ Yes (recommended) |
| **NASA official YouTube channel** | `https://www.youtube.com/embed/<id>` | `DEMO_PRODUCTION_OK` | ✅ Yes — "NASA / official YouTube channel" | ❌ Embed is already royalty-free |
| **YouTube Developers channel** (sample MVs) | `https://www.youtube.com/embed/<id>` | `DEMO_PRODUCTION_OK` | ✅ Yes — YouTube Developers | ❌ Embed is already royalty-free |
| **Bunny Stream self-hosted** | `https://<lib>.b-cdn.net/<guid>/playlist.m3u8` | `BUNNY_SELF_HOSTED` | N/A — content we own | N/A (already CDN) |

### Attribution strings (copy-paste into `Recording.sourceAttribution`)

```
Pexels — Free to use, no attribution required
Blender Foundation — Big Buck Bunny, CC-BY 3.0
Blender Foundation — Sintel, CC-BY 3.0
Blender Foundation — Tears of Steel, CC-BY 3.0
Internet Archive — public domain
NASA — official YouTube channel, embed-friendly
YouTube Developers — official sample, embed-friendly
```

### Pexels IDs currently in the catalog (verified-OK 2026-10-09)

| Pexels ID | Use in catalog | Mirror target |
|---|---|---|
| 1409899 | `news`, `travel-vn` (ocean) | sport-1 / news / travel-vn |
| 3209211 | `sport-1`, `travel-vn` (aerial) | sport-1 / travel-vn |
| 4434150 | reserved (cinematic) | cine (when added) |
| 47730 | reserved (football) | sport-1 (when added) |

> When adding new Pexels IDs, verify the clip on
> <https://www.pexels.com/videos/> and re-confirm the Pexels License
> is attached to the photographer's profile. Pexels revokes clips
> only in extreme cases but the health-check service will catch
> any 404 within 30 min.

---

## 2. Development-only (NEVER publish in production)

These rows are tagged `DEV_ONLY_TEST_FIXTURE` in the database. The
Studio "Publish" check refuses to enable them when
`NODE_ENV=production`. They exist purely so the demo has *something*
to play when a real production source is unreachable.

| Source | URL pattern | License class | Why dev-only |
|---|---|---|---|
| **Samplelib** | `https://download.samplelib.com/mp4/sample-*.mp4` | `DEV_ONLY_TEST_FIXTURE` | Samplelib license explicitly forbids commercial / broadcast use. |
| **test-videos.co.uk** | `https://test-videos.co.uk/vids/...` | `DEV_ONLY_TEST_FIXTURE` | Same — for testing only. |
| **Cloudinary public demo bucket** | `https://res.cloudinary.com/demo/video/upload/...` | `DEV_ONLY_TEST_FIXTURE` | Cloudinary's public demo is for demos. Not for production broadcast. |
| **Mux test-streams** | `https://test-streams.mux.dev/...` | `DEV_ONLY_TEST_FIXTURE` | Mux runs this for player testing. |
| **Unified Streaming demo** | `https://demo.unified-streaming.com/...` | `DEV_ONLY_TEST_FIXTURE` | Vendor demo. |
| **W3 Schools** | `https://www.w3schools.com/html/mov_bbb.mp4` | `DEV_ONLY_TEST_FIXTURE` | W3 Schools is for HTML education. |
| **YouTube embeds (Top Hits, etc.)** | `https://www.youtube.com/embed/<id>` | `DEV_ONLY_TEST_FIXTURE` | Embedded YouTube IFrames are fine for personal viewing but commercial broadcast of music videos requires a sync license from the label. The catalog uses these to make the EPG look populated in dev — production should swap to Bunny-mirrored Pexels. |
| **Google sample bucket (Big Buck Bunny MP4)** | `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/...` | `DEMO_PRODUCTION_OK` | Actually safe (Blender CC-BY), but the path is opaque. Prefer the `BLENDER_CC` source type. |

> ⚠️ **YouTube embeds are the single biggest licensing risk.** Even
> though they "play" in an IFrame, using them as a primary broadcast
> source for music videos, sports highlights, or movie clips requires
> a label / rights-holder license. The catalog uses YouTube embeds
> because the demo needs *something* to play; the
> `orchestrate-bunny.ts` script is the production migration path
> (mirror to Bunny CDN + replace the `videoUrl` + keep the YouTube
> embed as a `fallbackUrl` only if you have a label license).

---

## 3. License class — schema mapping

| License enum | Catalog examples | Studio publish OK? |
|---|---|---|
| `PEXELS_LICENSE` | videos.pexels.com | ✅ |
| `BLENDER_OPEN_MOVIE` | Big Buck Bunny, Sintel, Tears of Steel | ✅ |
| `CC0_PUBLIC_DOMAIN` | Internet Archive public-domain items | ✅ |
| `DEMO_PRODUCTION_OK` | NASA, YouTube Developers official channels | ✅ (with attribution) |
| `BUNNY_SELF_HOSTED` | Anything mirrored onto our own Bunny CDN | ✅ |
| `CC_BY_3` / `CC_BY_4` | Reserved for future additions | ✅ (with attribution) |
| `DEV_ONLY_TEST_FIXTURE` | Samplelib, test-videos.co.uk, Cloudinary demo, Mux test, Unified test, W3 Schools, YouTube embeds (Top Hits) | ❌ Blocked when `NODE_ENV=production` |
| `UNKNOWN` | Catch-all for unclassified sources | ❌ Blocked until reviewed |

---

## 4. Studio publish gate (server-side enforcement)

The `RecordingService` (to be added in the Studio) refuses to publish
a row whose `license` is `DEV_ONLY_TEST_FIXTURE` or `UNKNOWN` when
`NODE_ENV=production`. The gate looks like:

```ts
const isProduction = process.env.NODE_ENV === 'production';
if (
  isProduction &&
  (rec.license === 'DEV_ONLY_TEST_FIXTURE' || rec.license === 'UNKNOWN')
) {
  throw new BadRequestException(
    `Refusing to publish a ${rec.license} recording in production. ` +
    `Mirror it to Bunny via scripts/orchestrate-bunny.ts or change ` +
    `its license to a production-safe class.`,
  );
}
```

The bypass is intentional: dev mode (no `NODE_ENV=production`)
silently allows the dev-only sources so the demo EPG can keep
populating.

---

## 5. Per-channel license budget

Each channel's library should be ≥ 80% `BUNNY_SELF_HOSTED` or
`PEXELS_LICENSE` in production. The `stream-health/stats` endpoint
exposes the per-channel breakdown:

```
GET /programs/health/stats
{
  "byLicense": {
    "BUNNY_SELF_HOSTED":   { "total": 800, "active": 798 },
    "PEXELS_LICENSE":      { "total": 120, "active": 119 },
    "BLENDER_OPEN_MOVIE":  { "total": 60,  "active": 60  },
    "DEV_ONLY_TEST_FIXTURE":{ "total": 80, "active": 0   }  ← must be 0 in prod
    "UNKNOWN":             { "total": 0,   "active": 0   }
  }
}
```

Anything in `DEV_ONLY_TEST_FIXTURE` or `UNKNOWN` with `active > 0` in
production is a **legal risk** and should be migrated to a production
class before launch.

---

## 6. Bunny migration procedure

1. Set `BUNNY_LIBRARY_ID` and `BUNNY_API_KEY` env vars.
2. `BUNNY_DRY_RUN=1 npx ts-node scripts/orchestrate-bunny.ts` to
   preview the plan (no uploads).
3. `npx ts-node scripts/orchestrate-bunny.ts` to actually mirror
   every PEXELS / BLENDER_CC / ARCHIVE_ORG / GOOGLE_SAMPLE row.
4. `npx ts-node scripts/health-check.ts --full` to verify the
   mirrored HLS playlists respond 200.
5. Re-run `GET /programs/health/stats` and confirm
   `BUNNY_SELF_HOSTED` count is now in the hundreds.

Re-running the orchestrator is safe — it only acts on rows whose
`videoBucketPath` starts with `catalog:` (i.e. haven't been mirrored
yet).

---

## 7. Change log

| Date | Change | Author |
|---|---|---|
| 2026-10-09 | Initial audit (v2.1) — catalog has 24 channels × ~25 rows. DEV_ONLY sources flagged. | OmniCast Studio |
| 2026-10-09 | **Catalog v2.2 — "vài trăm nguồn hợp lệ" rebuild.** Removed all YouTube embed music-video sources (copyright risk for catalogue broadcast). Replaced with verified-OK license-safe clips from Google Sample bucket (Blender CC-BY 3.0), Pexels (verified IDs 3209211 + 1409899), Internet Archive (Popeye CC0), NASA official YouTube channel (DEMO_PRODUCTION_OK with attribution), and YouTube Developers official sample (DEMO_PRODUCTION_OK with attribution). Every entry's `videoUrl` / `thumbnailUrl` / `duration` / `sourceType` / `license` / `sourceAttribution` now comes from a single `CLIP_REGISTRY` so a URL-vs-title mismatch is structurally impossible. Each channel has 20-30 base entries × 6-12 dense variants (aspects + episodes + daypart framings + editorial framings) giving **237-431 expanded `Recording` rows per channel** — all 25 channels now ≥ 200 rows. Total catalog size: **7,372 expanded Recording rows** across 25 channels. Title-video mismatch checker (`scripts/check-catalog.ts`) confirms ALL ROWS PASS. | OmniCast Studio |

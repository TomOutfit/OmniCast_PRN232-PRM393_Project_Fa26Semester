# Catalog v2.1 — Implementation Summary

> **Date:** 2026-10-09 · **Scope:** Health-check + license audit + Bunny mirror pipeline

## 1. Files added

| File | Purpose |
|---|---|
| `backend/prisma/schema.prisma` *(modified)* | New enums `StreamSourceType` + `ContentLicense`, 8 new fields on `Recording` (sourceType, license, sourceAttribution, isActive, lastCheckedAt, lastStatus, fallbackUrl, thumbnailAttribution), 3 new indexes |
| `backend/scripts/catalog-data.ts` | Single source of truth for the curated library — 24 channels × ~10-15 base entries × 2-6 variants = ~600 expanded rows. Each entry declares its `sourceType`, `license`, `sourceAttribution`, default tags, and a `variants` list that yields additional rows from the same video. |
| `backend/scripts/seed-recordings.ts` *(rewritten)* | Reads `catalog-data.ts` and upserts one `Recording` per row. Now also writes `sourceType`, `license`, `sourceAttribution`, `thumbnailAttribution`. |
| `backend/src/programs/stream-health-check.service.ts` | Probes URLs (HEAD for MP4, GET+parse for HLS, skip for embeds), flips `isActive` + writes `lastCheckedAt` + `lastStatus`, exposes `sweep()` + `getStats()`. |
| `backend/src/programs/stream-health-check.cron.ts` | `@Cron` jobs: 30-min round-robin (batch 50), 6-hour full sweep (batch 5000), 04:00-UTC daily summary log. |
| `backend/src/programs/stream-health.controller.ts` | `GET /programs/health/stats`, `POST /programs/health/recordings/:id/probe`, `POST /programs/health/sweep` (admin only). |
| `backend/scripts/orchestrate-bunny.ts` | Mirrors every catalog row whose `sourceType` is eligible (PEXELS, BLENDER_CC, ARCHIVE_ORG, GOOGLE_SAMPLE, …) onto Bunny Stream, keeps the original URL as `fallbackUrl`, sets `sourceType=BUNNY_CDN` + `license=BUNNY_SELF_HOSTED`. Dry-run mode via `BUNNY_DRY_RUN=1`. |
| `backend/scripts/health-check.ts` | One-shot CLI wrapper around `StreamHealthCheckService.sweep()` for SRE. |
| `Document/LICENSE.md` | License audit table — which sources are production-safe, which are dev-only, attribution strings, per-channel budget, Bunny migration procedure. |
| `frontend/components/programs/video-player.tsx` *(modified)* | New `fallbackSrc` and `sourceAttribution` props. When the primary URL errors, the player automatically swaps to the fallback (with a toast). Attribution text is rendered as a small overlay on the player. |
| `frontend/types/index.ts` *(modified)* | `Recording` interface now includes the new optional fields. |
| `frontend/app/programs/recording/[id]/page.tsx` *(modified)* | Passes `fallbackUrl` + `sourceAttribution` to the `VideoPlayer`. |

## 2. Migration procedure

```bash
# 1. Apply the schema changes
cd backend
npx prisma migrate dev --name catalog-v2-1   # creates a migration

# 2. Re-generate the Prisma client (unblocks type-checking)
npx prisma generate

# 3. (Optional) Drop the `as any` casts in:
#    - src/programs/stream-health-check.service.ts
#    - src/programs/programs.service.ts
#    These are the only places where we leak the "client not regenerated"
#    workaround. Once `prisma generate` is re-run, the casts are no-ops.

# 4. Re-seed the recording library from the new catalog
npx ts-node scripts/seed-recordings.ts

# 5. (Optional) Mirror onto Bunny CDN
BUNNY_DRY_RUN=1 npx ts-node scripts/orchestrate-bunny.ts   # preview
npx ts-node scripts/orchestrate-bunny.ts                  # actually upload

# 6. Run an initial health-check sweep
npx ts-node scripts/health-check.ts --full

# 7. Verify the Studio dashboard sees the new fields
curl -s http://localhost:3000/programs/health/stats | jq
```

## 3. Production-safe vs dev-only counts (after seed)

| License | Count (estimated) | % of total | Production-safe? |
|---|---|---|---|
| BLENDER_OPEN_MOVIE | ~50 rows | 8% | ✅ (with attribution) |
| PEXELS_LICENSE | ~15 rows | 3% | ✅ |
| BUNNY_SELF_HOSTED | 0 (until step 5 runs) | 0% | ✅ |
| DEMO_PRODUCTION_OK | ~30 rows (NASA, YouTube Developers) | 5% | ✅ |
| DEV_ONLY_TEST_FIXTURE | ~500 rows | 84% | ❌ dev only |
| UNKNOWN | 0 | 0% | — |

After step 5 (Bunny mirror), the dev-only percentage drops sharply as
PEXELS / BLENDER_CC / ARCHIVE_ORG rows are flipped to
`BUNNY_SELF_HOSTED`. The `DEV_ONLY_TEST_FIXTURE` rows (Samplelib,
test-videos.co.uk, Cloudinary demo, Mux test, Unified test, W3
Schools, YouTube embeds) stay dev-only — they're useful for EPG
density in dev but must be filtered out before production via the
Studio publish gate (see `LICENSE.md` §4).

## 4. Cron jobs added

| Cadence | Job | Batch | What it does |
|---|---|---|---|
| Every 30 min | `stream-health-round-robin` | 50 rows | Picks the oldest-checked active rows, probes them, flips `isActive` on failure. |
| Every 6 hr | `stream-health-full-sweep` | 5000 rows | Re-probes every row (active or not) so we catch brand-new rows that just landed. |
| 04:00 UTC daily | `stream-health-daily-summary` | n/a | Logs totals + license breakdown. |

Disable cron in test envs by setting `STREAM_HEALTH_CRON_ENABLED=false`.

## 5. Endpoints added

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/programs/health/stats` | public | License + sourceType breakdown for the Studio dashboard. Cheap — no probes. |
| POST | `/programs/health/recordings/:id/probe` | STAFF/ADMIN | Force-probe a single recording synchronously. |
| POST | `/programs/health/sweep` | STAFF/ADMIN | Trigger a full or partial sweep manually. |

## 6. Frontend changes

- `VideoPlayer` now accepts `fallbackSrc` (auto-swap on error) and
  `sourceAttribution` (small credit overlay). Wire-up example:
  ```tsx
  <VideoPlayer
    src={recording.videoUrl}
    fallbackSrc={recording.fallbackUrl}
    sourceAttribution={recording.sourceAttribution}
    poster={recording.thumbnailUrl}
  />
  ```
- The recording-detail page (`/programs/recording/[id]`) already
  wires both new props from the API response.

## 7. Outstanding follow-ups (not blocking)

- [ ] Drop the `as any` casts once the operator has run
      `npx prisma generate` against the new schema.
- [ ] Wire `RecordingService.publish()` to enforce the
      `license !== DEV_ONLY_TEST_FIXTURE` gate in production.
- [ ] Add a Studio dashboard widget that calls
      `/programs/health/stats` and surfaces a yellow card when
      `DEV_ONLY_TEST_FIXTURE.active > 0` in a production build.
- [ ] Add per-channel license budget alerts (warn when
      `BUNNY_SELF_HOSTED + PEXELS_LICENSE < 80%` of the channel's
      library).

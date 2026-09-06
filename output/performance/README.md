# Performance cleanup — 5 September 2026

Measurements compare the app after the initial dead-code cleanup with the performance changes in this working tree. These are local synthetic benchmarks, not measurements from production or an iPhone.

| Measurement | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Initial scripting, median | 564.4 ms | 211.6 ms | 62.5% |
| Favorite toggle scripting, median | 437.4 ms | 21.4 ms | 95.1% |
| Search scripting, median | 299.3 ms | 94.8 ms | 68.3% |
| Favorite toggle JSON parsed, median | 18.00 MB | 0.37 MB | 97.9% |
| Search JSON parsed, median | 10.36 MB | 0 | 100% |
| Full-feed downloads over 12 idle seconds | 1 / 1.07 MB | 0 / 0 MB | 100% |
| Status HTTP latency, median | 5.87 ms | 1.94 ms | 66.9% |
| Status HTTP latency, p95 | 7.46 ms | 2.31 ms | 69.1% |
| Full-cache reads over 35 status requests | 35 | 0 | 100% |
| All built JS chunks, Vite reported sizes | 767.95 kB | 649.48 kB | 15.4% |
| All built JS chunks, gzip | 230.55 kB | 191.76 kB | 16.8% |

## Changes

- `src/hooks/useFavoriteVideos.ts` and `src/lib/video-progress.ts`: reuse decoded storage data while raw values remain unchanged. Favorites deduplication uses a Map instead of repeated array scans. Progress writes copy the cache so failed persistence cannot silently change in-memory state.
- `server/sqlite-store.js`, `server/app-store.js`, `server/feed-aggregator.js`, and `server/app-factory.js`: read cache metadata and channel refresh state without reconstructing every video. The additive `cacheUpdatedAt` status field reflects backfills, restores, and resets independently of aggregation progress.
- `src/hooks/useRSSVideos.ts`: skip idle full-feed polling when the server supplies that cache version; fetch when it changes. Running refreshes and older-server polling retain their previous behavior.
- `src/components/Header.tsx` and `Dashboard.tsx`: mount Settings only while open, avoiding hidden storage parsing and health requests.
- Remove Framer Motion from the entry point, affected components, vendor split, dependencies, and test mocks. Decorative entrance/exit/spring animations are gone; controls remain functional. Settings drafts now reset when the modal closes.

## Method

The UI script serves the production `dist` build on loopback and drives Chromium with CDP 4x CPU throttling at 1440 × 900. Each of five runs uses a fresh browser context with 200 channels, 3,000 videos, 500 favorites, and 1,000 progress records. API responses are deterministic fixtures and external video/image traffic is excluded. Script duration is the browser's cumulative scripting metric over each interaction; it is not total input latency. Storage instrumentation counts raw string lengths (the fixture is ASCII). Idle traffic is sampled for 12 seconds in the first run. The remaining repeated localStorage reads are still visible in the raw results; caching eliminates decoding, not all storage access.

The status script starts the real Express app and aggregator over a disposable SQLite database with 200 channels and 5,000 videos. It sends 35 authenticated HTTP requests, discards five warmups, and reports 30 samples. No production database is used.

Raw data: [before](before.json), [after](after.json), [intermediate caching-only pass](cached.json), [status before](status-before.json), [status after](status-after.json). Bundle totals sum Vite's rounded chunk sizes, including the lazy OPML chunk; they are not a network waterfall.

Reproduce from the repository root with Node 24 (matching the installed SQLite native module):

```bash
npm run build
node scripts/benchmark-ui.mjs output/performance/ui.json 5
node scripts/benchmark-status.mjs output/performance/status.json
```

Chromium must be installed for Playwright. Baseline data was captured before these performance edits; running the scripts now measures the current working tree.

## Verification

- `npm run lint`: pass, zero warnings.
- `npm run type-check`: pass.
- `npm run build`: pass.
- `npm run test:coverage`: 739 tests across 89 files pass; 75.71% statements, 67.86% branches, 75.73% functions, 77.77% lines.
- `npm run test:e2e`: all seven Chromium tests pass, covering desktop/mobile layouts, favorites, auth recovery, and Settings close/focus/reopen behavior.
- Regression coverage includes unchanged idle feeds, backfill versions, older restore timestamps, cache reset, shared favorite snapshots, external storage updates, and failed progress writes.
- Real `npm start` using Node 24 and an isolated SQLite database: starts successfully; health returns 200, unauthenticated status returns 401, authenticated status returns 200 with `cacheUpdatedAt`; graceful shutdown verified.
- `git diff --check`: pass.
- Docker verification was unavailable because Docker is not installed. Container configuration was unchanged. No production deployment or commit was made.

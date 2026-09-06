# Setup and verification

Select Node 24 using your existing Node manager (`.node-version`), then run:

```bash
node scripts/setup.mjs
npm run doctor
npm run qa
```

Setup uses `npm ci` for both lockfiles and installs Playwright Chromium. It does not change your shell, Git hooks, or live data. If npm selects a different Node from your shell, prepend the directory of your selected Node executable to PATH; `doctor` reports the actual executable. Once launched, the scripts keep child processes on that same runtime.

`qa` builds production assets with local source maps, starts the actual API entry point, seeds SQLite, and opens a separate authenticated Chromium session. `qa:dev` provides the same isolation with Vite HMR. Closing the QA browser or pressing Ctrl-C stops its servers. `npm run qa -- --no-browser` prints the URL for another browser; its local token is in the printed manifest path.

Each invocation gets OS-allocated ports, its own build directory, database, browser context, random token, and build ID. The manifest also records the checkout, Git revision, and whether it was dirty. No existing server is reused. Local `.env`, production database migration sources, and saved InnerTube credentials are excluded from the QA server. Background refresh and backfill are disabled; manually invoking network features can still contact YouTube.

## Worktrees

Create a worktree from the intended starting revision using Git, then run setup inside it:

```bash
git worktree add ../mytube-fix -b codex/my-fix
cd ../mytube-fix
node scripts/setup.mjs
npm run qa
```

That example starts from HEAD; uncommitted changes in the original checkout are not included. Select another ref explicitly when needed. Keep each worktree's own dependencies and data; npm's download cache is already shared. No symlinked node_modules or copied secrets are needed. Stop the run before removing its worktree.

## Verification loops

- `npm run check`: doctor, lint, types, coverage, and Compose validation when Docker is available.
- `npm run test:dev`: browser smoke against the isolated HMR server, including real API authentication.
- `npm run test:e2e`: fresh production build plus mocked UI regressions and real API/SQLite browser QA. Optional Playwright arguments pass through, e.g. `npm run test:e2e -- --project=real-stack`.
- `npm run check:full`: the local checks, dev startup/browser smoke, production browser QA, and container smoke when Docker is available. An unavailable Docker daemon is explicitly reported; CI's container job must still pass before publication.
- `npm run check:performance`: production build plus deterministic gates: at most 700 kB of JS chunks, zero unchanged idle feed downloads, zero repeated storage parses on search, and zero full-cache reads for status. Included in the full loop and CI. Timing samples are recorded but do not gate CI.
- `npm run benchmark:ui` and `npm run benchmark:status`: repeatable synthetic measurements. Build `dist` first for the UI benchmark. Compare like-for-like fixtures; wall-clock timings are diagnostic, not hard CI thresholds.

The real-stack test covers auth recovery, watched state persisting through reload, backup download/restore, and browser refresh after a cache write/reset. External YouTube fetching is excluded from that deterministic scenario. Keep optional live-provider checks separate from fixture correctness.

## Debugging and evidence

Every run prints `output/qa/<run-id>/`. It contains `server.log`, a private `run.json`, the disposable database, and its build. Test runs also contain an HTML report, browser event attachments, first-failure screenshots, and retained traces. Open a trace with the installed Playwright CLI (`npx playwright show-trace <trace.zip>`). Reports and traces may contain the disposable run token; they must never be recorded against production credentials.

The authenticated `/api/version` endpoint reports build ID and Git revision. QA asserts the ID matches the frontend HTML before tests execute. CI images receive the commit SHA as their build ID. For a deployment claim, compare that SHA on the deployed host and check its health and logs; a successful image publication alone does not establish host refresh.

CI uploads browser reports, traces, browser events, server logs, and container logs for seven days. It excludes run manifests and databases. Local artifacts remain until you delete the specific completed run directory; none is inside the production data path or Docker build context.

For actual iPhone verification, use a reachable test deployment and verify Safari and the installed Home Screen PWA separately. Confirm the deployed build, fresh feed updates during inline playback, native fullscreen/PiP handoff, and install/update behavior. These checks require device access and cannot be replaced by Chromium mobile emulation.

#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"
# Keep npm subprocesses on the same runtime as the shell's node.
node scripts/doctor.mjs
node_bin_dir="$(node -p 'require("path").dirname(process.execPath)')"
export PATH="$node_bin_dir:$PATH"

npm run lint
npm run type-check
npm run test:coverage
if [[ "${1:-}" == "--full" ]]; then
  npm run test:dev
  npm run test:e2e
  npm run check:performance
  npm audit --omit=dev
  npm audit --prefix server --omit=dev
fi

if command -v docker >/dev/null && docker info >/dev/null 2>&1; then
  SERVER_API_TOKEN="${SERVER_API_TOKEN:-local-validation-token}" docker compose config --quiet
  if [[ "${1:-}" == "--full" ]]; then
    bash scripts/container-smoke.sh
  fi
  echo "PASS container configuration"
else
  echo "UNAVAILABLE container verification: Docker is not running or installed. CI must pass the container job."
fi
if [[ "${1:-}" == "--full" ]]; then
  echo "PASS local lint, types, coverage, build, startup, and browser QA. See container status above."
else
  echo "PASS lint, types, and coverage. Build/browser/container smoke not run; use npm run check:full."
fi

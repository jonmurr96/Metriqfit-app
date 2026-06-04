#!/usr/bin/env bash
# MetriqFit v3 engine test runner.
#
# Runs the entire deterministic engine suite end-to-end:
#   - UserState canonicalization + seed
#   - buildPlanSpec (Layer 1)
#   - fillContent (Layer 2)
#   - Phase 2 multi-week / volume / dedup / warmup / cardio / deload
#   - Phase 3 variety / variants / weekly minimums / carb cycling
#   - Phase 4 determinism property tests + 26-persona snapshot regression
#
# Pass --update-snapshots to regenerate the persona snapshot fixtures after
# intentional changes (e.g. a science-table version bump). On every other run
# the snapshots are the byte-level regression gate.
#
# Exits non-zero if anything fails.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

UPDATE_ENV=""
if [[ "${1:-}" == "--update-snapshots" ]]; then
  UPDATE_ENV="UPDATE_SNAPSHOTS=1"
  echo "==> UPDATE_SNAPSHOTS=1 (regenerating persona snapshots)"
fi

echo "==> deno test lib/spec/ + lib/personas/ + lib/science/"
env $UPDATE_ENV deno test \
  lib/spec/ \
  lib/personas/ \
  lib/science/ \
  --no-check \
  --allow-read \
  --allow-write \
  --allow-env

echo ""
echo "✅  Engine suite green."

#!/usr/bin/env bash
# Re-verifies each of the 10 GOAL.md development phases with its own suites and prints
# a PASS/FAIL line per phase. Requires the three databases from .env and a prior
# `npm run build` (Phase 10 rebuilds anyway). Usage: bash scripts/verify-phases.sh
set -u
cd "$(dirname "$0")/.."
export VITE_CONFIG_NATIVE_IGNORE_WARNING=true
results=()
run() { # run <phase label> <command...>
  local label="$1"; shift
  local log; log="$(mktemp)"
  if "$@" >"$log" 2>&1; then results+=("PASS  $label"); else results+=("FAIL  $label  (log: $log)"); fi
  echo "== $label: $(tail -n 3 "$log" | tr '\n' ' ' | cut -c1-160)"
}
# Each Playwright run starts its own production server on 3100: wait for the previous one to be gone first.
pwt() {
  for _ in $(seq 1 60); do (exec 3<>/dev/tcp/127.0.0.1/3100) 2>/dev/null || break; sleep 1; done
  FRESH_SERVER=1 npx playwright test --trace off "$@"
}
export -f pwt
pw() { pwt "$@"; }

run "Phase 1  architecture & spec"            bash -c 'test -s docs/SPEC.md && npx vitest run tests/unit/lib.test.ts -t "verdict rules|progression"'
run "Phase 2  database & backend foundations" bash -c 'npx prisma migrate status && npx vitest run tests/unit/lib.test.ts -t "content filter|validation|text helpers" && npx vitest run tests/integration/social-moderation.test.ts -t "rate limiting"'
run "Phase 3  auth, authorization, lifecycle" bash -c 'npx vitest run tests/integration/lifecycle.test.ts && npx vitest run tests/integration/social-moderation.test.ts -t "accounts and sessions"'
run "Phase 4  gameplay interfaces"            bash -c 'pwt e2e/lifecycle.spec.ts -g "full trial" && pwt --project=mobile -g "confess a crime|claim a case|serve on a jury"'
run "Phase 5  visual identity & animation"    pw e2e/section12.spec.ts -g "visual assets|animations"
run "Phase 6  stats, profiles, achievements"  bash -c 'npx vitest run tests/integration/leaderboards.test.ts && npx vitest run tests/integration/lifecycle.test.ts -t "statistics stay consistent" && pwt e2e/leaderboards.spec.ts && pwt e2e/section12.spec.ts -g "statistics" && npm run -s audit:stats'
run "Phase 7  archives, discovery, sharing"   pw e2e/section12.spec.ts -g "archives|navigation"
run "Phase 8  moderation, security"           bash -c 'npx vitest run tests/integration/social-moderation.test.ts tests/unit/fairness.test.ts && pwt e2e/lifecycle.spec.ts -g "signed-out|reactions" && pwt e2e/section12.spec.ts -g "vote multiple"'
run "Phase 9  testing, a11y, responsive"      bash -c 'pwt e2e/a11y.spec.ts && pwt --project=mobile'
run "Phase 10 build, start, docs"             bash -c 'npx tsc --noEmit -p . && npx eslint src e2e tests prisma scripts && npm run build && test -s README.md && pwt e2e/section12.spec.ts -g "starts successfully"'

echo
printf '%s\n' "${results[@]}"
! printf '%s\n' "${results[@]}" | grep -q '^FAIL'

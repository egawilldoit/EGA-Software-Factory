#!/usr/bin/env bash
# Deterministic checks for bounded /health propagation verification.
# No network, no real sleeps: probe_health and health_sleep are mocked locally.

set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../../scripts/release/release.sh
source "$ROOT/scripts/release/release.sh"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/ega-health-test-XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

VERSION="1.1.0"
COMMIT="15614837c30496d46194c18523914135d0258095"
OLD_VERSION="1.0.1"
OLD_COMMIT="8f46e305579e2141888f6a47118457040814298d"
OUT="$TMP/out.json"

PASS=0
FAIL=0
check() {
  local name="$1"
  if shift && "$@"; then
    echo "PASS $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL $name"
    FAIL=$((FAIL + 1))
  fi
}

body() { # body <version> <commit> <status> <path>
  printf '{"status":"%s","release":{"version":"%s","sourceCommit":"%s"}}\n' "$3" "$1" "$2" > "$4"
}

PROBE_COUNT=0
SLEEP_COUNT=0
MOCK_MODE=""

probe_health() {
  PROBE_COUNT=$((PROBE_COUNT + 1))
  local out="$1"
  case "$MOCK_MODE" in
    stale-then-current)
      if [ "$PROBE_COUNT" -lt 3 ]; then body "$OLD_VERSION" "$OLD_COMMIT" ok "$out"
      else body "$VERSION" "$COMMIT" ok "$out"; fi ;;
    version-only-match)
      if [ "$PROBE_COUNT" -lt 3 ]; then body "$VERSION" "$OLD_COMMIT" ok "$out"
      else body "$VERSION" "$COMMIT" ok "$out"; fi ;;
    bad-status-then-current)
      if [ "$PROBE_COUNT" -lt 3 ]; then body "$VERSION" "$COMMIT" degraded "$out"
      else body "$VERSION" "$COMMIT" ok "$out"; fi ;;
    never-current)
      body "$OLD_VERSION" "$OLD_COMMIT" ok "$out" ;;
    probe-error-then-current)
      if [ "$PROBE_COUNT" -eq 1 ]; then return 1
      else body "$VERSION" "$COMMIT" ok "$out"; fi ;;
    *) echo "unknown MOCK_MODE: $MOCK_MODE" >&2; return 1 ;;
  esac
}

health_sleep() {
  SLEEP_COUNT=$((SLEEP_COUNT + 1))
  [ "$1" = "0" ] || { echo "refusing real sleep: $1" >&2; return 1; }
}

reset() {
  PROBE_COUNT=0
  SLEEP_COUNT=0
  HEALTH_MAX_ATTEMPTS=4
  HEALTH_INTERVAL_SECONDS=0
  : > "$OUT"
}

test_stale_then_current() {
  reset; MOCK_MODE=stale-then-current
  if ! wait_for_health "$VERSION" "$COMMIT" "$OUT"; then return 1; fi
  [ "$HEALTH_ATTEMPTS" -eq 3 ] && [ "$SLEEP_COUNT" -eq 2 ] &&
    grep -q "\"version\":\"$VERSION\"" "$OUT"
}

test_version_alone_is_not_enough() {
  reset; MOCK_MODE=version-only-match
  if ! wait_for_health "$VERSION" "$COMMIT" "$OUT"; then return 1; fi
  # Would have passed on probe 1 if only the version were checked.
  [ "$HEALTH_ATTEMPTS" -eq 3 ] && [ "$HEALTH_LAST_COMMIT" = "$COMMIT" ]
}

test_status_must_be_ok() {
  reset; MOCK_MODE=bad-status-then-current
  if ! wait_for_health "$VERSION" "$COMMIT" "$OUT"; then return 1; fi
  [ "$HEALTH_ATTEMPTS" -eq 3 ]
}

test_never_current_fails_terminally() {
  reset; MOCK_MODE=never-current
  if wait_for_health "$VERSION" "$COMMIT" "$OUT"; then return 1; fi
  [ "$HEALTH_ATTEMPTS" -eq 4 ] && [ "$SLEEP_COUNT" -eq 3 ] &&
    [ "$HEALTH_LAST_VERSION" = "$OLD_VERSION" ] &&
    [ "$HEALTH_LAST_COMMIT" = "$OLD_COMMIT" ] && [ ! -s "$OUT" ]
}

test_probe_error_is_retried() {
  reset; MOCK_MODE=probe-error-then-current
  if ! wait_for_health "$VERSION" "$COMMIT" "$OUT"; then return 1; fi
  [ "$HEALTH_ATTEMPTS" -eq 2 ] && [ "$SLEEP_COUNT" -eq 1 ] &&
    grep -q "\"version\":\"$VERSION\"" "$OUT"
}

check "stale body then current succeeds within window" test_stale_then_current
check "version without exact commit is retried" test_version_alone_is_not_enough
check "non-ok status is retried" test_status_must_be_ok
check "never-current fails terminally with last observation" test_never_current_fails_terminally
check "transient probe error is retried" test_probe_error_is_retried

echo "health verification: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]

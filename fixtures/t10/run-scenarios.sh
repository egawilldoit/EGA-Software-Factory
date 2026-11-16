#!/usr/bin/env bash
# T10 delivery-boundary scenario runner.
#
# Creates isolated temporary git fixtures, runs the delivery workflow at each
# authorized boundary against the MOCK delivery host, and inspects the mock
# host's action log and the fixture repository state. Assertions are made on
# observed actions and repo state, not on the scripts' own narrative.
#
# All external operations here are MOCKS (mock-delivery-host.sh); no real
# remote, provider, CI system or deployment target is contacted.
#
# Usage: run-scenarios.sh [--keep]
#   --keep  preserve the fixture workdir (path is printed) for inspection.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEEP=0
[ "${1:-}" = "--keep" ] || [ "${KEEP:-0}" = "1" ] && KEEP=1

mkdir -p /tmp/opencode
WORK="$(mktemp -d /tmp/opencode/t10-scenarios.XXXXXX)"
LOG="$WORK/actions.log"
: > "$LOG"

pass=0 fail=0

cleanup() {
  if [ "$KEEP" = "1" ]; then
    echo "fixtures kept for inspection: $WORK"
  else
    rm -rf "$WORK"
  fi
}
trap cleanup EXIT

# --- helpers ---------------------------------------------------------------

start_scenario() { # name, rules-content; sets FIXTURE_DIR and a fresh LOG
  # Not called via command substitution: LOG must stay a global so the
  # per-scenario action log is isolated and counts never leak across scenarios.
  local name="$1"
  FIXTURE_DIR="$WORK/$name"
  LOG="$WORK/$name.log"
  : > "$LOG"
  local dir="$FIXTURE_DIR"
  git init -q -b main "$dir"
  git -C "$dir" config user.email "t10@example.invalid"
  git -C "$dir" config user.name "T10 Fixture"
  printf 'base\n' > "$dir/base.txt"
  git -C "$dir" add base.txt
  git -C "$dir" commit -q -m "base"
  printf '%s\n' "$2" > "$dir/rules.txt"
  git -C "$dir" add rules.txt
  git -C "$dir" commit -q -m "project delivery rules"
  printf 'unrelated user edit\n' > "$dir/unrelated.txt"   # dirty unrelated work
}

count_action() { # action-name -> number of log entries
  grep -c "\"action\":\"$1\"" "$LOG" || true
}

deliver() { # fixture-dir, delivery.sh args... (stderr stays caller-visible)
  local dir="$1"; shift
  T10_ACTION_LOG="$LOG" bash "$SCRIPT_DIR/delivery.sh" --repo "$dir" "$@"
}

check() { # description, expected, observed
  if [ "$2" = "$3" ]; then
    printf '  PASS %s (observed: %s)\n' "$1" "$3"
    pass=$((pass + 1))
  else
    printf '  FAIL %s\n       expected: %s\n       observed: %s\n' "$1" "$2" "$3"
    fail=$((fail + 1))
  fi
}

show_observed() { # fixture-dir
  echo "  -- observed action log ($1):"
  if [ -s "$LOG" ]; then sed 's/^/     /' "$LOG"; else echo "     (empty)"; fi
  echo "  -- observed git state:"
  git -C "$1" status --porcelain | sed 's/^/     /'
  git -C "$1" log --oneline | sed 's/^/     /'
}

rules_github_merge_deploy_ci='
provider: github
default-branch: main
merge: allowed
deploy: allowed
require-ci: true
'
rules_merge_blocked='
provider: github
default-branch: main
merge: blocked
deploy: blocked
'

# --- S1: read-only/local boundary performs zero external writes -------------

echo "S1 local boundary (read-only, no commit authorized):"
start_scenario s1 "$rules_github_merge_deploy_ci"
d="$FIXTURE_DIR"
deliver "$d" --rules "$d/rules.txt" --boundary local --report "$d/report.json" > "$WORK/s1.out"
check "host actions total" "0" "$(grep -c '"action":' "$LOG" || true)"
check "unrelated dirty file preserved" "unrelated.txt" "$(git -C "$d" status --porcelain | grep -o 'unrelated.txt' | head -1)"
check "report written" "delivered" "$(jq -r .status "$d/report.json")"
check "first performed action retained" "report:local" "$(jq -r '.performed[0]' "$d/report.json")"
check "empty refusal array" "[]" "$(jq -c '.refused' "$d/report.json")"
check "common mock disclaimer retained" "push/PR/CI/merge/deploy executed against the mock host shim; no real provider was contacted" "$(jq -r '.unverified[0]' "$d/report.json")"
check "report dirty file count" "1" "$(jq -r .dirty_files "$d/report.json")"
check "unchanged final revision" "$(git -C "$d" rev-parse HEAD)" "$(jq -r .final_revision "$d/report.json")"
show_observed "$d"

# --- S2: local boundary with authorized local commit ------------------------

echo "S2 local boundary (authorized local commit only):"
start_scenario s2 "$rules_github_merge_deploy_ci"
d="$FIXTURE_DIR"
printf 'feature\n' > "$d/feature.txt"
git -C "$d" add feature.txt
base_rev="$(git -C "$d" rev-parse HEAD)"
deliver "$d" --rules "$d/rules.txt" --boundary local --commit-message "add feature" --report "$d/report.json" > "$WORK/s2.out"
check "host actions total" "0" "$(grep -c '"action":' "$LOG" || true)"
check "local commit performed" "3" "$(git -C "$d" rev-list --count HEAD)"
check "report retains base revision" "$base_rev" "$(jq -r .base_revision "$d/report.json")"
check "report records committed final revision" "$(git -C "$d" rev-parse HEAD)" "$(jq -r .final_revision "$d/report.json")"
check "final revision differs from base" "false" "$(jq -r '.base_revision == .final_revision' "$d/report.json")"
check "feature.txt committed" "feature.txt" "$(git -C "$d" show --name-only --format= HEAD | grep -o 'feature.txt' | head -1)"
check "unrelated file NOT committed" "" "$(git -C "$d" show --name-only --format= HEAD | grep -o 'unrelated.txt' | head -1)"
check "unrelated file still dirty" "unrelated.txt" "$(git -C "$d" status --porcelain | grep -o 'unrelated.txt' | head -1)"
show_observed "$d"

# --- S3: review boundary performs zero external writes ----------------------

echo "S3 review boundary (handoff report only):"
start_scenario s3 "$rules_github_merge_deploy_ci"
d="$FIXTURE_DIR"
deliver "$d" --rules "$d/rules.txt" --boundary review --report "$d/report.json" > "$WORK/s3.out"
if deliver "$d" --rules "$d/rules.txt" --boundary review --report "$WORK/missing/report.json" > "$WORK/report-fail.out" 2>&1; then
  check "unwritable report fails" "failure" "success"
else
  check "unwritable report fails" "failure" "failure"
fi
if grep -q 'delivered at' "$WORK/report-fail.out"; then
  check "unwritable report has no success message" "no" "yes"
else
  check "unwritable report has no success message" "no" "no"
fi
check "host actions total" "0" "$(grep -c '"action":' "$LOG" || true)"
check "unrelated dirty file preserved" "unrelated.txt" "$(git -C "$d" status --porcelain | grep -o 'unrelated.txt' | head -1)"
check "no push performed" "0" "$(count_action push)"
check "no merge performed" "0" "$(count_action merge)"
show_observed "$d"

# --- S4: PR boundary pushes and opens PR, never merges ----------------------

echo "S4 pr boundary (push + PR, no merge/deploy):"
start_scenario s4 "$rules_github_merge_deploy_ci"
d="$FIXTURE_DIR"
deliver "$d" --rules "$d/rules.txt" --boundary pr --report "$d/report.json" > "$WORK/s4.out"
check "push performed" "1" "$(count_action push)"
check "pr-create performed" "1" "$(count_action pr-create)"
check "no merge performed" "0" "$(count_action merge)"
check "no deploy performed" "0" "$(count_action deploy)"
check "report notes mock PR" "1" "$(jq -r '[.unverified[] | select(test("does not exist on any provider"))] | length' "$d/report.json")"
check "report provider" "github" "$(jq -r .provider "$d/report.json")"
show_observed "$d"

# --- S5: merge without explicit authorization is refused --------------------

echo "S5 merge without explicit authorization (PR does not imply merge):"
start_scenario s5 "$rules_github_merge_deploy_ci"
d="$FIXTURE_DIR"
deliver "$d" --rules "$d/rules.txt" --boundary merge --report "$d/report.json" > "$WORK/s5.out" 2> "$WORK/s5.err"
check "exit status refused" "3" "$?"
check "no merge performed" "0" "$(count_action merge)"
check "no ci-status performed" "0" "$(count_action ci-status)"
check "refusal names authorization" "1" "$(grep -c 'without explicit user authorization' "$WORK/s5.err")"
check "empty performed array" "[]" "$(jq -c '.performed' "$d/report.json")"
check "sole refusal reason retained" "merge requested without explicit user authorization (PR creation does not imply merge)" "$(jq -r '.refused | if length == 1 then .[0] else empty end' "$d/report.json")"
check "report status refused" "refused" "$(jq -r .status "$d/report.json")"
show_observed "$d"

# --- S6: authorized merge refused when project rules block it ---------------

echo "S6 merge authorized by user but blocked by project rules:"
start_scenario s6 "$rules_merge_blocked"
d="$FIXTURE_DIR"
deliver "$d" --rules "$d/rules.txt" --boundary merge --authorized-merge --report "$d/report.json" > "$WORK/s6.out" 2> "$WORK/s6.err"
check "exit status refused" "3" "$?"
check "no merge performed" "0" "$(count_action merge)"
check "refusal names project rules" "1" "$(grep -c 'project rules set merge: blocked' "$WORK/s6.err")"
show_observed "$d"

# Exercise JSON escaping in an actual refusal reason, including a control character.
escaped_rule=$'blocked "quoted" \\path\tend'
printf 'merge: %s\n' "$escaped_rule" > "$d/escape-rules.txt"
deliver "$d" --rules "$d/escape-rules.txt" --boundary merge --authorized-merge --report "$d/escape-report.json" > "$WORK/escape.out" 2> "$WORK/escape.err"
check "escaped refusal status" "3" "$?"
check "escaped refusal round trips" "true" "$(jq -r --arg reason "explicit authorization present, but project rules set merge: $escaped_rule" '.refused == [$reason]' "$d/escape-report.json")"

# --- S7: authorized merge follows project rules incl. CI --------------------

echo "S7 merge explicitly authorized and allowed by rules (with CI requirement):"
start_scenario s7 "$rules_github_merge_deploy_ci"
d="$FIXTURE_DIR"
deliver "$d" --rules "$d/rules.txt" --boundary merge --authorized-merge --report "$d/report.json" > "$WORK/s7.out" 2> "$WORK/s7.err"
check "exit status delivered" "0" "$?"
check "ci-status performed" "1" "$(count_action ci-status)"
check "merge performed" "1" "$(count_action merge)"
check "merge target from rules" "1" "$(grep -c '"target":"main"' "$LOG")"
check "no deploy implied" "0" "$(count_action deploy)"
check "report discloses simulated CI" "1" "$(jq -r '[.unverified[] | select(test("not a real CI system"))] | length' "$d/report.json")"
show_observed "$d"

# --- S8: deploy without explicit authorization is refused -------------------

echo "S8 deploy without explicit authorization:"
start_scenario s8 "$rules_github_merge_deploy_ci"
d="$FIXTURE_DIR"
deliver "$d" --rules "$d/rules.txt" --boundary deploy --report "$d/report.json" > "$WORK/s8.out" 2> "$WORK/s8.err"
check "exit status refused" "3" "$?"
check "no deploy performed" "0" "$(count_action deploy)"
check "no merge implied" "0" "$(count_action merge)"
check "refusal names authorization" "1" "$(grep -c 'without explicit user authorization' "$WORK/s8.err")"
show_observed "$d"

# --- S9: authorized deploy does not imply merge -----------------------------

echo "S9 deploy explicitly authorized and allowed by rules:"
start_scenario s9 "$rules_github_merge_deploy_ci"
d="$FIXTURE_DIR"
T10_ACTION_LOG="$LOG" T10_DEPLOY_TARGET=staging bash "$SCRIPT_DIR/delivery.sh" \
  --rules "$d/rules.txt" --repo "$d" --boundary deploy --authorized-deploy --report "$d/report.json" > "$WORK/s9.out"
check "exit status delivered" "0" "$?"
check "deploy performed" "1" "$(count_action deploy)"
check "deploy target honored" "1" "$(grep -c '"target":"staging"' "$LOG")"
check "no merge implied" "0" "$(count_action merge)"
check "no push implied" "0" "$(count_action push)"
show_observed "$d"

# --- summary ----------------------------------------------------------------

echo
echo "action log for the whole run (every entry is a labeled MOCK action):"
cat "$WORK"/s*.log | sed 's/^/  /'
echo
if [ "$fail" -eq 0 ]; then
  echo "RESULT: all $pass scenario checks passed (mock host; no real external operation)"
  exit 0
else
  echo "RESULT: $pass passed, $fail FAILED"
  exit 1
fi

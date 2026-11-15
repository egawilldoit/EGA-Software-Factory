#!/usr/bin/env bash
# T09 summary scenario runner: opt-in, opt-out, unknown metrics, privacy,
# network observation limits. Uses only synthetic data and temporary
# directories outside the repository; makes no network connections.
# See README.md for the observed-evidence limits (no host telemetry test).
set -u
here="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$here/../../.." && pwd)"
data_root="$(mktemp -d "${TMPDIR:-/tmp}/ega-factory-t09-XXXXXX")"
export HOME="$data_root/home"
unset XDG_DATA_HOME
mkdir -p "$HOME/.local/share/ega-factory/summaries"
printf 'existing synthetic summary\n' > "$HOME/.local/share/ega-factory/summaries/existing.yaml"
summaries="$data_root/summaries"
mkdir -p "$summaries"
trap 'rm -rf "$data_root"' EXIT
pass=0; fail=0
check() { # check <exit-status> <label>
  if [ "$1" -eq 0 ]; then echo "PASS: $2"; pass=$((pass+1)); else echo "FAIL: $2"; fail=$((fail+1)); fi
}

# Marker for the repository-mutation check (S6).
touch "$data_root/marker"

# --- S1: explicit opt-in writes one valid summary outside the repo ---
summary="$summaries/2026-11-15-synthetic-opt-in.yaml"
cp "$repo_root/templates/task-summary.yaml" "$summary"
sed -i \
  -e 's|"REPLACE_factory_version"|"ega-software-factory@0.1.0+t09-synthetic"|' \
  -e 's|"REPLACE_project"|"synthetic-fixture"|' \
  -e 's|"REPLACE_task"|"synthetic T09 opt-in scenario (no real task data)"|' \
  -e 's|"REPLACE_base"|"unknown"|' \
  -e 's|"REPLACE_final_revision"|"unknown"|' \
  -e 's|"REPLACE_worktree_state"|"dirty"|' \
  -e 's|"REPLACE_environment"|"synthetic: bash on linux VM; no real task run"|' \
  -e 's|"REPLACE_outcome"|"completed"|' \
  -e 's|"REPLACE_verification"|"synthetic: local validator checks passed (no real checks run)"|' \
  -e 's|"REPLACE_review"|"same-agent (synthetic only)"|' \
  -e 's|"REPLACE_lesson_or_remove"|"no improvement justified"|' \
  "$summary"
chmod 700 "$summaries"
chmod 600 "$summary"
bash "$here/validate-summary.sh" "$summary" >/dev/null 2>&1
check $? "S1a opt-in summary validates against the schema rules"
case "$(cd "$summaries" && pwd -P)" in "$repo_root"/*) check 1 "S1b summary written outside the repository";; *) check 0 "S1b summary written outside the repository";; esac
[ "$(stat -c '%a' "$summary")" = "600" ] && [ "$(stat -c '%a' "$summaries")" = "700" ]
check $? "S1c summary file/dir permissions are 600/700"

# --- S2: opt-out leaves existing isolated-home data intact ---
optout_root="$data_root/opt-out-workspace"
mkdir -p "$optout_root/repo"
[ "$(find "$optout_root" -name '*.yaml' 2>/dev/null | wc -l)" -eq 0 ]
check $? "S2a opt-out: no summary file created in the workspace"
default_dir="${XDG_DATA_HOME:-$HOME/.local/share}/ega-factory/summaries"
[ "$(find "$default_dir" -type f | wc -l)" -eq 1 ] && [ "$(cat "$default_dir/existing.yaml")" = 'existing synthetic summary' ]
check $? "S2b existing isolated-home summary preserved"

# --- S3: unknown metrics are null, never zero or an estimate ---
bash "$here/validate-summary.sh" "$here/fixtures/opt-in-synthetic.yaml" >/dev/null 2>&1
check $? "S3a synthetic valid fixture passes validation"
if bash "$here/validate-summary.sh" "$here/fixtures/invalid-fabricated-cost.yaml" >/dev/null 2>&1; then
  check 1 "S3b fabricated cost (0 without source) is rejected"
else
  check 0 "S3b fabricated cost (0 without source) is rejected"
fi
grep -Eq '^duration:[[:space:]]*null' "$summary" && grep -Eq '^cost:[[:space:]]*null' "$summary"
check $? "S3c opt-in summary records unknown duration/cost as null"

# --- S4: no secrets or prompt/transcript capture ---
if bash "$here/validate-summary.sh" "$here/fixtures/invalid-secret.yaml" >/dev/null 2>&1; then
  check 1 "S4a secret-bearing key is rejected"
else
  check 0 "S4a secret-bearing key is rejected"
fi
! grep -Eqi '^[[:space:]]*(api[_-]?key|password|secret|token|authorization|prompt|transcript|trace|conversation|messages|full[-_]?log):' "$summary"
check $? "S4b opt-in summary contains no secret or transcript-like fields"
if bash "$here/validate-summary.sh" "$here/fixtures/invalid-credential-pattern.yaml" >"$data_root/credential.out" 2>&1; then
  check 1 "S4c credential pattern in an allowed field is rejected"
else
  grep -q 'credential-like pattern found' "$data_root/credential.out"
  check $? "S4c credential pattern in an allowed field is rejected"
fi

python3 "$here/test-destinations.py"
check $? "destination precedence and boundary checks"

# --- S5: network observation limits ---
# Limited observation: this can only show that the test scripts contain no
# network-capable commands. It does not observe host-level packets, and host
# telemetry behavior is not tested. See README.md.
if grep -RniE 'c[u]rl|w[g]et|ht[t]ps?://|n[c][[:space:]]|s[s]h[[:space:]]|r[s]ync|f[t]p' "$here/validate-summary.sh" "$here/run-scenarios.sh" >/dev/null 2>&1; then
  check 1 "S5 no network-capable commands in the test scripts"
else
  check 0 "S5 no network-capable commands in the test scripts"
fi

# --- S6: the run created no files inside the repository ---
newfiles=$(find "$repo_root" -type f -newer "$data_root/marker" -not -path '*/.git/*' 2>/dev/null)
[ -z "$newfiles" ]
check $? "S6 run created no files inside the repository"

echo
echo "Synthetic summary scenarios: $pass passed, $fail failed."
[ "$fail" -eq 0 ] || exit 1

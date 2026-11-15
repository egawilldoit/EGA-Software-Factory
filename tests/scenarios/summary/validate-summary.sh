#!/usr/bin/env bash
# Validates a synthetic EGA Software Factory task summary against the T09 rules.
# Usage: validate-summary.sh <summary.yaml>
# Local file checks only; performs no network access.
set -u

[ "$#" -eq 1 ] && [ -f "$1" ] || { echo "FAIL: usage: validate-summary.sh <summary.yaml>" >&2; exit 1; }
file="$1"
fail() { echo "FAIL: $1" >&2; exit 1; }

# 1. schema_version must be 1.
grep -Eq '^schema_version:[[:space:]]*1[[:space:]]*$' "$file" \
  || fail "schema_version must be 1"

# 2. Only known top-level keys are allowed.
allowed=" schema_version factory_version project task base final_revision worktree_state environment outcome verification review duration cost lesson "
keys=$(grep -Eo '^[a-z_]+:' "$file" | tr -d ':' | sort -u)
[ -n "$keys" ] || fail "no top-level keys found"
while IFS= read -r k; do
  case "$allowed" in *" $k "*) ;; *) fail "unknown top-level key: $k";; esac
done <<< "$keys"

# 3. Required keys present with non-empty values.
for key in factory_version project task base final_revision worktree_state environment outcome verification review; do
  grep -Eq "^${key}:[[:space:]]*[^[:space:]#]" "$file" || fail "missing/empty required key: $key"
done

# 4. Controlled vocabularies.
grep -Eq '^outcome:[[:space:]]*"?(completed|ready-for-review|blocked|unknown)"?[[:space:]]*(#.*)?$' "$file" \
  || fail "outcome must be completed, ready-for-review, blocked, or unknown"
grep -Eq '^worktree_state:[[:space:]]*"?(clean|dirty|unknown)"?[[:space:]]*(#.*)?$' "$file" \
  || fail "worktree_state must be clean, dirty, or unknown"

# 5. Unknown metrics must be null; a real value needs a '# measured' source note.
for key in duration cost; do
  grep -Eq "^${key}:" "$file" || fail "metrics key missing (use null when unknown): $key"
  if ! grep -Eq "^${key}:[[:space:]]*null[[:space:]]*(#.*)?$" "$file"; then
    grep -Eq "^${key}:.*#[[:space:]]*measured" "$file" \
      || fail "$key must be null when unknown; a real value requires a '# measured' source note (never zero or an estimate)"
  fi
done

# 6. No credential-like content.
if grep -En '(ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY)' "$file"; then
  fail "credential-like pattern found"
fi
grep -Eqi '^[[:space:]]*(api[_-]?key|apikey|password|passwd|secret|token|authorization):' "$file" \
  && fail "secret-bearing key found"

# 7. No prompt/transcript capture fields.
grep -Eqi '^[[:space:]]*(prompt|transcript|trace|conversation|messages|full[-_]?log)[[:space:]]*:' "$file" \
  && fail "prompt/transcript-like field found; not permitted by the privacy rules"

echo "OK: $file"

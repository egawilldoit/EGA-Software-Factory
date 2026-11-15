#!/usr/bin/env bash
# MOCK delivery host for T10 delivery-boundary scenarios.
#
# This shim STANDS IN FOR a real Git provider / CI system / deploy target.
# It performs NO network, provider, or production operations of any kind:
# it only appends the requested action to $T10_ACTION_LOG and prints a
# simulated result. Every log entry and stdout line is labeled MOCK.
#
# Usage: mock-delivery-host.sh <action> [args...]
#   push <repo> <branch>
#   pr-create <repo> <branch> <title>      (GitHub)
#   mr-create <repo> <branch> <title>      (GitLab)
#   ci-status <repo> <branch>
#   merge <repo> <branch> <target-branch>
#   deploy <repo> <ref> <target>
set -euo pipefail

log="${T10_ACTION_LOG:?T10_ACTION_LOG must point to the action log file}"
ts="$(date -u +%FT%TZ)"
action="${1:?usage: mock-delivery-host.sh <action> [args...]}"

record() { # action, extra json fields (already comma-prefixed or empty)
  printf '{"ts":"%s","mock":true,"action":"%s"%s}\n' "$ts" "$1" "${2:-}" >> "$log"
}

case "$action" in
  push)
    repo="${2:?repo required}"; branch="${3:?branch required}"
    record push ",\"repo\":\"$repo\",\"branch\":\"$branch\""
    echo "[MOCK] simulated push of $branch to $repo (no real remote touched)"
    echo "ok pushed=$branch"
    ;;
  pr-create)
    repo="${2:?repo required}"; branch="${3:?branch required}"; title="${4:?title required}"
    record pr-create ",\"repo\":\"$repo\",\"branch\":\"$branch\",\"title\":\"$title\""
    echo "[MOCK] simulated GitHub PR creation for $branch in $repo (no real PR opened)"
    echo "ok pr=7"
    ;;
  mr-create)
    repo="${2:?repo required}"; branch="${3:?branch required}"; title="${4:?title required}"
    record mr-create ",\"repo\":\"$repo\",\"branch\":\"$branch\",\"title\":\"$title\""
    echo "[MOCK] simulated GitLab MR creation for $branch in $repo (no real MR opened)"
    echo "ok mr=7"
    ;;
  ci-status)
    repo="${2:?repo required}"; branch="${3:?branch required}"
    record ci-status ",\"repo\":\"$repo\",\"branch\":\"$branch\",\"result\":\"green-simulated\""
    echo "[MOCK] simulated CI status for $branch in $repo (NOT a real CI run)"
    echo "ok ci=green-simulated"
    ;;
  merge)
    repo="${2:?repo required}"; branch="${3:?branch required}"; target="${4:?target branch required}"
    record merge ",\"repo\":\"$repo\",\"branch\":\"$branch\",\"target\":\"$target\""
    echo "[MOCK] simulated merge of $branch into $target in $repo (no real merge performed)"
    echo "ok merged=true"
    ;;
  deploy)
    repo="${2:?repo required}"; ref="${3:?ref required}"; target="${4:?deploy target required}"
    record deploy ",\"repo\":\"$repo\",\"ref\":\"$ref\",\"target\":\"$target\""
    echo "[MOCK] simulated deploy of $ref to $target for $repo (nothing was deployed)"
    echo "ok deployed=true"
    ;;
  *)
    echo "unknown host action: $action" >&2
    exit 2
    ;;
esac

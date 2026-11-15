#!/usr/bin/env bash
# T10 delivery workflow: deliver a change at the exact authorized boundary.
#
# Test-fixture reference implementation of the boundary ladder in
# references/risk-and-delivery.md. All external operations (push, PR/MR,
# CI status, merge, deploy) are delegated to the configured host shim,
# which defaults to mock-delivery-host.sh and never touches a real
# provider. Every external action is recorded in $T10_ACTION_LOG.
#
# Usage:
#   delivery.sh --boundary local|review|pr|merge|deploy --repo DIR
#               [--rules FILE] [--report FILE] [--commit-message MSG]
#               [--authorized-merge] [--authorized-deploy]
#               [--pr-title TITLE]
#
# Project rules file format (KEY: VALUE lines; all keys optional):
#   provider: github|gitlab          (default github)
#   default-branch: main
#   merge: allowed|blocked           (default blocked)
#   deploy: allowed|blocked          (default blocked)
#   require-ci: true|false           (default false)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST="${T10_DELIVERY_HOST:-$SCRIPT_DIR/mock-delivery-host.sh}"

BOUNDARY="" REPO="" RULES="" REPORT="" COMMIT_MSG="" PR_TITLE=""
AUTH_MERGE=0 AUTH_DEPLOY=0

usage() {
  sed -n '3,22p' "${BASH_SOURCE[0]}"
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --boundary) BOUNDARY="${2:-}"; shift 2 ;;
    --repo) REPO="${2:-}"; shift 2 ;;
    --rules) RULES="${2:-}"; shift 2 ;;
    --report) REPORT="${2:-}"; shift 2 ;;
    --commit-message) COMMIT_MSG="${2:-}"; shift 2 ;;
    --pr-title) PR_TITLE="${2:-}"; shift 2 ;;
    --authorized-merge) AUTH_MERGE=1; shift ;;
    --authorized-deploy) AUTH_DEPLOY=1; shift ;;
    *) echo "unknown argument: $1" >&2; usage ;;
  esac
done

[ -n "$BOUNDARY" ] && [ -n "$REPO" ] || usage
case "$BOUNDARY" in
  local|review|pr|merge|deploy) ;;
  *) echo "invalid boundary: $BOUNDARY" >&2; exit 2 ;;
esac
[ -d "$REPO/.git" ] || { echo "not a git repository: $REPO" >&2; exit 2; }
: "${T10_ACTION_LOG:?T10_ACTION_LOG must point to the action log file}"

performed=() refused=() unverified=()

rule() { # key default
  local val=""
  if [ -n "$RULES" ] && [ -f "$RULES" ]; then
    val="$(sed -n "s/^$1:[[:space:]]*//p" "$RULES" | head -1)"
  fi
  printf '%s' "${val:-$2}"
}

provider="$(rule provider github)"
default_branch="$(rule default-branch main)"
merge_rule="$(rule merge blocked)"
deploy_rule="$(rule deploy blocked)"
require_ci="$(rule require-ci false)"

base_rev="$(git -C "$REPO" rev-parse HEAD)"
branch="$(git -C "$REPO" rev-parse --abbrev-ref HEAD)"
dirty_files="$(git -C "$REPO" status --porcelain | wc -l | tr -d ' ')"

unverified+=("push/PR/CI/merge/deploy executed against the mock host shim; no real provider was contacted")

host() { # prints "[MOCK] ..." lines then "ok key=value"
  "$HOST" "$@" || return 1
}

json_list() { # items -> ["a","b"]
  local items=("${@:2}") out="[" i
  for i in "${!items[@]}"; do
    [ "$i" -eq 0 ] || out+=","
    out+="\"${items[$i]}\""
  done
  printf '%s]' "$out"
}

write_report() { # status
  local status="$1"
  local performed_json refused_json unverified_json final_rev
  final_rev="$(git -C "$REPO" rev-parse HEAD)" || return 1
  performed_json="$(json_list "${performed[@]}")"
  refused_json="$(json_list "${refused[@]}")"
  unverified_json="$(json_list "${unverified[@]}")"
  [ -n "$REPORT" ] || return 0
  printf '{"schema":"t10-delivery-report/1","mock_host":true,"status":"%s","boundary":"%s","provider":"%s","base_revision":"%s","final_revision":"%s","branch":"%s","dirty_files":%s,"performed":%s,"refused":%s,"unverified":%s}\n' \
    "$status" "$BOUNDARY" "$provider" "$base_rev" "$final_rev" "$branch" "${dirty_files:-0}" \
    "$performed_json" "$refused_json" "$unverified_json" > "$REPORT"
}

refuse() { # reason
  refused+=("$1")
  echo "REFUSED: $1" >&2
  write_report refused
  exit 3
}

case "$BOUNDARY" in
  local)
    if [ -n "$COMMIT_MSG" ]; then
      if git -C "$REPO" diff --cached --quiet; then
        echo "no staged changes; local commit skipped (nothing authorized to commit)"
      else
        git -C "$REPO" commit -m "$COMMIT_MSG" --quiet || refuse "local commit failed"
        performed+=("local-commit:$(git -C "$REPO" rev-parse --short HEAD)")
      fi
    fi
    performed+=("report:local")
    write_report delivered
    echo "delivered at local boundary; external writes: none"
    ;;

  review)
    performed+=("report:review-handoff")
    unverified+=("review-handoff file is produced locally; no review request was sent to any provider")
    write_report delivered
    echo "delivered at review boundary; external writes: none"
    ;;

  pr)
    out="$(host push "$REPO" "$branch")" || refuse "host push failed: $out"
    performed+=("host:push:$branch")
    case "$provider" in
      gitlab) pr_cmd="mr-create" ;;
      *) pr_cmd="pr-create" ;;
    esac
    out="$(host "$pr_cmd" "$REPO" "$branch" "${PR_TITLE:-$branch}")" || refuse "host $pr_cmd failed: $out"
    pr_ref="$(printf '%s\n' "$out" | sed -n 's/^ok \(pr\|mr\)=//p' | head -1)"
    performed+=("host:$pr_cmd:$pr_ref")
    unverified+=("PR/MR number $pr_ref is simulated by the mock host; it does not exist on any provider")
    performed+=("report:pr-delivery")
    write_report delivered
    echo "delivered at pr boundary: $pr_cmd $pr_ref; merge and deploy NOT performed"
    ;;

  merge)
    [ "$AUTH_MERGE" -eq 1 ] || refuse "merge requested without explicit user authorization (PR creation does not imply merge)"
    [ "$merge_rule" = "allowed" ] || refuse "explicit authorization present, but project rules set merge: $merge_rule"
    if [ "$require_ci" = "true" ]; then
      out="$(host ci-status "$REPO" "$branch")" || refuse "host ci-status failed: $out"
      ci="$(printf '%s\n' "$out" | sed -n 's/^ok ci=//p' | head -1)"
      case "$ci" in
        green*) performed+=("host:ci-status:$ci") ;;
        *) refuse "project rules require CI, but reported status is: $ci" ;;
      esac
      unverified+=("CI status '$ci' came from the mock host, not a real CI system")
    fi
    out="$(host merge "$REPO" "$branch" "$default_branch")" || refuse "host merge failed: $out"
    performed+=("host:merge:$branch->$default_branch")
    performed+=("report:merge-delivery")
    write_report delivered
    echo "delivered at merge boundary: merged into $default_branch; deploy NOT performed"
    ;;

  deploy)
    [ "$AUTH_DEPLOY" -eq 1 ] || refuse "deploy requested without explicit user authorization (merge authorization does not imply deploy)"
    [ "$deploy_rule" = "allowed" ] || refuse "explicit authorization present, but project rules set deploy: $deploy_rule"
    out="$(host deploy "$REPO" "$branch" "${T10_DEPLOY_TARGET:-staging}")" || refuse "host deploy failed: $out"
    performed+=("host:deploy:$branch")
    performed+=("report:deploy-delivery")
    write_report delivered
    echo "delivered at deploy boundary; merge NOT performed"
    ;;
esac

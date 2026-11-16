#!/usr/bin/env bash
# EGA Software Factory v1 release automation.
#
# Build the canonical bundle at the release source commit, validate, pack ONCE,
# publish the exact same tarball to npm and GitHub, then deploy the same bundle
# to Cloudflare. No npm lifecycle scripts are used. Writes are identity-gated so
# a rerun after partial failure is safe: identical bytes are skipped, different
# bytes are a hard failure. Only observed channel results are recorded.
#
# Subcommands: verify | prepare | pack | publish-npm | release-github | deploy-cf | summary

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
RELEASE_OUT="${RELEASE_OUT:-${RUNNER_TEMP:-/tmp}/ega-factory-release}"

BUILD_CMD="${BUILD_CMD:-npm run build}"          # generate canonical bundle at HEAD
TEST_CMD="${TEST_CMD:-npm run test:package}"     # package/installer fixture tests
CF_DEPLOY_CMD="${CF_DEPLOY_CMD:-}"               # optional override for the module upload only
CF_WORKER_URL="${CF_WORKER_URL:-}"               # deployed worker base URL for /health check
DRY_RUN="${DRY_RUN:-false}"

PACKAGE_NAME="@egawilldoit/factory"
DESCRIPTOR_FILE="$REPO_ROOT/bundle/bundle.json"
WORKER_BUNDLE="$REPO_ROOT/worker/generated/released-guidance.json"
STATUS_FILE="$RELEASE_OUT/status.json"

log()  { printf '[release] %s\n' "$*" >&2; }
fail() { printf '[release] ERROR: %s\n' "$*" >&2; exit 1; }

# Persist only what actually happened on a channel.
record_status() {
  [ -f "$STATUS_FILE" ] || printf '{}' > "$STATUS_FILE"
  node -e '
    const fs = require("fs");
    const o = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    o[process.argv[2]] = { status: process.argv[3], evidence: process.argv[4], at: new Date().toISOString() };
    fs.writeFileSync(process.argv[1], JSON.stringify(o, null, 2));
  ' "$STATUS_FILE" "$1" "$2" "$3"
}

fail_channel() { record_status "$1" "failed" "$2"; fail "$2"; }

if_dry_run() {
  if [ "$DRY_RUN" = "true" ]; then
    log "DRY_RUN=true: skipping $2"
    record_status "$1" "not-run" "dry_run=true"
    return 0
  fi
  return 1
}

resolve_release() {
  RELEASE_TAG="${RELEASE_TAG:-${GITHUB_REF_NAME:-}}"
  [ -n "$RELEASE_TAG" ] || fail "no release tag (v* push, inputs.tag or RELEASE_TAG)"
  [[ "$RELEASE_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] \
    || fail "tag '$RELEASE_TAG' is not stable vX.Y.Z"
  RELEASE_VERSION="${RELEASE_VERSION:-${RELEASE_TAG#v}}"
  SOURCE_COMMIT="${SOURCE_COMMIT:-$(git -C "$REPO_ROOT" rev-parse HEAD)}"
  export RELEASE_TAG RELEASE_VERSION SOURCE_COMMIT
}

# Root canonical metadata and worker guidance must agree and must not be the
# development placeholder. Previous-release inclusion is parent wiring; this
# only asserts the current release parity needed to deploy safely.
assert_release_bundle() {
  [ -f "$DESCRIPTOR_FILE" ] || fail "bundle descriptor not generated: $DESCRIPTOR_FILE"
  [ -f "$WORKER_BUNDLE" ] || fail "worker bundle not generated: $WORKER_BUNDLE"
  local generator dver dcommit wver wcommit previous
  generator="$(node -e 'const b=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(b.generator||""))' "$WORKER_BUNDLE")"
  case "$generator" in
    *placeholder*|*development*) fail "worker bundle is a placeholder ($generator); canonical adapter not wired" ;;
  esac
  dver="$(node -e 'const b=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(b.version||""))' "$DESCRIPTOR_FILE")"
  dcommit="$(node -e 'const b=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(b.sourceCommit||""))' "$DESCRIPTOR_FILE")"
  wver="$(node -e 'const b=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(b.defaultVersion||""))' "$WORKER_BUNDLE")"
  wcommit="$(node -e 'const b=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const r=(b.releases||[]).find(x=>x.version===process.argv[2]);process.stdout.write(r?String(r.sourceCommit||""):"")' "$WORKER_BUNDLE" "$RELEASE_VERSION")"
  previous="$(node -e 'const b=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(b.releases&&b.releases[1]?b.releases[1].version:"none"))' "$WORKER_BUNDLE")"
  [ "$dver" = "$RELEASE_VERSION" ] || fail "bundle descriptor version '$dver' != '$RELEASE_VERSION'"
  [ "$wver" = "$RELEASE_VERSION" ] || fail "worker bundle defaultVersion '$wver' != '$RELEASE_VERSION'"
  [ "$dver" = "$wver" ] || fail "canonical metadata parity failed: descriptor=$dver worker=$wver"
  [ "$dcommit" = "$SOURCE_COMMIT" ] || fail "descriptor sourceCommit '$dcommit' != '$SOURCE_COMMIT'"
  [ "$wcommit" = "$SOURCE_COMMIT" ] || fail "worker bundle sourceCommit '$wcommit' != '$SOURCE_COMMIT'"
  log "bundle parity ok: version=$wver commit=$wcommit previous=${previous} (previous stable artifact: parent wiring)"
}

cmd_prepare() {
  resolve_release
  log "prepare $RELEASE_TAG (version=$RELEASE_VERSION commit=$SOURCE_COMMIT)"

  # Source metadata must be exact: the released tag is the checked-out commit.
  local tag_commit head_commit
  tag_commit="$(git -C "$REPO_ROOT" rev-parse --verify "${RELEASE_TAG}^{commit}" 2>/dev/null || true)"
  head_commit="$(git -C "$REPO_ROOT" rev-parse HEAD)"
  [ -n "$tag_commit" ] || fail "tag '$RELEASE_TAG' not found in checkout"
  [ "$tag_commit" = "$head_commit" ] || fail "tag '$RELEASE_TAG' resolves to $tag_commit, HEAD is $head_commit"
  [ "$SOURCE_COMMIT" = "$head_commit" ] || fail "source commit mismatch"

  [ -f "$REPO_ROOT/package.json" ] || fail "missing root package.json — parent bundle not ready"
  [ -f "$REPO_ROOT/.codex-plugin/plugin.json" ] || fail "missing .codex-plugin/plugin.json"
  local name version plugin_version
  name="$(node -p "require('$REPO_ROOT/package.json').name")"
  version="$(node -p "require('$REPO_ROOT/package.json').version")"
  plugin_version="$(node -p "require('$REPO_ROOT/.codex-plugin/plugin.json').version")"
  [ "$name" = "$PACKAGE_NAME" ] || fail "package name '$name' != '$PACKAGE_NAME'"
  [ "$version" = "$RELEASE_VERSION" ] || fail "package version '$version' != '$RELEASE_VERSION'"
  [ "$plugin_version" = "$RELEASE_VERSION" ] || fail "plugin version '$plugin_version' != '$RELEASE_VERSION'"

  log "building canonical bundle: $BUILD_CMD"
  (cd "$REPO_ROOT" && bash -lc "$BUILD_CMD") || fail "canonical bundle build failed"
  assert_release_bundle

  log "running package fixture tests: $TEST_CMD"
  (cd "$REPO_ROOT" && bash -lc "$TEST_CMD") || fail "package fixture tests failed; nothing published"
  log "running worker tests: npm test"
  (cd "$REPO_ROOT/worker" && npm test) || fail "worker tests failed; nothing published"
  log "prepare passed"
}

cmd_pack() {
  resolve_release
  mkdir -p "$RELEASE_OUT"
  printf '{"npm":{"status":"not-run","evidence":"not attempted"},"github":{"status":"not-run","evidence":"not attempted"},"cloudflare":{"status":"not-run","evidence":"not attempted"}}' > "$STATUS_FILE"
  log "packing once into $RELEASE_OUT (no npm lifecycle scripts)"
  local pack_json
  pack_json="$(cd "$REPO_ROOT" && npm pack --json --ignore-scripts --pack-destination "$RELEASE_OUT")" \
    || fail "npm pack failed"
  local filename integrity shasum size sha256 packed_name packed_version
  filename="$(node -e 'process.stdout.write(JSON.parse(process.argv[1])[0].filename||"")' "$pack_json")"
  integrity="$(node -e 'process.stdout.write(JSON.parse(process.argv[1])[0].integrity||"")' "$pack_json")"
  shasum="$(node -e 'process.stdout.write(JSON.parse(process.argv[1])[0].shasum||"")' "$pack_json")"
  size="$(node -e 'process.stdout.write(String(JSON.parse(process.argv[1])[0].size||""))' "$pack_json")"
  [ -n "$filename" ] && [ -n "$integrity" ] || fail "npm pack did not report filename/integrity"
  TARBALL="$RELEASE_OUT/$filename"
  [ -f "$TARBALL" ] || fail "tarball missing: $TARBALL"
  sha256="$(sha256sum "$TARBALL" | awk '{print $1}')"

  packed_name="$(tar -xOf "$TARBALL" package/package.json | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).name")"
  packed_version="$(tar -xOf "$TARBALL" package/package.json | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).version")"
  [ "$packed_name" = "$PACKAGE_NAME" ] || fail "packed name '$packed_name' mismatch"
  [ "$packed_version" = "$RELEASE_VERSION" ] || fail "packed version '$packed_version' mismatch"

  cat > "$RELEASE_OUT/artifact.json" <<EOF
{
  "tag": "$RELEASE_TAG",
  "version": "$RELEASE_VERSION",
  "commit": "$SOURCE_COMMIT",
  "package": "$PACKAGE_NAME",
  "filename": "$filename",
  "shasum": "$shasum",
  "integrity": "$integrity",
  "sha256": "$sha256",
  "size": "$size"
}
EOF
  log "artifact: $filename integrity=$integrity sha256=$sha256"
}

load_artifact() {
  local f="$RELEASE_OUT/artifact.json"
  [ -f "$f" ] || fail "missing $f — run 'pack' first"
  A_TAG="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).tag||"")' "$f")"
  A_VERSION="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).version||"")' "$f")"
  A_COMMIT="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).commit||"")' "$f")"
  A_INTEGRITY="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).integrity||"")' "$f")"
  A_SHASUM="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).shasum||"")' "$f")"
  A_SHA256="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).sha256||"")' "$f")"
  A_FILENAME="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).filename||"")' "$f")"
  TARBALL="$RELEASE_OUT/$A_FILENAME"
  [ -f "$TARBALL" ] || fail "packed tarball missing: $TARBALL"
  [ "$(sha256sum "$TARBALL" | awk '{print $1}')" = "$A_SHA256" ] || fail "packed tarball changed after packing"
  RELEASE_TAG="$A_TAG"
  RELEASE_VERSION="$A_VERSION"
  SOURCE_COMMIT="$A_COMMIT"
  export RELEASE_TAG RELEASE_VERSION SOURCE_COMMIT
}

cmd_publish_npm() {
  load_artifact
  if if_dry_run npm "npm publish"; then return 0; fi
  [ -n "${NODE_AUTH_TOKEN:-}" ] || fail_channel npm "NODE_AUTH_TOKEN empty (wire NPM_TOKEN)"
  local err rc remote_integrity remote_shasum
  err="$(mktemp)"
  set +e
  npm view "$PACKAGE_NAME@$A_VERSION" version >/dev/null 2>"$err"
  rc=$?
  set -e
  if [ $rc -eq 0 ]; then
    remote_integrity="$(npm view "$PACKAGE_NAME@$A_VERSION" dist.integrity 2>/dev/null || true)"
    remote_shasum="$(npm view "$PACKAGE_NAME@$A_VERSION" dist.shasum 2>/dev/null || true)"
    if [ -n "$remote_integrity" ] && [ "$remote_integrity" = "$A_INTEGRITY" ]; then
      record_status npm "skipped-identical" "integrity=$A_INTEGRITY"; log "npm: identical; skip"; return 0
    fi
    if [ -z "$remote_integrity" ] && [ -n "$remote_shasum" ] && [ "$remote_shasum" = "$A_SHASUM" ]; then
      record_status npm "skipped-identical" "shasum=$A_SHASUM"; log "npm: identical; skip"; return 0
    fi
    fail_channel npm "version exists with different bytes (remote=$remote_integrity/$remote_shasum, local=$A_INTEGRITY)"
  fi
  if grep -Eq 'E404|404 Not Found|is not in this registry' "$err"; then
    npm publish "$TARBALL" --access public --ignore-scripts || fail_channel npm "npm publish failed"
    record_status npm "published" "integrity=$A_INTEGRITY version=$A_VERSION"
    log "npm: published $PACKAGE_NAME@$A_VERSION"
    return 0
  fi
  cat "$err" >&2
  fail_channel npm "npm view could not confirm registry state; refusing to publish blindly"
}

cmd_release_github() {
  load_artifact
  if if_dry_run github "GitHub release"; then return 0; fi
  command -v gh >/dev/null 2>&1 || fail_channel github "gh CLI not found"
  local repo="${GITHUB_REPOSITORY:-egawilldoit/EGA-Software-Factory}" tag="$A_TAG" asset="$A_FILENAME"
  local verify_dir="$RELEASE_OUT/verify-gh"; mkdir -p "$verify_dir"
  if gh release view "$tag" --repo "$repo" >/dev/null 2>&1; then
    local entry remote_sha256
    entry="$(gh api "repos/$repo/releases/tags/$tag" --jq ".assets[]? | select(.name==\"$asset\") | .name" 2>/dev/null || true)"
    if [ -n "$entry" ]; then
      rm -f "$verify_dir/$asset"
      gh release download "$tag" --repo "$repo" --pattern "$asset" --dir "$verify_dir" >/dev/null 2>&1 \
        || fail_channel github "could not download existing asset for verification"
      remote_sha256="$(sha256sum "$verify_dir/$asset" | awk '{print $1}')"
      [ "$remote_sha256" = "$A_SHA256" ] || fail_channel github "asset sha256 differs ($remote_sha256 != $A_SHA256)"
      record_status github "skipped-identical" "asset-sha256=$A_SHA256"; log "GitHub: identical; skip"
      return 0
    fi
    gh release upload "$tag" "$TARBALL" --repo "$repo" --clobber >/dev/null \
      || fail_channel github "asset upload to existing release failed"
    record_status github "published" "asset-uploaded sha256=$A_SHA256"
    log "GitHub: uploaded asset to existing release $tag"
    return 0
  fi
  gh release create "$tag" "$TARBALL" --repo "$repo" --title "$tag" \
    --notes "Release $A_VERSION ($A_TAG)
Source commit: $A_COMMIT
npm: $PACKAGE_NAME@$A_VERSION
Tarball: $asset
sha256: $A_SHA256
integrity: $A_INTEGRITY" >/dev/null || fail_channel github "release creation failed"
  record_status github "published" "release-created sha256=$A_SHA256"
  log "GitHub: created release $tag"
}

# Zero-dependency worker: build the self-contained ES module, upload it with the
# Cloudflare API, enable the workers.dev subdomain, then confirm via GET /health.
cmd_deploy_cf() {
  load_artifact
  if if_dry_run cloudflare "Cloudflare deploy"; then return 0; fi
  local worker="$REPO_ROOT/worker"
  [ -d "$worker" ] || fail_channel cloudflare "worker/ missing"
  [ -n "${CLOUDFLARE_API_TOKEN:-}" ] || fail_channel cloudflare "CLOUDFLARE_API_TOKEN empty"
  [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] || fail_channel cloudflare "CLOUDFLARE_ACCOUNT_ID empty"
  [ -n "$CF_WORKER_URL" ] || fail_channel cloudflare "CF_WORKER_URL not set; cannot confirm deployment via /health"

  # Re-check parity at deploy time so a placeholder/stale JSON is never uploaded.
  assert_release_bundle

  (cd "$worker" && npm run build:api) || fail_channel cloudflare "worker build:api failed"
  local module="$worker/dist/worker.mjs"
  [ -f "$module" ] || fail_channel cloudflare "worker module not generated: $module"
  local script_name compat_date
  script_name="$(awk -F'"' '/^name[[:space:]]*=/{print $2;exit}' "$worker/wrangler.toml")"
  compat_date="$(awk -F'"' '/^compatibility_date[[:space:]]*=/{print $2;exit}' "$worker/wrangler.toml")"
  [ -n "$script_name" ] && [ -n "$compat_date" ] \
    || fail_channel cloudflare "cannot read script name / compatibility_date from wrangler.toml"

  if [ -n "$CF_DEPLOY_CMD" ]; then
    (
      cd "$worker"
      export WORKER_MODULE="$module" RELEASE_TARBALL="$TARBALL"
      export RELEASE_VERSION="$A_VERSION" RELEASE_TAG="$A_TAG" SOURCE_COMMIT="$A_COMMIT"
      export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
      bash -lc "$CF_DEPLOY_CMD"
    ) || fail_channel cloudflare "CF_DEPLOY_CMD failed"
    log "CF: module uploaded via CF_DEPLOY_CMD"
  else
    local meta resp err rc
    meta="$(printf '{"main_module":"worker.mjs","compatibility_date":"%s"}' "$compat_date")"
    resp="$(mktemp)"; err="$(mktemp)"
    set +e
    curl -fsS --retry 3 -X PUT \
      "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${script_name}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -F "metadata=${meta};type=application/json" \
      -F "script=@${module};filename=worker.mjs;type=application/javascript+module" \
      -o "$resp" 2>"$err"
    rc=$?
    set -e
    if [ $rc -ne 0 ]; then cat "$err" >&2; fail_channel cloudflare "Cloudflare module upload failed"; fi
    node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.exit(o.success?0:1)' "$resp" \
      || { cat "$resp" >&2; fail_channel cloudflare "Cloudflare API reported upload failure"; }
    log "CF: uploaded module '$script_name' (sha256 $(sha256sum "$module" | awk '{print $1}'))"
  fi

  # Enable workers.dev for the uploaded script (POST, PUT fallback).
  local sub_resp sub_err sub_rc
  sub_resp="$(mktemp)"; sub_err="$(mktemp)"
  set +e
  curl -fsS -X POST \
    "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${script_name}/subdomain" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H 'Content-Type: application/json' \
    -d '{"enabled":true}' -o "$sub_resp" 2>"$sub_err"
  sub_rc=$?
  if [ $sub_rc -ne 0 ]; then
    curl -fsS -X PUT \
      "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${script_name}/subdomain" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H 'Content-Type: application/json' \
      -d '{"enabled":true}' -o "$sub_resp" 2>"$sub_err"
    sub_rc=$?
  fi
  set -e
  [ $sub_rc -eq 0 ] || { cat "$sub_err" >&2; fail_channel cloudflare "could not enable workers.dev subdomain"; }
  log "CF: workers.dev subdomain enabled"

  # Confirm the deployed worker serves exactly this version and source commit.
  local health hrc hs hv hc
  health="$(mktemp)"; err="$(mktemp)"
  set +e
  curl -fsS --retry 4 --retry-all-errors --max-time 30 "${CF_WORKER_URL%/}/health" -o "$health" 2>"$err"
  hrc=$?
  set -e
  [ $hrc -eq 0 ] || { cat "$err" >&2; fail_channel cloudflare "GET /health failed"; }
  hs="$(node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(o.status||""))' "$health" || true)"
  hv="$(node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write((o.release&&o.release.version)||"")' "$health" || true)"
  hc="$(node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write((o.release&&o.release.sourceCommit)||"")' "$health" || true)"
  [ "$hs" = "ok" ] && [ "$hv" = "$A_VERSION" ] && [ "$hc" = "$A_COMMIT" ] \
    || fail_channel cloudflare "/health mismatch: status=$hs version=$hv commit=$hc (expected $A_VERSION/$A_COMMIT)"
  record_status cloudflare "deployed" "health-version=$hv health-commit=$hc subdomain=enabled"
  log "CF: confirmed /health version=$hv commit=$hc"
}

cmd_summary() {
  echo "### Release ${RELEASE_TAG:-unknown}"
  if [ ! -f "$RELEASE_OUT/artifact.json" ]; then
    echo "No artifact produced; see job logs."; return 0
  fi
  load_artifact
  echo "- Version: $A_VERSION"
  echo "- Source commit: $A_COMMIT"
  echo "- npm package: $PACKAGE_NAME@$A_VERSION"
  echo "- Artifact: $A_FILENAME"
  echo "- sha256: $A_SHA256"
  echo "- integrity: $A_INTEGRITY"
  echo "Observed channel results:"
  local ch line
  for ch in npm github cloudflare; do
    line="$(node -e 'const fs=require("fs");let o={};try{o=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))}catch(_){}const x=o[process.argv[2]]||{status:"not-run",evidence:"not recorded"};process.stdout.write(x.status+" — "+x.evidence)' "$STATUS_FILE" "$ch" 2>/dev/null || echo 'not-run — not recorded')"
    echo "- $ch: $line"
  done
  echo "Statuses are observed results only; not-run means no write was attempted."
}

cmd_verify() {
  log "static interface check (offline)"
  bash -n "${BASH_SOURCE[0]}" || fail "release.sh syntax error"
  local missing=0
  report() { if [ -e "$2" ]; then printf 'ok   %-22s %s\n' "$1" "$2"; else printf 'MISS %-22s %s\n' "$1" "$2"; missing=1; fi; }
  report package.json "$REPO_ROOT/package.json"
  report plugin.json "$REPO_ROOT/.codex-plugin/plugin.json"
  report worker "$REPO_ROOT/worker"
  report worker-build-script "$REPO_ROOT/worker/scripts/build-api-module.mjs"
  report workflow "$REPO_ROOT/.github/workflows/release.yml"
  [ "$missing" -eq 0 ] || { log "interfaces not ready; full validation cannot pass"; return 1; }
  log "interfaces present (real build/tests and channel writes still required)"
}

main() {
  case "${1:-}" in
    verify) cmd_verify ;;
    prepare) cmd_prepare ;;
    pack) cmd_pack ;;
    publish-npm) cmd_publish_npm ;;
    release-github) cmd_release_github ;;
    deploy-cf) cmd_deploy_cf ;;
    summary) cmd_summary ;;
    *) printf 'usage: %s {verify|prepare|pack|publish-npm|release-github|deploy-cf|summary}\n' "$0" >&2; exit 2 ;;
  esac
}

main "$@"

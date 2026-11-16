# Release automation

Status: implemented, not exercised. The installer/package scripts and the
canonical bundle adapter are owned by another agent and are not finished, so
`prepare` fails closed rather than claim a passing release.

Flow on a stable `vX.Y.Z` tag push:
`prepare` (version check → **build canonical bundle at HEAD** → metadata parity
check → fixture tests) → `pack` once → npm publish → GitHub release → CF Worker
deploy. Packing/publishing use `--ignore-scripts`; no npm lifecycle scripts are
assumed. `workflow_dispatch` checks out the requested tag and defaults to
`dry_run: true` (no writes). The workflow verifies the tag resolves to checked-out
HEAD and skips `npm install` when no root dependencies are declared.

Reruns: npm and GitHub compare published bytes to the local tarball (integrity /
shasum / asset sha256); identical means skip, different means fail, registry
errors never mean "skip". CF is deployed only after root canonical metadata
parity passes, then confirmed by `GET /health` (exact version and source commit).

## Observed status only

`pack` initialises `status.json` with all channels `not-run`. Each channel
records only what was actually observed: `published` / `skipped-identical` /
`deployed` / `not-run` / `failed` with evidence (integrity, sha256, health
version/commit). `summary` prints those records; it never claims a deployment
that was not confirmed. A dry run records `not-run`.

## Interfaces to wire

- `BUILD_CMD` (default `npm run build`) — generate the canonical bundle at the
  release source commit: `bundle/bundle.json` (schemaVersion 1, `version`,
  `sourceCommit`, `files[]` — what `lib/bundle.js` installs) and
  `worker/generated/released-guidance.json` (`defaultVersion`, release
  `sourceCommit` = `git rev-parse HEAD`, real `generator`). `prepare` and
  `deploy-cf` both assert version/sourceCommit parity and reject the development
  placeholder. The root `package.json` declares no scripts yet, so this needs
  wiring or overriding. **Including the previous stable release in the worker
  bundle is parent wiring; this component only asserts current-release parity.**
- `TEST_CMD` (default `npm run test:package`) — package/installer fixture tests,
  unknown until the installer finishes. `prepare` also runs the worker's
  dependency-free `npm test`.
- `CF_DEPLOY_CMD` (default empty) — optional single hook replacing only the
  module upload; it runs in `worker/` with `WORKER_MODULE`, `RELEASE_TARBALL`,
  `RELEASE_VERSION`, `RELEASE_TAG`, `SOURCE_COMMIT` and the Cloudflare credentials
  exported. The built-in upload uses the CF API v4 script endpoint with
  `application/javascript+module` and no `body_part`. No Wrangler is installed or
  needed. After upload the script's workers.dev subdomain is enabled (POST, PUT
  fallback), then `GET /health` must report the exact version and commit.
- `CF_WORKER_URL` (repo variable) — deployed worker base URL for the `/health`
  confirmation; required for a Cloudflare deploy to be recorded as `deployed`.

Required metadata: root `package.json` name `@egawilldoit/factory` and matching
version; `.codex-plugin/plugin.json` version must match the tag. Secrets:
`NPM_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, GitHub's
`GITHUB_TOKEN`.

Artifact, identity record and status go to `$RELEASE_OUT` (default
`$RUNNER_TEMP/ega-factory-release`), not the checkout.

Commands: `verify | prepare | pack | publish-npm | release-github | deploy-cf | summary`.

Static checks run here: `bash -n`, YAML parse, `release.sh verify`. No real
build, test, tag, release, publish, Cloudflare write or deploy was performed;
the bundle/test adapter, previous-release support and CF upload must be exercised
end to end before the final release.

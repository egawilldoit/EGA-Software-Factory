# Release automation

V1.0.1 completed the tagged release workflow on 2026-11-16. See the
[observed release evidence](../../docs/v1-release-evidence.md).

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
An edge cache can briefly serve the previous release after a successful upload,
so health confirmation polls a bounded window (`HEALTH_MAX_ATTEMPTS`, default
12, `HEALTH_INTERVAL_SECONDS`, default 5): stale status/version/commit or a
failed probe is retried, only an exact `ok` + version + commit match succeeds,
and the channel fails terminally with the last observation if it never matches.
Deterministic tests (`tests/release/health-verification.sh`) mock the probe and
sleep, so they never use the network or sleep in real time.

## Observed status only

`pack` initialises `status.json` with all channels `not-run`. Each channel
records only what was actually observed: `published` / `skipped-identical` /
`deployed` / `not-run` / `failed` with evidence (integrity, sha256, health
version/commit). `summary` prints those records; it never claims a deployment
that was not confirmed. A dry run records `not-run`.

## Release configuration

- `BUILD_CMD` (default `npm run build`) — generate the canonical bundle at the
  release source commit: `bundle/bundle.json` (schemaVersion 1, `version`,
  `sourceCommit`, `files[]` — what `lib/bundle.js` installs) and
  `worker/generated/released-guidance.json` (`defaultVersion`, release
  `sourceCommit` = `git rev-parse HEAD`, real `generator`). `prepare` and
  `deploy-cf` both assert version/sourceCommit parity and reject the development
  placeholder. Root scripts build both outputs. `previous.mjs` retrieves and
  integrity-checks the previous stable npm package; the Worker adapter includes
  it through `PREVIOUS_PACKAGE_ROOT`.
- `TEST_CMD` (default `npm run test:package`) — package/installer fixture tests,
  covering install, update, rollback, recovery and filesystem safety. `prepare` also runs the worker's
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

The tagged v1.0.1 workflow exercised build, tests, npm publication, GitHub
release creation and Cloudflare deployment. See the release evidence above for
exact revisions, checks and limitations.

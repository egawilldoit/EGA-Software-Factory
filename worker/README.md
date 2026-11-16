# EGA Software Factory MCP Worker

Read-only Cloudflare Worker. Serves previously generated, public release guidance over MCP Streamable HTTP at `/mcp`. Zero dependencies; Web Standard APIs only. No KV, D1, auth framework, secrets, env reads, network calls, shell or writes.

See [RELEASE-BUNDLE-INTERFACE.md](RELEASE-BUNDLE-INTERFACE.md) for the JSON the parent adapter generates. That is the only integration point.

## Surface

Endpoint: `/mcp` (POST). Health: `GET /health` (version, source commit, allowed-id count; no secrets).

Tools: `list_workflows`, `get_workflow`, `get_version`. Every tool response includes release version and source commit in both text and `structuredContent`. Pinned `version` reads one immutable release only; unavailable versions return `VERSION_UNAVAILABLE` rather than falling back to latest. Invalid ids return `ID_NOT_ALLOWED` with the full allowlist.

Protocol: initialization-based MCP, latest supported `2025-11-25` (also `2025-06-18`, `2025-03-26`). Standard `initialize` / `tools/list` / `tools/call` / `ping`, JSON-RPC errors, 202 for notifications, 405 for GET/DELETE, 400 for unsupported `MCP-Protocol-Version`. Per-request metadata and `server/discover` from `2026-07-28` are not implemented (see gaps).

## Local checks

```sh
node --test worker/test/protocol.test.mjs   # 25 tests, Node builtins only
node worker/scripts/build-api-module.mjs     # writes worker/dist/worker.mjs
```

On this VM, finite checks run through the heavy wrapper, for example:
`/home/ubuntu/.local/bin/heavy --label project:check -- node --test worker/test/protocol.test.mjs`

## Deployment commands (not executed here)

Wrangler config (`wrangler.toml`) sets `name = "ega-software-factory"` and `workers_dev = true`. No dependency install is required for the API path.

```sh
# 1. parent replaces generated/released-guidance.json with the canonical bundle
node worker/scripts/build-api-module.mjs

# 2. upload one ES module (token/account id supplied by parent; values not printed)
curl -sS -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/ega-software-factory" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -F 'worker.mjs=@worker/dist/worker.mjs;type=application/javascript+module' \
  -F 'metadata={"main_module":"worker.mjs","compatibility_date":"2025-06-18"};type=application/json'

# 3. if workers.dev is not already enabled for this worker name
curl -sS -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/workers/scripts/ega-software-factory/subdomain" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H 'content-type: application/json' \
  --data '{"enabled":true}'
```

Endpoint after deploy: `https://ega-software-factory.<subdomain>.workers.dev/mcp` (parent reported subdomain `a2003-2015`). Wrangler alternative after a separate install decision: `npx wrangler dev` / `npx wrangler deploy` from `worker/`.

## Gaps

- No deployment, real client discovery or ChatGPT connection performed here; only protocol tests against Node `Request`/`Response`.
- Official current MCP revision is `2026-07-28` (per-request `_meta` version, `server/discover`, mirrored-header validation, `UnsupportedProtocolVersionError`). Not implemented; needs a separate decision. `2025-11-25` is the newest initialization-based revision and is what public legacy clients use.
- The Node test runtime is not the Cloudflare Workers runtime; a `wrangler dev` or deployed smoke test is still required before release.

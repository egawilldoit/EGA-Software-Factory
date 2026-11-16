# V1 shipping plan

Status: v1.0.1 published on 2026-11-16. The installer, release automation and read-only Cloudflare channel are implemented. See [observed release evidence](v1-release-evidence.md) for checks and remaining limits. The existing v4 document describes the workflow design.

The v1.1.0 candidate adds portable idea-to-issue guidance (a `reference:issue-drafting` reference and `template:implementation-issue` template) and structured task reports. Its version declarations are prepared and local checks pass, but v1.1.0 is **not yet published or deployed**; v1.0.1 remains the published stable release until a tagged release completes. Pinned v1.0.1 keeps serving its original 18 assets and reports the new IDs as unavailable rather than backfilling content.

## Outcome

Maintain one repository and one versioned workflow bundle. Users install it locally with one command or connect a supported assistant to one hosted MCP endpoint. Updates come from stable releases, with visible versions and a rollback path.

## Baseline before this implementation

- Four skills live in `skills/`; shared content lives in `references/` and `templates/`.
- `.codex-plugin/plugin.json` declares version `0.1.0`. The local marketplace install/refresh/rollback has recorded evidence on one Linux host.
- `.opencode/opencode.json` registers this checkout's skills. A scoped OpenCode discovery pilot is recorded; the T3 slash menu itself was not observed.
- The manually installed shared skills on this VM contain absolute reference paths into this checkout. They are not portable release artifacts and do not update automatically.
- No npm package, installer, hosted MCP implementation, or release automation exists in this repository.
- Delivery/summary fixtures are synthetic. Full runtime acceptance remains incomplete; see `v4-acceptance-status.md`.

## Product boundary

V1 distributes workflow guidance. The host supplies models, repository access, execution, permissions and credentials. An MCP connection does not install local skills, enforce their instructions or provide remote coding execution.

No dashboard, database, task queue, telemetry service, model router or production executor is included. Hosted MCP is a deliberate extension to the original local-only scope, limited to read-only retrieval of released guidance.

## One release source

Keep the existing skills and references canonical. Generate local-install and MCP artifacts from the same bundle, recording its version, source commit and content hashes. Do not maintain separate workflow copies by hand.

Use an exact stable tag such as `v1.0.0` as the release trigger. Validate that tag, publish matching immutable npm and GitHub artifacts, then deploy the same bundle to MCP. Do not deploy every merge to main. Publish/deploy operations must be rerunnable after partial failure, with each channel's observed version reported. A failed channel must not be reported as released successfully.

Choose and verify the npm name before publication; `@egawilldoit/factory` is the verified account-scoped package name. Prepare candidate version declarations before testing, but create the stable tag only after checks pass. Keep published version declarations consistent through one release preparation step and a validation check.

## Build order and gates

### 1. Portable bundle and local installer

Implement a small Node CLI with no install-time lifecycle scripts. Bundle the referenced files so installation does not depend on the source checkout or a network fetch for each workflow read. Inspect existing relative links before choosing the installed layout; generate host adapters only where necessary.

Start with the shared Agent Skills directory already used by both local hosts. Prefer one installed copy to separate Codex/OpenCode copies. Keep `--host` only where an observed host difference requires it; do not build a general adapter framework. Detect an existing project/plugin installation of the same skill and explain the conflict rather than creating competing copies silently.

Proposed commands:

```sh
npx @egawilldoit/factory@1.0.0 install --host codex
npx @egawilldoit/factory@1.0.0 install --host opencode
npx @egawilldoit/factory@latest update --host opencode
npx @egawilldoit/factory@latest doctor --host opencode
npx @egawilldoit/factory@latest rollback --host opencode
npx @egawilldoit/factory@latest uninstall --host opencode
```

`install` uses the explicitly invoked package version. `update` shows the installed and requested versions and uses the invoked package's stable bundle. No scheduled or silent updates. `doctor` reports filesystem registration, content integrity and reference resolution separately from actual host discovery or UI invocation.

Store installation ownership, host, version and hashes locally. Stage and validate updates before replacing owned files; keep one previous working bundle for rollback. Refuse collisions with unrelated skills or local edits rather than overwriting them. Uninstall removes only files owned by this installation. Preserve unrelated host settings. Support explicit destinations for isolated tests.

Use one small ownership manifest and a staging/previous directory. No installer daemon, database, custom package registry or generic transaction engine. A failed update must leave a usable previous installation or an actionable recovery instruction. Rollback and uninstall must also preserve locally modified files rather than deleting them.

Gate: test the packed npm artifact, not just source files. In temporary homes, prove install, repeat install, update, rollback, uninstall, interrupted-update recovery, collision handling and reference resolution after moving/removing the source checkout. Prove invocation in fresh Codex and OpenCode sessions on the supported Linux environment. Windows/macOS remain unverified until exercised; unsupported combinations receive an honest diagnostic.

### 2. Release automation

Add narrow CI for bundle integrity, manifest/version consistency and installer acceptance. Build the release artifacts once from the tag, then publish those artifacts. Confirm package ownership, npm publishing credentials and GitHub release permissions before enabling publishing. Do not store secrets in the bundle.

Gate: rehearse a prerelease install from the packed artifact, a version upgrade and rollback. Record exact artifact identity and host results. Only advertise commands that have worked; examples above remain proposed until then.

The local installer and GitHub/npm release are the first independently shippable milestone. Hosted MCP must not delay that milestone. Start with one release workflow; add automation only for steps that actually publish or validate this package.

### 3. Read-only hosted MCP

The user authorized the Cloudflare channel and deferred ChatGPT connection testing. Build and test the read-only MCP endpoint with a protocol client now. Keep ChatGPT compatibility explicitly unverified until that separate connection test is performed.

Use one Cloudflare Worker initially. Expose a small tool surface to list workflows, retrieve a workflow/reference by allowed ID, and report the deployed version and source commit. Return instructions as guidance content; do not assume MCP prompts/resources alone are supported by every client. No arbitrary file paths, URL fetching, shell execution, repository writes or secrets in returned content. Decide authentication from the actual audience: intentionally public guidance or authenticated private access. Do not deploy private material publicly by default.

Deploy the same stable release bundle used by npm. Retain a known-good deployment for rollback. Local installations remain pinned; the stable MCP endpoint advances centrally and reports its current version on retrieval. Active conversations may retain older instructions and are not guaranteed to refresh automatically.

Keep the retrieval protocol small: list available IDs and retrieve one ID, including version and source commit in each response. Use the same content index generated for the local bundle, including linked references. Support retrieving the release selected at the beginning of a task so a deployment between calls cannot silently mix workflow versions. Initially retain the current and previous release; return a clear unavailable-version response for anything else rather than silently returning latest.

Gate: test actual tool discovery and retrieval with a protocol client, invalid IDs/versions, content/version parity and rollback. ChatGPT account connection testing is deferred and must not be claimed. A second MCP client is an optional compatibility check, required only if advertised as supported. Record account/host limitations without exposing credentials. No claim of coding or deployment execution from retrieval tests.

### 4. User handoff

Replace checkout-specific setup as the primary README path with the tested installer commands. Provide one short local example, the hosted endpoint, supported-host evidence, update/rollback steps and troubleshooting. ChatGPT connection instructions remain deferred until account compatibility is tested. Retain contributor/local-marketplace instructions separately.

Gate: from a clean supported environment, a user can install, invoke `factory`, identify its version, update, diagnose and roll back without editing paths manually. Run one small real task with the released artifact and record observed behavior; remaining factory scenarios stay not checked until exercised.

## Definition of shipped

- A tagged GitHub release and npm package contain matching verified workflow content.
- Supported local hosts pass installation and actual invocation checks from the distributed artifact.
- Updates preserve unrelated files and local edits, and rollback works.
- The hosted channel serves the same release and passes actual client checks, or is explicitly excluded from that release's advertised capabilities.
- README commands work, evidence and known gaps are recorded, and no full runtime acceptance is inferred from fixture results.

The user has authorized stages 1–4, including npm publication and Cloudflare deployment. Execute in this order; deferred ChatGPT account testing does not block the other shipping channels.

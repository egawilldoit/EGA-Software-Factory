# EGA Software Factory

Four agent skills for planning, implementing, verifying and reviewing one software outcome. The host supplies models, tools and permissions.

V1.0.1 is published on npm and GitHub, with read-only guidance live on Cloudflare. The workflow design is v4. See [release evidence](docs/v1-release-evidence.md) for tested hosts and remaining gaps.

## Install and use

Requires Node.js 22 or later. The installer targets the shared `~/.agents/skills` location used by Codex and OpenCode. Start a fresh host session after installation.

```sh
npx @egawilldoit/factory@1.0.1 install
npx @egawilldoit/factory@1.0.1 doctor
```

In Codex, use `$factory`. In T3/OpenCode, select `factory` in the skill menu or use `/skill:factory` where the client supports that command.

```text
Use factory to fix [one concrete bug]. Inspect existing work, make the smallest
useful change, verify the final behavior and review the diff. Stop at a local fix.
```

For an authorized rollout, specify the outcome, for example "get this scoped fix live." A PR-only request does not authorize merging. Actual project requirements and tool permissions still apply.

```sh
npx @egawilldoit/factory@latest update
npx @egawilldoit/factory@latest doctor
npx @egawilldoit/factory@latest rollback
npx @egawilldoit/factory@latest uninstall
```

Local installs remain pinned until updated. The installer preserves unrelated skills and refuses updates over local modifications. Rollback and uninstall save modified owned files under `.factory-preserved` before replacing or removing them. `doctor` distinguishes file integrity from real host discovery. If an existing project or plugin already supplies `factory`, choose one installation rather than loading duplicates. It does not silently take ownership of earlier manually copied skills.

## From an idea to an agent-ready issue

Ask `factory` to draft an issue. For example:

```text
Use factory to turn this into a self-contained implementation issue for
<repository>: <idea or bug>. Inspect current code and existing issues, record
what is observed versus assumed, and draft only. Do not publish yet.
```

Factory drafts by default and makes no external writes. A clear bug becomes one issue without an interview; an ambiguous idea surfaces only material decisions, with a recommendation that is not treated as approval. It checks for existing work, distinguishes reported from reproduced behavior, and reports specification readiness, dependency blocking and publication state separately. An already-implemented request is reported with evidence instead of duplicated.

An explicit request such as "publish that draft to `<repository>`" creates only the requested issues and necessary dependency references, verifies the resulting links, and reports any partial failure without duplicating issues. Publication ends planning and starts no coding. A later implementation session can use:

```text
Use factory to implement <issue URL>. Read its body, comments and current
repository instructions. Recheck current behavior and dependencies, then work
to the delivery boundary I specify for this implementation task.
```

The portable contract is `templates/implementation-issue.md`; detailed guidance is `references/issue-drafting.md`. In the release that includes this change, the read-only MCP channel serves them as `reference:issue-drafting` and `template:implementation-issue`. A pinned older release that predates them still serves its old IDs; requesting the new IDs at that version returns `ID_NOT_IN_RELEASE` rather than current content.

## Hosted guidance

The Cloudflare MCP channel supplies public released instructions only. It cannot access your repositories, execute work or change production. Its stable URL advances on a stable tagged release. Start by reading the version, then include that version in subsequent retrieval calls to avoid mixing releases.

ChatGPT custom MCP connection testing is deferred. No ChatGPT compatibility is claimed yet. The live endpoint is `https://ega-software-factory.a2003-2015.workers.dev/mcp`. Tool discovery, current/previous retrieval and content parity passed with the official MCP SDK.

## Release and contributor setup

Canonical content lives in `skills/`, `references/` and `templates/`. The npm installer and Worker use the same versioned bundle. Releases come from stable `vX.Y.Z` tags, not every merge. See the [shipping plan](docs/v1-shipping-plan.md).

For checkout-specific Codex marketplace install, refresh and rollback, see [local marketplace instructions](docs/local-marketplace.md). The repo's `.opencode/opencode.json` registers source skills for contributors; that is separate from a portable installation.

Linux is the initial verification target; Windows and macOS remain unverified. T3 menu behavior depends on the client; skill-tool discovery and UI keypress testing are separate checks.

Only fixture tooling needs `jq` or Python with PyYAML. The installer has no runtime dependencies beyond Node. Web specialist tools remain optional and are not bundled.

## Skills

- factory: establish context, scope, risk, capabilities, authorized stopping point; route proportionately.
- factory-plan: scoped plan with acceptance criteria, slices, verification.
- factory-verify: evidence table and separate final review; same-agent review labeled same-agent.
- factory-improve: testable improvement proposal from selected evidence, or none justified.

Skill names match directories and YAML frontmatter per Agent Skills spec.

## Compatibility and fallbacks

The factory directs agents to check candidate skills for purpose, dependencies, side effects, stopping point, host and version before use (references/skill-compatibility.md), and use a fallback when incompatible. Modern Web Guidance is an optional external source, not bundled (references/web-guidance.md). UI SDK is not a factory dependency.

## Permission boundaries

Plugin is guidance; does not enforce OS sandbox, network, permissions, CI. Deliver at exact authorized boundary only: local, review, pr, merge, deploy (references/risk-and-delivery.md). Read-only/local tasks zero external writes. PR creation does not authorize merge; merge alone does not authorize deploy. Merge/deploy follow the requested outcome's authorization, applicable project rules and actual automatic effects; a "get it live" outcome covers necessary merge/deploy, while a PR-only request does not, and a no-merge/full-stop request never merges (references/pr-workflows.md). Permission is separate from readiness: concrete migration dependencies or data-loss risks still matter. Passing check does not make destructive operation reversible. Unrelated work preserved.

## Opt-in task summaries (privacy)

Off by default. Enable for one task or once per project in existing project instructions; agents then write one local report at completion or blocked handoff. See [task reporting](references/task-summary.md) for the setting and later review prompt.

- Default location: ${XDG_DATA_HOME:-$HOME/.local/share}/ega-factory/summaries/<UTC-timestamp>-<short-task>-<unique-suffix>.yaml. The user's authorized destination and write boundary take precedence.
- Dir mode 0700, file mode 0600.
- New reports use schema_version: 2; schema 1 remains supported. Includes context, task/thread/PR links, individual check results, review independence, separate merge/deploy/live evidence, blockers and rework.
- Unknown duration/cost is null/unknown, never 0 or estimate.
- No default upload, background service, transcript collection, or cross-machine sync; local recording performs no network access.
- Do not store credentials, full prompts, private diffs, unrelated transcripts.
- Retention: persists until user deletes. Other copies or backups may exist.
- Template: templates/task-summary.yaml. Validation: tests/scenarios/summary/validate-summary.sh.

Synthetic scenario evidence (historical 2026-11-15 run, Linux VM openclaw, bash): 12/12 passed at that time. Filesystem-level checks, not host telemetry tests. The current verified count is 20/20 (see Verification status).

## Workflow verification status

- v1.1.0 candidate (prepared, not published): 19/19 installer, 20/20 summary, 55/55 delivery (mock host) and 29/29 Worker checks passed; adapter also tested against the actual published v1.0.1 package (pinned new IDs return `ID_NOT_IN_RELEASE`). No v1.1.0 npm/GitHub/Cloudflare release yet.
- Synthetic summary scenarios: 20/20 passed (2026-11-16; python3 + PyYAML).
- Delivery-boundary scenarios vs mock host: 55/55 checks passed (S1-S9 plus added report/escaping/unwritable-report coverage). All external ops were MOCKS; no real provider push/PR/merge/CI/deploy or real automatic deployment exercised (fixtures/t10/README.md).
- Manifests parse as valid JSON; skill names match directories.
- Refresh/rollback evidence: one local-host run, Codex CLI 0.169.0, 0.1.0 <-> 0.2.0, fresh-session invocation recorded (references/synchronization.md).
- Web-specialist routing, component/accessibility, browser verification not exercised as real user flow (references/web-guidance.md).
- No project-specific verification recipe exists yet (spec section 8).
- Pilot (T13): scoped real-task pilot observed in this repo for T3 skill discovery and docs (2026-11-16; see `docs/pilot-t3-skill-discovery.md`). Full integrated runtime behavior and the rest of T12 remain unverified.
- A summary destination test initially wrote outside its authorized boundary; a single retest passed after guidance was changed, using a reconstructed prompt. Host sandbox and network telemetry remain unverified.
- Git-marketplace upgrade behavior not exercised.

## Limitations

- Untested platforms remain unverified.
- Same-agent review is not independent; label same-agent.
- Static checks and mock hosts are not proof of real provider/browser behavior.
- No automatic telemetry, dashboard, remote executor or cross-machine summary sync is included.

## Provenance and adaptation

PR/takeover/review guidance is adapted selectively from the tstack skills by
Theo Browne (MIT License, Copyright (c) 2026 Theo Browne), pinned upstream
revision `11e37a74d0a6868c121cd0910ab2b3bd9873b92a` (commits touching
`skills/`, 2026-11-11): `takeover`, `modernize`, `file-pr`, `babysit-pr`,
`full-send`, `full-stop`, `council`, `sol-loop`. This is idea-level adaptation,
not a vendored copy; the factory keeps four skills and focused references.
Per-source provenance is recorded in
`references/takeover-and-modernize.md` and `references/pr-workflows.md`.
This adaptation deliberately keeps full-send/full-stop and council
**out** of automatic routing: merge/deploy and multi-reviewer rounds require
the user's stated outcome, and no universal approval gate is added.

Issue-drafting methods are adapted in original wording from Matt Pocock skills (MIT License, Copyright (c) 2026 Matt Pocock), upstream revision `5863806dd4e15c63174bee4e7515a4256792ecfa`: grilling via grill-me, triage agent briefs, to-spec and to-tickets. No substantial upstream text is copied. Automatic publishing, labels, commits, approval loops, exhaustive interviews, mandatory ticket fan-out and subagent delegation are deliberately not inherited. See `references/issue-drafting.md`.

## Acceptance scenarios

- `docs/authorization-and-completion-scenarios.md` — designed agent-behavior scenarios (authorization, instruction changes, merge-triggered deploy, green checks plus optional coverage, missing migration dependencies, superseded work). Status: designed, not executed.
- `docs/v4-acceptance-status.md` — runtime acceptance and pilot status; records what is observed versus unverified.

## References

references/workflow.md, references/planning.md, references/verification-and-review.md, references/risk-and-delivery.md, references/pr-workflows.md, references/takeover-and-modernize.md, references/web-guidance.md, references/task-summary.md, references/improvement-and-metrics.md, references/skill-compatibility.md, references/synchronization.md, EGA-SOFTWARE-FACTORY-V4-SPEC.md, tests/scenarios/summary/, fixtures/t10/, docs/.

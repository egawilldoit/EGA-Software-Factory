# EGA Software Factory

Small Codex plugin that routes software work to proportional planning, verification, review, and improvement workflows. Ships four thin skills: factory, factory-plan, factory-verify, factory-improve.

Status: v4 candidate. Real Codex host install/refresh/rollback observed on one Linux host (openclaw, Codex CLI 0.169.0, 2026-11-15) via a local marketplace. A scoped real-task pilot was run in this repo for T3 skill discovery and docs (2026-11-16; see `docs/pilot-t3-skill-discovery.md`). Full end-to-end readiness is not claimed.

## Supported host (tested)

- Host: openclaw (Linux), user ubuntu.
- Client: Codex CLI 0.169.0.
- Observed: 2026-11-15.
- Install/refresh/rollback exercised via a local marketplace source.

Untested/unverified: Windows, other VMs, ChatGPT web, Claude Code, IDE extensions, Git-backed remote marketplaces (codex plugin marketplace upgrade).

## Prerequisites

- Codex CLI 0.169.0 or compatible.
- Local checkout of this repository.
- Git.
- `jq` — required only by the T10 delivery fixture for JSON report serialization (`fixtures/t10/delivery.sh`); the plugin itself does not require it.
- `python3` with PyYAML (`import yaml`) — required only by the opt-in summary validator (`tests/scenarios/summary/validate-summary.sh`); it fails closed with `YAML parser unavailable` if PyYAML is absent. The destination checks use the Python standard library.
- Optional for web-specialist routing: Node.js >= 22 and Modern Web Guidance CLI (references/web-guidance.md).

Plugin performs no network access of its own.

## Install (tested path: local marketplace)

```sh
codex plugin marketplace add /path/to/EGA-Software-Factory
codex plugin add ega-software-factory@ega-software-factory
codex plugin list
```

Expected: plugin name ega-software-factory, version 0.1.0, cache under ~/.codex/plugins/cache/ega-software-factory/ega-software-factory/0.1.0/.

Notes: Git-backed marketplace install/upgrade not exercised (unverified). Adding same marketplace name from a different path requires removing it first. Plugin must be installed before invoking skills.

## Invoke

In a fresh Codex session:

```text
$factory
```

Also exposes $factory-plan, $factory-verify, $factory-improve. The instructions direct the agent to preserve read-only boundaries; the host enforces actual permissions.

### Use in T3 / OpenCode

The four skills are registered from this repo's `.opencode/opencode.json`, so no
global install is needed. Open the repo in T3 and type `/skill:factory` (or pick
**factory** from the skill menu); the other three load as `/skill:factory-plan`,
`/skill:factory-verify`, and `/skill:factory-improve`. T3 reloads project config
on save; run `/reload` in a fresh session if a skill is not listed yet.

Example:

```text
/skill:factory
Assess this repo and route a small documentation fix; keep it read-only.
```

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

Off by default. Written only on explicit user request.

- Default location: ${XDG_DATA_HOME:-$HOME/.local/share}/ega-factory/summaries/<date>-<short-task>.yaml. The user's authorized destination and write boundary take precedence.
- Dir mode 0700, file mode 0600.
- schema_version: 1; fields: factory version, project, task, base, final revision, worktree state, environment, outcome, verification, review, duration, cost, lesson.
- Unknown duration/cost is null/unknown, never 0 or estimate.
- No default upload, background service, automatic collection, or cross-machine sync in v1; recording performs no network access.
- Do not store credentials, full prompts, private diffs, unrelated transcripts.
- Retention: persists until user deletes. Other copies or backups may exist.
- Template: templates/task-summary.yaml. Validation: tests/scenarios/summary/validate-summary.sh.

Synthetic scenario evidence (historical 2026-11-15 run, Linux VM openclaw, bash): 12/12 passed at that time. Filesystem-level checks, not host telemetry tests. The current verified count is 19/19 (see Verification status).

## Refresh and rollback

Source of truth: marketplace source dir or repo revision. Installed copy: ~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/. Version in .codex-plugin/plugin.json.

Refresh (local marketplace; observed):
1. codex plugin marketplace add /path/to/marketplace-vA --json
2. codex plugin add ega-software-factory@ega-software-factory --json  (observed 0.1.0)
3. Update same marketplace source to version B.
4. codex plugin add ega-software-factory@ega-software-factory --json  (observed 0.2.0, old cache removed)
5. Start fresh Codex session and invoke $factory.

Notes: codex plugin marketplace upgrade applies to Git marketplaces; local refresh by re-running add. No automatic instant sync; reinstall + fresh session required. Plugin updates are not task-summary sync.

Rollback:
1. Restore marketplace source to known-good (or remove/re-add pointing to preserved source).
2. codex plugin add ega-software-factory@ega-software-factory --json (observed returns to 0.1.0, newer cache removed).

Alternative full remove/reinstall:
```sh
codex plugin remove ega-software-factory@ega-software-factory --json
codex plugin marketplace remove ega-software-factory
# add preserved known-good marketplace, then install
```
Rollback requires preserved known-good source; Codex does not keep multiple versions in cache.

## Verification status (honest)

- Synthetic summary scenarios: 19/19 passed (2026-11-16; python3 + PyYAML).
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
- No automatic telemetry, dashboard, cross-machine sync, or hosted service exists or is claimed.

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

## Acceptance scenarios

- `docs/authorization-and-completion-scenarios.md` — designed agent-behavior scenarios (authorization, instruction changes, merge-triggered deploy, green checks plus optional coverage, missing migration dependencies, superseded work). Status: designed, not executed.
- `docs/v4-acceptance-status.md` — runtime acceptance and pilot status; records what is observed versus unverified.

## References

references/workflow.md, references/planning.md, references/verification-and-review.md, references/risk-and-delivery.md, references/pr-workflows.md, references/takeover-and-modernize.md, references/web-guidance.md, references/task-summary.md, references/improvement-and-metrics.md, references/skill-compatibility.md, references/synchronization.md, EGA-SOFTWARE-FACTORY-V4-SPEC.md, tests/scenarios/summary/, fixtures/t10/, docs/.

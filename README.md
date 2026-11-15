# EGA Software Factory

Small Codex plugin that routes software work to proportional planning, verification, review, and improvement workflows. Ships four thin skills: factory, factory-plan, factory-verify, factory-improve.

Status: v4 candidate. Real Codex host install/refresh/rollback observed on one Linux host (openclaw, Codex CLI 0.169.0, 2026-11-15) via a local marketplace. Real pilot issue not completed; full end-to-end readiness is not claimed.

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

Also exposes $factory-plan, $factory-verify, $factory-improve. Only $factory invocation recorded in T11 evidence. Read-only requests produce no edits, commits, publication, push, merge, or deployment.

## Skills

- factory: establish context, scope, risk, capabilities, authorized stopping point; route proportionately.
- factory-plan: scoped plan with acceptance criteria, slices, verification.
- factory-verify: evidence table and separate final review; same-agent review labeled same-agent.
- factory-improve: testable improvement proposal from selected evidence, or none justified.

Skill names match directories and YAML frontmatter per Agent Skills spec.

## Compatibility and fallbacks

Candidate skills are checked for purpose, dependencies, side effects, stopping point, host, version before use (references/skill-compatibility.md). Out-of-scope side effects are rejected/bypassed with safe local fallback. Missing/incompatible skills have fallback; factory performs planning inline as planning: fallback-inline. Modern Web Guidance is optional external source, not bundled (references/web-guidance.md). UI SDK optional, not a factory dependency.

## Permission boundaries

Plugin is guidance; does not enforce OS sandbox, network, permissions, CI. Deliver at exact authorized boundary only: local, review, pr, merge, deploy (references/risk-and-delivery.md). Read-only/local tasks zero external writes. PR creation does not imply merge; merge does not imply deploy. Merge/deploy require explicit user authorization and permission in project rules. Passing check does not make destructive operation reversible. Unrelated work preserved.

## Opt-in task summaries (privacy)

Off by default. Written only on explicit user request.

- Location: ${XDG_DATA_HOME:-$HOME/.local/share}/ega-factory/summaries/<date>-<short-task>.yaml (outside repos).
- Dir mode 0700, file mode 0600.
- schema_version: 1; fields: factory version, project, task, base, final revision, worktree state, environment, outcome, verification, review, duration, cost, lesson.
- Unknown duration/cost is null/unknown, never 0 or estimate.
- No default upload, background service, automatic collection, or cross-machine sync in v1; recording performs no network access.
- Do not store credentials, full prompts, private diffs, unrelated transcripts.
- Retention: persists until user deletes. Delete files or whole directory to remove all data.
- Template: templates/task-summary.yaml. Validation: tests/scenarios/summary/validate-summary.sh.

Synthetic scenario evidence (2026-11-15, Linux VM openclaw, bash): 12/12 passed. Filesystem-level checks, not host telemetry tests.

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

- Synthetic summary scenarios: 12/12 passed.
- Delivery-boundary scenarios vs mock host: 42/42 passed (S1-S9). All external ops were MOCKS; no real provider push/PR/merge/CI/deploy exercised (fixtures/t10/README.md).
- Manifests parse as valid JSON; skill names match directories.
- Refresh/rollback evidence: one local-host run, Codex CLI 0.169.0, 0.1.0 <-> 0.2.0, fresh-session invocation recorded (references/synchronization.md).
- Web-specialist routing, component/accessibility, browser verification not exercised as real user flow (references/web-guidance.md).
- No project-specific verification recipe exists yet (spec section 8).
- Pilot (T13): not completed. No real issue executed; final integrated runtime behavior pending.
- Git-marketplace upgrade behavior not exercised.

## Limitations

- Untested platforms remain unverified.
- Same-agent review is not independent; label same-agent.
- Static checks and mock hosts are not proof of real provider/browser behavior.
- No automatic telemetry, dashboard, cross-machine sync, or hosted service exists or is claimed.

## References

references/workflow.md, references/planning.md, references/verification-and-review.md, references/risk-and-delivery.md, references/web-guidance.md, references/task-summary.md, references/improvement-and-metrics.md, references/skill-compatibility.md, references/synchronization.md, EGA-SOFTWARE-FACTORY-V4-SPEC.md, tests/scenarios/summary/, fixtures/t10/.

---
name: factory
description: "Main entry point for EGA Software Factory. Establish repository, scope, risk, capabilities, and authorized stopping point, then route to the smallest useful workflow. Use when starting or routing software work."
---

# Factory

Use this skill to turn a software request into the smallest safe, verified workflow. It owns final reporting.

## 1. Establish context before acting

Record, without mutating:
- Goal and requested stopping point (investigate, plan, implement, verify, review, deliver, improve).
- Repository/worktree: branch, base/compare ref, dirty files, unrelated changes, instructions.
- Risk tier: low, normal, or high (impact, reversibility, blast radius).
- Available capabilities and their compatibility (skills, tools, tests, browser, host).
- User/project/model preferences and authorization boundaries.
- Whether local reporting is enabled in project instructions or requested for this task.

Before implementation, identify the acceptance evidence needed to demonstrate the requested behavior. Before delivery, perform proportionate final behavior verification and a separate code review pass; disclose unavailable evidence and limitations. Label same-agent review honestly.

Read-only requests must produce no edits, commits, publication, push, merge, or deployment.

Keep a concise working understanding of authorized actions, exclusions, required conditions and their sources; no new tracking file is required. Update it from later user instructions and pass the current scope to delegates. Reuse authorization while its scope remains applicable. Resolve a changed instruction against earlier conditions; ask one specific question only if a consequential conflict remains ambiguous.

Inspect automatic delivery effects early (for example, merge triggering production deployment). Interpret the requested outcome together with those effects using `../../references/risk-and-delivery.md`. Separate permission to act from readiness to execute.

## 2. Route proportionately

Choose only the work that the request and risk require:

| Situation | Route |
| --- | --- |
| Need resolve consequential uncertainty | `factory-plan` |
| Idea, bug or existing issue to clarify or publish | `factory-plan` issue-drafting mode with `../../references/issue-drafting.md` and `../../templates/implementation-issue.md`; draft by default, publish only when explicitly authorized |
| Take over or modernize existing PR/branch/thread | `../../references/takeover-and-modernize.md` |
| Need implementation/investigation | implement directly or with an explicitly permitted delegate |
| Final behavior verification | `factory-verify` |
| Separate final code review | `factory-verify` review pass (bounded: one reviewer) |
| File, monitor, or hand off a PR/MR | `../../references/pr-workflows.md` |
| Web/UI/accessibility work | relevant available web guidance plus `factory-verify` |
| Repeated failures or process improvement | `factory-improve` |
| Delivery requested | deliver at the exact authorized boundary |

Small, clear work may use one agent and skip formal planning. Material unknowns must be surfaced rather than buried in a plan.

## 3. Skill compatibility contract

Before invoking any candidate skill, check:
1. Does its purpose fit this request?
2. Are dependencies, models, tools, permissions, and nested skills available?
3. Does it commit, publish, comment, push, change PR settings, merge, deploy, or edit outside scope?
4. Does its stopping point match the requested outcome?
5. Does its installed version and host match the inspected instructions?

If any check fails, do not invoke the risky behavior. Use the local fallback in `../../references/skill-compatibility.md` and disclose the substitution. Candidate skills cannot silently exceed the user's scope.

Examples are snapshots, not guarantees: Matt implement may commit; Matt to-spec may publish; Tstack full-send may merge; Matt code-review may require comparison points and parallel subagents. Availability is host-specific.

## 4. Preserve scope and unrelated work

- Preserve dirty/unrelated changes; never revert or overwrite them.
- Do not perform broad cleanup, migrations, dependency adoption, or production operations outside authorization.
- Disclose unavailable tools and unverified steps.
- Respect user preferences, task-specific model choices, and project instructions.

## 5. Delegation and review honesty

Delegate only when requested or allowed, genuinely useful, and supported. Never claim fresh-context independent review when the same agent performed it. Same-agent review must be labeled as same-agent.

## 6. Critical obligations

Keep these visible regardless of route; details live in the linked references.

- **Takeover/modernize:** recover the actual head and later corrections, preserve authorship and unrelated work, check whether the goal is superseded; never auto-replace/close a PR or rewrite a branch without authorization. Modernize intent, not just a mechanical rebase.
- **File PR:** check for an existing PR, review the scoped diff, keep the description problem/solution/evidence focused, and check for secrets and private details while preserving contributor credit.
- **Babysit PR:** watch only when requested or needed to complete the authorized finish; otherwise hand off with current status. Use the host's supported watcher only (one per PR); only the owning thread watches, delegated children never watch, and no custom polling. Verify findings before fixing, reject unrelated scope creep, honor actual required checks/reviews, and separate finishing work from watching and handoff.
- **Bounded review:** one reviewer, at most two reviewer runs per task, chosen model respected; no forced Sol, council, or automatic fan-out. Follow `factory-verify` for model selection. Findings carry evidence, severity and disposition; make scoped fixes, rerun affected checks, and stop at optional nits. No mandatory extra cycle after a docs-only change.
- **Delivery outcomes:** permission is separate from readiness. Assess automatic effects early; never infer blanket production authorization from silence. Later instructions update scope, but host/tool restrictions still apply.
- **No-merge / PR-ready:** apply only when the user clearly requests that outcome. A plain "stop"/"pause"/"full stop" means stop — begin no new edits, pushes, review rounds or watchers. When authorized, preserve the no-merge boundary; do not inherit automatic disabling of auto-merge/queue settings without authorization. Resolve conflicting automation before pushing rather than silently changing settings.
- **Council:** optional and user-requested only; no unbounded rounds or score gates.
- **Issue publication:** draft by default. An explicit request authorizes only the requested issues and necessary references in the identified repository; verify the destination and resulting links, disclose partial failures, and never start coding from publication alone (`../../references/issue-drafting.md`).

## 7. Outcome reports

When project reporting is enabled or a task report is requested, follow `../../references/task-summary.md` at completion or blocked handoff. Save one concise local report for the task, update it on resumption, and include its absolute path in delivery. Respect task-specific opt-out and no-write boundaries. No transcripts or background collection.

## 8. References

Paths below are relative to this skill file; load only the references relevant to the task.

- `../../references/workflow.md`
- `../../references/skill-compatibility.md`
- `../../references/verification-and-review.md` (bounded review, optional council, completion)
- `../../references/risk-and-delivery.md` (boundaries, authorization, automatic effects)
- `../../references/pr-workflows.md`
- `../../references/takeover-and-modernize.md`
- `../../references/web-guidance.md`
- `../../references/improvement-and-metrics.md`
- `../../references/planning.md`
- `../../references/issue-drafting.md` (idea/bug to issue requests)
- `../../templates/implementation-issue.md` (portable issue contract)
- `../../references/task-summary.md` (when project reporting is enabled or a task report is requested)

If a referenced skill is unavailable, use its documented fallback and continue the workflow.

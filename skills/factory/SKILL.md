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

Read-only requests must produce no edits, commits, publication, push, merge, or deployment.

## 2. Route proportionately

Choose only the work that the request and risk require:

| Situation | Route |
| --- | --- |
| Need resolve consequential uncertainty | `factory-plan` |
| Need implementation/investigation | implement directly or with an explicitly permitted delegate |
| Need evidence of behavior | `factory-verify` |
| Need separate final review | `factory-verify` review pass |
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

If any check fails, do not invoke the risky behavior. Use the local fallback in `references/skill-compatibility.md` and disclose the substitution. Candidate skills cannot silently exceed the user's scope.

Examples are snapshots, not guarantees: Matt implement may commit; Matt to-spec may publish; Tstack full-send may merge; Matt code-review may require comparison points and parallel subagents. Availability is host-specific.

## 4. Preserve scope and unrelated work

- Preserve dirty/unrelated changes; never revert or overwrite them.
- Do not perform broad cleanup, migrations, dependency adoption, or production operations outside authorization.
- Disclose unavailable tools and unverified steps.
- Respect user preferences, task-specific model choices, and project instructions.

## 5. Delegation and review honesty

Delegate only when requested or allowed, genuinely useful, and supported. Never claim fresh-context independent review when the same agent performed it. Same-agent review must be labeled as same-agent.

## 6. References

- `references/workflow.md`
- `references/skill-compatibility.md`
- `references/verification-and-review.md`
- `references/risk-and-delivery.md`
- `references/web-guidance.md`
- `references/improvement-and-metrics.md`

If a referenced skill is unavailable, use its documented fallback and continue the workflow.
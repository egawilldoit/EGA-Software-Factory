---
name: factory-verify
description: "Establish evidence for a change: essential checks, behavior verification, and a separate final review with honest independence. Use before delivery or when verification is requested."
---

# Factory Verify

Define and record evidence for the final scoped change. Verification produces an evidence table; review is a separate pass. Same-agent review is never independent.

## Interface

Input: final diff/scope, base/ref, working-tree state, risk tier, environment, and requested readiness boundary.

Output evidence table with, for each essential criterion:
- Status: `passed`, `failed`, or `not checked`.
- Evidence: observed command, output, artifact, or reason.
- Environment and scoped revision/worktree state.
- Readiness impact.

Also output:
- Behavior verification notes (real user flow when feasible).
- Review findings and independence disclosure (`same-agent` when the same agent performs both).
- Missing evidence and whether it blocks readiness.

## Essential checks

Choose checks proportional to the change and risk tier. Every essential criterion must have a status; do not leave blank.

| Area | What to check | When relevant |
|------|--------------|---------------|
| Logic | Focused meaningful tests; type/lint/build checks | Any code or skill change |
| UI | Real user flow; keyboard, focus, responsive behavior, accessible names, reduced motion | Web/UI/accessibility change |
| APIs | Representative endpoint and failure behavior | API-facing change |
| Data/auth | Invariants, permissions, migration behavior in an authorized environment | Data/auth/migration change |
| Performance | Comparable baseline and after measurements in same environment | Performance-sensitive change |
| Docs | Links and examples appropriate to the change | Doc/user-facing change |

Per criterion, record one of:
- `passed`: observed evidence, command or artifact, target environment, scoped revision.
- `failed`: observed failure and impact.
- `not checked`: exact reason and impact on delivery/readiness.

## Rules

- Build/CI alone is not proof of user behavior.
- Evidence must correspond to the final scoped diff, including uncommitted (dirty) state.
- After meaningful review fixes, rebase/conflict resolution, or other invalidating changes, repeat affected checks.
- Same-agent review is not independent; label it `same-agent`.
- If an essential check is unavailable, mark it `not checked` with exact reason and readiness impact.
- Do not claim full verification when mandatory evidence is missing.
- If `factory-verify` is unavailable, `factory` performs a minimal evidence pass and labels it `verification: fallback-inline`.

## Completion

Once scoped checks and final review pass, proceed to the authorized delivery boundary. Additional tests or reviews need a concrete finding, changed requirement or invalidated evidence. Distinguish required checks and concrete technical blockers from optional improvements; focus on resolving the actual blocker. See `../../references/verification-and-review.md` for completion and blocker handling.

## Review

Separately assess: requested behavior, omitted requirements, unintended changes, error handling, security, architecture, maintainability, and test coverage. Report limitations honestly. Disclose whether the reviewer is independent of the implementer. Green checks do not authorize production operations or make destructive actions reversible.

Keep the final review bounded: one reviewer, a respected user-chosen model, no forced Sol/council or automatic fan-out. Record findings with evidence, severity and disposition; make scoped fixes, rerun affected checks, and stop at optional nits. See `../../references/verification-and-review.md`.

## Scenario verification (T06)

When verifying this skill itself:

1. **Invalidated check:** Make a temporary edit to a checked file, confirm a previously `passed` check no longer passes, revert, and rerun to confirm it passes again. Record both observations.
2. **Unavailable browser:** If a UI/browser check cannot run, mark it `not checked` with reason (no browser / no network / host lacks display) and readiness impact; do not substitute a static scan.
3. Inspect actual outputs, not only the agent's narrative.

## Fallback

When this skill cannot be invoked, `factory` performs an inline evidence pass: record repo/branch/HEAD/dirty state, list essential criteria as `not checked` with reason "factory-verify unavailable", and label `verification: fallback-inline`.

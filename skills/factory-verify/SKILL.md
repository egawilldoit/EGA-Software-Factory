---
name: factory-verify
description: "Establish evidence for a change: essential checks, behavior verification, and a separate final review with honest independence. Use before delivery or when verification is requested."
---

# Factory Verify

Define and record evidence for the final scoped change.

## Interface

Input: final diff/scope, base/ref, working-tree state, risk tier, environment, and requested readiness boundary.

Output evidence table with, for each essential criterion:
- Status: passed, failed, or not checked.
- Evidence: observed command, output, artifact, or reason.
- Environment and scoped revision/worktree state.
- Readiness impact.

Also output:
- Behavior verification notes (real user flow when feasible).
- Review findings and independence disclosure.
- Missing evidence and whether it blocks readiness.

## Rules

- Build/CI alone is not proof of user behavior.
- Evidence must correspond to the final scoped diff, including uncommitted state.
- After meaningful review fixes, rebase/conflict resolution, or other invalidating changes, repeat affected checks.
- Same-agent review is not independent; label it `same-agent`.
- If an essential check is unavailable, mark it `not checked` with exact reason and readiness impact.
- Do not claim full verification when mandatory evidence is missing.
- If `factory-verify` is unavailable, `factory` performs a minimal evidence pass and labels it `verification: fallback-inline`.

## Review

Separately assess requested behavior, omitted requirements, unintended changes, error handling, security, architecture, maintainability, and test coverage. Report limitations honestly. Green checks do not authorize production operations or make destructive actions reversible.
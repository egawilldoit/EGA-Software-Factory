# Verification and Review

Evidence must correspond to the final scoped diff, base/ref, and working-tree state (including uncommitted/dirty changes). A commit SHA alone does not describe uncommitted modifications.

## Evidence table

For each essential criterion report `passed`, `failed`, or `not checked` with command/output/artifact and readiness impact:

| Column | Meaning |
|--------|---------|
| Criterion | Essential check area (logic, UI, API, data/auth, performance, docs) |
| Status | `passed` / `failed` / `not checked` |
| Evidence | Observed command, output, artifact, or exact reason |
| Environment | Tested host, client, environment |
| Revision | Scoped base/final revision and worktree state |
| Readiness impact | What the status means for delivery |

## Check areas

- **Logic:** focused meaningful tests plus relevant type/lint/build checks.
- **UI:** real user flow, keyboard, focus, responsive behavior, accessible names, reduced motion.
- **APIs:** representative endpoint and failure behavior.
- **Data/auth:** invariants, permissions, migration behavior in an authorized environment.
- **Performance:** comparable baseline and after measurements in the same environment.
- **Docs:** links and examples appropriate to the change.

## Rules

- Build/CI alone is not represented as proof of user behavior.
- Repeat checks invalidated by later edits, rebase, or conflict resolution.
- If an essential check is unavailable, mark it `not checked` with exact reason and readiness impact.
- Missing essential evidence affects readiness; do not claim full verification when mandatory evidence is missing.
- Green checks do not authorize production operations or make deletion reversible.

## Separate review

Review separately from verification: requested behavior, omitted requirements, unintended changes, error handling, security, architecture, maintainability, and test coverage. Report limitations honestly and disclose review independence. Same-agent review is labeled `same-agent` and is not independent.

## T06 verification scenarios

- Test a previously passing check invalidated by a later edit; revert and confirm it passes again.
- Test an unavailable browser case: mark `not checked`, do not substitute a static scan.
- Inspect actual outputs, not only the agent's narrative.

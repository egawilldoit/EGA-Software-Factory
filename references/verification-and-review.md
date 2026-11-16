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

## Completion and blockers

Identify the essential checks for this scope and why they are needed. Separate user/project requirements and checks justified by concrete risks from optional improvements. Do not present every possible coverage gap as a blocker.

When relevant checks and final review pass and delivery is authorized, proceed to delivery. Expand testing or request another review only for a concrete finding, changed requirement, or evidence invalidated by changes. Rerun affected checks rather than restarting unrelated verification. Reuse evidence only while the relevant code and environment remain applicable.

If blocked, focus on resolving the blocker through permitted alternatives. Do not compensate with unrelated tests, cleanup or repeated delegation. Report the exact unmet condition, its source, consequence, attempted alternatives and the smallest external input needed. Missing evidence must remain visible even when it does not block the requested boundary; do not claim unobserved production success.

## Separate review

Review separately from verification: requested behavior, omitted requirements, unintended changes, error handling, security, architecture, maintainability, and test coverage. Report limitations honestly and disclose review independence. Same-agent review is labeled `same-agent` and is not independent.

## Bounded review

A final review is one focused reviewer pass, not a standing loop:

- Use **one** reviewer. Respect a user-chosen model; do not force a particular reviewer or model (for example Sol) and do not start a council, fan-out, or automatic extra reviewers unless explicitly requested.
- Scope the review to the final scoped diff; state intent and out-of-scope paths. If a delegate is used, keep it read-only and do not edit files while it reviews the same checkout.
- Record each finding with evidence and a stable id, severity (`blocker` / `should` / `nit`), and disposition (`fixed` / `disagree` / `declined` + reason). Verify severity yourself by credible impact, reachability and relevance to the goal, not the label it arrived with. Rarity or a location outside the diff lowers priority only when impact is genuinely small; it does not make a credible data-loss, auth-bypass or broken-caller defect optional. Example: a rare auth bypass reachable through an unusual but supported input stays at least a `should` even with no test for that path. Keep scope control by declining speculative or genuinely low-impact coverage with a written reason.
- Make the smallest fix for real, in-scope findings; prefer deleting or narrowing code. Verify each fix, rerun affected checks, and re-review the final diff. Disagree or decline with evidence, and list declined nits as follow-ups.
- Stop when agreed findings are fixed, no blocker or should remains, and no concern of your own is open. Stop at optional nits; declined nits and comment/doc/format-only fixes need no new cycle. An exhausted budget is not approval, and a docs-only change needs no mandatory extra review cycle.

## Optional council

A council (multiple models in parallel, scores, repeated rounds) runs only on
explicit user request. No automatic fan-out, unbounded rounds, or score gates.
If used, collect useful findings and disagreements, keep review work read-only,
act on concrete findings against the current diff, and stop when the user's
goal is met rather than continuing to chase perfect scores.

Agent-behavior scenarios for completion, blockers and scope are in
`../docs/authorization-and-completion-scenarios.md`; observed status is in
`../docs/v4-acceptance-status.md`.

## T06 verification scenarios

- Test a previously passing check invalidated by a later edit; revert and confirm it passes again.
- Test an unavailable browser case: mark `not checked`, do not substitute a static scan.
- Inspect actual outputs, not only the agent's narrative.

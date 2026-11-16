# Planning

factory-plan resolves consequential uncertainty into the smallest useful plan for the requested risk. It also drafts issues from ideas and bugs. Planning is not a universal approval gate and never creates issues, commits, branches, or other external writes by itself: issue drafting produces local text by default and publishes only when the user explicitly requests publication in an identified repository. See [issue-drafting.md](issue-drafting.md).

## Proportionality

Plan depth follows risk (impact, reversibility, blast radius), not changed-line count.

- Low (copy, simple docs, isolated cosmetic tweak): one or two sentences of scope plus the check that proves it. No formal slices.
- Normal (ordinary product change): concise plan with goal, boundaries, acceptance criteria, one or more slices, and verification.
- High (auth, RLS, secrets, billing, production data, migrations, architecture, public API, concurrency): detailed plan with invariants, failure cases, compatibility/migration notes, stronger checks, and review focus. Still avoid ceremony that does not reduce risk.

Read-only or investigative requests do not need an implementation plan; state findings and the next decision instead.

## Plan shape

Every plan includes, in this order:

1. Goal and non-goals.
2. Scope boundaries and preserved work.
3. Risk tier and rationale.
4. Invariants and failure cases.
5. Acceptance criteria.
6. Useful implementation slices.
7. Verification and review approach.
8. Open consequential questions.

## Invariants and failure cases

For high-risk work, name invariants as statements that must hold before and after the change, plus the failure modes that would violate them.

- Permission invariant: a user without role X cannot read or mutate resource Y, including through alternate paths.
- Data invariant: a migration leaves no orphaned rows and is reversible or explicitly irreversible with a documented rollback.
- Compatibility invariant: existing callers continue to work, or the break is versioned and communicated.

Failure cases should include at least one permission bypass, one malformed or missing input, one partial-failure or rollback case, and one compatibility or regression case when relevant.

## Acceptance criteria

- Write criteria as observable outcomes, not implementation steps.
- Tie each criterion to evidence that could prove it (test, command, user flow, artifact).
- Include negative criteria when risk warrants (for example, unauthorized request returns 403 and no data).
- Avoid criteria that only restates code structure.

## Useful slices

- A slice is independently verifiable and leaves the system in a working state.
- Prefer vertical slices (behavior end to end) over horizontal layers when both are possible.
- For high-risk work, put the invariant-checking or migration-safety slice before feature polish.
- Trivial fixes need no slice breakdown.

## Verification approach

- Choose checks from references/verification-and-review.md based on the change type (logic, UI, API, data/auth, performance, docs).
- State which checks are static (type, lint, build, unit tests) and which exercise real behavior (user flow, endpoint, browser, migration in an authorized environment).
- Static inspection alone is not proof of user behavior; mark it as such and say what real check is missing.
- If a required real-behavior check is unavailable, mark it not checked with reason and readiness impact rather than substituting a static check.

## Consequential questions

Ask only when the answer changes scope, risk, authorization, or an externally visible contract and cannot be inferred from repository evidence. Batch independent consequential questions and defer dependent ones; research factual answers instead of asking for them. Resolve routine choices autonomously and record the assumption. Never use planning as a way to defer an obvious decision.

## Side effects and external writes

- A plan or issue draft is a local artifact by default. It does not create tracker issues, commits, branches, PRs, comments, deployments, or configuration changes.
- An explicit issue-publication request authorizes only the requested issues and necessary dependency references in the identified repository. It does not authorize coding, closure of other issues, labels beyond existing project rules, commits, PRs or deployment. Publication ends planning.
- Honor read-only/no-write boundaries, including their precedence over standing outcome-report permission. A "draft" instruction never implies permission to write local files.
- If the user asks for delivery, hand off to the delivery workflow at the exact authorized boundary.
- Do not introduce a mandatory human approval step; the user's requested stopping point and authorization define when to proceed.
- Report partial publication honestly: keep created IDs, check for duplicates before retrying, and do not recreate the whole set or broaden permissions to repair a failure.

## Comparison: small fix vs high-impact change

Small fix (low risk): Fix typo in README install command.

- Plan: one sentence scope, one docs check (links/examples), no slices, no invariants.
- Static vs real: link check is static; no behavior to verify. Report not checked only if a behavior claim exists.

High-impact change (high risk): Add row-level security to project documents.

- Plan: invariants (no cross-tenant read/write, service role still works for migrations), failure cases (unauthenticated, wrong tenant, admin bypass attempt, partial migration), slices (migration + policy + tests + rollback), verification (policy tests in authorized DB, migration dry-run, compatibility check), review focus (bypass paths, policy gaps).
- Static vs real: type/lint are static; policy enforcement is real behavior and must be exercised in an authorized environment. If unavailable, mark not checked and block readiness.

## Fallback

If factory-plan cannot be invoked, factory performs this inline with the same output shape and labels the plan planning: fallback-inline.
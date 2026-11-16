---
name: factory-plan
description: "Resolve consequential uncertainty into a scoped plan, or turn an idea or bug into a self-contained, evidence-backed issue draft with authorized publication and handoff. Use when planning or issue drafting is justified."
---

# Factory Plan

Produce the smallest useful plan for the requested risk.

## Interface

Input: goal, context, constraints, risk tier, available evidence, and requested stopping point. For issue drafting: an idea, bug, screenshot, conversation or existing issue, plus the destination repository when known.

Output:
- Goal and non-goals.
- Scope boundaries and preserved unrelated work.
- Risk tier and invariants/failure cases for high-risk work.
- Acceptance criteria.
- Useful implementation slices.
- Verification and review approach.
- Open consequential questions only.
- For issue drafting: one self-contained issue draft or a justified set with real dependencies, plus specification readiness, dependency blocking and publication state.

## Modes

- **Planning** (default for implementation/verification requests): produce the smallest useful plan. Keep the existing output shape and boundaries.
- **Issue drafting** (idea, bug or existing issue to clarify or publish): follow `../../references/issue-drafting.md` and the portable `../../templates/implementation-issue.md`. Inspect relevant current behavior and existing work before drafting; draft by default and publish only within explicit authorization.

Choose the mode from the request, not from the amount of ceremony available. A clear bug is one issue without an interview; use the deeper steps only when material uncertainty warrants them.

## Rules

- Small tasks receive concise guidance; high-risk tasks identify invariants and failure cases.
- Resolve routine choices autonomously; ask only consequential questions that cannot be resolved from available evidence.
- Drafting produces local text only by default. Creating tracker issues or dependency references requires an explicit issue-publication request and is limited to the requested issues in the identified repository. Planning never creates commits, branches, PRs or deployments; publication starts no coding.
- Honor read-only/no-write boundaries, including precedence over standing report permission. Drafts contain no chats, private diffs, secrets or sensitive records.
- No universal human approval gate is introduced. Do not inherit automatic publishing, labels, commits, approval loops or delegates from adapted external methods.
- If `factory-plan` is unavailable, `factory` performs this inline with the same output shape.
- Planning depth follows risk (impact, reversibility, blast radius), not changed-line count.
- For high-risk work, state invariants and at least one permission, input, partial-failure, and compatibility failure case when relevant.
- Distinguish static checks from real-behavior checks; static inspection alone is not proof of user behavior.
- Acceptance criteria must be observable and tied to evidence, including negative criteria when risk warrants.
- Slices must leave the system working and be independently verifiable; omit them for trivial work.
- Ask only consequential questions; resolve routine choices autonomously and record assumptions.
- For takeover/ modernization work, resolve the actual head and later corrections first and check whether the goal is already superseded before planning a rebase; see `../../references/takeover-and-modernize.md`.
- In issue-drafting mode, record the inspected revision and distinguish facts, user decisions, recommendations and assumptions. Research factual answers; ask only consequential questions and batch independent ones.
- Default to one issue. Slice only for independently verifiable work with real blockers, and report specification readiness, dependency blocking and publication state separately.
- Verify destination and permissions before authorized publication; publish blockers first, verify links, disclose partial failures and never duplicate issues on retry. Publication ends planning and starts no coding.

## Fallback

When the skill cannot be invoked, return a compact plan with the same sections and mark `planning: fallback-inline`. For issue requests, return a compact draft with the same contract and mark `issue-drafting: fallback-inline`; no publication occurs in fallback.

## References

- `../../references/planning.md`
- `../../references/issue-drafting.md` (idea/bug to issue requests)
- `../../templates/implementation-issue.md` (portable issue contract)
- `../../references/risk-and-delivery.md`
- `../../references/verification-and-review.md`
- `../../references/takeover-and-modernize.md` (when planning takeover/modernize work)
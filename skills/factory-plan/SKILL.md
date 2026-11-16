---
name: factory-plan
description: "Resolve consequential uncertainty into a scoped plan: outcome, boundaries, risk, acceptance criteria, useful slices, and verification. Use when planning is justified."
---

# Factory Plan

Produce the smallest useful plan for the requested risk.

## Interface

Input: goal, context, constraints, risk tier, available evidence, and requested stopping point.

Output:
- Goal and non-goals.
- Scope boundaries and preserved unrelated work.
- Risk tier and invariants/failure cases for high-risk work.
- Acceptance criteria.
- Useful implementation slices.
- Verification and review approach.
- Open consequential questions only.

## Rules

- Small tasks receive concise guidance; high-risk tasks identify invariants and failure cases.
- Resolve routine choices autonomously; ask only consequential questions that cannot be resolved from available evidence.
- Local plans do not create issues, commits, branches, or other external writes.
- No universal human approval gate is introduced.
- If `factory-plan` is unavailable, `factory` performs this inline with the same output shape.
- Planning depth follows risk (impact, reversibility, blast radius), not changed-line count.
- For high-risk work, state invariants and at least one permission, input, partial-failure, and compatibility failure case when relevant.
- Distinguish static checks from real-behavior checks; static inspection alone is not proof of user behavior.
- Acceptance criteria must be observable and tied to evidence, including negative criteria when risk warrants.
- Slices must leave the system working and be independently verifiable; omit them for trivial work.
- Ask only consequential questions; resolve routine choices autonomously and record assumptions.
- For takeover/ modernization work, resolve the actual head and later corrections first and check whether the goal is already superseded before planning a rebase; see `../../references/takeover-and-modernize.md`.

## Fallback

When the skill cannot be invoked, return a compact plan with the same sections and mark `planning: fallback-inline`.

## References

- `../../references/planning.md`
- `../../references/risk-and-delivery.md`
- `../../references/verification-and-review.md`
- `../../references/takeover-and-modernize.md` (when planning takeover/modernize work)
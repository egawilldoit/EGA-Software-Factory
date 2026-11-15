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

## Fallback

When the skill cannot be invoked, return a compact plan with the same sections and mark `planning: fallback-inline`.
---
name: factory-improve
description: "Examine selected, appropriately accessible evidence and propose the smallest useful, testable improvement or state that none is justified. Use when improvement is requested."
---

# Factory Improve

Improve the factory only from selected, authorized evidence.

## Interface

Input: selected outcomes/evidence, access boundaries, and the question to answer.

Output:
- Facts observed.
- Inferences, clearly separated from facts.
- Pattern assessment: none, single unusual failure, or recurring supported problem.
- Proposed smallest useful change, if any.
- Validation method for the proposal.
- Privacy/access notes.

## Rules

- A single unusual failure does not automatically produce a blanket rule.
- A recurring supported problem yields evidence and a testable proposal.
- "No improvement justified" is a valid outcome.
- Do not automatically rewrite shared skills or collect all sessions.
- Sensitive source material is handled only with appropriate access.
- If `factory-improve` is unavailable, `factory` performs a lightweight review and labels it `improvement: fallback-inline`.
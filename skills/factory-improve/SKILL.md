---
name: factory-improve
description: "Examine selected, appropriately accessible evidence and propose the smallest useful, testable improvement or state that none is justified. Use when improvement is requested."
---

# Factory Improve

Improve the factory only from selected, authorized evidence. An improvement is a reviewable proposal, not an automatic change.

## Interface

Input: selected evidence explicitly chosen by the user or by a prior authorized step (outcome summaries, failing check logs, review notes, incident notes), the factory/plugin version and revision, access boundaries, and the question to answer.

Evidence is never collected automatically. Full session transcripts, prompts, secrets, and unrelated records are out of scope unless specifically authorized and necessary.

Output:
- Evidence inventory: source, date, revision, access basis, and gaps.
- Facts observed, each tied to a source.
- Inferences, clearly separated and labeled, with confidence and what would disconfirm them.
- Pattern assessment: `none` | `single unusual failure` | `recurring supported problem`.
- For a recurring problem: recurrence support (occurrences, distinct tasks/revisions/environments, shared root cause, counterexamples checked).
- For a justified problem: the smallest useful change, an intervention comparison, and a validation method.
- Privacy/access notes: what was read, what was excluded, and under what basis.
- An explicit statement of what is not being changed.

## Procedure

1. Confirm authorization: who selected the evidence, what may be read, and whether the outcome is a proposal only or an approved application. If unclear, narrow or stop and ask.
2. Inventory the evidence; record gaps and how they bound conclusions.
3. Separate facts from inferences. Point each fact to its source; mark unknowns as unknown.
4. Test for recurrence: count independent occurrences across distinct tasks and revisions, and check disconfirming cases and alternative causes (environment drift, project misconfiguration, stale plugin version, user preference). Recurrence means the same root cause, not any failure.
5. Decide:
   - No pattern or a single unusual failure: report `no improvement justified`. Optionally note a watch item; change no rule.
   - Recurring supported problem: compare intervention types (instruction/skill text, check/test, environment/tooling, architecture, process) and propose the smallest reversible change. Doing nothing remains an option when no intervention beats its cost.
6. Define validation before proposing application: expected effect, metric and denominator, baseline from the same evidence, scope and window, affected checks to rerun, and a revert trigger.
7. Report. Applying the proposal is a separate step requiring its own authorization.

## Rules

- A single unusual failure never becomes a blanket rule, an automatic guard, or a rewrite of a shared skill.
- `No improvement justified` is a complete, valid outcome; show the evidence for it.
- LLM judgment over transcripts is not proof; a proposal is a hypothesis until validated.
- Never automatically rewrite shared skills, merge rules, publish, or collect all sessions. Changes go through normal review and authorization.
- Handle sensitive source material only with appropriate access; prefer versioned, opt-in local summaries with null/unknown for missing metrics.
- Do not fabricate counts, costs, or success rates; unknown stays unknown.
- If `factory-improve` is unavailable, `factory` performs a lightweight review and labels it `improvement: fallback-inline`.

## Reference

See `references/improvement-and-metrics.md` for evidence selection, fact/inference separation, pattern classification, intervention comparison, validation, and the outcome-summary metrics model.

## Fallback

When the skill cannot be invoked, return the same output sections with the evidence at hand, label `improvement: fallback-inline`, and apply no change.

# Improvement and Metrics

`factory-improve` examines selected, appropriately accessible evidence, distinguishes facts from inferences, identifies recurring failures, compares interventions, and defines validation. It does not automatically rewrite shared skills or collect all sessions. An improvement is a reviewable proposal with a validation method, not an automatic change.

## Evidence selection

- Evidence must be selected by the user or a prior authorized step. Never bulk-collect sessions, transcripts, prompts, or telemetry.
- Acceptable sources: opt-in local outcome summaries, failing check logs, review notes the user points to, and incident reports.
- Record for each item: source, date, factory/plugin revision, and access basis. Gaps bound conclusions; unknown stays unknown.
- Sensitive material (secrets, full prompts, private diffs, unrelated records) is out of scope unless specifically authorized and necessary.

## Facts vs inferences

- A fact is directly observed: a command output, a diff, a summary field. Tie every fact to its source.
- An inference is an interpretation. Label it, state confidence, and name what would disconfirm it.
- LLM judgment over transcripts is not proof. A proposal is a hypothesis until it is validated on real evidence.

## Pattern classification

Classify before proposing anything:

- `none`: no shared root cause across the selected evidence. Outcome: no improvement justified; show the evidence.
- `single unusual failure`: one-off or unrelated causes. Outcome: no rule change; optionally a watch item. Never a blanket rule.
- `recurring supported problem`: multiple independent occurrences across distinct tasks and revisions with a shared root cause, with disconfirming cases and alternative causes checked (environment drift, project misconfiguration, stale plugin version, user preference). Outcome: a reviewable, testable proposal.

Recurrence means the same root cause, not any failure. There is deliberately no fixed count threshold; document the judgment and its limits instead. Absence of summaries means unknown, not "no failures".

## Intervention comparison

When a recurring problem is supported, compare before proposing and prefer the smallest, most reversible option:

| Intervention | Fits when | Cost / risk | Validation |
| --- | --- | --- | --- |
| Do nothing / monitor | Signal is weak or cost exceeds benefit | None now; failure persists | Watch next N summaries; re-assess |
| Instruction or skill text | Behavior gap, e.g. a skipped mandatory step | Low | Rerun affected checks on a fixture; fresh-session invocation |
| Check or test | Regression can be caught mechanically | Low–medium | Prove the check fails before and passes after |
| Environment or tooling | Drift, misconfiguration, missing pin | Medium | Reproduce in the fixed environment; compare |
| Architecture | Structural cause repeated across areas | High | Scoped design note plus staged rollout; rare for v1 |
| Process (human step) | Judgment cannot be mechanized | Low–medium | Audit a sample of runs for adherence |

## Validation

Define before applying, and treat an unvalidated proposal as a hypothesis:

- Expected effect and the metric with its denominator (rework rate, rerun count, escaped regressions).
- Baseline measured from the same selected evidence; scope and window.
- Which affected checks to rerun and on what fixture or branch.
- Revert trigger: regression or no measurable signal reverts the change.
- Record the result; a failed validation is evidence, not an error to hide.

## Outcome summaries and metrics

Outcome summaries are opt-in per task or once per project, local, and versioned (`schema_version`, `factory_version`, project, task, base, final revision, worktree state, environment, outcome, verification, review, duration, cost, lesson). See `task-summary.md` for the current schema, project setting and later review procedure. Reports distinguish check results, review independence, merge/deploy/live status, blockers and rework. Schema 1 remains readable; new reports use schema 2.

- Default location: outside the public repository; user-controlled access, retention, and deletion decided before enabling persistence.
- No default upload, background service, or automatic collection. Credentials, full prompts, private diffs, and unrelated transcripts are never stored by default.
- Missing duration or cost is `null`/`unknown`, never 0 and never a fabricated estimate. Do not infer dollar costs from subscription usage.
- Do not claim or build cross-machine synchronization in v1; no aggregation is meaningful without denominators and collection coverage.
- "No improvement justified" is a valid result, as is a summary whose `lesson` says so.

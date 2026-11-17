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

## Small controlled comparison

For material agent-behavior changes, use a small current-versus-proposed comparison when the expected benefit justifies it. Routine wording corrections do not require new agent runs. A few runs provide limited evidence, not a general effectiveness claim. Respect task authorization, available models and review limits; do not launch extra agents automatically.

1. Snapshot the canonical current guidance into a scratch directory outside the repository; keep the proposed version separate. Hold host, model, tools and surrounding instructions constant.
2. Choose two to four compact fixture tasks from the table below. Each names an input and objective criteria checkable from artifacts or an action log, not from the agent's narrative.
3. Run each task once against current and once against proposed guidance in fresh sessions with no shared context; do not reuse a session that saw the other version.
4. Grade each criterion as met/not met with cited evidence from observed outputs or logs. State clearly whether real agent behavior was observed or only static/mock checks: a designed or unrun task is a hypothesis, never behavior evidence.
5. Record the result in the existing outcome-summary mechanism (`task-summary.md` schema 2): snapshot revision, environment, criteria, `checks` and a `lesson`. No new schema, report type, platform, service or auto-collection.
6. Use the observed differences to decide whether to retain, revise or reject the proposal. If evidence is inconclusive or runs are unavailable, label effectiveness unverified rather than claiming improvement. Revert demonstrated regressions as in Validation.

Designed fixture tasks (not executed by this reference):

| Task | Input/setup | Evaluation criteria |
| --- | --- | --- |
| Bug | A reproducible failure with a misleading trace in a small repo. | Minimal reproduction; product vs environment vs fixture classified; root cause fixed rather than symptom; focused test fails before and passes after. |
| Needless dependency or abstraction | A small change that adds a dependency or wrapper where an existing helper already exists. | Existing code reused; no new dependency/abstraction; observable behavior preserved and verified; only touched code simplified; no unrelated cleanup. |
| Caller impact | An interface change with several callers and one failing path. | Relevant callers, contracts and failure paths identified from code evidence; concrete impact and reachability stated; scoped fix; no speculative scope expansion. |
| Fresh-agent issue handoff | An idea or bug plus a private conversation, asked for a self-contained issue draft. | Draft stands without the conversation; facts vs assumptions and reported vs reproduced distinguished; observable acceptance criteria and verification; specification, dependency and publication state stated; no publication without explicit request. |

Method provenance: selectively adapted baseline comparison and verifiable criteria from Anthropic's [skill-creator](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator), and behavior-preserving simplification from [code-simplifier](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/code-simplifier). Installed snapshots inspected on 2026-11-17: `skill-creator` snapshot SHA-256 `dcd4803e61e913e6fc27294184cd3a71f09f5e924ff20c8a9a20173e7b3c2bcf`; `code-simplifier` snapshot SHA-256 `2a51e8d210580d9f66ac2ed1226c41f9374565fc275da30d7bb95f65c2cc87bb`. Upstream commit identity was unavailable; hashes identify the inspected text. Methods are restated in Factory's wording; no substantial upstream text is copied. No automatic fan-out, commits, approval prompts, mandatory full-suite checks or new report schema are inherited.

## Outcome summaries and metrics

Outcome summaries are opt-in per task or once per project, local, and versioned (`schema_version`, `factory_version`, project, task, base, final revision, worktree state, environment, outcome, verification, review, duration, cost, lesson). See `task-summary.md` for the current schema, project setting and later review procedure. Reports distinguish check results, review independence, merge/deploy/live status, blockers and rework. Schema 1 remains readable; new reports use schema 2.

- Default location: outside the public repository; user-controlled access, retention, and deletion decided before enabling persistence.
- No default upload, background service, or automatic collection. Credentials, full prompts, private diffs, and unrelated transcripts are never stored by default.
- Missing duration or cost is `null`/`unknown`, never 0 and never a fabricated estimate. Do not infer dollar costs from subscription usage.
- Do not claim or build cross-machine synchronization in v1; no aggregation is meaningful without denominators and collection coverage.
- "No improvement justified" is a valid result, as is a summary whose `lesson` says so.

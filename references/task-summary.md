# Task Summary

Opt-in, local, per-task outcome reports. Default off. Enable for one task or once for a project; an agent writes the report during handoff, not through a background collector. No upload or transcript collection.

## Enable once per project

When the user enables project reporting, add this short setting to the project's existing AGENTS.md or equivalent persistent project instructions. Preserve unrelated instructions. This is standing authorization to write local reports, not permission to change delivery boundaries:

> Factory reporting: enabled for this project. At the end of each Factory task, or when handing off blocked work, save a local outcome report using the Factory task-summary reference. Report its absolute path. Do not store prompts, transcripts, secrets or private diffs.

Read this setting when establishing project context; do not ask again on every task. A later task-specific opt-out or read-only/no-write instruction takes precedence. Disable by removing the setting or marking it disabled; preserve existing reports unless deletion is requested. Without persistent project instructions, record only the current task rather than claiming future sessions are configured.

Record one report per task, not per agent, turn or test. The coordinating agent owns it. Use a UTC timestamp plus a short task identifier and collision-resistant suffix for new filenames. On resumption, update the known report for that same task; preserve earlier blockers and rework in their respective fields rather than silently erasing them. Never overwrite an unrelated report. Reporting failure is a handoff limitation, not a reason to claim the software delivery failed or to repeat deployment.

## Location (outside the public repo)

The user's explicit destination and permitted write boundary take precedence over any default. Before creating a directory or file, inspect the current `XDG_DATA_HOME` and `HOME`. A nonempty absolute `XDG_DATA_HOME` takes precedence over `HOME`; if it is unset or empty, use `HOME/.local/share`. Do not interpret a relative `XDG_DATA_HOME` or a missing `HOME` as a usable default. Resolve the destination and authorized boundary to absolute canonical paths, including existing symlinks, and check containment by path components, not a string prefix. Resolve and check again immediately before writing. If the path cannot be resolved or lies outside the authorized boundary, do not write there; use an explicitly authorized suitable location or ask for one. Never substitute the literal home-directory default when `XDG_DATA_HOME` is set. These instructions do not enforce filesystem isolation; host permissions and sandbox controls remain responsible for enforcement.

When no narrower destination or boundary applies, the default is `${XDG_DATA_HOME:-$HOME/.local/share}/ega-factory/summaries/<UTC-timestamp>-<short-task>-<unique-suffix>.yaml`.

One YAML file per task, based on `../templates/task-summary.yaml` relative to this reference. By default keep summaries outside project repositories and synced locations; if the user explicitly chooses a different location, respect their scope and privacy preferences. Create the directory with `0700` permissions and files with `0600`.

## Opt-in and opt-out

- Opt-in: explicit task request or the enabled project setting above. Unknown fields become `null`/`unknown`; do not invent evidence.
- Default/opt-out: write nothing, create no directory, and do not ask follow-up questions about cost or duration.
- A summary is not a commit, push, issue, or upload. Recording it performs no network access.

## Schema

New reports use `schema_version: 2`; existing schema 1 reports remain readable and valid. Use the portable template, and validate with `tests/scenarios/summary/validate-summary.sh` when working in the Factory source checkout. Installed guidance does not include that development validator; check the schema directly when it is unavailable.

Keep the existing context fields: `factory_version`, `project`, `task`, `base`, `final_revision`, `worktree_state`, `environment`, `outcome`, `verification`, `review`, `duration`, `cost`, optional `lesson`. Add:

- `recorded_at`: UTC ISO timestamp of the latest report update.
- `links`: `task`, `thread`, `pr`, each a URL or null. Strip credentials and secret-bearing query parameters; include only permitted identifiers.
- `checks`: list of `name`, `status`, `evidence`. Status is `passed | failed | skipped | not-checked`. Name the environment and revision in evidence, or explain why a check was skipped/not checked. Empty means no checks recorded, not all passed.
- `review_detail`: `independence` (`same-agent | independent | none | unknown`) and `evidence` (reviewer/model when known, findings and dispositions, or a gap).
- `delivery`: `merged`, `deployed`, `verified_live`, each `"yes" | "no" | "unknown"` (quote these YAML values), plus `evidence`. Merge alone proves neither deployment nor live behavior; an automatic deployment not inspected is unknown, not no.
- `blockers`: list of concise strings identifying current blockers, conditions and resolved blockers when useful. An empty list means none known in this task's scope.
- `rework`: list of concise strings describing confirmed failures, fixes and repeated effort with evidence links where available. Separate suspected causes from demonstrated causes. Do not paste logs or diffs.

`outcome` is `completed | ready-for-review | blocked | unknown`; it describes the authorized task boundary. A draft-PR task can be completed without merging. `worktree_state` is `clean | dirty | unknown`. The `verification` and `review` strings remain short readable summaries; structured fields carry individual results. Keep them consistent.

Unknown context uses `unknown`, links use null, and unmeasured duration/cost use null. Never infer dollar costs from subscription usage. A lesson is an observation or hypothesis, not an automatic new rule; "no improvement justified" is valid.

## Review saved work later

At handoff, include the report's absolute path so it can be found from the task thread. Reports stay in the directory above until explicitly removed.

Example request: "Use factory-improve to review the reports for EGA House from the last five tasks in my local Factory summaries directory. Identify recurring failures, cite the report filenames and evidence, and propose the smallest improvement. Do not change rules yet."

Select reports by project and date before reading them; do not load all transcripts. Include blocked and unsuccessful tasks, not only successes. Check source evidence for consequential conclusions: these reports are agent-written accounts, not independent proof. Missing reports mean unknown coverage. A review proposes changes; it does not silently rewrite the Factory.

## Privacy

Do not store credentials, full prompts, private diffs, unrelated transcripts, or secret-bearing keys. Omit sensitive data from `task` and other free-text fields. Summaries stay on the user's own machine.

## Retention and deletion

- Retention: files persist until the user deletes them. No automatic expiry, rotation, upload, or cross-machine sync is performed or claimed for v1.
- Deletion: delete individual files, or the whole `ega-factory/summaries/` directory if explicitly requested. Other copies, backups or caches may exist. If asked to delete, remove exactly what was identified and report what was removed.

## Limits

Agent-written reports at authorized handoff only. Host and provider telemetry behavior is not tested by this plugin; never present a recorded summary as host-collected data or as a measured cost. Cross-machine synchronization is out of scope for v1. Later aggregation (cycle time, verified outcomes, rework) is a follow-on feature, not a v1 behavior.

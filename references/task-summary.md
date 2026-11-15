# Task Summary

Opt-in, local, per-task outcome summaries. Default off: nothing is written unless the user explicitly asks to record a summary. No upload, background service, or automatic collection exists in v1; recording is manual work performed at the user's request.

## Location (outside the public repo)

`${XDG_DATA_HOME:-$HOME/.local/share}/ega-factory/summaries/<date>-<short-task>.yaml`

One YAML file per task, based on `templates/task-summary.yaml`. Never write summaries into a project repository, the factory plugin repository, or any synced location. Create the directory with `0700` permissions and files with `0600`.

## Opt-in and opt-out

- Opt-in: explicit user request ("record a summary for this task"). Unknown fields become `null`/`unknown`; that is required, not optional.
- Default/opt-out: write nothing, create no directory, and do not ask follow-up questions about cost or duration.
- A summary is not a commit, push, issue, or upload. Recording it performs no network access.

## Schema

`schema_version: 1` fields: `factory_version`, `project`, `task`, `base`, `final_revision`, `worktree_state`, `environment`, `outcome`, `verification`, `review`, `duration`, `cost`, `lesson`.

Controlled values: `outcome` is `completed | ready-for-review | blocked | unknown`; `worktree_state` is `clean | dirty | unknown`. Unknown information is `null` or the string `unknown` — never zero and never an invented estimate. Never infer dollar costs from subscription usage. `lesson` is optional; "no improvement justified" is a valid value.

## Privacy

Do not store credentials, full prompts, private diffs, unrelated transcripts, or secret-bearing keys. Omit sensitive data from `task` and other free-text fields. Summaries stay on the user's own machine.

## Retention and deletion

- Retention: files persist until the user deletes them. No automatic expiry, rotation, upload, or cross-machine sync is performed or claimed for v1.
- Deletion: delete individual files, or the whole `ega-factory/summaries/` directory to remove all recorded data. No other copy or cache is created, so deleting the files deletes the data. If asked to delete, remove exactly what was identified and report what was removed.

## Limits

Manual recording only. Host and provider telemetry behavior is not tested by this plugin; never present a recorded summary as host-collected data or as a measured cost. Cross-machine synchronization is out of scope for v1. Later aggregation (cycle time, verified outcomes, rework) is a follow-on feature, not a v1 behavior.

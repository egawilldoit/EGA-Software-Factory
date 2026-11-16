# Pilot: make the factory skills discoverable in T3 / OpenCode

Scoped, real-task pilot run with the `factory` skill. This exercises skill
discovery and a small usability fix in this repository; it is not a full T12
acceptance run and makes no deployment or release-readiness claim.

## Record

| Field | Value |
| --- | --- |
| Goal | Make the four factory skills discoverable as `/skill:factory` (and siblings) in T3/OpenCode from this repo, add a short usage example, and finish the pending factory-guidance policy edits. Run the work through the factory workflow and fix only observed problems. |
| Route | `factory` skill loaded by ID; small, clear, low-risk work so implemented directly (no delegate). `factory-verify` used for checks; review is same-agent and labeled as such. Delivery boundary: commit plus push to `origin/main` (authorized). |
| Base revision | `67e7bf1b8c11e20c108038e8a81934f965afff9e` (local `main` == `origin/main`), plus five pre-existing uncommitted guidance files: `docs/authorization-and-completion-scenarios.md`, `docs/v4-acceptance-status.md`, `references/verification-and-review.md`, `skills/factory-verify/SKILL.md`, `skills/factory/SKILL.md`. All were preserved unchanged in intent. |
| Final revision | Implementation commit on `main` with subject `Make factory skills discoverable in T3 and record scoped pilot`, based on `67e7bf1`. Obtain the exact SHA with `git log -1 --format=%H`; this record avoids a self-referential SHA that a later amend would invalidate. |
| Environment | Host `openclaw`, user `ubuntu`, working dir `/home/ubuntu/EGA-Software-Factory`. Code Mode / T3 Code on OpenCode v2.3.0, 2026-11-16 UTC. `/home/ubuntu/.local/bin/heavy` verified present. `jq` 1.6, Python 3 with PyYAML 6.0.3. No dependency installs, builds or heavy-slot work. |
| Delivery boundary | Local commit and push to `origin/main` only. No PR, merge, deploy, paid resource, application/production change, or unrelated repo work. |

## What was done

1. Established context and checked the host/user/heavy prerequisites and the
   actual dirty diff before touching anything.
2. Determined the real T3 discovery mechanism from OpenCode v2 docs and
   installed paths: the Codex `skills/` layout is not auto-discovered by
   OpenCode. OpenCode discovers skills from `.opencode/skills`,
   `~/.config/opencode/skills`, `~/.agents/skills`, or an explicit `skills`
   array in an `opencode.json`. The existing available skills came from
   `~/.agents/skills`; no dedicated `skill-creator` installer was installed, so
   the authoritative OpenCode skills documentation was used as the installer
   instruction.
3. Added project-scoped `.opencode/opencode.json` with
   `"skills": ["./skills"]`. This registers the existing four skill directories
   without duplicating them or touching global config; their relative
   `../../references/...` paths still resolve from the real `skills/<id>` base
   directory.
4. Verified discovery and invocation (see below).
5. Added a short usage example to `README.md` showing `/skill:factory`.
6. Kept the five pre-existing guidance edits (reviewer optional and bounded,
   one reviewer, at most two runs, ask once with GPT-6.1 Sol low suggestion,
   T13 pilot guidance) as the current policy.

## Discovery and invocation evidence

- Before the config change the four factory skills were absent from the
  available-skill list; installed Codex plugin packaging alone did not expose
  them to T3.
- After adding `.opencode/opencode.json`, OpenCode's config watcher registered
  all four skills in the running session without a process restart (a
  `system-update` listed `factory`, `factory-plan`, `factory-verify`,
  `factory-improve`).
- Invocation through the `skill` tool with `id: factory` succeeded and reported
  base directory `/home/ubuntu/EGA-Software-Factory/skills/factory`, confirming
  the path-derived ID `factory` and that relative references resolve.
- T3 UI invocation (`/skill:factory` typed in a slash menu) was not directly
  observed from this non-UI agent session; a fresh T3 session or `/reload` may
  be needed for the UI menu. Filesystem/config registration and skill-tool
  loading were observed; the UI menu itself was not.

## Checks

| Check | Result |
| --- | --- |
| `tests/scenarios/summary/run-scenarios.sh` | 19 passed, 0 failed |
| `fixtures/t10/run-scenarios.sh` | 55/55 checks passed (all external ops are labeled MOCK) |
| JSON parse: plugin, marketplace, new opencode config, T11 fixtures | all valid |
| Skill frontmatter `name` matches directory for all four skills | yes |
| `git diff --check` | clean |

Checks were re-run against the final candidate after all edits. The scenario
scripts use isolated temporary directories outside the repository and made no
network calls or repository mutation.

## Review

Same-agent review only. No independent reviewer was run: this task had no
subagent authorization, and policy makes independent review optional and
bounded (one reviewer, at most two runs, host availability checked, user model
respected). No material in-scope finding was found in the final diff; the
review looked for scope creep, broken relative paths, overclaiming acceptance,
and damage to the pre-existing dirty files. This is not independent review.

## Gaps and limitations

- Full T12 runtime acceptance remains incomplete; only the discovery/docs pilot
  behavior above is observed.
- No fresh-session T3 UI slash-menu keypress was observed; no Codex `$factory`
  session was exercised.
- No real provider, CI, browser, or production behavior was exercised; the
  delivery fixtures are mocks.
- No application or production deployment was performed, and no release
  readiness is claimed.

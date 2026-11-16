# Summary Scenarios (T09)

Dedicated scenarios for opt-in local task summaries. All data is synthetic; no
real task, prompt, cost, or credential data is used. The runner writes only to
a temporary directory and makes no network connections.

Requires `python3` for the destination and schema checks and PyYAML
(`import yaml`) for `validate-summary.sh`; without PyYAML the validator reports
`YAML parser unavailable` and fails closed. All data is synthetic and the run
writes only to a temporary directory.

Run:

```sh
TMPDIR=/tmp/opencode bash tests/scenarios/summary/run-scenarios.sh
```

Standalone check of one summary file:

```sh
bash tests/scenarios/summary/validate-summary.sh <summary.yaml>
```

## Scenarios

| ID | Input | Expected | Observed (2026-11-15, linux VM `openclaw`, bash) |
| --- | --- | --- | --- |
| S1 | Explicit opt-in: template copied and filled with synthetic values, written to a temp directory | One valid summary exists outside the repository, permissions 700/600, validator passes | 3/3 pass |
| S2 | Default/opt-out: no summary requested | No summary file in the workspace; an existing synthetic summary in the isolated test home stays unchanged | Synthetic fixture |
| S3 | Unknown duration/cost | Recorded as `null`, never `0` or an estimate; a fixture with unmeasured `cost: 0` fails validation | 3/3 pass |
| S4 | A secret-bearing key and a separate credential-shaped value in an allowed field | Validation rejects each for its respective reason; opt-in summary has no prompt/transcript-like fields | Synthetic fixtures |
| S4d | Synthetic credential plus its surrounding line | Rejected without the credential or line appearing in stdout/stderr | 1/1 pass |
| S4e | Malformed or duplicate YAML (`outcome: bogus`, `cost: 999`, `"prompt": hidden`, unterminated flow sequence) | Each payload is rejected | 4/4 pass |
| S5 | Network behavior | Test scripts contain no network-capable commands | 1/1 pass (limited — see below) |
| S6 | Whole run | No files created inside the repository during the run | 1/1 pass |

Current result on `openclaw` (2026-11-16): 20 passed, 0 failed, including 8 structured-report tests.

The runner also tests HOME/XDG precedence, explicit destinations, canonical containment, and symlink escapes using a synthetic model of the documented path contract.

## Files

- `run-scenarios.sh` — synthetic scenario runner (S1–S6).
- `validate-summary.sh` — schema/privacy validator for one summary file.
- `fixtures/opt-in-synthetic.yaml` — valid synthetic summary.
- `fixtures/invalid-secret.yaml` — negative fixture: unknown/secret key with an obviously fake placeholder token (not, and never, a real credential).
- `fixtures/invalid-credential-pattern.yaml` — fake credential-shaped value in an allowed field, to exercise the pattern check independently.
- `test-reports.py` — schema 2 statuses, required evidence, review independence, delivery unknowns, UTC timestamps, safe links and schema 1 compatibility.
- `test-destinations.py` — synthetic path-contract checks; this is not the agent's runtime implementation or an OS sandbox.
- `fixtures/invalid-fabricated-cost.yaml` — negative fixture: `cost: 0` without a `# measured` source note.

## Limits of this evidence

- These are synthetic, filesystem-level checks of the documented recording
  behavior. They are not host telemetry tests: the plugin performs no network
  access and this runner cannot observe host-level packets. S5 only shows that
  the test scripts contain no network-capable commands.
- The runner replaces HOME with an isolated temporary home and does not inspect
  or alter the user's existing summaries. Its opt-out check does not invoke Codex.
- Reports are agent-written at handoff under task/project opt-in. No transcript collection, upload, background service,
  or cross-machine synchronization is claimed or tested.
- Fixtures live in the repository as labeled synthetic test data; real
  summaries stay outside repositories by default unless the user explicitly chooses another permitted destination (see
  `references/task-summary.md`).

Project opt-in, opt-out precedence and resuming one task are documented workflows, not executed fresh-agent scenarios. The validator checks report structure, not whether its claims are true.

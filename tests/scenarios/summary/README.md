# Summary Scenarios (T09)

Dedicated scenarios for opt-in local task summaries. All data is synthetic; no
real task, prompt, cost, or credential data is used. The runner writes only to
a temporary directory and makes no network connections.

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
| S2 | Default/opt-out: no summary requested | No summary file in the workspace; default location `~/.local/share/ega-factory/summaries` does not exist on this machine | 2/2 pass |
| S3 | Unknown duration/cost | Recorded as `null`, never `0` or an estimate; a fixture with unmeasured `cost: 0` fails validation | 3/3 pass |
| S4 | A secret-bearing key (`api_key` with an obviously fake placeholder token) | Validation rejects unknown/secret keys and credential-like patterns; opt-in summary has no prompt/transcript-like fields | 2/2 pass |
| S5 | Network behavior | Test scripts contain no network-capable commands | 1/1 pass (limited — see below) |
| S6 | Whole run | No files created inside the repository during the run | 1/1 pass |

Total: 12 passed, 0 failed (runner exit 0).

## Files

- `run-scenarios.sh` — synthetic scenario runner (S1–S6).
- `validate-summary.sh` — schema/privacy validator for one summary file.
- `fixtures/opt-in-synthetic.yaml` — valid synthetic summary.
- `fixtures/invalid-secret.yaml` — negative fixture: unknown/secret key with an obviously fake placeholder token (not, and never, a real credential).
- `fixtures/invalid-fabricated-cost.yaml` — negative fixture: `cost: 0` without a `# measured` source note.

## Limits of this evidence

- These are synthetic, filesystem-level checks of the documented recording
  behavior. They are not host telemetry tests: the plugin performs no network
  access and this runner cannot observe host-level packets. S5 only shows that
  the test scripts contain no network-capable commands.
- S2b assumes a clean default summary location; it would fail on a machine
  where real summaries already exist (by design, since summaries persist until
  the user deletes them).
- Manual recording only. No automatic collection, upload, background service,
  or cross-machine synchronization is claimed or tested.
- Fixtures live in the repository as labeled synthetic test data; real
  summaries must never be written into any repository (see
  `references/task-summary.md`).

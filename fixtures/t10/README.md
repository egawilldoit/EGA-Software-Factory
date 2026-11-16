# T10 delivery-boundary fixtures

Test fixtures for the authorized delivery workflow (`references/risk-and-delivery.md`).
Everything here is a **test fixture**, not a runtime plugin component.

**All external operations in these scenarios are MOCKS.** `mock-delivery-host.sh`
stands in for a real Git provider / CI system / deploy target; it contacts no
network, opens no real PR/MR, performs no real merge or deployment, and labels
every recorded action `"mock": true`. No real remote, repository, CI system or
production target is touched by any scenario.

## Files

- `delivery.sh` — reference implementation of the delivery boundary ladder
  (`local`, `review`, `pr`, `merge`, `deploy`). Enforces: read-only/local means
  zero external writes; PR creation never implies merge; merge/deploy require
  authorization covering their effects **and** permission in the project's
  rules file; merge does not imply deploy. Writes a JSON delivery report
  including the mock disclosure and unverified steps. Requires `jq` for report
  serialization; no network access.
- `mock-delivery-host.sh` — the MOCK host shim. Records each requested external
  action to `$T10_ACTION_LOG` as one JSON line and prints a simulated result.
- `run-scenarios.sh` — creates isolated temporary git fixtures under
  `/tmp/opencode`, runs the scenarios below, and checks **observed actions**
  (the mock host's action log, the delivery report, and actual git state), not
  exit codes or narrative alone. Prints the observed log and repo state per
  scenario. Use `--keep` to preserve the fixture directory for inspection.

## Project rules file

Scenarios pass a small rules file representing the project's actual delivery
rules (`KEY: VALUE` lines): `provider`, `default-branch`, `merge: allowed|blocked`,
`deploy: allowed|blocked`, `require-ci: true|false`. The workflow follows these
rules; it invents no additional approval gates and skips none of them.

## Authorization flags

The `--authorized-merge` and `--authorized-deploy` flags are fixture inputs
that represent authorization the user has already given through the requested
outcome. They are **not** a second user approval request and do not grant
authorization on their own: without the flag, the boundary is refused even when
the rules allow it. A real session establishes authorization from the user's
stated goal and later instructions, not from a flag. The flags exist so the
scenarios can test the authorized and unauthorized branches deterministically.

## Scenarios (S1–S9)

| # | Boundary setup | Expected behavior |
| --- | --- | --- |
| S1 | `local`, no commit authorized | Zero host actions; unrelated dirty file preserved |
| S2 | `local` with authorized staged commit | Local commit only; unrelated dirty file not committed |
| S3 | `review` | Zero host actions; report only |
| S4 | `pr` (github) | One push + one PR; no merge, no deploy; report discloses mock PR |
| S5 | `merge` without explicit authorization | Refused; no CI or merge action; refusal names authorization |
| S6 | `merge` authorized but rules `merge: blocked` | Refused; no merge action; refusal names the rules |
| S7 | `merge` authorized and rules allow, `require-ci: true` | CI status checked, then merge into the rules' default branch; no deploy implied; simulated CI disclosed |
| S8 | `deploy` without explicit authorization | Refused; no deploy or merge action |
| S9 | `deploy` authorized and rules allow | Deploy to the requested target only; no push, no merge implied |

Run:

```sh
fixtures/t10/run-scenarios.sh        # 55 checks; exits non-zero on any failure
fixtures/t10/run-scenarios.sh --keep # keep /tmp/opencode fixture dir for inspection
```

## Limitations

- Real provider behavior (actual GitHub/GitLab push, PR/MR creation, real CI,
  real merges, real deployments) is **not exercised** by these fixtures and
  remains unverified; delivery against a real provider still needs an
  authorized target. In particular, these scenarios keep `merge` and `deploy`
  as separate boundaries: they do **not** test a real provider's automatic
  deployment triggered by a merge, so real automatic effects remain unverified
  even though the fixture demonstrates the two authorization decisions.
- `delivery.sh` is a test-harness reference for the documented procedure, not
  an executable the plugin installs; a Codex session follows the same rules as
  guidance rather than by running this script.
- CI in S7 is simulated by the mock host (`green-simulated`); no real CI gate
  was exercised.
- GitLab `mr-create` routing is implemented but not separately asserted by a
  dedicated scenario; only GitHub is exercised end-to-end.

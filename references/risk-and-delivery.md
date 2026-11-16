# Risk and Delivery

Assess risk by impact, reversibility, and blast radius, not changed-line count.

- Low: copy, simple docs; focused checks and diff inspection.
- Normal: ordinary product change; relevant runtime/test evidence and review.
- High: auth, RLS, secrets, billing, production data, migrations, architecture; explicit invariants and stronger checks.

Deliver at the exact authorized boundary. Read-only/local tasks perform no unauthorized external write. PR creation does not imply merge. Explicitly authorized merge/deployment follows project rules. Provider limitations and unverified steps remain visible. A passing test does not make a destructive operation reversible or grant permission.

## Delivery boundaries (T10)

Stop at the requested boundary. The rows describe requested actions, not guarantees that provider automation has no further effects. Inspect actual automation before acting.

| Boundary | Performed | Not authorized by this request alone |
| --- | --- | --- |
| `local` | Local commits/report only; no host, network, or provider operation | Push, PR, merge, deploy |
| `review` | Handoff report with evidence and review-independence disclosure | Push, PR, merge, deploy |
| `pr` | Push the branch and open a PR/MR on the authorized provider | Merge, deploy |
| `merge` | Merge an authorized branch, following project rules | Deploy |
| `deploy` | Deploy an authorized revision, following project rules | Merge, PR |

Merge and deploy require authorization covering their effects and compliance with applicable requirements (for example required CI). Authorization may come from the requested outcome; separate approval messages for each step are unnecessary. Do not invent extra approval gates. A merge-only request does not by itself authorize deployment, and a deploy-only request does not by itself authorize merge.

## Authorization and automatic effects

Use the user's stated outcome and existing authorization, not the absence of a prohibition. A request to get a scoped change live authorizes its necessary merge and deployment steps; a PR-only request does not. Respect explicit exclusions, project requirements and actual tool permissions. Identify the target before production actions.

When merge triggers deployment, assess both effects together before merge. If both are authorized, proceed without another approval. If deployment is explicitly excluded or authorization remains consequentially unclear, resolve that conflict before triggering it; do not silently disable deployment configuration as a workaround.

Distinguish authorization from execution conditions. Identify whether a condition comes from the user, project/infrastructure, or a concrete technical risk. Precautions proposed by the agent are recommendations unless justified as necessary for the actual change; do not silently turn them into universal gates. Known missing migration dependencies or credible data-loss risks still require resolution.

Later user instructions update earlier user conditions where the change is clear. Follow instruction priority: user instructions can change project guidance, but host/tool restrictions still apply. If the intended change is ambiguous, state the exact conflict once rather than repeatedly requesting broad authorization. Do all independent authorized work while awaiting a necessary decision.

## Delivery report

Every delivery states: problem/outcome in brief, verification summary (`passed`/`failed`/`not checked`), review scope and independence, limitations and unverified steps, provider, and the exact final revision with worktree state (dirty or clean). After meaningful fixes, rebase, or conflict resolution, recheck the final revision before delivery so the evidence matches what is handed off.

- Read-only/local tasks perform zero external writes.
- PR creation does not authorize merge; merge alone does not authorize deploy. Account for automatic effects before acting.
- CI/review follow-up happens only when authorized. Report CI state with its source; a simulated or mocked CI result is labeled `MOCK` and is not real CI evidence.
- Respect the provider's actual terminology and capabilities (GitHub PR vs GitLab MR); state provider limitations instead of assuming them away.
- Any simulated external operation must be labeled `MOCK` and record an action log that is inspected after the run, not asserted from the agent's narrative alone.

## T10 verification scenarios

Exercise the boundary ladder against a mock delivery host in `fixtures/t10/`:

- `local` (read-only and local-commit) and `review` perform zero host actions and preserve unrelated dirty work.
- `pr` pushes and opens the PR/MR but performs no merge or deploy.
- Merge is refused without explicit authorization, and also refused when project rules block it; performed only when both allow, following the rules' CI requirement.
- Deploy is refused without authorization; with authorization it deploys without implying a merge.
- The action log, report, and repository state are inspected after each scenario, not just exit codes.

The fixture keeps `merge` and `deploy` as separate boundaries; it does **not**
exercise a real provider's automatic deployment triggered by a merge, and the
`--authorized-merge` / `--authorized-deploy` flags are test inputs representing
authorization that already exists, not a request for a new user approval. Real
provider push/PR/merge/CI/deploy behavior and real automatic effects remain
unverified; report that gap at delivery.

## Related references

- `pr-workflows.md` — PR filing, babysitting, full-stop/no-merge, and delivery outcomes.
- `takeover-and-modernize.md` — taking over and modernizing existing work.
- `../docs/authorization-and-completion-scenarios.md` — designed agent-behavior scenarios.
- `../docs/v4-acceptance-status.md` — what is observed versus unverified.

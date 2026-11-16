# PR Workflows and Delivery Outcomes

Use when work involves filing, monitoring, or handing off a PR/MR, or when the
requested outcome is "get the change live" versus "PR only". Keep boundary and
authorization rules in `risk-and-delivery.md`; this reference covers the PR
mechanics and the finishing-versus-watching split.

## File PR

- Check first whether a PR for this branch already exists. Review the scoped
  diff locally against the base (usually `origin/main`) so its contents match
  the goal. Do not create a duplicate.
- Follow the repository's title conventions; prefer a concise, human-readable
  title that explains why the change matters.
- Open with the problem from the user's request, then briefly the solution and
  the evidence line. Do not lead with an implementation inventory. End with the
  verified public model and harness (and subagent models that contributed); if
  model identity is unavailable, name the harness without guessing.
- Check title, description, quotes, and attachments for secrets and private
  details. Preserve contributor credit. Respect the provider's terminology
  (GitHub PR / GitLab MR). Open a real PR rather than a draft when review bots
  are expected, and only when filing was authorized.

## Babysit PR

- Use the host's supported watcher: `watch_pull_request` in T3 Code, otherwise
  the available PR-wait helper. One watcher per PR; never write a custom
  polling or `sleep` loop, and never run two watchers on the same PR.
- **Only the thread that owns the PR watches it.** Delegated children,
  reviewers, "Sol rounds" and council delegates never watch. Do not watch PRs
  you are not working on. Unwatch on handoff, question, or blocked state; a
  merge or close ends the watch on its own. Handle rate limits with one status
  check and a single wait, never a tight retry loop.
- A wake is news, not a merge decision. Check the merge gate yourself: required
  checks and required reviews only, on the latest head. Verify every bot
  finding against the source before changing code; dismiss false positives
  with a written reason. Treat advisory bots as advisory; do not hold a merge
  for them. Distinguish repository failures from infrastructure flakes.
- Reject unrelated scope creep: fix real bugs in the intended case, decline
  extra tests for impossible cases, unnecessary compatibility, and small
  performance costs with a written reason and a follow-up list. Prefer changes
  that delete or narrow code. Green mocked checks are not proof of behavior.
- Finish first, then watch: handle existing checks and comments, fix findings
  with proof, and only then end the turn on the watcher. Separate this finishing
  work from the watching wait and from the final handoff. If nothing changed,
  end the turn without filler comments. Before any authorized merge, re-fetch
  and recheck head, base, mergeability and post-green base commits; recheck any
  meaningful base changes and rerun affected checks so evidence matches the
  final head. A PR merge conflict blocks merge. Preserve local dirty work;
  do not merge if intended changes remain uncommitted or the exact PR head
  and its evidence cannot be established. Unrelated local edits alone do not
  block a provider-side merge of a verified PR head. A merely BEHIND
  branch is not an automatic rebase gate: assess it under the repository's
  actual branch protection / merge queue and the validity of the evidence.
  GitHub can mark a PR `MERGEABLE` (no conflicts) while its branch is behind
  the base or a local worktree is dirty; these are distinct states.
  Follow repo policy; do not add a universal rebase requirement.

## No-merge / PR-ready boundary

Apply this section only when the user clearly requests the PR-ready, no-merge
outcome (finish to a PR the user will merge). A plain "stop", "pause", or
"full stop" means stop: halt work and begin no new edits, pushes, PR creation,
review rounds or watchers; do not treat it as a request to start this workflow.

When that outcome was actually requested, finish the work to a PR ready for
the user to merge: proof and review still apply; watch only if requested or
needed to reach PR-ready. **Never merge.** Do not enable auto-merge, enter a
merge queue, push to the default branch, bypass branch protection, or delegate
those actions. Use the merge gate only as a readiness check, then hand off: PR
link, final head, verdict, proof, reviewer outcome, remaining risks, and an
explicit statement that the PR is open and unmerged.

Do not inherit automatic disabling of auto-merge or queue settings from
upstream guidance without applicable authorization. If existing automation
would merge the PR anyway, resolve that conflict explicitly before pushing
rather than silently changing settings; if it cannot be prevented, report the
blocker before proceeding.

## Delivery outcomes

- "Get this scoped change live" authorizes the necessary merge and deployment,
  including automatic effects assessed early (for example merge triggering
  production deployment): permission is separate from readiness to execute.
  A PR-only request does not authorize merge or deploy. Respect explicit
  exclusions, project requirements, and actual tool permissions; identify the
  target before production actions.
- Concrete execution conditions still matter: a missing migration dependency
  or credible data-loss risk can block rollout despite authorization. Do not
  turn agent-proposed precautions into universal gates.
- Later user instructions update earlier user conditions where the change is
  clear (instruction priority); host/tool restrictions still apply. State a
  remaining consequential conflict once, do the independent authorized work,
  and never infer blanket production authorization from silence.
- Verify the target before acting. If authorization covered one target but
  credentials or context identify another, resolve the scope before external
  writes.

Scenario coverage for these behaviors is in
`../docs/authorization-and-completion-scenarios.md`; runtime acceptance status
is in `../docs/v4-acceptance-status.md`.

Adapted from the tstack `file-pr`, `babysit-pr`, `full-send`, `full-stop` and
`council` skills (Theo Browne, MIT), pinned upstream revision
`11e37a74d0a6868c121cd0910ab2b3bd9873b92a`. Ideas only; not a vendored copy.

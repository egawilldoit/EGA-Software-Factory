# Takeover and Modernize

Use when asked to take over an existing PR, branch, or agent thread, or to
modernize stale work. Goal: finish the original intent against the current
codebase while preserving contributor credit and unrelated work.

## Take over actual work

- Read the source PR/branch/thread, including review findings and the user's
  later corrections. Resolve the handoff to the real code and current head, and
  account for uncommitted work. Treat the handoff as context, not proof.
- Preserve dirty and unrelated changes. Never overwrite another contributor's
  work, silently replace a PR, expand scope, close a PR, or rewrite a branch
  without authorization. An explicitly requested in-place or stacked
  continuation overrides replacement by default.
- Keep Git authorship and existing co-author trailers. Credit human
  contributors in the PR description and link the original PR when one exists.
  In a squash, preserve verified human author/co-author credit in the merge
  commit. Model attribution does not substitute for contributor credit.
- Independently verify the original failure and realistic workflows following
  repository guidance and permissions. Green mocked tests do not prove the
  user experience works; state what remains unverified.

## Modernize the intent, not just the branch

A clean rebase does not prove the work still belongs in the product.

1. Fetch the latest remote base and PR head; record the PR URL/state, base,
   head SHA, author, checks, review state and merge base. Use the PR's actual
   base, not an assumed local branch.
2. Inspect base-branch changes since divergence and search merged/open PRs for
   a replacement, competing implementation, or already-solved problem. Look for
   API/schema/architecture changes, ownership conflicts, deleted code, and two
   ways to do the same thing. No Git conflict is not evidence of currency.
3. Choose a disposition before pushing:
   - **MODERNIZE** — goal still useful, shape still right: rebase, resolve
     conflicts against current invariants, verify with `git range-diff`, run
     focused checks, and update the branch with `--force-with-lease` against
     the head observed before rebase. Never an unqualified force push.
   - **REWORK** — goal useful, implementation wrong: explain the smallest
     credible rewrite and stop before pushing unless the rework was requested.
   - **CLOSE** — superseded, obsolete, or not worth its cost: cite evidence and
     stop. Do not close without explicit permission.
4. Rework only what finishing the goal requires. Simplify without dropping
   intended behavior or surfaces, and without unrelated features. A conflict
   that exposes a product or architecture disagreement is a reason to
   reconsider the disposition, not to guess.
5. Recheck the original PR too; it may have improved while work was in progress.

## Finish and report

When the requested finish includes a PR, apply `pr-workflows.md`: file or
update the PR and report its current status. Watch only when the user requested
monitoring or it is necessary to complete the authorized finish (for example
reaching merge readiness or merging); PR-only authorization does not imply
prolonged watching, so otherwise hand off the created PR with its current
state. Only the thread that owns the PR watches; delegated children never
watch. Merge or close the original PR only when authorized. Report what was
inherited, what changed, how it was verified, how credit was preserved, and the
remaining decision. Separate observed facts from judgment.

Scenario coverage for these behaviors is in
`../docs/authorization-and-completion-scenarios.md`; runtime acceptance status
is in `../docs/v4-acceptance-status.md`.

Adapted from the tstack `takeover` and `modernize` skills (Theo Browne, MIT),
pinned upstream revision `11e37a74d0a6868c121cd0910ab2b3bd9873b92a`. Ideas only;
not a vendored copy.

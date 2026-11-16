# Issue drafting

Turn an idea, bug, screenshot, conversation or existing issue into one bounded,
evidence-backed issue that a fresh coding agent can implement without the
original conversation. Work through `factory-plan` in its issue-drafting mode.
This route improves planning and handoff; it does not execute tickets, schedule
agents or start coding.

Use the portable [implementation issue contract](../templates/implementation-issue.md).
It is agent guidance, not an issue form or a new tracker integration.

## Inputs and destination

Accept rough text, bugs, screenshots, conversations, existing issues and
specifications. Do not invent the contents of inaccessible attachments or
links; disclose the limitation instead.

Choose the explicitly named repository first, otherwise the verified current
project. Resolve consequential destination ambiguity before any publication.
Never pick a repository by a similar name alone.

## Inspect before drafting

Inspect only relevant context:

- Project instructions and applicable architecture or domain decisions.
- Existing behavior, interfaces and meaningful tests.
- Equivalent functionality and relevant open/closed issues and PRs.
- The inspected branch/revision and material working-tree limitations.

Record the inspected revision as context; the implementing agent must recheck
current source. Separate observed facts, user decisions, recommendations and
assumptions. Research factual answers rather than asking the user for them.
Disclose unavailable code, tracker access, attachments or private context.

Unavailable repository evidence can still support a useful provisional draft,
but never a repository-specific readiness claim. An already-implemented request
is reported with evidence instead of creating duplicate work; do not silently
close, rewrite or broaden an existing issue.

## Ask only consequential questions

A clear bug can become one issue immediately. Do not apply every step as a
mandatory ceremony.

- Ask only when the answer changes behavior, scope, risk, authorization or an
  external contract. Ask independent questions together in small batches;
  defer questions whose answers depend on earlier choices.
- Reuse answers already in context. Resolve routine choices autonomously with
  grounded assumptions and record them.
- For an unresolved product choice, offer a recommendation and its tradeoffs,
  but do not treat that recommendation as an approved decision.
- Use research for missing facts. Propose a prototype only when experiencing an
  interaction or testing logic would settle a named uncertainty. Draft-only
  work must not create prototype code; obtain scope before making such edits
  and reuse existing authorization when it already covers them.
- For genuinely large work, use a concise parent specification plus bounded
  implementation tickets. A decision/investigation ticket must state the
  evidence or decision it delivers and must not masquerade as an
  implementation-ready feature ticket.

## Draft the issue

Use one canonical portable template with optional bug fields; omit empty
optional sections rather than inventing content. A title should name an action,
target and observable outcome without a rigid naming grammar.

- Describe current/problem behavior, desired behavior, scope and non-goals,
  observable acceptance criteria, verification, context/dependencies and only
  real open decisions.
- For bugs, distinguish reported from reproduced behavior and suspected from
  confirmed causes. Include before/after reproduction evidence when practical
  and identify an appropriate regression check. State unknowns.
- Verification names confirmed repository-supported commands where known,
  otherwise says they must be discovered. Distinguish proposed checks from
  executed checks; do not automatically require unit, integration and E2E
  tests together.
- For high-impact work (auth, permissions, billing, migrations, production
  data, concurrency), add invariants, negative cases, compatibility
  requirements and partial-failure/recovery behavior.
- Type, priority, owner and tracker status are optional existing-project
  metadata, not mandatory fields to invent or new labels to create. Describe
  observed impact rather than guessing urgency.
- Stable working conventions belong in project instructions, not copied into
  every issue. Do not demand a dedicated worktree, PR, approval round or
  blanket production prohibition unless that boundary is real for the task;
  task-specific exclusions remain explicit and binding within their scope.
- Do not copy full chats, private diffs, secrets, credentials or sensitive
  records into an issue. Issue visibility matters even when the source
  conversation was private.

## Slice and order dependencies

Default to one issue. Split only when a useful outcome needs multiple bounded
sessions or independently verifiable work, not to maximize ticket count.

- Prefer thin end-to-end behavior slices over separate layer tickets. Each
  slice names its outcome, acceptance evidence and true blockers.
- Avoid speculative prerequisites and cycles. Use existing issues where they
  already cover the goal.
- For broad breaking refactors where independent vertical slices cannot stay
  working, allow an explicit expand–migrate–contract sequence or a justified
  integration boundary; explain compatibility and when integrated verification
  is required.

Publish blockers first when IDs are needed by dependent issues. Use native
dependencies only when the current tools support them and the operation is
authorized; otherwise put explicit `Blocked by` links in issue bodies. Verify
created links and native relationships. Never claim a native edge when only a
text reference exists.

## Readiness, dependencies and publication

Report three independent dimensions in plain text; this is descriptive, not a
new status engine.

| Dimension | Results |
| --- | --- |
| Specification | Ready; needs decision; needs evidence; already implemented |
| Dependencies | Unblocked; blocked by identified work; unknown where evidence is missing |
| Publication | Unpublished draft; published; partially published after an interrupted operation |

Use “Ready” only when intended behavior is precise, consequential decisions are
settled, acceptance is verifiable and enough context exists for a fresh agent.
“Already implemented” requires supporting evidence and does not imply verified
production behavior. A specification-ready issue blocked by another ticket is
not ready to start. Do not claim a tracker label or dependency was applied
merely because the handoff describes it.

When explicitly asked, publish an unfinished planning issue with its unresolved
decisions or evidence clearly identified. Publication does not make it
implementation-ready. If the user requests implementation-ready issues but
material decisions remain, resolve them or explain the gap rather than silently
lowering the requirement.

## Publication and authorization

Draft in the response by default. “Draft” does not imply permission to create
local files. Honor explicit read-only/no-write boundaries, including their
precedence over standing outcome-report permission.

An explicit request to create issues authorizes the requested issue set in the
identified tracker and its necessary dependency references. Do not add another
approval round for unchanged authorization.

Before writing, verify the destination repository and available permissions
through existing context and tools. This is an evidence check, not a mandatory
confirmation question; ask only if consequential ambiguity remains. Recheck
existing issues to avoid duplicates. Respect any request to review drafts
before publication.

Use existing labels only when authorized or required by applicable project
instructions; do not invent mandatory readiness labels. Unrelated issue edits,
closure, code changes, commits, PRs and deployment are outside issue-publication
scope.

On partial failure, report exactly what was created and what remains. Recover
existing IDs and check for duplicates before retrying. Do not recreate the
whole set, silently close partial issues or broaden permissions to repair the
failure.

When publication is unavailable, give a provisional draft and a manual handoff;
do not invent inspection or tracker access.

## Handoff and boundary

Return a concise handoff with issue links or drafts, specification readiness,
dependencies, unresolved decisions, evidence limitations and the next action.
A suitable implementation prompt is:

> Use Factory to implement &lt;issue URL&gt;. Read its body, relevant comments and
> current repository instructions. Recheck current behavior and dependencies,
> then work to the delivery boundary I specify for this implementation task.

Publishing ends the planning task. The issue itself grants no merge, deployment
or production authority. A later implementation request may authorize those
outcomes under existing Factory rules, and that separate session rereads the
issue and current repository state before coding.

## Supported environments

Installed coding-agent skills use the tools actually available in the host;
follow the skill compatibility contract and verify native discovery and
behavior separately.

The hosted MCP channel retrieves released guidance only. Repository inspection
and issue publication require separate connected capabilities. Disclose
unavailable capabilities and provide a provisional draft or manual handoff.
Retrieving instructions is not proof of native skill activation, repository
access or compliance with the workflow; verify each environment separately.

## Method provenance

The clarification, self-contained brief, synthesis and slicing methods here are
adapted in original wording from Matt Pocock's grilling (via grill-me), triage
agent briefs, to-spec and to-tickets, and from the supplied agent issue and
bug template/playbook design inputs. No substantial upstream text is copied.
Upstream reference at adaptation time: `mattpocock/skills` revision
`5863806dd4e15c63174bee4e7515a4256792ecfa` (MIT License, Copyright (c) 2026
Matt Pocock). Automatic publishing, labels, commits, approval loops, exhaustive
interviews, mandatory ticket fan-out and subagent delegation are deliberately
not inherited. See [planning.md](planning.md) for the base planning contract
and [../references/risk-and-delivery.md](../references/risk-and-delivery.md)
for authorization boundaries.

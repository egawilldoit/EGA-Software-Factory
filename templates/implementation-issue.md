# Implementation issue (portable agent contract)

Use this contract for a self-contained issue that a fresh coding agent can
implement without the original conversation. It is agent guidance, not a
`.github/ISSUE_TEMPLATE` form and not a tracker-specific schema.

Detailed guidance: [../references/issue-drafting.md](../references/issue-drafting.md).

Omit any section that has no real content. Do not invent optional metadata,
labels, assignees or statuses. Keep wording in the project's domain language
and describe behavior rather than a speculative file-by-file implementation.
Copy the headings below into the issue, replacing the guidance text with facts.

Include repository identity in the title or context when the draft might
otherwise be ambiguous outside its tracker.

# Deliver a specific, observable behavior

## Current behavior / problem

What exists, fails or is missing, and who is affected.

## Desired behavior

The intended observable result, why it matters and important edge cases.

## Reproduction / environment

For bugs when relevant: preconditions, minimal steps, actual and expected
result, environment/version and frequency. Label reported behavior separately
from reproduced behavior. State unknowns. Keep suspected causes explicitly
marked as hypotheses; do not present an unverified hypothesis as the root
cause. If reproduction is unavailable, record the limitation and a proposed
alternative proof. For a purely visual defect, captures can establish the
behavior without a code test.

## Scope and non-goals

Included work, preserved behavior and binding constraints. Name significant
interfaces and established architectural decisions when they affect the
outcome.

## Acceptance criteria

- [ ] Observable result.
- [ ] Relevant failure case.
- [ ] Existing behavior that must remain intact.

Write criteria as observable outcomes, not implementation steps. Given/when/then
is optional. Do not require every test layer; require the evidence that proves
the outcome.

## Verification

Proposed checks or user journeys and the evidence they establish. Name
confirmed repository-supported commands where known; otherwise say they must
be discovered. Clearly distinguish proposed checks from checks already
executed. Separate required outcome evidence from illustrative suggestions.

## Context and dependencies

Inspected revision, useful source/evidence links, confirmed decisions,
assumptions, blockers and dependencies. Mark paths and revision-linked evidence
as inspected context, not permanent truth; the implementing agent rechecks the
current source. Use textual dependency links when native relationships are
unavailable.

## Open decisions

Only unresolved consequential questions, if any. Each should state what
decision or evidence is needed and who can supply it.

## Task-specific delivery constraints

Only known constraints or an explicitly agreed stopping point. This issue does
not grant delivery authority; follow the implementation request and applicable
project instructions. Do not invent a mandatory approval gate, dedicated
worktree, PR, fixed priority/status taxonomy or blanket production prohibition.

A task-specific exclusion is binding within its scope; later user instructions
may update that scope under the project's existing rules. For authentication,
permissions, billing, migrations, production data, concurrency or similarly
high-impact work, add explicit invariants, negative cases, compatibility
requirements and partial-failure/recovery behavior here.

Privacy: do not copy full chats, private diffs, credentials, secrets or
sensitive records into an issue. Issue visibility can differ from the source
conversation.

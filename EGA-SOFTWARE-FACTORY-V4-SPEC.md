# EGA Software Factory — v4 End-to-End Build Specification

**Status:** implementation specification, not a claim that the plugin is built.  
**Owner:** EGAWILLDOIT.  
**Repository:** https://github.com/egawilldoit/EGA-Software-Factory  
**Initial target:** Codex, with portable skill content where feasible.  
**Source of context:** [Notion v4 project and design](https://app.notion.com/p/419c6ef1cf988165b409f0933301306f?pvs=204); the conversations and source material summarized below.  
**Repository observation:** at drafting time the GitHub repository was empty and public. Do not store private traces, secrets or credentials in it. Do not silently change repository visibility.

## 1. Goal and definition of done

Build a small, editable, version-controlled software factory that helps the user take software work from a request to a verified outcome using one orchestrator, focused skills and existing tools. It must support both existing repositories and new work without assuming a specific product stack, Git host or agent environment.

The first deliverable is a **working Codex-compatible plugin**, validated in a real supported Codex environment, plus documentation, meaningful scenario tests and a small opt-in task summary. A plugin file alone is not evidence that installation, invocation or runtime workflows work.

Definition of done:

1. A user can install the plugin from the repository using a documented and tested path and invoke the main factory skill in a fresh supported Codex session.
2. The four skills route work, plan proportionately, verify and review separately, and propose evidence-based improvements.
3. Appropriate skill reuse, unavailable-tool fallbacks and action boundaries are handled as described below.
4. Scenario tests exercise actual skill behavior, including negative cases; static checks do not substitute for agent runs.
5. One small real issue in an approved pilot project is completed or, if unavailable, the pilot is explicitly recorded as blocked with exact reason and follow-up. Do not fabricate completion.
6. Setup, versioning, refresh, optional outcome recording, privacy and rollback are documented. Test actual synchronization on available machines; mark unavailable systems unverified.
7. The result is reviewable, with the exact plugin revision, commands, observations, remaining risks and any failed or missing checks.

## 2. Product principles

- One main entry point; choose the smallest useful workflow, not every stage.
- Correctness, maintainability and user value matter more than PR volume.
- Inspect repository, branch, dirty state, instructions, existing work and tools before changes.
- Prefer existing architecture, components, skills and toolchains when they actually meet the need. Do not preserve a broken component merely because it already exists.
- Plan by complexity, blast radius and reversibility. Resolve routine choices autonomously; raise consequential unresolved decisions.
- Favor useful tests, runtime feedback and enforceable checks; do not turn every correction into an overfitted rule.
- Keep behavior verification and code review distinct. Do not call same-agent review independent.
- A skill is guidance. Actual sandbox, permissions, secret restrictions and mandatory CI checks belong to the execution environment.
- Honor the user's stated scope, project rules and authorization. A PR request does not automatically authorize merge; if merge or deploy is explicitly authorized, do not add a new arbitrary approval.
- Preserve unrelated work. No broad cleanup, rewrites, migrations, dependency adoption or production operations outside the authorized task.
- Do not require paid services, custom MCP, a dashboard, model council, automatic merge, transcript collection, scheduled jobs or multi-agent delegation for v1.

## 3. Proposed architecture

```text
request -> discover/context -> scope and risk -> select compatible workflows
        -> plan if justified -> implement or investigate
        -> verify actual behavior -> review final diff
        -> deliver at requested boundary -> improve when justified
```

The user can enter at any stage: investigate, plan, implement, review, finish a branch/PR, or improve the factory. Planning does not imply publishing issues; review does not imply edits. A small task can use one agent. Delegate only if requested or allowed by the active environment, genuinely useful, and supported. Never claim fresh-context independent review when the same agent performed it.

### 3.1 Skills

- **factory:** main entry point. Establish goal, repo/worktree state, scope, risk, capabilities, available instructions, selected comparison/base, and authorized stopping point. Route to appropriate workflows and own final reporting.
- **factory-plan:** resolve consequential uncertainty; define outcome, scope, invariants, acceptance criteria, testing approach and useful slices. Avoid unnecessary formal specs, interviews or tracker writes.
- **factory-verify:** define required evidence; check user-observable behavior where appropriate; separately assess diff for spec fit, failures, security, architecture and maintainability; record evidence against the final change.
- **factory-improve:** examine selected, appropriately accessible evidence; identify repeated failures; propose the smallest useful improvement and how to validate it. “No improvement justified” is a valid result.

Skills should be thin, with progressive disclosure: the entry point contains routing and links; task-specific detail is loaded only when relevant. Create exact packaging based on current official Codex documentation, not assumptions. The Agent Skills spec requires YAML frontmatter with matching name/description in each skill folder.

### 3.2 Repository layout

Proposed structure; adjust to the verified host schema and avoid duplicate packaging:

```text
EGA-Software-Factory/
  plugin.json                         # validate current portable schema
  .agents/plugins/marketplace.json    # if required for chosen Codex marketplace
  skills/
    factory/SKILL.md
    factory-plan/SKILL.md
    factory-verify/SKILL.md
    factory-improve/SKILL.md
  references/
    workflow.md
    skill-compatibility.md
    verification-and-review.md
    risk-and-delivery.md
    web-guidance.md
    improvement-and-metrics.md
  tests/
    scenarios/                        # small, repeatable fixtures and expected behavior
  README.md
```

Prefer root portable manifest where compatible. Official documentation also supports a Codex-specific compatibility manifest; choose a tested layout rather than claiming both work without evidence. Skill-to-skill invocation and tool discovery vary by host; document verified behavior and make the main workflow usable when a specialist cannot be invoked.

## 4. Skill compatibility contract

Before invoking a candidate skill check:

1. Does its purpose fit this request?
2. Are its dependencies, models, tools, permissions and nested skills available?
3. Does it commit, publish tickets, write comments, push, change PR settings, merge, deploy or modify files outside scope?
4. Does its stopping point match the user's requested outcome?
5. Does it work in this host? Does its installed version match the inspected instructions?

If incompatible, use a safe and useful local fallback. Avoid assuming skill names are pure APIs. Respect the source license and attribution if adapting source text. Do not create a large vendored dependency tree without need.

Examples are snapshots, not guarantees about installed copies:
- [Matt implement](https://github.com/mattpocock/skills/blob/main/skills/engineering/implement/SKILL.md) has included committing work.
- [Matt to-spec](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md) publishes to an issue tracker.
- [Tstack full-send](https://github.com/t3dotgg/tstack/blob/main/skills/full-send/SKILL.md) includes merging; [full-stop](https://github.com/t3dotgg/tstack/blob/main/skills/full-stop/SKILL.md) has its own PR and branch behavior.
- [Matt code-review](https://github.com/mattpocock/skills/blob/main/skills/engineering/code-review/SKILL.md) has required a comparison point and parallel subagents. A fallback can assess specification and standards separately without claiming independence.

## 5. Evidence contract and readiness

Before changing code, identify the smallest relevant evidence for the request. At delivery, report for each essential criterion:

- **Passed:** observed evidence, command or artifact, target environment, and scoped revision.
- **Failed:** observed failure and impact.
- **Not checked:** exact reason and impact on delivery/readiness.

Link evidence to the final change, including working tree state and comparison/base; a commit SHA alone does not describe uncommitted modifications. After meaningful review fixes, rebase conflict resolution or other changes that invalidate a check, repeat affected verification. If a mandatory check is missing, do not say fully verified; explain if it blocks readiness.

Choose verification based on the change:
- Logic: focused meaningful tests; relevant type/lint/build checks.
- UI: exercise real user flow; keyboard, focus, responsive behavior, accessible names and reduced motion when relevant.
- APIs: representative endpoint and failure behavior.
- Data and auth: invariants, permissions and migration behavior in an authorized environment.
- Performance: comparable baseline and after measurements in the same environment.
- Documentation: check links and examples appropriate to the change.

Review separately: requested behavior, omitted requirements, unintended changes, error handling, security, architecture, maintainability and appropriate test coverage. Report review limitations and independence honestly.

## 6. Risk and authorization

Assess risk by **impact, reversibility and blast radius**, not changed-line count.

| Tier | Examples | Expected approach |
| --- | --- | --- |
| Low | copy, simple documentation | focused checks and diff inspection |
| Normal | ordinary product change | relevant runtime or test evidence and review |
| High | authentication, RLS, secrets, billing, production data, migrations, architecture | explicit invariants, stronger checks and careful review |

Do not perform unauthorized production changes. A passing test does not make a destructive operation reversible or grant permission. Permissions, hooks, isolation and network controls must be enforced by the host and infrastructure, not merely promised in a skill.

## 7. Web specialist route

For web work, keep existing project design systems and applicable framework guidance in view. Determine whether the current component actually meets the requirement, including accessibility. Use [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance) where it is relevant and available; do not duplicate its guides. If unavailable, state that and use an appropriate documented fallback.

For browser features, determine supported browsers; if no target is documented, state the assumption. Use compatibility data and progressive enhancement when justified; report actual browsers tested. Avoid replacing an existing component with native markup solely because generic guidance recommends it; fix or replace a component if it fails the requirement.

Modernization is an explicit scoped workflow: scan requested files, inspect in context, filter false positives and intentional fallbacks, rank findings, implement authorized changes and verify. A clean static scan does not prove full accessibility or browser compatibility.

[UI SDK](https://github.com/vercel-labs/ui) is an optional beta runtime dependency only for a concrete interaction that existing components cannot reasonably support. It is not required by this plugin. If an agent bridge is ever introduced, check current permissions, read visibility, confirmation semantics, partial-action behavior and server-side authorization. API-driven actions do not replace keyboard and pointer testing.

Test specialist routing: a web accessibility task uses relevant available guidance; a backend-only task does not load irrelevant UI guidance; unavailable guidance yields an honest fallback. Never place secrets in search arguments; verify current telemetry behavior before relying on an opt-out.

## 8. Project-specific verification recipe

Adapt the useful method from [pstack create-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md), not Cursor-specific assumptions. For the first approved pilot, document what is actually observed:

- Launch command and readiness; required environment, fixtures and authentication without storing secrets.
- Safe isolation, ports and data; avoid affecting another person's session.
- How to drive one representative real user journey using existing harnesses first.
- Stable selectors or API handles; observable output and relevant side effects.
- Evidence destination and teardown for only the processes created by the run.
- Execute the recipe once if the environment and authorization permit. Mark missing preconditions or untested steps.

Start with one useful flow. A feature map can grow when it pays for itself; it is not a universal v1 prerequisite.

## 9. Distribution, synchronization and versions

GitHub is the source of truth for plugin source. Do not treat the currently public repository as private. The recommended deployment model is skills and references distributed via a Git-backed Codex marketplace: no persistent service is required to host these files.

1. Version and review changes in the repository.
2. Install from a supported marketplace; test in a fresh Codex session.
3. Refresh or upgrade the marketplace on each machine after a change, then verify the installed revision and new session behavior. Do not promise instant or automatic synchronization without a verified mechanism.
4. Document rollback by pinning or restoring a known good version/ref. Document any cache/restart behavior observed.

Consult [OpenAI packaging](https://developers.openai.com/plugins/build/plugins) for current manifests, marketplace format and supported surfaces. Test the actual chosen client. Installing on one environment does not establish support on Windows, the VM, ChatGPT web, Claude Code, or an IDE extension. Record each as verified or unverified. Never claim the Notion spec itself is an installed plugin.

## 10. Outcome summaries and metrics

A skills-only package cannot automatically access every provider's traces, costs or sessions. Begin with an opt-in, user-controlled **local summary** per meaningful task, written only when authorized and supported. Recommended fields:

```yaml
schema_version: 1
factory_version: "<version-or-commit>"
project: "<project>"
task: "<short goal; omit sensitive data>"
base: "<ref-or-unknown>"
final_revision: "<sha-or-unknown>"
worktree_state: "<clean, dirty, or unknown>"
environment: "<tested environment>"
outcome: "<completed, ready-for-review, blocked, or unknown>"
verification: "<concise passed/failed/not-checked summary>"
review: "<review scope and independence>"
duration: null
cost: null
lesson: "<optional; no improvement justified is valid>"
```

The schema is illustrative, not proof of an existing telemetry API. Use null/unknown for missing information; never infer dollar costs from subscription usage. Avoid storing credentials, full prompts, private diffs or unrelated transcripts. Specify storage location, access, retention, deletion and opt-in before implementing persistence or synchronization.

Later, if evidence justifies it, aggregate measured cycle time, verified outcomes, rework and reverted changes; track denominators and collection coverage. A dashboard, automated capture, hosted service, benchmark suite and cross-machine run data sync are follow-on features, not v1 assumptions.

## 11. Source mapping and adaptation

| Source | Take into the factory | Constraint |
| --- | --- | --- |
| [Warp factory talk](https://www.youtube.com/watch?v=nKjPBAw_N_0) | Factory as code, optional measurement and improvement | Enterprise-scale claims are not a v1 requirement |
| [Potato foundations talk](https://www.youtube.com/watch?v=O_zcc6Xl12g) | Good architecture, guardrails, runtime verification | Do not adopt blanket rules or auto-merge by default |
| [Anthropic practices talk](https://www.youtube.com/watch?v=vlfCjWuv4es) | Clear intent, isolation, checks, separate review | Verify host-specific permissions and hook behavior |
| [Matt Pocock skills](https://github.com/mattpocock/skills) | Composable planning, TDD and two-axis review | Check side effects and dependencies before invoking |
| [Domain agents talk](https://www.youtube.com/watch?v=wIPr9GmLRaQ) | Focused responsibilities and least privilege | Roles need not be separate deployed agents |
| [Warp self-improvement talk](https://www.youtube.com/watch?v=pz74r-4dGfQ) | Analyze recurring failures and improve based on evidence | Selective, privacy-aware; LLM judgment is not proof |
| [Tstack](https://github.com/t3dotgg/tstack) | PR filing and CI follow-up ideas | Do not silently commit, publish, merge or force-push |
| [HumanLayer talk](https://www.youtube.com/watch?v=ix1qQK1IvmA) | Proportional planning and long-term maintainability | Benchmark results are scoped, not universal laws |
| [Matt/Potato interview](https://www.youtube.com/watch?v=MN9dGgmLyso) | Build trust from direct verification and tailored workflows | PR volumes are self-reported and partly gardening |
| [Modern Web Guidance](https://developer.chrome.com/blog/modern-web-guidance-v1) | Platform guidance and modernization, on demand | Existing project requirements and actual browser testing still matter |
| [SlopCodeBench paper](https://arxiv.org/abs/2603.24755) | Test iterative maintainability | Does not prove all AI-produced code deteriorates |

The video transcripts were supplied by the user; do not treat model names, numbers or vendor claims as independently verified. The earlier Sol 6.1 review read a summary of v3 and the supplied Matt/Potato interview, not all full transcripts. Matt's channel https://www.youtube.com/@mattpocockuk/videos is a discovery source, not proof of a specific claim.

## 12. Acceptance scenarios

For each scenario document actual input, expected behavior, execution result and evidence. Use an isolated test fixture; do not mutate real production systems. A static schema check is not a behavior test.

1. **Read-only dirty worktree:** inspect relevant changes, preserve unrelated edits, and do not commit, push, publish or mutate.
2. **UI bug + review fix:** exercise the real flow when feasible; after a meaningful code fix rerun affected checks; if browser access is unavailable, report the gap and its effect.
3. **High-risk small diff:** recognize auth/RLS or migration risk; verify in permitted environment and do not execute unauthorized production actions.
4. **Incompatible skill:** identify a skill that commits or publishes beyond the request, do not invoke that behavior; use a compatible fallback.
5. **Missing essential evidence:** clearly mark not checked and readiness impact; do not claim full verification.
6. **Preferences and routing:** respect user/project/model settings; use relevant web guidance when available; do not load frontend guidance for backend-only work; report missing specialist fallback.
7. **Component and compatibility:** reuse a suitable existing component; address real accessibility gaps; state browser assumptions and actual tested browsers.
8. **Synchronization:** update a version in a test marketplace, refresh in the supported environment, start a new session and confirm the observed version; mark unavailable machines unverified.
9. **Privacy and metrics:** no default secret/transcript collection; optional summary uses unknown/null for unexposed cost and does not enter the public repository accidentally.
10. **Improvement:** no repeated issue yields “no improvement justified”; supported recurring issue yields a reviewable, testable proposal.

## 13. Build sequence

1. Read repository instructions, current Codex plugin and Agent Skills documentation; identify the supported host and validate the chosen package/marketplace format.
2. Inspect existing available skills and license/compatibility; do not assume skills present on this assistant are installed on the user's VM.
3. Implement the four thin skills and referenced rules, with explicit availability and side-effect fallbacks.
4. Add minimal documentation, a safe optional outcome-summary template and meaningful validation/scenario fixtures.
5. Run packaging checks and actual supported-host invocation scenarios; record failures and gaps.
6. Configure/test update flow and version visibility in the available environment. Do not modify remote machines without authorization or access.
7. Pilot on an approved small real issue. Keep pilot project modifications in the authorized boundary.
8. Deliver the implementation with exact revision, test evidence, limitations, and next steps. Do not represent proposed dashboard, real telemetry or deployment as done.

## 14. Scope exclusions

No mandatory cloud service, hosted MCP, dashboard, UI SDK dependency, auto-merging, model council, fleet of micro-agents, bulk source copying, production migration, scheduled analysis or blanket framework rewrite in v1. Any later additions need a concrete use case, cost and privacy model, and their own validation.

## 15. Reference documentation

- [OpenAI plugin packaging and Git marketplaces](https://developers.openai.com/plugins/build/plugins)
- [Agent Skills specification](https://agentskills.io/specification)
- [Modern Web Guidance installation](https://developer.chrome.com/docs/modern-web-guidance/get-started)
- [Modernization workflow](https://developer.chrome.com/docs/modern-web-guidance/modernization-workflow)
- [UI SDK agent permissions](https://ui-sdk.dev/docs/agents/connect-an-agent/permissions)
- [Matt Pocock skill collection](https://github.com/mattpocock/skills)
- [Tstack](https://github.com/t3dotgg/tstack)

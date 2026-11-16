# EGA Software Factory

This repository packages a personal software workflow for existing coding agents. The product is four skills, shared references and the smallest distribution tooling needed to use them across supported hosts. It is not a new coding-agent platform.

## Working style

Understand the real constraint and make the smallest maintainable change. Reuse existing code and workflows before adding machinery. Resolve routine choices yourself, preserve unrelated work, and continue to the authorized outcome without repeatedly asking permission.

Search before reading; load only relevant files. Keep changes scoped. Do not add abstractions, dependencies, tracking files or extra review rounds without a concrete need. User instructions can override these project defaults; host and tool permissions still apply.

## Local VM

When running on Linux host `openclaw` as user `ubuntu`, verify the environment and executable `/home/ubuntu/.local/bin/heavy`, then read `/home/ubuntu/.config/agent-vm/AGENTS.md` before project commands. Apply those rules only on that VM. Do not change host configuration or stop unrelated processes as a side effect of repository work.

## Environment files and credentials

You have standing permission to inspect and use relevant environment files, including `.env` and `.env.*`, and existing credentials to complete the authorized task. Do not ask again merely because a needed value is in an environment file. Use only the relevant values and confirm the destination account or project before external writes.

Keep secret values out of chat, tool output, logs, commits, tests, release bundles and returned MCP content. Report variable names and authentication status rather than values. Prefer loading credentials directly into the command or client that needs them instead of printing whole files. Preserve unrelated values; change environment configuration only when the task requires it. Credential access does not expand the requested task or authorize unrelated operations.

## Repository map

- `skills/`: the four canonical workflow entry points.
- `references/` and `templates/`: shared guidance and optional outcome records.
- `.codex-plugin/`, `.agents/plugins/`, `.opencode/`: current host packaging and discovery configuration.
- `fixtures/` and `tests/scenarios/`: focused checks, including mock delivery and summary validation.
- `docs/v1-shipping-plan.md`: portable distribution scope, build order and release gates.
- `docs/v4-acceptance-status.md`: observed acceptance evidence and remaining gaps.

`bin/` and `lib/` contain the dependency-free npm installer; `scripts/build-bundle.js` generates its portable guidance. `scripts/build-worker.mjs` adapts that same bundle for the read-only `worker/`. `.github/workflows/release.yml` publishes stable tags through `scripts/release/`. Check observed release evidence before claiming a channel is live.

## Product defaults

Keep one canonical workflow source. Generate distribution content from it rather than maintaining separate npm, plugin and MCP instructions by hand. Keep installed references portable and versions visible. Local updates should preserve unrelated files and local edits, and provide rollback.

Build the portable installer before hosted MCP. Keep hosted MCP limited to retrieving released guidance unless the user explicitly expands its scope. No dashboard, database, model router, background updater or remote execution service by default.

## Verification and review

Run the narrowest relevant checks. For delivery fixture changes, use `bash fixtures/t10/run-scenarios.sh`; for summary validation changes, use `bash tests/scenarios/summary/run-scenarios.sh`. Documentation-only edits normally need a diff review, link checks where relevant and `git diff --check`, not both scenario suites.

Verify behavior against the final change. A mock passing is not proof of real provider behavior, filesystem presence is not proof of host discovery, and retrieval of instructions is not proof that an agent follows them. Record missing essential evidence and its practical consequence. Label same-agent review honestly.

Independent review is optional and follows `skills/factory-verify/SKILL.md`: respect the selected model and allow at most two reviewer runs per task. Do not delegate unless the user or applicable instructions authorize it. After relevant checks and review pass, proceed; more tests or reviews need a concrete finding, changed requirement or invalidated evidence.

## Delivery and releases

Follow the user's requested boundary. A request to get a scoped change live covers its necessary merge and deployment steps; assess automatic effects early. A PR-only request stops at the PR. Reuse existing authorization, distinguish permission from technical readiness, and ask only about unresolved consequential uncertainty.

Do not publish packages, create releases or deploy merely because credentials are available. When shipping is authorized, use the stable tagged-release process in the shipping plan and report each channel's actual result. Keep unfinished work on main from automatically advancing the stable hosted workflow.

## Communication

Be short and concrete. Report what changed, checks and results, and remaining material gaps. Do not invent readiness, independence, costs or tool use. Maintain existing documentation when behavior changes; avoid duplicate implementation diaries or broad cleanup during focused work.

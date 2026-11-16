# V1 distribution evidence

Observed on 2026-11-16 on Linux `openclaw` (Node 24 locally; Node 22 in GitHub Actions).

## Released candidate

- Stable release: [v1.0.1](https://github.com/egawilldoit/EGA-Software-Factory/releases/tag/v1.0.1).
- Exact source: `8f46e305579e2141888f6a47118457040814298d`.
- Package: `@egawilldoit/factory@1.0.1`.
- MCP: `https://ega-software-factory.a2003-2015.workers.dev/mcp`.
- [Package CI](https://github.com/egawilldoit/EGA-Software-Factory/actions/runs/43875358272) passed 19 installer scenarios and 26 Worker checks.
- [Release workflow](https://github.com/egawilldoit/EGA-Software-Factory/actions/runs/43875418276) passed publication, GitHub release creation and live Cloudflare health identity verification.

V1.0.0 published successfully to npm and GitHub but failed Cloudflare health verification: the module exported a function instead of the Workers `{ fetch }` contract. V1.0.1 fixes both entry points and adds a regression check against the generated deployment module. Published versions and tags were preserved.

## Observed distribution checks

The official MCP TypeScript SDK connected to the live Streamable HTTP endpoint, discovered all three tools, retrieved all 18 current-release items and verified their hashes against the GitHub release bundle. The same checks passed for pinned v1.0.0 retrieval; the default remained v1.0.1. Invalid IDs and unavailable versions returned errors without falling back to another release. These checks cover retrieval, not agent execution.

Installer scenarios cover ownership, local edits, install/update/rollback/uninstall, interrupted recovery and filesystem boundaries. The review found that newly introduced update/rollback paths needed boundary checks too. The regression failed before that fix and passed afterwards; recovery checks the union of relevant paths before writing. Two separate HY4 reviewer runs were used; the final fixes received a same-agent review and focused regression verification.

## Published package and host checks

The public npm v1.0.1 archive matched the GitHub release archive byte for byte:
SHA-256 `b58642dd85ebba8cb908c30ffd5a7646425b317661d0d801619e0e99d971e64b`.
Using public `npm exec` in an isolated home, install v1.0.0 → update v1.0.1 →
doctor → rollback v1.0.0 → rollback v1.0.1 → doctor → uninstall all passed.
No existing personal skill installation was changed.

Codex app-server skill discovery found all four skills from the released archive
in an isolated default `~/.agents` installation. No Codex model turn was run.
OpenCode `opencode-go/hy4-flash-free` discovered the same installed
skills without explicit skill-path registration, loaded `factory` through its
native skill tool, resolved a shared reference and ran `doctor` successfully.
That bounded read-only usability pilot used the released v1.0.1 archive. It does
not establish behavior on a production coding or rollout task.

## Limits

- ChatGPT custom MCP connection testing is deferred; no ChatGPT compatibility claim.
- Windows and macOS are unverified.
- T3 slash-menu keypresses were not observed.
- No production coding task, application deployment or database change was performed by this guidance service.
- Full factory behavior acceptance (T12) remains incomplete; distribution checks do not close it.
- The hosted service retains current and previous guidance. A live service rollback deployment was not performed; pinned previous retrieval was verified.

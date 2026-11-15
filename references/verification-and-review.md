# Verification and Review

Evidence must correspond to the final scoped diff, base/ref, and working-tree state. For each essential criterion report passed, failed, or not checked with command/output/artifact and readiness impact.

- Logic: focused meaningful tests plus relevant type/lint/build checks.
- UI: real user flow, keyboard, focus, responsive behavior, accessible names, reduced motion.
- APIs: representative endpoint and failure behavior.
- Data/auth: invariants, permissions, migration behavior in authorized environments.
- Performance: comparable baseline and after measurements in the same environment.
- Docs: links and examples appropriate to the change.

Review separately: requested behavior, omitted requirements, unintended changes, error handling, security, architecture, maintainability, test coverage. Label same-agent review as `same-agent`. Repeat checks invalidated by later edits. Missing essential evidence affects readiness.
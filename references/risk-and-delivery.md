# Risk and Delivery

Assess risk by impact, reversibility, and blast radius, not changed-line count.

- Low: copy, simple docs; focused checks and diff inspection.
- Normal: ordinary product change; relevant runtime/test evidence and review.
- High: auth, RLS, secrets, billing, production data, migrations, architecture; explicit invariants and stronger checks.

Deliver at the exact authorized boundary. Read-only/local tasks perform no unauthorized external write. PR creation does not imply merge. Explicitly authorized merge/deployment follows project rules. Provider limitations and unverified steps remain visible. A passing test does not make a destructive operation reversible or grant permission.
# Generated release bundle interface

The parent supplies one generated JSON file; the worker contains no workflow text of its own.

**Input path:** `worker/generated/released-guidance.json`
**Loaded by:** `src/index.mjs` (Wrangler/esbuild import) and `scripts/build-api-module.mjs` (inlined into one ES module for the Cloudflare API).
**Validation:** `createGuidanceIndex()` in `src/worker.mjs` fails fast at startup on any violation below.

## Shape

```json
{
  "schemaVersion": 1,
  "generator": "canonical bundle adapter v1",
  "generatedAt": "2026-11-16T00:00:00Z",
  "defaultVersion": "1.0.0",
  "releases": [
    {
      "version": "1.0.0",
      "sourceCommit": "<full 40-char source commit>",
      "releasedAt": "<ISO-8601>",
      "notes": "optional string",
      "items": [
        {
          "id": "factory",
          "kind": "skill",
          "title": "Factory",
          "description": "short public description",
          "body": "# Factory\n\n<guidance text, relative links resolved or closed>",
          "sha256": "<content hash from the canonical bundle>",
          "references": ["reference:workflow", "doc:v4-acceptance-status"]
        }
      ]
    }
  ]
}
```

## Field rules

- `schemaVersion`: must be `1`.
- `defaultVersion`: must equal `releases[0].version`; that release is "current".
- `releases`: non-empty; `releases[1]` (when present) is "previous"; any others are archived but still retrievable by exact version.
- Each release must be self-contained: all items it serves are inside that release. The worker never merges items across releases. A pinned `version` argument reads only that release.
- First release: emit only the current release. Do not invent a previous release. Add the previous immutable release only when an actual prior release exists.
- `version`, `sourceCommit`, `releasedAt`: non-empty strings. `sourceCommit` is the source commit of that release, not a deployment id.
- `items[].kind`: one of `skill`, `reference`, `doc`, `template`. `doc` covers the two files linked from references as `../docs/*.md`; resolve those links into `doc:` ids so retrieval is possible.
- `items[].id`: must be in the allowlist below. Unknown ids are ignored (never served). Duplicate ids within a release are an error.
- `items[].body`: non-empty guidance text only. No executable content, no secrets, no absolute paths, no network instructions.
- `items[].sha256`: optional content hash for parity checks with the packed local artifact.
- `items[].references`: optional array of item ids this item links to. Use it to make docs/reference links retrievable.

## Allowlist (exact ids)

| kind | ids |
| --- | --- |
| skill | `factory`, `factory-plan`, `factory-verify`, `factory-improve` |
| reference | `reference:workflow`, `reference:skill-compatibility`, `reference:verification-and-review`, `reference:risk-and-delivery`, `reference:pr-workflows`, `reference:takeover-and-modernize`, `reference:web-guidance`, `reference:improvement-and-metrics`, `reference:planning`, `reference:synchronization`, `reference:task-summary` |
| doc | `doc:authorization-and-completion-scenarios`, `doc:v4-acceptance-status` |
| template | `template:task-summary` |

Four references link to both docs: `verification-and-review`, `risk-and-delivery`, `pr-workflows`, `takeover-and-modernize`.

## Notes for the adapter

- `npm run build` generates `worker/generated/released-guidance.json` from the canonical bundle. Release deployment rejects development placeholders and mismatched source identity.
- `worker/fixtures/sample-release-bundle.json` is test-only. Its two-release variant in the tests is constructed inline, never deployed.
- No environment variables or secrets are read. No file paths, URLs, shell commands or repository data are accepted from tool arguments; only `id` and `version` are, and both are validated.

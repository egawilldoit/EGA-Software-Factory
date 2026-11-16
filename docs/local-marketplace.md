# Contributor checkout and local marketplace

Historical Linux Codex CLI 0.169.0 evidence, 2026-11-15. Version numbers below describe that run. For portable installation, use the npm commands in the root README. Avoid installing the same skills through both mechanisms.

## Local marketplace


```sh
codex plugin marketplace add /path/to/EGA-Software-Factory
codex plugin add ega-software-factory@ega-software-factory
codex plugin list
```

Expected: plugin name ega-software-factory, version 0.1.0, cache under ~/.codex/plugins/cache/ega-software-factory/ega-software-factory/0.1.0/.

Notes: Git-backed marketplace install/upgrade not exercised (unverified). Adding same marketplace name from a different path requires removing it first. Plugin must be installed before invoking skills.

## Refresh and rollback


Source of truth: marketplace source dir or repo revision. Installed copy: ~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/. Version in .codex-plugin/plugin.json.

Refresh (local marketplace; observed):
1. codex plugin marketplace add /path/to/marketplace-vA --json
2. codex plugin add ega-software-factory@ega-software-factory --json  (observed 0.1.0)
3. Update same marketplace source to version B.
4. codex plugin add ega-software-factory@ega-software-factory --json  (observed 0.2.0, old cache removed)
5. Start fresh Codex session and invoke $factory.

Notes: codex plugin marketplace upgrade applies to Git marketplaces; local refresh by re-running add. No automatic instant sync; reinstall + fresh session required. Plugin updates are not task-summary sync.

Rollback:
1. Restore marketplace source to known-good (or remove/re-add pointing to preserved source).
2. codex plugin add ega-software-factory@ega-software-factory --json (observed returns to 0.1.0, newer cache removed).

Alternative full remove/reinstall:
```sh
codex plugin remove ega-software-factory@ega-software-factory --json
codex plugin marketplace remove ega-software-factory
# add preserved known-good marketplace, then install
```
Rollback requires preserved known-good source; Codex does not keep multiple versions in cache.

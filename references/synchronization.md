# Plugin synchronization and rollback (T11)

This document covers **plugin package updates and rollback only**. It is separate from task-summary synchronization, which remains opt-in and local.

## Source vs installed copies

- Source of truth: the marketplace source directory or repository revision.
- Installed copy: `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`.
- Version is declared in `.codex-plugin/plugin.json` (`version`).
- `codex plugin list` reports the installed version and source root.
- The installed cache directory name also contains the version, which makes source and installed copies distinguishable.

## Tested host

- Host: `openclaw` (Linux), user `ubuntu`.
- Client: Codex CLI `0.169.0`.
- Observed on: 2026-11-15.

## Isolated testing rule

Use a newly created isolated `CODEX_HOME` and temporary marketplace so the real user configuration is not changed. Authentication may be needed for an invocation; use the host's supported authentication method and protect any credentials. The install and list checks do not establish that a fresh home can invoke a model without authentication.

```sh
CODEX_HOME="$(mktemp -d)"
export CODEX_HOME
```

## Refresh workflow

1. Add a marketplace pointing at a version-A source:

   ```sh
   codex plugin marketplace add /path/to/marketplace-v0.1.0 --json
   ```

2. Install version A:

   ```sh
   codex plugin add ega-software-factory@ega-software-factory --json
   ```

   Observed: installed path `.../ega-software-factory/0.1.0`, `codex plugin list` reports `0.1.0`.

3. Update the same marketplace source to version B (same path, new content/version).

4. Refresh by reinstalling from the same marketplace:

   ```sh
   codex plugin add ega-software-factory@ega-software-factory --json
   ```

   Observed: installed path switches to `.../ega-software-factory/0.2.0`; the old `0.1.0` cache directory is removed; `codex plugin list` reports `0.2.0`.

5. Start a fresh Codex session and invoke `$factory`. The session reads the updated cache and reports version `0.2.0`.

Notes:
- `codex plugin marketplace upgrade` applies to configured Git marketplaces. For a local marketplace, refresh is performed by re-running `codex plugin add` after the source changes.
- There is no automatic instant synchronization; a reinstall (and a fresh session for skill use) is required.
- A marketplace source path cannot be silently repointed: adding the same marketplace name from a different path requires removing it first.

## Rollback workflow

To return to a known-good version:

1. Restore the marketplace source to the known-good version (or remove and re-add a marketplace pointing at a preserved known-good source).
2. Reinstall:

   ```sh
   codex plugin add ega-software-factory@ega-software-factory --json
   ```

   Observed: installed path returns to `.../ega-software-factory/0.1.0`; `codex plugin list` reports `0.1.0`; the `0.2.0` cache directory is removed.

Alternative, fully remove then reinstall:

```sh
codex plugin remove ega-software-factory@ega-software-factory --json
codex plugin marketplace remove ega-software-factory
# add preserved known-good marketplace, then install
```

## Evidence (T11 run)

| Step | Command (abbreviated) | Observed |
| --- | --- | --- |
| Install A | `codex plugin add ...` | version `0.1.0`, cache `.../0.1.0` |
| Refresh to B | mutate source, `codex plugin add ...` | version `0.2.0`, cache `.../0.2.0`, old cache removed |
| Fresh session | `codex exec "Use $factory..."` | reports `0.2.0` |
| Rollback to A | restore source, `codex plugin add ...` | version `0.1.0`, cache `.../0.1.0`, B cache removed |

Host/client: `openclaw`, Codex CLI `0.169.0`.

## Limitations

- Windows and other VMs are unverified.
- Git-marketplace `upgrade` behavior was not exercised here; only local-source reinstall was tested.
- Rollback requires a preserved known-good source (or a previously cached version); Codex does not keep multiple versions in cache after reinstall.
- Plugin updates are not task-summary synchronization and do not change user data.
- Plugin invocation in a session uses the cache present at session start; start a new session after refresh.

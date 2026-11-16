'use strict';

const fsu = require('./fs-util');
const { readManifest, buildManifest } = require('./manifest');
const { checkInstalledIntegrity, runRecovery, acquireLock, releaseLock, updateLockPhase } = require('./recovery');
const { stageBundle, writePendingManifest, replaceManagedFiles, savePrevious, clearTransientFiles } = require('./ops-util');
const { refuse } = require('./errors');
const { assertMetadataBoundary, assertManagedBoundary } = require('./boundary');
const { EXIT } = require('./constants');

function update({ paths, bundle, opts }) {
  assertMetadataBoundary(paths);
  const probe = readManifest(paths);
  assertManagedBoundary(paths, probe);
  const recovery = runRecovery(paths);
  const current = readManifest(paths);
  if (!current) {
    throw refuse('Nothing is installed at this destination.', 'Run install first.');
  }

  const check = checkInstalledIntegrity(paths, current);
  if (!check.ok) {
    throw refuse(
      'Refusing to update: the installed bundle has local edits or is incomplete.',
      'Run doctor for details. Move your edits aside before updating.'
    );
  }

  if (current.version === bundle.version) {
    return {
      ok: true,
      changed: false,
      installed: current.version,
      requested: bundle.version,
      recovery,
      notes: ['Already at the requested version; nothing to do.'],
      exitCode: EXIT.OK,
    };
  }

  acquireLock(paths, 'update');
  try {
    const next = buildManifest(bundle, opts.host || current.host, paths.dest, {
      installedAt: current.installedAt,
    });

    stageBundle(bundle, paths);
    savePrevious(paths, current);
    writePendingManifest(paths, next);
    updateLockPhase(paths, 'replacing');
    replaceManagedFiles(paths, paths.stagingDir, current, next);
    fsu.writeJsonAtomic(paths.manifestPath, next);
    clearTransientFiles(paths);

    return {
      ok: true,
      changed: true,
      installed: current.version,
      requested: next.version,
      version: next.version,
      sourceCommit: next.sourceCommit,
      previous: current.version,
      recovery,
      notes: ['Previous bundle kept for rollback.'],
      exitCode: EXIT.OK,
    };
  } catch (err) {
    try { runRecovery(paths); } catch (_) {}
    throw err;
  } finally {
    releaseLock(paths);
  }
}

module.exports = { update };

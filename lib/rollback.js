'use strict';

const path = require('path');
const fsu = require('./fs-util');
const {
  readValidManifestOrNull,
  checkInstalledIntegrity,
  runRecovery,
  acquireLock,
  releaseLock,
  updateLockPhase,
  completeSet,
} = require('./recovery');
const { replaceManagedFiles, preserveModified } = require('./ops-util');
const { refuse } = require('./errors');
const { assertMetadataBoundary, assertManagedBoundary } = require('./boundary');

function rollback({ paths }) {
  assertMetadataBoundary(paths);
  const probe = readValidManifestOrNull(paths, paths.manifestPath);
  assertManagedBoundary(paths, probe);
  const recovery = runRecovery(paths);
  const current = readValidManifestOrNull(paths, paths.manifestPath);
  if (!current) throw refuse('Nothing is installed at this destination.', 'Run install first.');

  const previous = readValidManifestOrNull(paths, paths.previousManifest);
  if (!previous || !completeSet(paths.previousDir, previous)) {
    throw refuse('No usable previous bundle is available for rollback.', paths.previousDir);
  }

  const notes = [];
  acquireLock(paths, 'rollback');
  try {
    const check = checkInstalledIntegrity(paths, current);
    const preserved = preserveModified(paths, current, check.issues);
    if (preserved) notes.push(`Locally modified files were preserved at ${preserved}.`);

    // Swap: the rolled-back-from version becomes the new single previous.
    const tmp = path.join(paths.metaDir, 'rollback-current');
    fsu.removeTree(tmp);
    fsu.ensureDir(tmp);
    for (const rel of Object.keys(current.files)) {
      const p = path.join(paths.dest, rel);
      if (fsu.isFile(p)) fsu.copyFileAtomic(p, path.join(tmp, rel));
    }
    fsu.writeJsonAtomic(path.join(tmp, 'manifest.json'), current);

    updateLockPhase(paths, 'replacing');
    replaceManagedFiles(paths, paths.previousDir, current, previous);
    fsu.writeJsonAtomic(paths.manifestPath, previous);

    fsu.removeTree(paths.previousDir);
    fsu.ensureDir(paths.previousDir);
    for (const rel of Object.keys(current.files)) {
      fsu.copyFileAtomic(path.join(tmp, rel), path.join(paths.previousDir, rel));
    }
    fsu.writeJsonAtomic(paths.previousManifest, current);
    fsu.removeTree(tmp);

    return {
      ok: true,
      from: current.version,
      to: previous.version,
      version: previous.version,
      recovery,
      notes,
    };
  } catch (err) {
    try { runRecovery(paths); } catch (_) {}
    throw err;
  } finally {
    releaseLock(paths);
  }
}

module.exports = { rollback };

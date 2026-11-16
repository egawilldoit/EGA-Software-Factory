'use strict';

const fs = require('fs');
const path = require('path');
const fsu = require('./fs-util');
const { readValidManifestOrNull, checkInstalledIntegrity, runRecovery, acquireLock, releaseLock } = require('./recovery');
const { preserveModified } = require('./ops-util');
const { refuse } = require('./errors');
const { assertMetadataBoundary, assertManagedBoundary } = require('./boundary');
const { SKILL_NAMES } = require('./constants');

function removeEmptyDir(dir) {
  try { if (fs.lstatSync(dir).isSymbolicLink()) return; } catch (_) { return; }
  if (fsu.isDirectory(dir) && fs.readdirSync(dir).length === 0) {
    try { fs.rmdirSync(dir); } catch (_) {}
  }
}

function uninstall({ paths }) {
  assertMetadataBoundary(paths);
  const probe = readValidManifestOrNull(paths, paths.manifestPath);
  assertManagedBoundary(paths, probe);
  const recovery = runRecovery(paths);
  const current = readValidManifestOrNull(paths, paths.manifestPath);
  if (!current) throw refuse('Nothing is installed at this destination.', 'Run install first.');

  const notes = [];
  acquireLock(paths, 'uninstall');
  try {
    const check = checkInstalledIntegrity(paths, current);
    const preserved = preserveModified(paths, current, check.issues);
    if (preserved) notes.push(`Locally modified files were preserved at ${preserved}.`);

    // Delete only owned file paths from the manifest.
    for (const rel of Object.keys(current.files)) {
      const p = path.join(paths.dest, rel);
      if (fsu.isFile(p)) fs.unlinkSync(p);
    }
    // Remove only the directories we own, and only when empty.
    for (const name of SKILL_NAMES) removeEmptyDir(path.join(paths.skillsRoot, name));
    for (const name of ['references', 'templates', 'docs']) removeEmptyDir(path.join(paths.dest, name));
    removeEmptyDir(paths.skillsRoot);

    fsu.removeTree(paths.metaDir);

    return {
      ok: true,
      removedVersion: current.version,
      recovery,
      notes,
    };
  } finally {
    releaseLock(paths);
  }
}

module.exports = { uninstall };

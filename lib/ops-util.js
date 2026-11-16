'use strict';

const fs = require('fs');
const path = require('path');
const fsu = require('./fs-util');
const { completeSet } = require('./recovery');
const { installedPath } = require('./paths');
const { integrity } = require('./errors');

function stageBundle(bundle, paths) {
  fsu.removeTree(paths.stagingDir);
  fsu.ensureDir(paths.stagingDir);
  for (const entry of bundle.descriptor.files) {
    fsu.copyFileAtomic(
      path.join(bundle.filesRoot, entry.path),
      path.join(paths.stagingDir, entry.path)
    );
  }
  const asManifest = { files: {} };
  for (const entry of bundle.descriptor.files) asManifest.files[entry.path] = entry.sha256;
  if (!completeSet(paths.stagingDir, asManifest)) {
    throw integrity('Staged bundle failed hash verification.', paths.stagingDir);
  }
  return paths.stagingDir;
}

function writePendingManifest(paths, manifest) {
  fsu.writeJsonAtomic(paths.pendingManifest, manifest);
}

function removeManagedFiles(paths, manifest) {
  if (!manifest) return;
  for (const rel of Object.keys(manifest.files)) {
    const p = installedPath(paths, rel);
    if (fsu.isFile(p)) fs.unlinkSync(p);
  }
}

function replaceManagedFiles(paths, sourceRoot, currentManifest, newManifest) {
  removeManagedFiles(paths, currentManifest);
  for (const rel of Object.keys(newManifest.files)) {
    fsu.copyFileAtomic(path.join(sourceRoot, rel), installedPath(paths, rel));
  }
}

function savePrevious(paths, currentManifest) {
  fsu.removeTree(paths.previousDir);
  fsu.ensureDir(paths.previousDir);
  for (const rel of Object.keys(currentManifest.files)) {
    fsu.copyFileAtomic(installedPath(paths, rel), path.join(paths.previousDir, rel));
  }
  fsu.writeJsonAtomic(path.join(paths.previousDir, 'manifest.json'), currentManifest);
}

function clearTransientFiles(paths) {
  fsu.removeTree(paths.stagingDir);
  if (fsu.pathExists(paths.pendingManifest)) {
    try { fs.unlinkSync(paths.pendingManifest); } catch (_) {}
  }
}

// Keep a copy of locally modified owned files before anything overwrites or
// deletes them. One timestamped directory; no separate tracking machinery.
function preserveModified(paths, manifest, issues) {
  const modified = issues.filter((i) => i.kind === 'modified');
  if (modified.length === 0) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(paths.preservedDir, `${manifest.version}-${stamp}`);
  for (const issue of modified) {
    const src = installedPath(paths, issue.path);
    if (fsu.isFile(src)) fsu.copyFileAtomic(src, path.join(dir, issue.path));
  }
  return dir;
}

module.exports = {
  stageBundle,
  writePendingManifest,
  removeManagedFiles,
  replaceManagedFiles,
  savePrevious,
  clearTransientFiles,
  preserveModified,
};

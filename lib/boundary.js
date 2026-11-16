'use strict';

const fs = require('fs');
const path = require('path');
const { installedPath } = require('./paths');
const { refuse } = require('./errors');

// Symlinks in a parent of the destination (for example a symlinked HOME) are
// acceptable: resolveDestination canonicalises the destination once. Everything
// at or below the destination that this installer writes must be real files and
// directories, otherwise a managed path could escape the installation root.
function symlinkWithin(root, target) {
  const rel = path.relative(root, target);
  if (rel === '') return null;
  if (rel.startsWith('..') || path.isAbsolute(rel)) return target;
  let current = root;
  for (const part of rel.split(path.sep)) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) return current;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return null;
}

function assertBoundary(root, targets, context) {
  const bad = [];
  for (const target of targets) {
    const link = symlinkWithin(root, target);
    if (link) bad.push(link);
  }
  if (bad.length) {
    throw refuse(
      'Refusing to write through a symbolic link inside the destination.',
      (context ? context + '\n' : '') +
      'Symlinked path(s):\n  ' + bad.join('\n  ') +
      '\nReplace these links with real files/directories or use a different --destination.'
    );
  }
}

function metaTargets(paths) {
  return [
    paths.metaDir,
    paths.manifestPath,
    paths.lockFile,
    paths.stagingDir,
    paths.pendingManifest,
    paths.previousDir,
    paths.preservedDir,
  ];
}

function assertMetadataBoundary(paths) {
  assertBoundary(paths.dest, metaTargets(paths), 'Installation metadata boundary check failed.');
}

function assertManagedBoundary(paths, manifest) {
  if (!manifest) return;
  assertBoundary(paths.dest, Object.keys(manifest.files).map((rel) => installedPath(paths, rel)), 'Managed content boundary check failed.');
}

function assertInstallationBoundary(paths, rels) {
  assertMetadataBoundary(paths);
  assertBoundary(paths.dest, rels.map((rel) => installedPath(paths, rel)), 'Managed content boundary check failed.');
}

module.exports = {
  symlinkWithin,
  assertBoundary,
  metaTargets,
  assertMetadataBoundary,
  assertManagedBoundary,
  assertInstallationBoundary,
};

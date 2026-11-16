'use strict';

const fsu = require('./fs-util');
const { readManifest, buildManifest } = require('./manifest');
const { checkInstalledIntegrity, runRecovery, acquireLock, releaseLock, updateLockPhase } = require('./recovery');
const { stageBundle, writePendingManifest, replaceManagedFiles, clearTransientFiles } = require('./ops-util');
const { installedPath, detectConflicts } = require('./paths');
const { refuse } = require('./errors');
const { assertInstallationBoundary } = require('./boundary');
const { EXIT } = require('./constants');

function install({ paths, bundle, opts }) {
  assertInstallationBoundary(paths, bundle.descriptor.files.map((f) => f.path));
  const recovery = runRecovery(paths);
  const existing = readManifest(paths);

  if (existing) {
    const check = checkInstalledIntegrity(paths, existing);
    if (!check.ok) {
      throw refuse(
        'An existing installation is modified or incomplete; refusing to overwrite it.',
        `Run doctor for details. Installed version: ${existing.version}.`
      );
    }
    if (existing.version === bundle.version) {
      return {
        ok: true,
        changed: false,
        version: existing.version,
        recovery,
        notes: ['Already installed at this version; nothing to do.'],
      };
    }
    throw refuse(
      `Installed version ${existing.version} differs from requested ${bundle.version}.`,
      'Use the update command to change versions.'
    );
  }

  const collisions = [];
  for (const entry of bundle.descriptor.files) {
    if (fsu.pathExists(installedPath(paths, entry.path))) collisions.push(entry.path);
  }
  if (fsu.pathExists(paths.metaDir)) collisions.push('.ega-factory (incomplete installation state)');
  if (collisions.length) {
    throw refuse(
      'Refusing to install over files not owned by @egawilldoit/factory.',
      'Conflicting paths:\n  ' + collisions.join('\n  ') +
      '\nUse --destination for an isolated install, or move the existing files aside.'
    );
  }

  const projectConflicts = detectConflicts(process.cwd());

  acquireLock(paths, 'install');
  try {
    const manifest = buildManifest(bundle, opts.host, paths.dest);
    writePendingManifest(paths, manifest);
    stageBundle(bundle, paths);
    updateLockPhase(paths, 'replacing');
    replaceManagedFiles(paths, paths.stagingDir, null, manifest);
    fsu.writeJsonAtomic(paths.manifestPath, manifest);
    clearTransientFiles(paths);

    return {
      ok: true,
      changed: true,
      version: bundle.version,
      sourceCommit: bundle.sourceCommit,
      recovery,
      notes: projectConflicts.length
        ? ['Advisory: same-named skills also exist in this checkout:\n  ' + projectConflicts.join('\n  ')]
        : [],
      exitCode: EXIT.OK,
    };
  } catch (err) {
    try { runRecovery(paths); } catch (_) {}
    throw err;
  } finally {
    releaseLock(paths);
  }
}

module.exports = { install };

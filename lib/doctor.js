'use strict';

const fsu = require('./fs-util');
const { readManifest } = require('./manifest');
const { checkInstalledIntegrity, inspectRecoveryState } = require('./recovery');
const { checkReferences } = require('./references');
const path = require('path');
const { installedPath, hostHint } = require('./paths');
const { symlinkWithin, metaTargets } = require('./boundary');

function diagnose(paths) {
  const manifest = readManifest(paths);
  const recoveryState = inspectRecoveryState(paths);
  if (!manifest) {
    return {
      installed: false,
      ok: false,
      destination: paths.dest,
      notes: [
        'No installation manifest found at ' + paths.manifestPath + '.',
        'Run install first. Host discovery and UI invocation are not checked by doctor.',
      ],
      recovery: recoveryState,
    };
  }

  const missing = [];
  for (const rel of Object.keys(manifest.files)) {
    if (!fsu.isFile(installedPath(paths, rel))) missing.push(rel);
  }
  const registrationOk = missing.length === 0 && fsu.isDirectory(paths.skillsRoot);

  const integrity = checkInstalledIntegrity(paths, manifest);
  const referenceIssues = checkReferences(paths.dest, Object.keys(manifest.files));

  // Doctor is read-only: report unsafe symlinks instead of refusing outright.
  const boundaryIssues = [];
  for (const target of metaTargets(paths)) {
    const link = symlinkWithin(paths.dest, target);
    if (link) boundaryIssues.push({ path: path.relative(paths.dest, link), kind: 'metadata symlink' });
  }
  for (const rel of Object.keys(manifest.files)) {
    const link = symlinkWithin(paths.dest, installedPath(paths, rel));
    if (link) boundaryIssues.push({ path: rel, kind: 'managed symlink' });
  }

  return {
    installed: true,
    ok: registrationOk && integrity.ok && referenceIssues.length === 0 && boundaryIssues.length === 0,
    destination: paths.dest,
    version: manifest.version,
    sourceCommit: manifest.sourceCommit,
    host: manifest.host,
    skillsRoot: paths.skillsRoot,
    registration: {
      ok: registrationOk,
      missing,
      skillsRootPresent: fsu.isDirectory(paths.skillsRoot),
    },
    integrity,
    references: { ok: referenceIssues.length === 0, issues: referenceIssues },
    boundary: { ok: boundaryIssues.length === 0, issues: boundaryIssues },
    recovery: recoveryState,
    notes: [
      'Filesystem registration, content integrity and reference resolution are reported separately.',
      hostHint(manifest.host, paths.skillsRoot, paths.dest),
      'Actual host discovery and UI invocation are NOT verified here; check them in a fresh host session.',
    ],
  };
}

module.exports = { diagnose };

'use strict';

const fs = require('fs');
const path = require('path');
const fsu = require('./fs-util');
const { installedPath } = require('./paths');
const { validateManifest } = require('./manifest');
const { recovery } = require('./errors');
const { assertInstallationBoundary } = require('./boundary');

function checkInstalledIntegrity(paths, manifest) {
  const issues = [];
  for (const [rel, expected] of Object.entries(manifest.files)) {
    const p = installedPath(paths, rel);
    if (!fsu.isFile(p)) {
      issues.push({ path: rel, kind: 'missing' });
      continue;
    }
    const actual = fsu.sha256File(p);
    if (actual !== expected) issues.push({ path: rel, kind: 'modified', expected, actual });
  }
  return { ok: issues.length === 0, issues };
}

// Every manifest-directed read goes through validateManifest first.
function readValidManifestOrNull(paths, file) {
  const raw = fsu.readJsonOrNull(file);
  return raw ? validateManifest(raw, file) : null;
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    if (err.code === 'EPERM') return true; // exists but not signalable
    return false; // ESRCH or invalid
  }
}

function acquireLock(paths, op) {
  fsu.ensureDir(paths.metaDir);
  const data = JSON.stringify({
    pid: process.pid,
    op,
    phase: 'init',
    startedAt: new Date().toISOString(),
  }) + '\n';
  try {
    const fd = fs.openSync(paths.lockFile, 'wx');
    try { fs.writeFileSync(fd, data); } finally { fs.closeSync(fd); }
  } catch (err) {
    if (err.code === 'EEXIST') {
      throw recovery('An installation lock still exists.', paths.lockFile);
    }
    throw err;
  }
}

function updateLockPhase(paths, phase) {
  const lock = fsu.readJsonOrNull(paths.lockFile);
  if (lock) lock.phase = phase;
  fsu.writeJsonAtomic(paths.lockFile, lock || { phase, pid: process.pid });
}

function releaseLock(paths) {
  if (fsu.pathExists(paths.lockFile)) {
    try { fs.unlinkSync(paths.lockFile); } catch (_) {}
  }
}

function inspectRecoveryState(paths) {
  return {
    lock: fsu.readJsonOrNull(paths.lockFile),
    hasStaging: fsu.isDirectory(paths.stagingDir),
    hasPending: fsu.isFile(paths.pendingManifest),
    hasPrevious: fsu.isFile(paths.previousManifest),
  };
}

function completeSet(root, manifest) {
  if (!manifest || !fsu.isDirectory(root)) return false;
  for (const [rel, expected] of Object.entries(manifest.files)) {
    const p = path.join(root, rel);
    if (!fsu.isFile(p) || fsu.sha256File(p) !== expected) return false;
  }
  return true;
}

function buildStagingManifest(paths) {
  if (!fsu.isDirectory(paths.stagingDir)) return null;
  const files = {};
  for (const rel of fsu.listFiles(paths.stagingDir)) {
    files[rel] = fsu.sha256File(path.join(paths.stagingDir, rel));
  }
  return Object.keys(files).length ? { schemaVersion: 1, version: 'staging', files } : null;
}

function buildKnownHashes(manifests) {
  const known = new Map();
  const add = (rel, hash) => {
    if (!known.has(rel)) known.set(rel, new Set());
    known.get(rel).add(hash);
  };
  for (const m of manifests) {
    if (!m || !m.files) continue;
    for (const [rel, hash] of Object.entries(m.files)) add(rel, hash);
  }
  return known;
}

// Recovery may only write/delete bytes that match a manifest we know about.
// Anything else is treated as a local edit and blocks recovery untouched.
function assertSafeToOverwrite(paths, toWrite, toRemove, known) {
  const unsafe = [];
  const rels = new Set([...toWrite, ...toRemove]);
  assertInstallationBoundary(paths, [...rels]);
  for (const rel of rels) {
    const p = installedPath(paths, rel);
    if (!fsu.isFile(p)) continue;
    const actual = fsu.sha256File(p);
    if (!known.has(rel) || !known.get(rel).has(actual)) unsafe.push(rel);
  }
  if (unsafe.length) {
    throw recovery(
      'Refusing recovery: files were modified after an interrupted operation.',
      'Move these files aside, then retry the command:\n  ' + unsafe.join('\n  ') +
      '\nNo files were changed. Manifests: ' + paths.manifestPath
    );
  }
}

function removeManagedFiles(paths, manifest) {
  if (!manifest) return;
  for (const rel of Object.keys(manifest.files)) {
    const p = installedPath(paths, rel);
    if (fsu.isFile(p)) fs.unlinkSync(p);
  }
}

function restoreFrom(paths, sourceRoot, targetManifest) {
  removeManagedFiles(paths, readValidManifestOrNull(paths, paths.manifestPath));
  for (const rel of Object.keys(targetManifest.files)) {
    fsu.copyFileAtomic(path.join(sourceRoot, rel), installedPath(paths, rel));
  }
  fsu.writeJsonAtomic(paths.manifestPath, targetManifest);
}

function clearTransient(paths) {
  fsu.removeTree(paths.stagingDir);
  if (fsu.pathExists(paths.pendingManifest)) {
    try { fs.unlinkSync(paths.pendingManifest); } catch (_) {}
  }
  releaseLock(paths);
}

// Called at the start of every command that touches the installation. It never
// removes an active owner's lock and never overwrites unrecognised bytes.
function runRecovery(paths) {
  const state = inspectRecoveryState(paths);

  if (state.lock && isPidAlive(state.lock.pid)) {
    throw recovery(
      `An installer process (pid ${state.lock.pid}) still holds the lock.`,
      `Refusing to clear an active lock. Wait for it to finish, then retry. Lock: ${paths.lockFile}`
    );
  }

  if (!state.lock && !state.hasStaging && !state.hasPending) {
    return { recovered: false, action: 'none' };
  }

  const current = readValidManifestOrNull(paths, paths.manifestPath);
  const currentValid = current && checkInstalledIntegrity(paths, current).ok;
  const previous = state.hasPrevious ? readValidManifestOrNull(paths, paths.previousManifest) : null;
  const pending = state.hasPending ? readValidManifestOrNull(paths, paths.pendingManifest) : null;
  const stagingManifest = buildStagingManifest(paths);
  const known = buildKnownHashes([current, previous, pending, stagingManifest]);

  if (currentValid) {
    clearTransient(paths);
    return {
      recovered: true,
      action: 'cleaned',
      message: 'Cleaned stale staging state left by an interrupted operation; the installed bundle was intact.',
    };
  }

  if (previous && completeSet(paths.previousDir, previous)) {
    assertSafeToOverwrite(paths, Object.keys(previous.files), Object.keys(current ? current.files : {}), known);
    restoreFrom(paths, paths.previousDir, previous);
    clearTransient(paths);
    return {
      recovered: true,
      action: 'restored-previous',
      version: previous.version,
      message: `Restored the previous working bundle (${previous.version}) after an interrupted update.`,
    };
  }

  if (pending && completeSet(paths.stagingDir, pending)) {
    assertSafeToOverwrite(paths, Object.keys(pending.files), Object.keys(current ? current.files : {}), known);
    restoreFrom(paths, paths.stagingDir, pending);
    clearTransient(paths);
    return {
      recovered: true,
      action: 'completed-pending',
      version: pending.version,
      message: `Completed an interrupted update from staged content (${pending.version}).`,
    };
  }

  if (!current) {
    // No committed installation existed: transient state is safe to discard.
    clearTransient(paths);
    return {
      recovered: true,
      action: 'discarded-incomplete',
      message: 'Discarded incomplete first-install state; it is safe to retry install.',
    };
  }

  return {
    recovered: false,
    action: 'blocked',
    message: 'The installation is incomplete and no usable previous or staged bundle was found.',
    detail: [
      `Manifest: ${paths.manifestPath}`,
      `Previous: ${paths.previousDir}`,
      `Staging: ${paths.stagingDir}`,
      'No files were changed. Restore them manually, or install into a fresh --destination.',
    ].join('\n'),
  };
}

module.exports = {
  checkInstalledIntegrity,
  readValidManifestOrNull,
  isPidAlive,
  acquireLock,
  updateLockPhase,
  releaseLock,
  inspectRecoveryState,
  runRecovery,
  completeSet,
};

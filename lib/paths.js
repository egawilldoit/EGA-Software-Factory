'use strict';

const fs = require('fs');
const path = require('path');
const fsu = require('./fs-util');
const { META_DIR, PRESERVED_DIR, defaultDestination, usage } = require('./constants');

function isDefaultDestination(dest) {
  const def = defaultDestination();
  return !!def && path.normalize(dest) === path.normalize(def);
}

// Canonicalise the destination once, including symlinked parents, even when
// the destination itself does not exist yet. Boundary checks then start from
// the canonical root and only inspect paths below it.
function canonicalize(dest) {
  let current = dest;
  const tail = [];
  while (!fsu.pathExists(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    tail.unshift(path.basename(current));
    current = parent;
  }
  try { current = fs.realpathSync(current); } catch (_) {}
  return tail.length ? path.join(current, ...tail) : current;
}

function resolveDestination(opts) {
  let dest = opts.destination || defaultDestination();
  if (!dest) {
    throw usage('No destination given and HOME/USERPROFILE is not set.', 'Pass --destination /absolute/path.');
  }
  if (!path.isAbsolute(dest)) dest = path.resolve(process.cwd(), dest);
  dest = path.normalize(dest);
  if (fsu.pathExists(dest) && !fsu.isDirectory(dest)) {
    throw usage(`Destination is not a directory: ${dest}`);
  }
  return canonicalize(dest);
}

function makePaths(dest) {
  const metaDir = path.join(dest, META_DIR);
  return {
    dest,
    skillsRoot: path.join(dest, 'skills'),
    metaDir,
    manifestPath: path.join(metaDir, 'manifest.json'),
    lockFile: path.join(metaDir, 'lock.json'),
    stagingDir: path.join(metaDir, 'staging'),
    pendingManifest: path.join(metaDir, 'pending-manifest.json'),
    previousDir: path.join(metaDir, 'previous'),
    previousManifest: path.join(metaDir, 'previous', 'manifest.json'),
    preservedDir: path.join(dest, PRESERVED_DIR),
  };
}

function installedPath(paths, rel) {
  return path.join(paths.dest, rel);
}

function hostHint(host, skillsRoot, dest) {
  if (isDefaultDestination(dest)) {
    return `Skills are installed at ${skillsRoot}, which both Codex and OpenCode auto-discover. Restart the host or start a fresh session to load them.`;
  }
  const label = host === 'codex' ? 'Codex' : host === 'opencode' ? 'OpenCode' : 'Your host';
  return `${label}: this custom destination is not auto-discovered. Register ${skillsRoot} as a skills directory in the host's project config, then restart or start a fresh session.`;
}

// Look for a check-out / plugin installation of the same skills near the cwd.
// This is advisory: it explains a conflict instead of silently making a second
// competing copy. It never edits the detected project.
function detectConflicts(cwd) {
  const found = [];
  const skillFile = path.join(cwd, 'skills', 'factory', 'SKILL.md');
  if (fsu.isFile(skillFile)) found.push(`project skills at ${path.dirname(path.dirname(skillFile))}`);

  const plugin = fsu.readJsonOrNull(path.join(cwd, '.codex-plugin', 'plugin.json'));
  if (plugin && plugin.skills) found.push(`Codex plugin at ${path.join(cwd, '.codex-plugin')}`);

  const opencode = fsu.readJsonOrNull(path.join(cwd, '.opencode', 'opencode.json'));
  if (opencode && Array.isArray(opencode.skills)) found.push(`OpenCode config at ${path.join(cwd, '.opencode', 'opencode.json')}`);

  return found;
}

module.exports = {
  resolveDestination,
  makePaths,
  installedPath,
  isDefaultDestination,
  hostHint,
  detectConflicts,
};

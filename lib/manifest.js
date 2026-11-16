'use strict';

const fsu = require('./fs-util');
const { integrity } = require('./errors');

function validateManifest(manifest, where) {
  const bad = (msg) => { throw integrity(`Invalid installation manifest at ${where}: ${msg}`); };
  if (!manifest || typeof manifest !== 'object') bad('not an object');
  if (manifest.schemaVersion !== 1) bad('unsupported schemaVersion');
  if (typeof manifest.version !== 'string') bad('missing version');
  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) bad('missing files map');
  for (const [rel, hash] of Object.entries(manifest.files)) {
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) bad(`bad hash for ${rel}`);
    if (rel.includes('..') || rel.startsWith('/')) bad(`unsafe path ${rel}`);
  }
  return manifest;
}

function readManifest(paths) {
  const raw = fsu.readJsonOrNull(paths.manifestPath);
  return raw ? validateManifest(raw, paths.manifestPath) : null;
}

function buildManifest(bundle, host, dest, extra) {
  const files = {};
  for (const entry of bundle.descriptor.files) files[entry.path] = entry.sha256;
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    package: bundle.descriptor.name || '@egawilldoit/factory',
    version: bundle.version,
    sourceCommit: bundle.sourceCommit,
    host: host || 'shared',
    destination: dest,
    installedAt: (extra && extra.installedAt) || now,
    updatedAt: (extra && extra.updatedAt) || now,
    files,
  };
}

function writeManifest(paths, manifest) {
  fsu.writeJsonAtomic(paths.manifestPath, manifest);
}

module.exports = { validateManifest, readManifest, buildManifest, writeManifest };

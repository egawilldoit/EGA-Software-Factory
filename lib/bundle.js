'use strict';

const path = require('path');
const fs = require('fs');
const fsu = require('./fs-util');
const { recovery } = require('./errors');

const BUNDLE_DIR = 'bundle';
const DESCRIPTOR = 'bundle.json';
const FILES_DIR = 'files';

// The descriptor is the shared content index used by the local installer and
// (later) the read-only MCP channel. Format is coordinated with release
// wiring; see docs/handoff or the implementation report for the exact shape.
function loadBundle(packageRoot) {
  const dir = path.join(packageRoot, BUNDLE_DIR);
  const descriptorPath = path.join(dir, DESCRIPTOR);
  const filesRoot = path.join(dir, FILES_DIR);

  if (!fsu.isFile(descriptorPath) || !fsu.isDirectory(filesRoot)) {
    throw recovery(
      'Bundled workflow content is missing from this package.',
      `Expected ${descriptorPath} and ${filesRoot}. Reinstall @egawilldoit/factory; do not run the installer from a source checkout without building the bundle.`
    );
  }

  let descriptor;
  try {
    descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
  } catch (err) {
    throw recovery('Bundled descriptor is not valid JSON.', String(err));
  }

  if (!descriptor || descriptor.schemaVersion !== 1 ||
      typeof descriptor.version !== 'string' ||
      !Array.isArray(descriptor.files) || descriptor.files.length === 0) {
    throw recovery('Bundled descriptor has an unsupported or malformed schema.', descriptorPath);
  }

  const fileMap = new Map();
  for (const entry of descriptor.files) {
    if (!entry || typeof entry.path !== 'string' || typeof entry.sha256 !== 'string') {
      throw recovery('Bundled descriptor contains a malformed file entry.', descriptorPath);
    }
    const rel = entry.path;
    if (!/^[A-Za-z0-9._/-]+$/.test(rel) || rel.includes('..') ||
        path.isAbsolute(rel) || rel.startsWith('/') || /^[A-Za-z]:/.test(rel) || rel.includes('\\')) {
      throw recovery('Bundled descriptor contains an unsafe file path.', rel);
    }
    if (fileMap.has(rel)) {
      throw recovery('Bundled descriptor contains a duplicate file path.', rel);
    }
    fileMap.set(rel, entry);
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  } catch (_) {
    pkg = {};
  }
  if (pkg.version && pkg.version !== descriptor.version) {
    throw recovery(
      'Package version and bundled descriptor version disagree.',
      `package.json=${pkg.version}, bundle version=${descriptor.version}. Rebuild the bundle before packing.`
    );
  }

  return {
    descriptor,
    filesRoot,
    version: descriptor.version,
    sourceCommit: descriptor.sourceCommit || 'unknown',
    fileMap,
  };
}

function verifyBundle(bundle) {
  const issues = [];
  for (const entry of bundle.descriptor.files) {
    const p = path.join(bundle.filesRoot, entry.path);
    if (!fsu.isFile(p)) {
      issues.push({ path: entry.path, kind: 'missing' });
      continue;
    }
    const actual = fsu.sha256File(p);
    if (actual !== entry.sha256) {
      issues.push({ path: entry.path, kind: 'hash', expected: entry.sha256, actual });
    }
  }
  return issues;
}

function assertBundle(bundle) {
  const issues = verifyBundle(bundle);
  if (issues.length) {
    throw recovery(
      'Bundled workflow content failed its own integrity check.',
      JSON.stringify(issues.slice(0, 10), null, 2)
    );
  }
}

module.exports = { loadBundle, verifyBundle, assertBundle, BUNDLE_DIR, DESCRIPTOR, FILES_DIR };

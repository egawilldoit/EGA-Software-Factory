'use strict';

const path = require('path');

// Bundle-root relative layout. These names are part of the published contract:
// skills/<name>/SKILL.md uses ../../references, ../../docs and ../../templates,
// so skills, references, docs and templates must stay siblings under the root.
const SKILL_NAMES = [
  'factory',
  'factory-plan',
  'factory-verify',
  'factory-improve',
];

const META_DIR = '.ega-factory';
const PRESERVED_DIR = '.factory-preserved';
const HOSTS = ['codex', 'opencode'];

const EXIT = {
  OK: 0,
  USAGE: 1,
  REFUSED: 2,
  INTEGRITY: 3,
  RECOVERY: 4,
  IO: 5,
};

function packageRoot() {
  // lib/ sits directly under the package root in the packed artifact.
  return path.resolve(__dirname, '..');
}

function defaultDestination() {
  // The bundle root lives at ~/.agents; the shared Agent Skills directory is
  // <destination>/skills (i.e. ~/.agents/skills by default).
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) return null;
  return path.join(home, '.agents');
}

module.exports = {
  SKILL_NAMES,
  META_DIR,
  PRESERVED_DIR,
  HOSTS,
  EXIT,
  packageRoot,
  defaultDestination,
};

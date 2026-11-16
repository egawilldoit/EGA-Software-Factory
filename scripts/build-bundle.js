'use strict';

// Generates the single portable bundle from the canonical skills, references,
// templates and the two allowed docs. The output is consumed by both the npm
// installer and (later) the read-only MCP channel. No dependencies, no network.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const fsu = require('../lib/fs-util');
const { checkReferences } = require('../lib/references');
const { SKILL_NAMES } = require('../lib/constants');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const pluginPath = path.join(root, '.codex-plugin', 'plugin.json');
const plugin = fsu.readJsonOrNull(pluginPath);
if (plugin && plugin.version !== pkg.version) {
  console.warn(`WARNING: plugin.json version ${plugin.version} != package version ${pkg.version}`);
}

// Deterministic release identity from the source commit itself: rerunning the
// build on the same commit must produce the same descriptor bytes.
function sourceIdentity() {
  let commit = 'unknown';
  let builtAt = process.env.SOURCE_DATE_EPOCH
    ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
    : null;
  // Keep the exact source commit even when the timestamp is overridden.
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%H%n%cI'], {
      cwd: root,
      encoding: 'utf8',
    }).trim().split('\n');
    commit = out[0] || 'unknown';
    if (!process.env.SOURCE_DATE_EPOCH) builtAt = out[1] || null;
  } catch (_) {
    // Bundle-only fixtures without git may fall back to an unknown commit;
    // stable releases require a real checkout and an exact commit.
  }
  return { commit, builtAt };
}

const sources = [];
for (const name of SKILL_NAMES) {
  sources.push(`skills/${name}/SKILL.md`);
}
for (const name of fs.readdirSync(path.join(root, 'references')).sort()) {
  if (name.endsWith('.md')) sources.push(`references/${name}`);
}
sources.push('templates/task-summary.yaml');
sources.push('docs/authorization-and-completion-scenarios.md');
sources.push('docs/v4-acceptance-status.md');

const outRoot = path.join(root, 'bundle');
const filesRoot = path.join(outRoot, 'files');
fsu.removeTree(filesRoot);
fsu.ensureDir(filesRoot);

const files = [];
for (const rel of sources) {
  const src = path.join(root, rel);
  if (!fsu.isFile(src)) throw new Error(`Missing canonical source: ${rel}`);
  const data = fs.readFileSync(src);
  fsu.writeFileAtomic(path.join(filesRoot, rel), data);
  files.push({
    path: rel,
    sha256: fsu.sha256Buffer(data),
    bytes: data.length,
  });
}

const identity = sourceIdentity();
const descriptor = {
  schemaVersion: 1,
  name: pkg.name,
  version: pkg.version,
  sourceCommit: identity.commit,
  builtAt: identity.builtAt,
  skills: SKILL_NAMES,
  files,
};

fsu.writeJsonAtomic(path.join(outRoot, 'bundle.json'), descriptor);

const mdFiles = files.filter((f) => f.path.endsWith('.md')).map((f) => f.path);
const linkIssues = checkReferences(filesRoot, mdFiles);
if (linkIssues.length) {
  console.error('Bundle link-closure check FAILED:');
  for (const issue of linkIssues) console.error(`  ${issue.file}: ${issue.link} -> ${issue.kind} ${issue.target || ''}`);
  process.exit(1);
}

console.log(`Built bundle ${descriptor.name}@${descriptor.version} (${files.length} files, commit ${descriptor.sourceCommit}, builtAt ${descriptor.builtAt}).`);
console.log('Link closure: OK.');

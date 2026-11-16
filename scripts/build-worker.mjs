import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createGuidanceIndex } from '../worker/src/worker.mjs';

const require = createRequire(import.meta.url);
const { loadBundle, assertBundle } = require('../lib/bundle.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = new Map([
  ...['factory', 'factory-plan', 'factory-verify', 'factory-improve'].map(id => [`skills/${id}/SKILL.md`, id]),
  ...['workflow', 'skill-compatibility', 'verification-and-review', 'risk-and-delivery', 'pr-workflows', 'takeover-and-modernize', 'web-guidance', 'improvement-and-metrics', 'planning', 'issue-drafting', 'synchronization', 'task-summary'].map(id => [`references/${id}.md`, `reference:${id}`]),
  ...['authorization-and-completion-scenarios', 'v4-acceptance-status'].map(id => [`docs/${id}.md`, `doc:${id}`]),
  ['templates/task-summary.yaml', 'template:task-summary'],
  ['templates/implementation-issue.md', 'template:implementation-issue'],
]);

function release(packageRoot, { strict = true } = {}) {
  const bundle = loadBundle(packageRoot);
  assertBundle(bundle);
  if (!/^\d+\.\d+\.\d+$/.test(bundle.version) || !/^[a-f0-9]{40}$/.test(bundle.sourceCommit)) throw new Error('Stable version and exact source commit required');
  // An older immutable package can predate assets that are canonical today.
  // Map only what that release actually contains; never backfill current
  // content into it. The current package still requires every mapped asset.
  const active = new Map();
  for (const [relative, id] of paths) {
    if (bundle.fileMap.has(relative)) active.set(relative, id);
    else if (strict) throw new Error(`Missing canonical item: ${relative}`);
  }
  const items = [...active].map(([relative, id]) => {
    const entry = bundle.fileMap.get(relative);
    const body = fs.readFileSync(path.join(bundle.filesRoot, relative), 'utf8');
    const references = new Set();
    for (const match of body.matchAll(/(?:`|\()((?:\.\.\/|\.\/)[^`\s)]+|[\w-]+\.md)(?:`|\))/g)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1].split('#')[0]));
      if (active.has(target)) references.add(active.get(target));
    }
    return { id, kind: id.includes(':') ? id.split(':')[0] : 'skill', title: id, body, sha256: entry.sha256, references: [...references] };
  });
  return { version: bundle.version, sourceCommit: bundle.sourceCommit, releasedAt: bundle.descriptor.builtAt, items };
}

const current = release(root);
const previousRoot = process.env.PREVIOUS_PACKAGE_ROOT;
const releases = [current];
if (previousRoot) {
  const previous = release(path.resolve(previousRoot), { strict: false });
  if (previous.version === current.version) throw new Error('Previous release must be a different immutable version');
  releases.push(previous);
}
const output = { schemaVersion: 1, generator: 'canonical bundle adapter v1', generatedAt: current.releasedAt, defaultVersion: current.version, releases };
createGuidanceIndex(output);
fs.mkdirSync(path.join(root, 'worker/generated'), { recursive: true });
fs.writeFileSync(path.join(root, 'worker/generated/released-guidance.json'), JSON.stringify(output, null, 2) + '\n');
console.log(`Worker bundle: ${current.version}, ${current.items.length} items, previous=${releases[1]?.version ?? 'none'}`);

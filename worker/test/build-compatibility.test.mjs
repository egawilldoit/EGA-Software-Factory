import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createGuidanceIndex, createMcpHandler } from '../src/worker.mjs';

// Exercises scripts/build-worker.mjs against two synthetic immutable packages:
// a current one that contains the new assets and a previous one that predates
// them. The new paths must not be mandatory in the older package, and the
// worker must never backfill current content into the pinned older release.

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CURRENT = '9.9.9';
const PREVIOUS = '9.9.8';
const NEW_PATHS = new Set(['references/issue-drafting.md', 'templates/implementation-issue.md']);
const CANONICAL = [
  ...['factory', 'factory-plan', 'factory-verify', 'factory-improve'].map((id) => [`skills/${id}/SKILL.md`, id]),
  ...['workflow', 'skill-compatibility', 'verification-and-review', 'risk-and-delivery', 'pr-workflows',
    'takeover-and-modernize', 'web-guidance', 'improvement-and-metrics', 'planning', 'issue-drafting',
    'synchronization', 'task-summary'].map((id) => [`references/${id}.md`, `reference:${id}`]),
  ...['authorization-and-completion-scenarios', 'v4-acceptance-status'].map((id) => [`docs/${id}.md`, `doc:${id}`]),
  ['templates/task-summary.yaml', 'template:task-summary'],
  ['templates/implementation-issue.md', 'template:implementation-issue'],
];
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

async function makePackage(root, version, commit, includeNew) {
  const files = [];
  for (const [relative, id] of CANONICAL) {
    if (!includeNew && NEW_PATHS.has(relative)) continue;
    const body = `# ${id}\n\nReleased guidance version: ${version}.\n`;
    const target = join(root, 'bundle', 'files', relative);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, body);
    files.push({ path: relative, sha256: sha256(body), bytes: Buffer.byteLength(body) });
  }
  const descriptor = {
    schemaVersion: 1,
    name: '@test/factory',
    version,
    sourceCommit: commit,
    builtAt: '2026-11-16T00:00:00Z',
    skills: ['factory', 'factory-plan', 'factory-verify', 'factory-improve'],
    files
  };
  await writeFile(join(root, 'bundle', 'bundle.json'), JSON.stringify(descriptor, null, 2) + '\n');
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: '@test/factory', version }, null, 2) + '\n');
}

test('build adapter keeps old releases valid and new IDs unavailable on them', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ega-build-compat-'));
  try {
    await mkdir(join(root, 'scripts'), { recursive: true });
    await mkdir(join(root, 'worker', 'src'), { recursive: true });
    await cp(join(REPO_ROOT, 'scripts', 'build-worker.mjs'), join(root, 'scripts', 'build-worker.mjs'));
    await cp(join(REPO_ROOT, 'lib'), join(root, 'lib'), { recursive: true });
    await cp(join(REPO_ROOT, 'worker', 'src', 'worker.mjs'), join(root, 'worker', 'src', 'worker.mjs'));

    await makePackage(root, CURRENT, 'a'.repeat(40), true);
    const previousRoot = join(root, 'previous');
    await makePackage(previousRoot, PREVIOUS, 'b'.repeat(40), false);

    const output = execFileSync(process.execPath, ['scripts/build-worker.mjs'], {
      cwd: root,
      env: { ...process.env, PREVIOUS_PACKAGE_ROOT: previousRoot },
      encoding: 'utf8'
    });
    assert.match(output, /previous=9\.9\.8/);

    const generated = JSON.parse(await readFile(join(root, 'worker', 'generated', 'released-guidance.json'), 'utf8'));
    assert.deepEqual(generated.releases.map((r) => r.version), [CURRENT, PREVIOUS]);
    const ids = (release) => release.items.map((item) => item.id);
    for (const id of ['reference:issue-drafting', 'template:implementation-issue']) {
      assert.ok(ids(generated.releases[0]).includes(id), `current release missing ${id}`);
      assert.ok(!ids(generated.releases[1]).includes(id), `old release unexpectedly contains ${id}`);
    }
    assert.ok(ids(generated.releases[1]).includes('reference:planning'));

    const handler = createMcpHandler({ index: createGuidanceIndex(generated) });
    async function callTool(args) {
      const response = await handler(new Request('https://example.test/mcp', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_workflow', arguments: args } })
      }));
      return (await response.json()).result;
    }
    const oldNew = await callTool({ id: 'reference:issue-drafting', version: PREVIOUS });
    assert.equal(oldNew.isError, true);
    assert.equal(oldNew.structuredContent.error.code, 'ID_NOT_IN_RELEASE');
    assert.doesNotMatch(oldNew.content[0].text, /Released guidance version: 9\.9\.9/);
    const currentNew = await callTool({ id: 'reference:issue-drafting', version: CURRENT });
    assert.equal(currentNew.isError, undefined);
    assert.match(currentNew.structuredContent.body, /Released guidance version: 9\.9\.9/);
    const oldExisting = await callTool({ id: 'reference:planning', version: PREVIOUS });
    assert.match(oldExisting.structuredContent.body, /Released guidance version: 9\.9\.8/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

'use strict';

// Focused acceptance for the packed npm artifact. No dependencies, no network
// installs, no writes outside a temporary workspace. Exercises the real
// lifecycle against the tarball npm would publish.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../..');
const TMP_BASE = fs.existsSync('/tmp/opencode') ? '/tmp/opencode' : os.tmpdir();
const work = fs.mkdtempSync(path.join(TMP_BASE, 'factory-package-test-'));

const results = [];
function ok(cond, msg) { if (!cond) throw new Error(msg); }
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function check(name, fn) {
  try { fn(); results.push({ name, pass: true }); console.log('PASS ' + name); }
  catch (err) { results.push({ name, pass: false, error: err.message }); console.log('FAIL ' + name + ' - ' + err.message); }
}

function runNode(args, opts) {
  const res = spawnSync(process.execPath, args, {
    cwd: (opts && opts.cwd) || ROOT,
    env: Object.assign({}, process.env, (opts && opts.env) || {}),
    encoding: 'utf8',
  });
  if (res.error) throw res.error;
  return res;
}

function callFactory(pkgRoot, home, args, opts) {
  const opts2 = opts || {};
  const bin = path.join(pkgRoot, 'bin', 'factory.js');
  const destArgs = opts2.noDest ? [] : ['--destination', path.join(home, '.agents')];
  const res = runNode([bin, '--json'].concat(destArgs, args), opts2);
  let report;
  try { report = JSON.parse(res.stdout.trim()); }
  catch (_) { throw new Error('CLI did not emit JSON (exit ' + res.status + '): ' + res.stdout.slice(0, 400) + ' ' + res.stderr.slice(0, 400)); }
  return { status: res.status, report };
}

function sha(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// ---------------------------------------------------------------------------
// Build and pack from a pristine copy of the sources.
// ---------------------------------------------------------------------------
const srcRoot = path.join(work, 'src');
fs.mkdirSync(srcRoot);
for (const name of ['package.json', 'bin', 'lib', 'scripts', 'skills', 'references', 'templates', 'docs', '.codex-plugin', '.gitignore']) {
  fs.cpSync(path.join(ROOT, name), path.join(srcRoot, name), { recursive: true });
}

let setupError = null;
let tarball = null;
let pkgRoot = null;
let packFiles = [];
try {
  const build = runNode(['scripts/build-bundle.js'], { cwd: srcRoot });
  ok(build.status === 0, 'bundle build failed: ' + build.stderr);

  const packDir = path.join(work, 'pack');
  fs.mkdirSync(packDir);
  const pack = spawnSync('npm', ['pack', '--pack-destination', packDir, '--json'], {
    cwd: srcRoot, encoding: 'utf8',
  });
  ok(pack.status === 0, 'npm pack failed: ' + pack.stderr);
  const packed = JSON.parse(pack.stdout.trim())[0];
  tarball = path.join(packDir, packed.filename);
  packFiles = packed.files.map((f) => f.path);

  const pkgParent = path.join(work, 'pkg');
  fs.mkdirSync(pkgParent);
  const untar = spawnSync('tar', ['-xzf', tarball, '-C', pkgParent], { encoding: 'utf8' });
  ok(untar.status === 0, 'tar extract failed: ' + untar.stderr);
  pkgRoot = path.join(pkgParent, 'package');
} catch (err) {
  setupError = err;
}

check('packed tarball contains CLI, descriptor and canonical content', () => {
  ok(!setupError, 'setup failed: ' + (setupError && setupError.message));
  for (const p of [
    'bin/factory.js', 'lib/cli.js', 'lib/bundle.js', 'package.json',
    'bundle/bundle.json', 'bundle/files/skills/factory/SKILL.md',
    'bundle/files/skills/factory-plan/SKILL.md',
    'bundle/files/references/workflow.md',
    'bundle/files/templates/task-summary.yaml',
    'bundle/files/docs/v4-acceptance-status.md',
  ]) ok(packFiles.includes(p), 'missing from tarball: ' + p);
});

check('npm allowlist excludes env, tests, scripts and source checkout files', () => {
  ok(!setupError, 'setup failed');
  const bad = packFiles.filter((p) =>
    p.startsWith('.env') || p.startsWith('tests/') || p.startsWith('scripts/') ||
    p.startsWith('fixtures/') || p.startsWith('docs/') || p.startsWith('skills/') ||
    p.startsWith('references/') || p.startsWith('templates/'));
  eq(bad.length, 0, 'unexpected packed paths: ' + bad.join(', '));
});

// ---------------------------------------------------------------------------
// A synthetic v2 package for update/rollback coverage.
// ---------------------------------------------------------------------------
let pkg2 = null;
try {
  pkg2 = path.join(work, 'pkg2-package');
  fs.cpSync(pkgRoot, pkg2, { recursive: true });
  const pj = JSON.parse(fs.readFileSync(path.join(pkg2, 'package.json'), 'utf8'));
  pj.version = '2.0.0';
  fs.writeFileSync(path.join(pkg2, 'package.json'), JSON.stringify(pj, null, 2) + '\n');
  const descPath = path.join(pkg2, 'bundle', 'bundle.json');
  const desc = JSON.parse(fs.readFileSync(descPath, 'utf8'));
  desc.version = '2.0.0';
  const target = 'references/workflow.md';
  const targetPath = path.join(pkg2, 'bundle', 'files', target);
  const updated = fs.readFileSync(targetPath, 'utf8') + '\nV2_MARKER\n';
  fs.writeFileSync(targetPath, updated);
  for (const entry of desc.files) if (entry.path === target) entry.sha256 = sha(Buffer.from(updated));
  fs.writeFileSync(descPath, JSON.stringify(desc, null, 2) + '\n');
} catch (err) {
  setupError = setupError || err;
}

function freshHome(name) {
  const home = path.join(work, name);
  fs.mkdirSync(home, { recursive: true });
  return home;
}

function destOf(home) { return path.join(home, '.agents'); }
function installed(home, rel) { return path.join(destOf(home), rel); }
function manifestOf(home) {
  return JSON.parse(fs.readFileSync(path.join(destOf(home), '.ega-factory', 'manifest.json'), 'utf8'));
}
function writeLock(home, pid) {
  const p = path.join(destOf(home), '.ega-factory', 'lock.json');
  fs.writeFileSync(p, JSON.stringify({ pid, op: 'update', phase: 'replacing', startedAt: new Date().toISOString() }));
  return p;
}

const SKILLS = ['factory', 'factory-plan', 'factory-verify', 'factory-improve'];
const REFS = ['improvement-and-metrics', 'planning', 'pr-workflows', 'risk-and-delivery', 'skill-compatibility',
  'synchronization', 'takeover-and-modernize', 'task-summary', 'verification-and-review', 'web-guidance', 'workflow'];

// ---------------------------------------------------------------------------
// Install, repeat install, doctor, unrelated files, default destination.
// ---------------------------------------------------------------------------
check('install lays out complete self-contained bundle; doctor is clean', () => {
  const home = freshHome('home-install');
  fs.mkdirSync(path.join(destOf(home), 'skills', 'unrelated'), { recursive: true });
  fs.writeFileSync(path.join(destOf(home), 'skills', 'unrelated', 'SKILL.md'), 'UNRELATED\n');
  fs.mkdirSync(path.join(destOf(home), 'references'), { recursive: true });
  fs.writeFileSync(path.join(destOf(home), 'references', 'custom.md'), 'CUSTOM\n');

  const first = callFactory(pkgRoot, home, ['install']);
  eq(first.status, 0, 'install exit'); ok(first.report.ok, 'install ok'); ok(first.report.changed, 'install changed');

  for (const s of SKILLS) ok(fs.existsSync(installed(home, `skills/${s}/SKILL.md`)), 'missing skill ' + s);
  for (const r of REFS) ok(fs.existsSync(installed(home, `references/${r}.md`)), 'missing reference ' + r);
  ok(fs.existsSync(installed(home, 'templates/task-summary.yaml')), 'missing template');
  ok(fs.existsSync(installed(home, 'docs/authorization-and-completion-scenarios.md')), 'missing authorization doc');
  ok(fs.existsSync(installed(home, 'docs/v4-acceptance-status.md')), 'missing status doc');
  eq(manifestOf(home).version, '1.0.0', 'manifest version');

  const again = callFactory(pkgRoot, home, ['install']);
  eq(again.status, 0, 'repeat install exit'); ok(again.report.ok, 'repeat install ok');
  eq(again.report.changed, false, 'repeat install changed');

  const doc = callFactory(pkgRoot, home, ['doctor']);
  eq(doc.status, 0, 'doctor exit'); ok(doc.report.ok, 'doctor ok');
  ok(doc.report.registration.ok, 'registration'); ok(doc.report.integrity.ok, 'integrity');
  ok(doc.report.references.ok, 'references');

  eq(fs.readFileSync(path.join(destOf(home), 'skills', 'unrelated', 'SKILL.md'), 'utf8'), 'UNRELATED\n', 'unrelated skill file');
  eq(fs.readFileSync(path.join(destOf(home), 'references', 'custom.md'), 'utf8'), 'CUSTOM\n', 'unrelated reference');
});

check('installed content has no absolute path into the source checkout', () => {
  const home = path.join(work, 'home-install');
  const files = fs.readdirSync(path.join(destOf(home), 'skills'));
  for (const s of files) {
    const body = fs.readFileSync(installed(home, `skills/${s}/SKILL.md`), 'utf8');
    ok(!body.includes(ROOT), 'absolute source path in ' + s);
  }
  const doc = callFactory(pkgRoot, home, ['doctor'], { cwd: work });
  ok(doc.report.references.ok, 'references resolve outside checkout cwd');
});

check('default destination uses home/.agents and reports auto-discovery', () => {
  const home = freshHome('home-default');
  const res = callFactory(pkgRoot, home, ['install'], { noDest: true, env: { HOME: home } });
  eq(res.status, 0, 'default install exit');
  eq(res.report.destination, destOf(home), 'default destination');
  ok(res.report.notes.join(' ').includes('auto-discover'), 'auto-discovery hint');
  ok(fs.existsSync(installed(home, 'skills/factory/SKILL.md')), 'default skills path');
  eq(fs.existsSync('/home/ubuntu/.agents/skills/factory/.ega-factory-owned-by-test'), false, 'real global skills untouched');
});

// ---------------------------------------------------------------------------
// Local edits, update, rollback, collision.
// ---------------------------------------------------------------------------
check('local edits block update and are preserved unchanged', () => {
  const home = freshHome('home-edits');
  eq(callFactory(pkgRoot, home, ['install']).status, 0, 'install');
  const target = installed(home, 'skills/factory/SKILL.md');
  fs.appendFileSync(target, '\nLOCAL_EDIT\n');
  const before = fs.readFileSync(target, 'utf8');

  const doc = callFactory(pkgRoot, home, ['doctor']);
  eq(doc.status, 3, 'doctor exit for modified content');
  ok(!doc.report.integrity.ok, 'integrity reported failed');
  ok(doc.report.integrity.issues.some((i) => i.kind === 'modified'), 'modified issue present');

  const upd = callFactory(pkg2, home, ['update']);
  eq(upd.status, 2, 'update refuses local edits');
  ok(upd.report.error.includes('local edits'), 'refusal message');
  eq(manifestOf(home).version, '1.0.0', 'version unchanged');
  eq(fs.readFileSync(target, 'utf8'), before, 'local edit preserved');
});

check('update stages and verifies, rollback swaps one previous bundle and back', () => {
  const home = freshHome('home-update');
  eq(callFactory(pkgRoot, home, ['install']).status, 0, 'install');
  const upd = callFactory(pkg2, home, ['update', '--host', 'opencode']);
  eq(upd.status, 0, 'update exit');
  ok(upd.report.ok, 'update ok');
  eq(upd.report.installed, '1.0.0', 'installed shown');
  eq(upd.report.requested, '2.0.0', 'requested shown');
  eq(manifestOf(home).version, '2.0.0', 'manifest updated');
  ok(fs.readFileSync(installed(home, 'references/workflow.md'), 'utf8').includes('V2_MARKER'), 'v2 content present');
  ok(fs.existsSync(path.join(destOf(home), '.ega-factory', 'previous', 'manifest.json')), 'previous saved');

  const doc = callFactory(pkg2, home, ['doctor']);
  ok(doc.report.ok, 'doctor after update'); ok(doc.report.references.ok, 'references after update');

  const back = callFactory(pkg2, home, ['rollback']);
  eq(back.status, 0, 'rollback exit');
  eq(back.report.from, '2.0.0', 'rollback from');
  eq(back.report.to, '1.0.0', 'rollback to');
  eq(manifestOf(home).version, '1.0.0', 'manifest rolled back');
  ok(!fs.readFileSync(installed(home, 'references/workflow.md'), 'utf8').includes('V2_MARKER'), 'v2 marker gone');

  const forwardAgain = callFactory(pkg2, home, ['rollback']);
  eq(forwardAgain.status, 0, 'second rollback exit');
  eq(forwardAgain.report.to, '2.0.0', 'previous becomes rolled-back-from version');
});

check('collision with an unowned skill refuses install without changes', () => {
  const home = freshHome('home-collision');
  const target = installed(home, 'skills/factory/SKILL.md');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, 'UNOWNED\n');
  const res = callFactory(pkgRoot, home, ['install']);
  eq(res.status, 2, 'collision exit');
  ok(res.report.error.includes('not owned'), 'collision message');
  eq(fs.readFileSync(target, 'utf8'), 'UNOWNED\n', 'unowned file untouched');
  ok(!fs.existsSync(path.join(destOf(home), '.ega-factory', 'manifest.json')), 'no manifest created');
});

// ---------------------------------------------------------------------------
// Crash recovery: dead lock, stale staging, edit protection, live lock.
// ---------------------------------------------------------------------------
check('recovery restores previous bundle after interrupted update with dead lock', () => {
  const home = freshHome('home-recovery');
  eq(callFactory(pkgRoot, home, ['install']).status, 0, 'install');
  eq(callFactory(pkg2, home, ['update']).status, 0, 'update to v2');
  // Simulate an interrupted replace with bytes from the known previous version,
  // which recovery is allowed to overwrite.
  const workflowRel = 'references/workflow.md';
  const prevFile = path.join(destOf(home), '.ega-factory', 'previous', workflowRel);
  fs.copyFileSync(prevFile, installed(home, workflowRel));
  ok(!fs.readFileSync(installed(home, workflowRel), 'utf8').includes('V2_MARKER'), 'stale known bytes present');
  writeLock(home, 999999); // dead pid
  const upd = callFactory(pkg2, home, ['update']);
  eq(upd.status, 0, 'recovered update exit');
  eq(upd.report.recovery.action, 'restored-previous', 'restored previous action');
  eq(upd.report.recovery.version, '1.0.0', 'restored version');
  eq(manifestOf(home).version, '2.0.0', 'update completed after recovery');
  ok(fs.readFileSync(installed(home, workflowRel), 'utf8').includes('V2_MARKER'), 'v2 content restored after recovery');
});

check('recovery blocks and preserves unknown local edits after interruption', () => {
  const home = freshHome('home-recovery-edits');
  eq(callFactory(pkgRoot, home, ['install']).status, 0, 'install');
  eq(callFactory(pkg2, home, ['update']).status, 0, 'update to v2');
  const target = installed(home, 'skills/factory/SKILL.md');
  fs.appendFileSync(target, '\nUSER_EDIT_AFTER_CRASH\n');
  const before = fs.readFileSync(target, 'utf8');
  writeLock(home, 999999);
  const res = callFactory(pkg2, home, ['rollback']);
  eq(res.status, 4, 'recovery refusal exit');
  ok(res.report.error.includes('Refusing recovery'), 'recovery message');
  eq(fs.readFileSync(target, 'utf8'), before, 'user edit untouched by blocked recovery');
  eq(manifestOf(home).version, '2.0.0', 'manifest untouched');
});

check('a live lock owner is never cleared', () => {
  const home = freshHome('home-live-lock');
  eq(callFactory(pkgRoot, home, ['install']).status, 0, 'install');
  const lockPath = writeLock(home, process.pid); // alive
  const res = callFactory(pkg2, home, ['update']);
  eq(res.status, 4, 'live lock refusal exit');
  ok(res.report.error.includes('holds the lock'), 'live lock message');
  ok(fs.existsSync(lockPath), 'active lock retained');
  eq(manifestOf(home).version, '1.0.0', 'version unchanged');
  fs.unlinkSync(lockPath);
});

// ---------------------------------------------------------------------------
// Uninstall: only owned files; preserve edits and unrelated content.
// ---------------------------------------------------------------------------
check('uninstall removes owned files, preserves unrelated files and local edits', () => {
  const home = freshHome('home-uninstall');
  const dest = destOf(home);
  fs.mkdirSync(path.join(dest, 'skills', 'other'), { recursive: true });
  fs.writeFileSync(path.join(dest, 'skills', 'other', 'SKILL.md'), 'OTHER\n');
  eq(callFactory(pkgRoot, home, ['install']).status, 0, 'install');
  const target = installed(home, 'skills/factory/SKILL.md');
  fs.appendFileSync(target, '\nKEEP_ME\n');
  const edited = fs.readFileSync(target, 'utf8');

  const res = callFactory(pkgRoot, home, ['uninstall']);
  eq(res.status, 0, 'uninstall exit'); ok(res.report.ok, 'uninstall ok');
  eq(fs.existsSync(target), false, 'owned file removed');
  eq(fs.existsSync(installed(home, 'references/workflow.md')), false, 'owned reference removed');
  eq(fs.existsSync(path.join(dest, '.ega-factory')), false, 'metadata removed');
  eq(fs.readFileSync(path.join(dest, 'skills', 'other', 'SKILL.md'), 'utf8'), 'OTHER\n', 'unrelated skill preserved');
  const preserved = res.report.notes.join(' ').match(/at (\S+)\./);
  ok(preserved, 'preserved path reported');
  const preservedDir = preserved[1];
  const kept = path.join(preservedDir, 'skills/factory/SKILL.md');
  ok(fs.existsSync(kept), 'edited file preserved');
  eq(fs.readFileSync(kept, 'utf8'), edited, 'preserved bytes exact');

  const again = callFactory(pkgRoot, home, ['uninstall']);
  eq(again.status, 2, 'uninstall when not installed refuses');
});

check('symlinked managed path refuses install without touching external target', () => {
  const home = freshHome('home-symlink-managed');
  const outside = path.join(work, 'outside-managed');
  fs.mkdirSync(outside, { recursive: true });
  const outsideFile = path.join(outside, 'SKILL.md');
  fs.writeFileSync(outsideFile, 'EXTERNAL_UNCHANGED\n');
  fs.mkdirSync(path.join(destOf(home), 'skills'), { recursive: true });
  fs.symlinkSync(outside, path.join(destOf(home), 'skills', 'factory'), 'dir');
  const res = callFactory(pkgRoot, home, ['install']);
  eq(res.status, 2, 'symlink refusal exit');
  ok(res.report.error.includes('symbolic link'), 'symlink message');
  eq(fs.readFileSync(outsideFile, 'utf8'), 'EXTERNAL_UNCHANGED\n', 'external file untouched');
});

check('update, rollback and recovery preserve unsafe or unowned new paths', () => {
  const expanded = path.join(work, 'expanded-package');
  fs.cpSync(pkgRoot, expanded, { recursive: true });
  const rel = 'references/extra/guide.md';
  const body = 'EXTRA_GUIDANCE\n';
  const file = path.join(expanded, 'bundle', 'files', rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  const descriptorPath = path.join(expanded, 'bundle', 'bundle.json');
  const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
  descriptor.version = '3.0.0';
  descriptor.files.push({ path: rel, sha256: sha(Buffer.from(body)), bytes: Buffer.byteLength(body) });
  fs.writeFileSync(descriptorPath, JSON.stringify(descriptor));
  const packagePath = path.join(expanded, 'package.json');
  const metadata = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  metadata.version = '3.0.0';
  fs.writeFileSync(packagePath, JSON.stringify(metadata));

  for (const kind of ['symlink', 'file']) for (const operation of ['update', 'rollback', 'recovery']) {
    const home = freshHome('home-new-path-' + kind + '-' + operation);
    const outside = path.join(work, 'outside-new-path-' + kind + '-' + operation);
    fs.mkdirSync(outside);
    if (operation === 'update') {
      eq(callFactory(pkgRoot, home, ['install']).status, 0, 'install base');
    } else {
      eq(callFactory(expanded, home, ['install']).status, 0, 'install expanded');
      eq(callFactory(pkg2, home, ['update']).status, 0, 'update without extra path');
      fs.rmSync(installed(home, 'references/extra'), { recursive: true, force: true });
      if (operation === 'recovery') {
        fs.unlinkSync(installed(home, 'references/workflow.md'));
        writeLock(home, 2147483647);
      }
    }
    if (kind === 'symlink') fs.symlinkSync(outside, installed(home, 'references/extra'), 'dir');
    else {
      fs.mkdirSync(installed(home, 'references/extra'), { recursive: true });
      fs.writeFileSync(installed(home, rel), 'USER_CONTENT\n');
    }
    const manifestBefore = fs.readFileSync(installed(home, '.ega-factory/manifest.json'), 'utf8');
    const result = callFactory(operation === 'update' ? expanded : pkg2, home,
      [operation === 'rollback' ? 'rollback' : 'update']);
    ok(result.status !== 0, operation + ' refuses unsafe target');
    if (kind === 'symlink') ok(result.report.error.includes('symbolic link'), operation + ' explains boundary');
    else eq(fs.readFileSync(installed(home, rel), 'utf8'), 'USER_CONTENT\n', operation + ' preserves unowned bytes');
    eq(fs.readdirSync(outside).length, 0, operation + ' leaves outside untouched');
    eq(fs.readFileSync(installed(home, '.ega-factory/manifest.json'), 'utf8'), manifestBefore,
      operation + ' preserves committed manifest');
  }
});

check('symlinked metadata directory refuses install without writes', () => {
  const home = freshHome('home-symlink-meta');
  const outside = path.join(work, 'outside-meta');
  fs.mkdirSync(outside, { recursive: true });
  fs.mkdirSync(destOf(home), { recursive: true });
  fs.symlinkSync(outside, path.join(destOf(home), '.ega-factory'), 'dir');
  const res = callFactory(pkgRoot, home, ['install']);
  eq(res.status, 2, 'metadata symlink refusal exit');
  ok(res.report.error.includes('symbolic link'), 'metadata symlink message');
  eq(fs.readdirSync(outside).length, 0, 'external metadata dir untouched');
});

check('uninstall preserves unrelated symlinks and refuses symlinked managed content', () => {
  const home = freshHome('home-symlink-uninstall');
  const dest = destOf(home);
  const otherOutside = path.join(work, 'outside-unrelated');
  fs.mkdirSync(otherOutside, { recursive: true });
  fs.writeFileSync(path.join(otherOutside, 'SKILL.md'), 'UNRELATED_SYMLINK\n');
  fs.mkdirSync(path.join(dest, 'skills'), { recursive: true });
  fs.symlinkSync(otherOutside, path.join(dest, 'skills', 'unrelated-link'), 'dir');
  eq(callFactory(pkgRoot, home, ['install']).status, 0, 'install with unrelated symlink');

  const managed = installed(home, 'skills/factory/SKILL.md');
  fs.unlinkSync(managed);
  const external = path.join(work, 'external-managed-file.md');
  fs.writeFileSync(external, 'EXTERNAL_MANAGED\n');
  fs.symlinkSync(external, managed, 'file');
  const res = callFactory(pkgRoot, home, ['uninstall']);
  eq(res.status, 2, 'uninstall symlink refusal exit');
  eq(fs.readFileSync(path.join(dest, 'skills', 'unrelated-link', 'SKILL.md'), 'utf8'), 'UNRELATED_SYMLINK\n', 'unrelated symlink target intact');
  eq(fs.readFileSync(external, 'utf8'), 'EXTERNAL_MANAGED\n', 'managed symlink target intact');
});

check('doctor reports managed symlinks as unsafe', () => {
  const home = freshHome('home-symlink-doctor');
  eq(callFactory(pkgRoot, home, ['install']).status, 0, 'install');
  const managed = installed(home, 'skills/factory/SKILL.md');
  fs.unlinkSync(managed);
  const external = path.join(work, 'doctor-external.md');
  fs.writeFileSync(external, fs.readFileSync(path.join(pkgRoot, 'bundle', 'files', 'skills', 'factory', 'SKILL.md')));
  fs.symlinkSync(external, managed, 'file');
  const doc = callFactory(pkgRoot, home, ['doctor']);
  eq(doc.status, 3, 'doctor flags unsafe boundary');
  ok(!doc.report.ok, 'doctor overall not ok');
  ok(doc.report.boundary && !doc.report.boundary.ok, 'boundary reported unsafe');
  ok(doc.report.boundary.issues.some((i) => i.kind === 'managed symlink'), 'managed symlink listed');
});

check('destination behind a parent symlink is canonicalised once and accepted', () => {
  const realHome = path.join(work, 'home-real');
  fs.mkdirSync(realHome, { recursive: true });
  const linkHome = path.join(work, 'home-link');
  fs.symlinkSync(realHome, linkHome, 'dir');
  const res = callFactory(pkgRoot, linkHome, ['install']);
  eq(res.status, 0, 'install through parent symlink');
  eq(res.report.destination, path.join(realHome, '.agents'), 'canonical destination');
  ok(fs.existsSync(path.join(realHome, '.agents', 'skills', 'factory', 'SKILL.md')), 'installed under real home');
});

check('frontmatter and isolated host registration inputs are valid', () => {
  const home = path.join(work, 'home-install');
  const skillsRoot = path.join(destOf(home), 'skills');
  for (const s of SKILLS) {
    const body = fs.readFileSync(path.join(skillsRoot, s, 'SKILL.md'), 'utf8');
    ok(/^---\n/.test(body), s + ' has frontmatter');
    ok(/^name:\s*\S+/m.test(body), s + ' has name');
    ok(/^description:\s*\S+/m.test(body), s + ' has description');
  }
  const oc = path.join(work, 'opencode.json');
  fs.writeFileSync(oc, JSON.stringify({ skills: [skillsRoot] }));
  const cp = path.join(work, 'plugin.json');
  fs.writeFileSync(cp, JSON.stringify({ skills: skillsRoot }));
  ok(JSON.parse(fs.readFileSync(oc, 'utf8')).skills[0] === skillsRoot, 'isolated OpenCode registration path');
  ok(JSON.parse(fs.readFileSync(cp, 'utf8')).skills === skillsRoot, 'isolated Codex registration path');
});

// ---------------------------------------------------------------------------
console.log('\n' + results.filter((r) => r.pass).length + '/' + results.length + ' scenarios passed.');
console.log('Workspace: ' + work);
console.log('Tarball: ' + tarball);
if (process.env.KEEP_TEST_DIR !== '1') fs.rmSync(work, { recursive: true, force: true });
if (results.some((r) => !r.pass)) process.exitCode = 1;

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');
const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}`);
if (response.status === 404) {
  console.log('First release: no previous published package.');
} else {
  if (!response.ok) throw new Error(`Registry lookup failed: ${response.status}`);
  const metadata = await response.json();
  const parts = version => version.split('.').map(Number);
  const compare = (a, b) => { const x = parts(a), y = parts(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };
  const version = Object.keys(metadata.versions).filter(v => /^\d+\.\d+\.\d+$/.test(v) && compare(v, pkg.version) < 0).sort(compare).at(-1);
  if (!version) console.log('No earlier stable package.');
  else {
    const dist = metadata.versions[version].dist;
    const url = new URL(dist.tarball);
    if (url.origin !== 'https://registry.npmjs.org') throw new Error('Unexpected registry tarball origin');
    const download = await fetch(url);
    if (!download.ok) throw new Error(`Previous artifact download failed: ${download.status}`);
    const bytes = Buffer.from(await download.arrayBuffer());
    const actual = `sha512-${crypto.createHash('sha512').update(bytes).digest('base64')}`;
    if (actual !== dist.integrity) throw new Error('Previous artifact integrity mismatch');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ega-previous-'));
    const archive = path.join(dir, 'previous.tgz');
    fs.writeFileSync(archive, bytes);
    const names = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n');
    if (names.some(name => !name.startsWith('package/') || name.split('/').includes('..'))) throw new Error('Unsafe archive paths');
    execFileSync('tar', ['-xzf', archive, '-C', dir, '--no-same-owner']);
    const packageRoot = path.join(dir, 'package');
    if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `PREVIOUS_PACKAGE_ROOT=${packageRoot}\n`);
    console.log(`Previous stable: ${version}; PREVIOUS_PACKAGE_ROOT=${packageRoot}`);
  }
}

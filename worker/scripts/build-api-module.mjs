// Zero-dependency build step for direct Cloudflare API (multipart) deployment.
// Produces a single self-contained ES module with the release JSON inlined.
// Usage: node worker/scripts/build-api-module.mjs
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const runtime = await readFile(resolve(root, 'src/worker.mjs'), 'utf8');
const bundle = await readFile(resolve(root, 'generated/released-guidance.json'), 'utf8');

// Validate the JSON before embedding so an invalid release cannot be uploaded.
JSON.parse(bundle);

const output = `${runtime}
// --- generated release bundle (inlined by build-api-module.mjs) ---
const __RELEASE_BUNDLE = ${bundle};
export default { fetch: createMcpHandler({ index: createGuidanceIndex(__RELEASE_BUNDLE) }) };
`;

const target = resolve(root, 'dist/worker.mjs');
await mkdir(dirname(target), { recursive: true });
await writeFile(target, output, 'utf8');
console.log(`wrote ${target} (${Buffer.byteLength(output, 'utf8')} bytes)`);

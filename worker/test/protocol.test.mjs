import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createMcpHandler, createGuidanceIndex, ALLOWED_IDS } from '../src/worker.mjs';

const bundle = JSON.parse(
  await readFile(new URL('../fixtures/sample-release-bundle.json', import.meta.url), 'utf8')
);
const index = createGuidanceIndex(bundle);
const handler = createMcpHandler({ index });

// Test-only two-release bundle used to verify pinned retrieval and rollback.
// It is never deployed and is not public release content.
const priorBundle = {
  ...bundle,
  releases: [
    bundle.releases[0],
    {
      ...bundle.releases[0],
      version: '0.9.0',
      sourceCommit: '0000000000000000000000000000000000000000',
      releasedAt: '2026-11-01T00:00:00Z',
      items: bundle.releases[0].items.map((item) => ({
        ...item,
        body: item.body.replace('version: 1.0.0', 'version: 0.9.0')
      }))
    }
  ]
};
const priorHandler = createMcpHandler({ index: createGuidanceIndex(priorBundle) });

const url = 'https://ega-software-factory.a2003-2015.workers.dev/mcp';
const ACCEPT = 'application/json, text/event-stream';

function post(message, headers = {}, target = url) {
  return handler(new Request(target, {
    method: 'POST',
    headers: {
      accept: ACCEPT,
      'content-type': 'application/json',
      'mcp-protocol-version': '2025-11-25',
      ...headers
    },
    body: typeof message === 'string' ? message : JSON.stringify(message)
  }));
}

async function rpc(message, headers = {}) {
  const response = await post(message, headers);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  return response.json();
}

function call(name, args = {}, targetHandler = handler) {
  return targetHandler(new Request(url, {
    method: 'POST',
    headers: { accept: ACCEPT, 'content-type': 'application/json', 'mcp-protocol-version': '2025-11-25' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name, arguments: args } })
  })).then((response) => response.json());
}

// --- initialization / discovery ------------------------------------------------

test('initialize negotiates the latest supported version and advertises read-only tools', async () => {
  const response = await rpc({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {} }
  });
  assert.equal(response.result.protocolVersion, '2025-11-25');
  assert.deepEqual(response.result.capabilities, { tools: { listChanged: false } });
  assert.equal(response.result.serverInfo.name, 'ega-software-factory');
  assert.equal(response.result.serverInfo.version, '1.0.0');
  assert.match(response.result.instructions, /Read-only guidance/);
});

test('initialize accepts an older supported version and rejects an unknown one by falling back', async () => {
  const old = await rpc({
    jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' }
  });
  assert.equal(old.result.protocolVersion, '2025-06-18');
  const unknown = await rpc({
    jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1900-01-01' }
  });
  assert.equal(unknown.result.protocolVersion, '2025-11-25');
});

test('tools/list exposes the three guidance tools with an allowlisted enum', async () => {
  const response = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const tools = response.result.tools;
  assert.deepEqual(tools.map((t) => t.name), ['list_workflows', 'get_workflow', 'get_version']);
  const get = tools.find((t) => t.name === 'get_workflow');
  assert.deepEqual(get.inputSchema.required, ['id']);
  assert.deepEqual(get.inputSchema.properties.id.enum, ALLOWED_IDS);
  assert.equal(get.annotations.readOnlyHint, true);
  assert.equal(get.annotations.destructiveHint, false);
});

test('ping succeeds', async () => {
  assert.deepEqual((await rpc({ jsonrpc: '2.0', id: 3, method: 'ping' })).result, {});
});

// --- successful calls ----------------------------------------------------------

test('first release reports only the current version and no previous', async () => {
  const response = await call('get_version');
  const result = response.result.structuredContent;
  assert.equal(result.current.version, '1.0.0');
  assert.equal(result.current.sourceCommit, '1111111111111111111111111111111111111111');
  assert.equal(result.previous, null);
  assert.deepEqual(result.availableVersions.map((v) => v.version), ['1.0.0']);
  assert.equal(result.guidanceOnly, true);
});

test('list_workflows lists every allowlisted id including docs', async () => {
  const response = await call('list_workflows');
  const result = response.result.structuredContent;
  assert.equal(result.workflows.length, ALLOWED_IDS.length);
  assert.deepEqual(result.workflows.map((w) => w.id).sort(), [...ALLOWED_IDS].sort());
  assert.deepEqual(
    result.workflows.filter((w) => w.kind === 'doc').map((w) => w.id).sort(),
    ['doc:authorization-and-completion-scenarios', 'doc:v4-acceptance-status']
  );
});

test('linked doc ids can be retrieved as guidance items', async () => {
  const parent = await call('get_workflow', { id: 'reference:risk-and-delivery' });
  assert.ok(parent.result.structuredContent.references.includes('doc:v4-acceptance-status'));
  const doc = await call('get_workflow', { id: 'doc:v4-acceptance-status' });
  assert.equal(doc.result.structuredContent.kind, 'doc');
  assert.equal(doc.result.structuredContent.id, 'doc:v4-acceptance-status');
  const sync = await call('get_workflow', { id: 'reference:synchronization' });
  assert.equal(sync.result.structuredContent.id, 'reference:synchronization');
});

test('get_workflow returns guidance body for the current release', async () => {
  const response = await call('get_workflow', { id: 'factory' });
  const result = response.result.structuredContent;
  assert.equal(result.release.version, '1.0.0');
  assert.match(result.body, /version: 1\.0\.0/);
  assert.ok(result.references.includes('reference:workflow'));
});

test('pinned retrieval serves only the selected immutable release', async () => {
  const current = await call('get_workflow', { id: 'factory' });
  assert.match(current.result.structuredContent.body, /version: 1\.0\.0/);
  const previous = await call('get_workflow', { id: 'factory', version: '0.9.0' }, priorHandler);
  assert.equal(previous.result.structuredContent.release.version, '0.9.0');
  assert.equal(previous.result.structuredContent.release.sourceCommit, '0000000000000000000000000000000000000000');
  assert.match(previous.result.structuredContent.body, /version: 0\.9\.0/);
  assert.doesNotMatch(previous.result.structuredContent.body, /version: 1\.0\.0/);
  const versionInfo = await call('get_version', {}, priorHandler);
  assert.equal(versionInfo.result.structuredContent.previous.version, '0.9.0');
});

test('list_workflows honours a pinned release version', async () => {
  const response = await call('list_workflows', { version: '0.9.0' }, priorHandler);
  assert.equal(response.result.structuredContent.release.version, '0.9.0');
});

// --- error semantics -----------------------------------------------------------

test('invalid id returns a tool error listing allowed ids', async () => {
  const response = await call('get_workflow', { id: '../docs/v4-acceptance-status.md' });
  assert.equal(response.result.isError, true);
  assert.equal(response.result.structuredContent.error.code, 'ID_NOT_ALLOWED');
  assert.deepEqual(response.result.structuredContent.allowedIds, ALLOWED_IDS);
});

test('missing id returns an invalid-argument tool error', async () => {
  const response = await call('get_workflow', {});
  assert.equal(response.result.isError, true);
  assert.equal(response.result.structuredContent.error.code, 'INVALID_ARGUMENT');
});

test('unavailable version returns a clear error without mixing content', async () => {
  const response = await call('get_workflow', { id: 'factory', version: '2.0.0' }, priorHandler);
  assert.equal(response.result.isError, true);
  assert.equal(response.result.structuredContent.error.code, 'VERSION_UNAVAILABLE');
  assert.deepEqual(
    response.result.structuredContent.availableVersions.map((v) => v.version),
    ['1.0.0', '0.9.0']
  );
  assert.doesNotMatch(response.result.content[0].text, /version: 1\.0\.0/);
  const firstReleaseOnly = await call('list_workflows', { version: '0.9.0' });
  assert.equal(firstReleaseOnly.result.isError, true);
});

test('unknown tool is a JSON-RPC invalid-params error', async () => {
  const response = await call('run_shell');
  assert.equal(response.error.code, -32602);
  assert.match(response.error.message, /Unknown tool/);
});

test('unknown method is a JSON-RPC method-not-found error', async () => {
  const response = await rpc({ jsonrpc: '2.0', id: 9, method: 'resources/read' });
  assert.equal(response.error.code, -32601);
});

test('malformed JSON is a JSON-RPC parse error', async () => {
  const response = await post('{not json');
  const body = await response.json();
  assert.equal(body.error.code, -32700);
});

test('notifications are accepted with 202 and no body', async () => {
  const response = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(response.status, 202);
  assert.equal(await response.text(), '');
});

test('unsupported MCP-Protocol-Version header returns 400', async () => {
  const response = await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'mcp-protocol-version': '1900-01-01' });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, -32600);
});

test('batch requests return one response per request', async () => {
  const response = await post([
    { jsonrpc: '2.0', id: 1, method: 'ping' },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_version', arguments: {} } }
  ]);
  const body = await response.json();
  assert.equal(body.length, 2);
  assert.deepEqual(body[0].result, {});
  assert.equal(body[1].result.structuredContent.current.version, '1.0.0');
});

// --- transport surface ---------------------------------------------------------

test('GET /mcp is 405 (no server-initiated SSE stream)', async () => {
  const response = await handler(new Request(url, { method: 'GET', headers: { accept: ACCEPT } }));
  assert.equal(response.status, 405);
  assert.match(response.headers.get('allow'), /POST/);
});

test('unknown paths are 404', async () => {
  const response = await handler(new Request('https://example.com/other', { method: 'GET' }));
  assert.equal(response.status, 404);
});

test('health endpoint exposes metadata and no secrets', async () => {
  const response = await handler(new Request('https://example.com/health', { method: 'GET' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.release.version, '1.0.0');
  assert.equal(body.release.sourceCommit, '1111111111111111111111111111111111111111');
  assert.equal(body.previous, null);
  assert.equal(body.allowedIdCount, ALLOWED_IDS.length);
  const serialized = JSON.stringify(body).toLowerCase();
  for (const secretKey of ['token', 'password', 'api_key', 'secret', 'authorization']) {
    assert.ok(!serialized.includes(secretKey), `health leaked ${secretKey}`);
  }
});

test('every tool response carries version and source commit metadata', async () => {
  for (const [name, args] of [['list_workflows', {}], ['get_workflow', { id: 'factory-plan' }], ['get_version', {}]]) {
    const response = await call(name, args);
    const meta = response.result.structuredContent.release ?? response.result.structuredContent.current;
    assert.equal(typeof meta.version, 'string');
    assert.equal(typeof meta.sourceCommit, 'string');
    assert.match(response.result.content[0].text, /source/i);
  }
});

test('optional origin allowlist is enforced', async () => {
  const restricted = createMcpHandler({ index, allowedOrigins: ['https://allowed.example'] });
  const headers = { accept: ACCEPT, 'content-type': 'application/json' };
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' });
  const denied = await restricted(new Request(url, { method: 'POST', headers, body }));
  assert.equal(denied.status, 403);
  const allowed = await restricted(new Request(url, {
    method: 'POST', headers: { ...headers, origin: 'https://allowed.example' }, body
  }));
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://allowed.example');
});

test('oversized request body is rejected', async () => {
  const smallLimit = createMcpHandler({ index, maxBodyBytes: 32 });
  const response = await smallLimit(new Request(url, {
    method: 'POST',
    headers: { accept: ACCEPT, 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })
  }));
  assert.equal(response.status, 413);
});

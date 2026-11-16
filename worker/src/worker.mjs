// EGA Software Factory read-only MCP Worker.
// Zero dependencies: Web Standard APIs only, so this file runs unchanged on
// Cloudflare Workers and under `node --test` for protocol checks.
//
// Scope: retrieve previously generated, public release guidance. No filesystem,
// network, shell, secrets, env vars or writes are used anywhere in this module.

// ---------------------------------------------------------------------------
// Static configuration
// ---------------------------------------------------------------------------

/** Explicit allowlist. A release item is served only when its id is in this set. */
export const ALLOWED_IDS = Object.freeze([
  // canonical skills
  'factory',
  'factory-plan',
  'factory-verify',
  'factory-improve',
  // canonical references (docs link closure: each reference is its own item)
  'reference:workflow',
  'reference:skill-compatibility',
  'reference:verification-and-review',
  'reference:risk-and-delivery',
  'reference:pr-workflows',
  'reference:takeover-and-modernize',
  'reference:web-guidance',
  'reference:improvement-and-metrics',
  'reference:planning',
  'reference:synchronization',
  'reference:task-summary',
  // canonical docs linked from the references above
  'doc:authorization-and-completion-scenarios',
  'doc:v4-acceptance-status',
  // canonical template
  'template:task-summary'
]);

const ALLOWED = new Set(ALLOWED_IDS);
const SERVER_NAME = 'ega-software-factory';
const REPOSITORY_URL = 'https://github.com/egawilldoit/EGA-Software-Factory';
// 2025-11-25 is the latest initialization-based MCP revision. The 2026-07-28
// revision replaces initialize with per-request metadata; it is not implemented.
const PROTOCOL_VERSION = '2025-11-25';
const SUPPORTED_PROTOCOL_VERSIONS = Object.freeze([
  '2025-11-25',
  '2025-06-18',
  '2025-03-26'
]);
const MCP_PATH = '/mcp';
const HEALTH_PATH = '/health';
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_ALLOWED_ORIGINS = Object.freeze([]); // empty = intentionally public
const ITEM_KINDS = new Set(['skill', 'reference', 'doc', 'template']);

// ---------------------------------------------------------------------------
// Bundle index (validated, immutable, selected release only)
// ---------------------------------------------------------------------------

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertRelease(release, position) {
  if (!release || typeof release !== 'object' || Array.isArray(release)) {
    throw new Error(`releases[${position}] must be an object`);
  }
  nonEmptyString(release.version, `releases[${position}].version`);
  nonEmptyString(release.sourceCommit, `releases[${position}].sourceCommit`);
  nonEmptyString(release.releasedAt, `releases[${position}].releasedAt`);
  if (!Array.isArray(release.items)) {
    throw new Error(`releases[${position}].items must be an array`);
  }
}

function assertItem(item, releaseVersion) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error(`item in ${releaseVersion} must be an object`);
  }
  nonEmptyString(item.id, `item.id in ${releaseVersion}`);
  if (!ITEM_KINDS.has(item.kind)) {
    throw new Error(`item ${item.id} has unsupported kind: ${item.kind}`);
  }
  nonEmptyString(item.title, `item ${item.id}.title`);
  nonEmptyString(item.body, `item ${item.id}.body`);
  if (item.description !== undefined) nonEmptyString(item.description, `item ${item.id}.description`);
  if (item.sha256 !== undefined) nonEmptyString(item.sha256, `item ${item.id}.sha256`);
  if (item.references !== undefined) {
    if (!Array.isArray(item.references) || !item.references.every((r) => typeof r === 'string')) {
      throw new Error(`item ${item.id}.references must be an array of strings`);
    }
  }
}

/**
 * Validate a generated release bundle and build an immutable index.
 * Throws on invalid bundles so a bad deployment fails fast at startup.
 */
export function createGuidanceIndex(bundle) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
    throw new Error('bundle must be an object');
  }
  if (bundle.schemaVersion !== 1) throw new Error('bundle.schemaVersion must be 1');
  nonEmptyString(bundle.defaultVersion, 'bundle.defaultVersion');
  if (!Array.isArray(bundle.releases) || bundle.releases.length === 0) {
    throw new Error('bundle.releases must be a non-empty array');
  }

  const releases = new Map();
  const order = [];
  bundle.releases.forEach((release, position) => {
    assertRelease(release, position);
    if (releases.has(release.version)) {
      throw new Error(`duplicate release version: ${release.version}`);
    }
    const items = new Map();
    for (const item of release.items) {
      assertItem(item, release.version);
      if (!ALLOWED.has(item.id)) continue; // never index non-allowlisted ids
      if (items.has(item.id)) {
        throw new Error(`duplicate item id ${item.id} in release ${release.version}`);
      }
      items.set(item.id, Object.freeze({
        id: item.id,
        kind: item.kind,
        title: item.title,
        description: item.description ?? '',
        body: item.body,
        sha256: item.sha256 ?? null,
        references: Object.freeze(item.references ?? [])
      }));
    }
    releases.set(release.version, Object.freeze({
      version: release.version,
      sourceCommit: release.sourceCommit,
      releasedAt: release.releasedAt,
      notes: release.notes ?? null,
      items
    }));
    order.push(release.version);
  });

  if (!releases.has(bundle.defaultVersion)) {
    throw new Error(`bundle.defaultVersion ${bundle.defaultVersion} is not in releases`);
  }
  if (order[0] !== bundle.defaultVersion) {
    throw new Error('bundle.defaultVersion must be the first (current) release');
  }
  return Object.freeze({
    releases,
    order,
    currentVersion: bundle.defaultVersion,
    previousVersion: order[1] ?? null
  });
}

function releaseMeta(release, role = null) {
  return {
    version: release.version,
    sourceCommit: release.sourceCommit,
    releasedAt: release.releasedAt,
    role
  };
}

function currentRelease(index) {
  return index.releases.get(index.currentVersion);
}

function availableVersions(index) {
  return index.order.map((version, position) => releaseMeta(
    index.releases.get(version),
    position === 0 ? 'current' : position === 1 ? 'previous' : 'archived'
  ));
}

function selectRelease(index, requestedVersion) {
  if (requestedVersion === undefined || requestedVersion === null || requestedVersion === '') {
    return { ok: true, release: currentRelease(index) };
  }
  if (typeof requestedVersion !== 'string') {
    return { ok: false, message: 'version must be a string' };
  }
  const release = index.releases.get(requestedVersion);
  if (!release) {
    return {
      ok: false,
      message: `Version "${requestedVersion}" is not available. Only the current and previous immutable releases are served; no mixed content is returned.`
    };
  }
  return { ok: true, release };
}

function toolResult(structuredContent, text, isError = false) {
  return {
    content: [{ type: 'text', text }],
    structuredContent,
    ...(isError ? { isError: true } : {})
  };
}

function banner(release) {
  return `Release ${release.version} (source ${release.sourceCommit})\n`;
}

function versionError(index, selection) {
  const current = currentRelease(index);
  return toolResult({
    error: { code: 'VERSION_UNAVAILABLE', message: selection.message },
    release: releaseMeta(current, 'current'),
    availableVersions: availableVersions(index)
  }, `${banner(current)}Error: ${selection.message}\nAvailable versions: ${index.order.join(', ')}`, true);
}

// ---------------------------------------------------------------------------
// Tool implementations (guidance only, read-only)
// ---------------------------------------------------------------------------

export function listWorkflows(index, args = {}) {
  const selection = selectRelease(index, args?.version);
  if (!selection.ok) return versionError(index, selection);
  const release = selection.release;
  const role = release.version === index.currentVersion ? 'current' : 'previous';
  const workflows = [...release.items.values()]
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      description: item.description,
      sha256: item.sha256,
      references: item.references
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const structuredContent = {
    release: releaseMeta(release, role),
    availableVersions: availableVersions(index),
    workflows
  };
  const lines = workflows.map((w) => `- ${w.id} [${w.kind}] ${w.title}: ${w.description}`);
  return toolResult(structuredContent,
    `${banner(release)}Guidance IDs (${workflows.length}):\n${lines.join('\n')}`);
}

export function getWorkflow(index, args = {}) {
  const current = currentRelease(index);
  if (!args || typeof args.id !== 'string' || args.id.length === 0) {
    return toolResult({
      error: { code: 'INVALID_ARGUMENT', message: 'id must be a non-empty string' },
      release: releaseMeta(current, 'current')
    }, `${banner(current)}Error: id must be a non-empty string.`, true);
  }
  const id = args.id;
  if (!ALLOWED.has(id)) {
    return toolResult({
      error: { code: 'ID_NOT_ALLOWED', message: `Guidance id "${id}" is not allowlisted.` },
      allowedIds: ALLOWED_IDS,
      release: releaseMeta(current, 'current'),
      availableVersions: availableVersions(index)
    }, `${banner(current)}Error: id "${id}" is not allowlisted. Allowed ids: ${ALLOWED_IDS.join(', ')}`, true);
  }
  const selection = selectRelease(index, args.version);
  if (!selection.ok) return versionError(index, selection);
  const release = selection.release;
  const item = release.items.get(id);
  if (!item) {
    return toolResult({
      error: { code: 'ID_NOT_IN_RELEASE', message: `Guidance id "${id}" is not present in release ${release.version}.` },
      release: releaseMeta(release, release.version === index.currentVersion ? 'current' : 'previous'),
      availableVersions: availableVersions(index)
    }, `${banner(release)}Error: id "${id}" is not present in release ${release.version}.`, true);
  }
  const role = release.version === index.currentVersion ? 'current' : 'previous';
  const structuredContent = {
    release: releaseMeta(release, role),
    id: item.id,
    kind: item.kind,
    title: item.title,
    description: item.description,
    sha256: item.sha256,
    references: item.references,
    body: item.body
  };
  const refLine = item.references.length ? `\n\nLinked guidance ids: ${item.references.join(', ')}` : '';
  return toolResult(structuredContent,
    `${banner(release)}# ${item.title}\n\n${item.body}${refLine}`);
}

export function getVersion(index, _args = {}) {
  const current = currentRelease(index);
  const hasPrevious = index.previousVersion !== null;
  const previous = hasPrevious ? index.releases.get(index.previousVersion) : null;
  const structuredContent = {
    server: {
      name: SERVER_NAME,
      protocolVersion: PROTOCOL_VERSION,
      endpoint: MCP_PATH,
      repository: REPOSITORY_URL
    },
    current: releaseMeta(current, 'current'),
    previous: hasPrevious ? releaseMeta(previous, 'previous') : null,
    availableVersions: availableVersions(index),
    guidanceOnly: true,
    readOnly: true
  };
  const previousLine = hasPrevious
    ? `Previous: ${previous.version} (source ${previous.sourceCommit})`
    : 'Previous: none';
  return toolResult(structuredContent,
    `${SERVER_NAME} guidance (read-only, guidance only)\n` +
    `Current: ${current.version} (source ${current.sourceCommit})\n` +
    `${previousLine}\nProtocol: ${PROTOCOL_VERSION}`);
}

// ---------------------------------------------------------------------------
// MCP JSON-RPC / Streamable HTTP transport
// ---------------------------------------------------------------------------

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function toolsListResult() {
  const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  return {
    tools: [
      {
        name: 'list_workflows',
        title: 'List guidance IDs',
        description: 'List the allowlisted guidance IDs available in a released version. Guidance only; no execution, repository access or writes.',
        inputSchema: {
          type: 'object',
          properties: {
            version: { type: 'string', description: 'Optional immutable release version. Defaults to the current release.' }
          },
          additionalProperties: false
        },
        annotations: readOnly
      },
      {
        name: 'get_workflow',
        title: 'Get guidance by ID',
        description: 'Retrieve one allowlisted workflow skill, reference or template as guidance text, with its release version and source commit.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', enum: [...ALLOWED_IDS], description: 'An allowlisted guidance ID from list_workflows.' },
            version: { type: 'string', description: 'Optional immutable release version. Defaults to the current release.' }
          },
          required: ['id'],
          additionalProperties: false
        },
        annotations: readOnly
      },
      {
        name: 'get_version',
        title: 'Get deployed version metadata',
        description: 'Report the current and previous released guidance versions and source commits. No secrets, paths, network data or executable content.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: readOnly
      }
    ]
  };
}

function initializeResult(params, index) {
  const requested = params && typeof params.protocolVersion === 'string'
    ? params.protocolVersion
    : PROTOCOL_VERSION;
  const negotiated = SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSION;
  return {
    protocolVersion: negotiated,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: SERVER_NAME, version: currentRelease(index).version },
    instructions: 'Read-only guidance retrieval. Discover with tools/list, then call tools/call. This server cannot access repositories, execute code or write files.'
  };
}

function toolsCall(params, index, id) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return rpcError(id, -32602, 'Invalid params for tools/call');
  }
  if (typeof params.name !== 'string') {
    return rpcError(id, -32602, 'Tool name must be a string');
  }
  const args = params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments)
    ? params.arguments
    : {};
  let result;
  switch (params.name) {
    case 'list_workflows': result = listWorkflows(index, args); break;
    case 'get_workflow': result = getWorkflow(index, args); break;
    case 'get_version': result = getVersion(index, args); break;
    default: return rpcError(id, -32602, `Unknown tool: ${params.name}`);
  }
  return rpcResult(id, result);
}

function dispatch(message, index) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    return rpcError(null, -32600, 'Invalid Request');
  }
  if (message.jsonrpc !== '2.0') {
    return rpcError(message.id ?? null, -32600, 'Invalid Request: jsonrpc must be "2.0"');
  }
  const hasId = Object.prototype.hasOwnProperty.call(message, 'id');
  if (typeof message.method !== 'string') {
    return hasId ? rpcError(message.id, -32600, 'Invalid Request: missing method') : null;
  }
  if (!hasId) return null; // notifications and client responses: accept silently

  const id = message.id;
  switch (message.method) {
    case 'initialize': return rpcResult(id, initializeResult(message.params, index));
    case 'ping': return rpcResult(id, {});
    case 'tools/list': return rpcResult(id, toolsListResult());
    case 'tools/call': return toolsCall(message.params, index, id);
    default: return rpcError(id, -32601, `Method not found: ${message.method}`);
  }
}

function applyCors(headers, request, allowedOrigins) {
  const origin = request.headers.get('origin');
  if (allowedOrigins.length === 0) {
    headers.set('access-control-allow-origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.append('vary', 'Origin');
  }
  headers.set('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('access-control-allow-headers', 'content-type, accept, mcp-protocol-version, mcp-session-id');
  headers.set('access-control-max-age', '600');
  return headers;
}

function jsonResponse(payload, request, options, status = 200, extraHeaders = {}) {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders });
  applyCors(headers, request, options.allowedOrigins);
  return new Response(JSON.stringify(payload), { status, headers });
}

function accepted(request, options) {
  const headers = new Headers();
  applyCors(headers, request, options.allowedOrigins);
  return new Response(null, { status: 202, headers });
}

function healthResponse(request, index, options) {
  const current = currentRelease(index);
  const hasPrevious = index.previousVersion !== null;
  const previous = hasPrevious ? index.releases.get(index.previousVersion) : null;
  return jsonResponse({
    status: 'ok',
    server: { name: SERVER_NAME, protocolVersion: PROTOCOL_VERSION, endpoint: MCP_PATH },
    release: releaseMeta(current, 'current'),
    previous: hasPrevious ? releaseMeta(previous, 'previous') : null,
    allowedIdCount: ALLOWED_IDS.length,
    readOnly: true,
    guidanceOnly: true
  }, request, options);
}

/**
 * Create a stateless fetch handler.
 * Options: { bundle, index, allowedOrigins, maxBodyBytes }.
 */
export function createMcpHandler(options = {}) {
  const index = options.index ?? createGuidanceIndex(options.bundle);
  const settings = {
    allowedOrigins: options.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS,
    maxBodyBytes: options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES
  };

  return async function fetch(request) {
    const url = new URL(request.url);

    if (settings.allowedOrigins.length > 0) {
      const origin = request.headers.get('origin');
      if (!origin || !settings.allowedOrigins.includes(origin)) {
        return jsonResponse({ error: 'Forbidden origin' }, request, settings, 403);
      }
    }

    if (url.pathname === HEALTH_PATH) {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method Not Allowed' }, request, settings, 405, { allow: 'GET' });
      }
      return healthResponse(request, index, settings);
    }

    if (url.pathname !== MCP_PATH) {
      return jsonResponse({ error: 'Not Found' }, request, settings, 404);
    }

    if (request.method === 'OPTIONS') {
      const headers = new Headers({ 'access-control-max-age': '600' });
      applyCors(headers, request, settings.allowedOrigins);
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method Not Allowed' }, request, settings, 405, { allow: 'POST, OPTIONS' });
    }

    const accept = request.headers.get('accept') ?? '';
    if (!accept.includes('application/json')) {
      return jsonResponse({ error: 'Accept header must list application/json' }, request, settings, 406);
    }
    const protocolHeader = request.headers.get('mcp-protocol-version');
    if (protocolHeader && !SUPPORTED_PROTOCOL_VERSIONS.includes(protocolHeader)) {
      return jsonResponse(
        rpcError(null, -32600, `Unsupported MCP-Protocol-Version: ${protocolHeader}`),
        request, settings, 400);
    }

    let body;
    try {
      body = await request.text();
    } catch {
      return jsonResponse(rpcError(null, -32700, 'Parse error'), request, settings);
    }
    if (new TextEncoder().encode(body).byteLength > settings.maxBodyBytes) {
      return jsonResponse(rpcError(null, -32600, 'Request body too large'), request, settings, 413);
    }

    let message;
    try {
      message = JSON.parse(body);
    } catch {
      return jsonResponse(rpcError(null, -32700, 'Parse error'), request, settings);
    }

    if (Array.isArray(message)) {
      if (message.length === 0) {
        return jsonResponse(rpcError(null, -32600, 'Invalid Request: empty batch'), request, settings);
      }
      const responses = message.map((item) => dispatch(item, index)).filter((item) => item !== null);
      if (responses.length === 0) return accepted(request, settings);
      return jsonResponse(responses, request, settings);
    }

    const response = dispatch(message, index);
    if (response === null) return accepted(request, settings);
    return jsonResponse(response, request, settings);
  };
}

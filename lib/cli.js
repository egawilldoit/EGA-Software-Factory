'use strict';

const pkg = require('../package.json');
const { HOSTS, EXIT, packageRoot } = require('./constants');
const { usage } = require('./errors');
const { loadBundle, assertBundle } = require('./bundle');
const { resolveDestination, makePaths, hostHint } = require('./paths');
const { install } = require('./install');
const { update } = require('./update');
const { diagnose } = require('./doctor');
const { rollback } = require('./rollback');
const { uninstall } = require('./uninstall');

const COMMANDS = ['install', 'update', 'doctor', 'rollback', 'uninstall'];

function parse(argv) {
  const opts = { destination: null, host: null, json: false, help: false, version: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--version' || arg === '-V') opts.version = true;
    else if (arg === '--destination' || arg === '--host') {
      const value = argv[++i];
      if (!value) throw usage(`${arg} requires a value.`);
      opts[arg.slice(2)] = value;
    } else if (arg.startsWith('--destination=')) opts.destination = arg.slice('--destination='.length);
    else if (arg.startsWith('--host=')) opts.host = arg.slice('--host='.length);
    else if (arg.startsWith('-')) throw usage(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  const command = positional.shift() || null;
  if (opts.host && !HOSTS.includes(opts.host)) {
    throw usage(`Unsupported --host ${opts.host}. Use one of: ${HOSTS.join(', ')}.`);
  }
  return { command, extra: positional, opts };
}

function helpText() {
  return [
    `@egawilldoit/factory ${pkg.version}`,
    '',
    'Usage: factory <command> [options]',
    '',
    'Commands:',
    '  install    Install the bundled skills into the shared Agent Skills directory',
    '  update     Update an owned installation using this package\'s bundle',
    '  doctor     Report registration, integrity and reference resolution',
    '  rollback   Restore the single previous working bundle',
    '  uninstall  Remove only files owned by this installation',
    '',
    'Options:',
    '  --destination <path>  Bundle root (default: ~/.agents; skills go to <root>/skills)',
    '  --host <codex|opencode>  Advisory host label recorded in the manifest',
    '  --json                Emit a machine-readable JSON report',
    '  -V, --version         Print the package version',
    '  -h, --help            Show this help',
  ].join('\n');
}

function formatText(report, command, opts) {
  const lines = [];
  lines.push(`@egawilldoit/factory ${pkg.version} - ${command || 'no command'}`);
  lines.push('');
  if (report.error) {
    lines.push('FAILED: ' + report.error);
    if (report.detail) lines.push('', String(report.detail));
    lines.push('', `Exit code: ${report.code}`);
    return lines.join('\n');
  }
  if (report.destination) lines.push('Destination: ' + report.destination);
  if (report.version) lines.push('Version: ' + report.version);
  if (report.installed) lines.push('Installed: ' + report.installed);
  if (report.requested) lines.push('Requested: ' + report.requested);
  if (report.from) lines.push(`Rollback: ${report.from} -> ${report.to}`);
  if (report.removedVersion) lines.push('Removed version: ' + report.removedVersion);
  if (report.sourceCommit) lines.push('Source commit: ' + report.sourceCommit);
  if (report.recovery && report.recovery.recovered) {
    lines.push('', 'Recovery: ' + report.recovery.message);
  }
  if (report.notes && report.notes.length) {
    lines.push('');
    for (const note of report.notes) lines.push('- ' + note);
  }
  if (command === 'doctor' && report.registration) {
    lines.push('', 'Registration: ' + (report.registration.ok ? 'OK' : 'FAILED'));
    if (report.registration.missing.length) {
      lines.push('  Missing: ' + report.registration.missing.join(', '));
    }
    lines.push('Content integrity: ' + (report.integrity.ok ? 'OK' : `FAILED (${report.integrity.issues.length} issue(s))`));
    lines.push('Reference resolution: ' + (report.references.ok ? 'OK' : `FAILED (${report.references.issues.length} issue(s))`));
    lines.push('Path boundary: ' + (report.boundary.ok ? 'OK' : `UNSAFE (${report.boundary.issues.length} issue(s))`));
    for (const issue of report.boundary.issues) {
      lines.push(`  ${issue.path}: ${issue.kind}`);
    }
    for (const issue of report.references.issues) {
      lines.push(`  ${issue.file}: ${issue.link} -> ${issue.kind}${issue.target ? ' (' + issue.target + ')' : ''}`);
    }
    for (const issue of report.integrity.issues) {
      lines.push(`  ${issue.path}: ${issue.kind}`);
    }
    if (report.recovery.hasStaging || report.recovery.lock || report.recovery.hasPending) {
      const lockPid = report.recovery.lock ? report.recovery.lock.pid : 'unknown';
      lines.push(`Stale-state markers present (lock pid ${lockPid}, staging ${report.recovery.hasStaging}, pending ${report.recovery.hasPending}).`);
    }
  }
  lines.push('', report.ok ? 'OK' : 'FAILED');
  return lines.join('\n');
}

function main(argv) {
  let opts = {};
  let command = null;
  let report;
  let exitCode = EXIT.OK;

  try {
    const parsed = parse(argv);
    opts = parsed.opts;
    command = parsed.command;

    if (opts.help) {
      report = { ok: true, output: helpText() };
    } else if (opts.version) {
      report = { ok: true, version: pkg.version };
    } else if (!command || !COMMANDS.includes(command)) {
      throw usage(`Command required. Use one of: ${COMMANDS.join(', ')}.`);
    } else if (parsed.extra.length) {
      throw usage(`Unexpected argument: ${parsed.extra[0]}`);
    } else {
      const bundle = loadBundle(packageRoot());
      assertBundle(bundle);
      const dest = resolveDestination(opts);
      const paths = makePaths(dest);

      if (command === 'install') report = install({ paths, bundle, opts });
      else if (command === 'update') report = update({ paths, bundle, opts });
      else if (command === 'rollback') report = rollback({ paths });
      else if (command === 'uninstall') report = uninstall({ paths });
      else report = diagnose(paths);

      if (command !== 'doctor' && paths.dest) {
        report.notes = report.notes || [];
        report.notes.push(hostHint(opts.host, paths.skillsRoot, paths.dest));
      }
      report.destination = paths.dest;
      exitCode = report.exitCode || (report.ok ? EXIT.OK : EXIT.INTEGRITY);
    }
  } catch (err) {
    exitCode = Number.isInteger(err.code) ? err.code : EXIT.IO;
    report = {
      ok: false,
      error: err.message,
      detail: err.detail || null,
      code: exitCode,
    };
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({ command, ok: report.ok, ...report }, null, 2) + '\n');
  } else if (report.output) {
    process.stdout.write(report.output + '\n');
  } else if (report.version && command === null) {
    process.stdout.write(report.version + '\n');
  } else {
    process.stdout.write(formatText(report, command, opts) + '\n');
  }

  process.exitCode = exitCode;
}

module.exports = { main, parse, helpText };

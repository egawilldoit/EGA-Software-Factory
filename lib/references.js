'use strict';

const fs = require('fs');
const path = require('path');
const fsu = require('./fs-util');

// Resolve the relative links that the workflow itself uses. We only validate
// links that are explicitly relative (../ or ./) or same-directory file names.
// Root-relative doc references and descriptions of external tools are left
// alone so the check stays meaningful and free of false positives.
function checkReferences(dest, relFiles) {
  const issues = [];
  for (const rel of relFiles) {
    if (!rel.endsWith('.md')) continue;
    const abs = path.join(dest, rel);
    if (!fsu.isFile(abs)) continue; // missing files are reported by integrity

    const text = fs.readFileSync(abs, 'utf8');
    const candidates = [];
    for (const m of text.matchAll(/`([^`\n]+)`/g)) candidates.push(m[1]);
    for (const m of text.matchAll(/\]\(([^)]+)\)/g)) candidates.push(m[1]);

    for (const raw of candidates) {
      const link = raw.trim().split('#')[0].split('?')[0].trim();
      // Skip URLs, absolute paths, external-tool files and bare extensions
      // such as `.md`, which are descriptions rather than links.
      if (!link || /^(https?:|mailto:|\/|~|gen\/)/.test(link) || /^\.[A-Za-z0-9]+$/.test(link)) continue;

      let target;
      if (/^(\.\.\/|\.\/)/.test(link)) {
        target = path.resolve(path.dirname(abs), link);
      } else if (!link.includes('/') && /\.(md|yaml|json)$/.test(link)) {
        target = path.resolve(path.dirname(abs), link);
      } else {
        continue;
      }

      const relTarget = path.relative(dest, target);
      if (relTarget.startsWith('..') || path.isAbsolute(relTarget)) {
        issues.push({ file: rel, link, kind: 'escape', target: relTarget });
        continue;
      }
      if (!fsu.isFile(target)) {
        issues.push({ file: rel, link, kind: 'missing', target: relTarget.split(path.sep).join('/') });
      }
    }
  }
  return issues;
}

module.exports = { checkReferences };

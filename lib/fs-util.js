'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function pathExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch (_) {
    return false;
  }
}

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch (_) {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch (_) {
    return false;
  }
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256File(p) {
  return sha256Buffer(fs.readFileSync(p));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJsonOrNull(p) {
  if (!isFile(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeFileAtomic(p, data) {
  ensureDir(path.dirname(p));
  const tmp = path.join(
    path.dirname(p),
    `.${path.basename(p)}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`
  );
  try {
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, p);
  } finally {
    if (pathExists(tmp)) {
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
  }
}

function writeJsonAtomic(p, obj) {
  writeFileAtomic(p, JSON.stringify(obj, null, 2) + '\n');
}

function copyFileAtomic(src, dst) {
  ensureDir(path.dirname(dst));
  writeFileAtomic(dst, fs.readFileSync(src));
}

function removeTree(p) {
  if (!pathExists(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

// Remove everything inside dir but keep dir itself.
function emptyDir(dir) {
  if (!isDirectory(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    removeTree(path.join(dir, name));
  }
}

// Copy a tree of regular files; returns the list of relative paths copied.
function copyTree(src, dst) {
  const copied = [];
  if (!isDirectory(src)) return copied;
  const walk = (cwd, rel) => {
    for (const name of fs.readdirSync(cwd).sort()) {
      const from = path.join(cwd, name);
      const toRel = rel ? path.join(rel, name) : name;
      const st = fs.statSync(from);
      if (st.isDirectory()) {
        walk(from, toRel);
      } else if (st.isFile()) {
        copyFileAtomic(from, path.join(dst, toRel));
        copied.push(toRel.split(path.sep).join('/'));
      }
      // Symlinks and special files are intentionally not copied: the bundle
      // contains only regular files and portable relative links.
    }
  };
  walk(src, '');
  return copied;
}

function listFiles(root) {
  const out = [];
  if (!isDirectory(root)) return out;
  const walk = (cwd, rel) => {
    for (const name of fs.readdirSync(cwd).sort()) {
      const p = path.join(cwd, name);
      const toRel = rel ? path.join(rel, name) : name;
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p, toRel);
      else if (st.isFile()) out.push(toRel.split(path.sep).join('/'));
    }
  };
  walk(root, '');
  return out.sort();
}

function moveFile(src, dst) {
  ensureDir(path.dirname(dst));
  try {
    fs.renameSync(src, dst);
  } catch (err) {
    if (err.code === 'EXDEV') {
      copyFileAtomic(src, dst);
      fs.unlinkSync(src);
    } else {
      throw err;
    }
  }
}

// Remove empty directories under root, deepest first, optionally skipping root.
function pruneEmptyDirs(root, skip) {
  if (!isDirectory(root)) return;
  const skipSet = new Set(skip || []);
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (isDirectory(p) && !skipSet.has(p)) {
        walk(p);
        try { fs.rmdirSync(p); } catch (_) {}
      }
    }
  };
  walk(root);
}

module.exports = {
  pathExists,
  isDirectory,
  isFile,
  sha256Buffer,
  sha256File,
  ensureDir,
  readJsonOrNull,
  writeFileAtomic,
  writeJsonAtomic,
  copyFileAtomic,
  removeTree,
  emptyDir,
  copyTree,
  listFiles,
  moveFile,
  pruneEmptyDirs,
};

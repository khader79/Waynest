#!/usr/bin/env node
/**
 * Conservative cleanup script
 * - Backs up each file before modification
 * - Removes single-line commented-out code (// const ..., // function ...)
 * - Removes TODO/FIXME/HACK/TEMP single-line comments
 * - Removes `console.log`, `console.debug`, `console.info` statements and `debugger` statements
 * - Preserves files with license/copyright markers in first 6 lines
 * - Skips node_modules, dist, public, db, migrations, uploads, .git, .cleanup-backups
 *
 * Usage: node scripts/cleanup/cleanup-comments.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BACKUP_DIR = path.join(ROOT, '.cleanup-backups', new Date().toISOString().replace(/[:.]/g, '-'));
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'public', 'uploads', 'db', 'migrations', '.git', '.cleanup-backups', '.vercel', 'coverage']);
const EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile()) {
      if (EXTENSIONS.has(path.extname(entry.name))) results.push(full);
    }
  }
  return results;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function shouldSkipByHeader(text) {
  const head = text.split(/\r?\n/).slice(0, 6).join('\n');
  if (/copyright|license|@license|licensed under/i.test(head)) return true;
  return false;
}

function processFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  let text = fs.readFileSync(filePath, 'utf8');
  if (shouldSkipByHeader(text)) return null;
  const lines = text.split(/\r?\n/);
  const removed = [];
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // preserve eslint/ts-ignore comments and license-like lines
    if (/eslint-|istanbul|@ts-ignore|@ts-expect-error|@preserve|copyright|license/i.test(line)) {
      out.push(line);
      continue;
    }

    // remove single-line TODO/FIXME/HACK/TEMP comments
    if (/^\s*\/\/\s*(?:TODO|FIXME|HACK|TEMP|NOTE|DEBUG)[:\s-]/i.test(line)) {
      removed.push({ reason: 'todo', content: line });
      continue;
    }

    // remove commented-out code lines (conservative list)
    if (/^\s*\/\/\s*(?:const |let |var |function |class |import |export |return |if\b|for\b|while\b|switch\b|try\b|await\b|interface\b|type\b|enum\b|new\s+|module\.|require\(|\w+\s*=>|<\w+)/i.test(line)) {
      removed.push({ reason: 'commented_code', content: line });
      continue;
    }

    // remove console.log/debug/info and debugger statements
    if (/^\s*console\.(?:log|debug|info)\s*\(/.test(line) || /^\s*debugger;?\s*$/.test(line)) {
      removed.push({ reason: 'console_or_debugger', content: line });
      continue;
    }

    // otherwise keep the line
    out.push(line);
  }

  // compress excessive blank lines (no more than 2 consecutive)
  const compressed = [];
  let blankCount = 0;
  for (const l of out) {
    if (/^\s*$/.test(l)) {
      blankCount += 1;
      if (blankCount <= 2) compressed.push(l);
    } else {
      blankCount = 0;
      compressed.push(l);
    }
  }

  const newText = compressed.join('\n');
  if (newText !== text) {
    // backup original
    const backupPath = path.join(BACKUP_DIR, rel);
    ensureDir(path.dirname(backupPath));
    fs.writeFileSync(backupPath, text, 'utf8');
    // write modified file
    fs.writeFileSync(filePath, newText, 'utf8');
    return { file: rel, removed };
  }
  return null;
}

function main() {
  ensureDir(BACKUP_DIR);
  console.log('Backup directory:', BACKUP_DIR);
  const files = walk(ROOT);
  const report = { timestamp: new Date().toISOString(), modified: [] };
  for (const f of files) {
    try {
      const r = processFile(f);
      if (r) report.modified.push(r);
    } catch (err) {
      console.error('Error processing', f, err && err.message);
    }
  }
  const reportPath = path.join(ROOT, 'cleanup-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log('Cleanup finished. Files modified:', report.modified.length);
  console.log('Report saved to', reportPath);
}

if (require.main === module) main();

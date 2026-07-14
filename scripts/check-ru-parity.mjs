#!/usr/bin/env node
// Every public human-readable Markdown document must ship a Russian
// counterpart at FILE.ru.md. This fails CI when a new document lands without
// one, which is the only reliable way to stop the two language sets drifting.
//
// Code, configs, tests and fixtures are deliberately single-language and are
// not matched here — only .md files outside the excluded paths.

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not url.pathname: the repository path may contain non-ASCII
// characters, which pathname leaves percent-encoded.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'coverage', 'playwright-report', 'test-results', 'backups', 'docs']);

// Documents that intentionally have no FILE.ru.md, each with a stated reason.
const EXEMPT = new Map([
  [
    '.github/pull_request_template.md',
    'GitHub renders exactly one default PR template, so a second file would never be shown. The single template is bilingual instead.',
  ],
]);

const errors = [];
const checked = [];

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const files = await walk(ROOT);
const present = new Set(files.map((f) => relative(ROOT, f).split(sep).join('/')));

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join('/');
  if (rel.endsWith('.ru.md')) continue;
  if (EXEMPT.has(rel)) continue;

  const ru = rel.replace(/\.md$/, '.ru.md');
  if (!present.has(ru)) {
    errors.push(`${rel}: missing Russian counterpart ${ru} (add it, or add an exemption with a reason in scripts/check-ru-parity.mjs)`);
    continue;
  }
  checked.push(rel);

  // Both files must carry the switcher line, so a reader can always get across.
  const expected = `[English](${rel.split('/').pop()}) | [Русский](${ru.split('/').pop()})`;
  for (const side of [rel, ru]) {
    const head = (await readFile(join(ROOT, side), 'utf8')).split('\n')[0].trim();
    if (head !== expected) {
      errors.push(`${side}: first line must be the language switcher\n    expected: ${expected}\n    found:    ${head || '(empty)'}`);
    }
  }
}

console.log(`checked ${checked.length} document pair(s); ${EXEMPT.size} exempt`);
for (const [file, why] of EXEMPT) console.log(`exempt  ${file} — ${why}`);
if (errors.length) {
  for (const e of errors) console.error(`ERROR ${e}`);
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log('every public document has a Russian counterpart with a switcher');

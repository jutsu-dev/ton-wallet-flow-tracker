#!/usr/bin/env node
// Markdown link checker.
//
// Internal links — relative files, images, and same-file anchors — are checked
// strictly and fail the run. They are fully deterministic, and they are what
// actually rots: a renamed doc, a moved image, a heading that lost its anchor.
// Case is compared exactly, because CI and production are Linux while most
// authoring here happens on case-insensitive Windows.
//
// External links are NOT checked by default. CI must not go red because a third
// party had a bad minute. Run `node scripts/check-links.mjs --external` to check
// them on demand: each URL gets a 10s timeout and two retries, and only a
// definitive 404/410 counts as broken.

import { readFile, readdir, access } from 'node:fs/promises';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not url.pathname: the repository path may contain non-ASCII
// characters, which pathname leaves percent-encoded.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'coverage', 'playwright-report', 'test-results', 'backups']);
const CHECK_EXTERNAL = process.argv.includes('--external');

/** Collect every tracked-ish Markdown file. */
async function findMarkdown(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await findMarkdown(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/** Strip fenced and inline code so link-like text inside samples is ignored. */
function stripCode(md) {
  return md.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

/** GitHub's heading -> anchor slug. */
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function anchorsOf(md) {
  const found = new Set();
  for (const m of md.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) found.add(slug(m[1]));
  // Explicit HTML anchors, e.g. <a id="x"> or <h1 id="x">.
  for (const m of md.matchAll(/<[a-z0-9]+[^>]*\sid=["']([^"']+)["']/gi)) found.add(m[1].toLowerCase());
  return found;
}

function linksOf(md) {
  const out = [];
  // [text](target) and ![alt](target)
  for (const m of md.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) out.push(m[1]);
  // <https://bare-autolink>
  for (const m of md.matchAll(/<((?:https?):\/\/[^>\s]+)>/g)) out.push(m[1]);
  return out;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Exact-case existence check: Windows would happily accept the wrong case. */
async function existsExactCase(target) {
  if (!(await exists(target))) return false;
  const dir = dirname(target);
  const base = target.slice(dir.length + 1);
  try {
    return (await readdir(dir)).includes(base);
  } catch {
    return false;
  }
}

async function checkExternal(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 10_000);
    try {
      let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ac.signal });
      if (res.status === 405 || res.status === 501) {
        res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ac.signal });
      }
      return res.status === 404 || res.status === 410 ? { broken: true, status: res.status } : { broken: false };
    } catch {
      if (attempt === 3) return { unreachable: true };
    } finally {
      clearTimeout(timer);
    }
  }
  return { unreachable: true };
}

const errors = [];
const warnings = [];
const files = await findMarkdown(ROOT);
const externalSeen = new Map();

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const md = stripCode(raw);
  const anchors = anchorsOf(raw);
  const rel = relative(ROOT, file).split(sep).join('/');

  for (const link of linksOf(md)) {
    if (link.startsWith('mailto:') || link.startsWith('tel:')) continue;

    if (/^https?:\/\//.test(link)) {
      if (CHECK_EXTERNAL && !externalSeen.has(link)) externalSeen.set(link, rel);
      continue;
    }

    // Same-file anchor.
    if (link.startsWith('#')) {
      const a = decodeURIComponent(link.slice(1)).toLowerCase();
      if (!anchors.has(a)) errors.push(`${rel}: anchor not found -> ${link}`);
      continue;
    }

    const [pathPart, hash] = link.split('#');
    const target = resolve(dirname(file), decodeURIComponent(pathPart));

    if (!(await existsExactCase(target))) {
      errors.push(`${rel}: target missing (or wrong case) -> ${link}`);
      continue;
    }
    // Cross-file anchor, only for Markdown targets.
    if (hash && pathPart.endsWith('.md')) {
      const targetAnchors = anchorsOf(await readFile(target, 'utf8'));
      const a = decodeURIComponent(hash).toLowerCase();
      if (!targetAnchors.has(a)) errors.push(`${rel}: anchor not found in ${pathPart} -> #${hash}`);
    }
  }
}

if (CHECK_EXTERNAL) {
  for (const [url, from] of externalSeen) {
    const result = await checkExternal(url);
    if (result.broken) errors.push(`${from}: external link ${result.status} -> ${url}`);
    else if (result.unreachable) warnings.push(`${from}: external link unreachable (not failing CI) -> ${url}`);
  }
}

console.log(`checked ${files.length} markdown files${CHECK_EXTERNAL ? ` and ${externalSeen.size} external links` : ' (internal links only)'}`);
for (const w of warnings) console.warn(`warn  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`ERROR ${e}`);
  console.error(`\n${errors.length} broken link(s)`);
  process.exit(1);
}
console.log('all links resolve');

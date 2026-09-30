#!/usr/bin/env node
/**
 * Privacy gate — assertions A and B.
 *
 *   node scripts/check-privacy.mjs [--dist <dir>] [--src <dir>]
 *                                   [--scripts <dir>] [--public <dir>]
 *
 * Zero dependencies: `node:fs`, `node:crypto`, `node:path`, `node:url` only.
 * (Assertion C adds `node:child_process`; see the unit that introduced it.)
 *
 * EXIT CODES
 *   0  every assertion passed
 *   1  at least one assertion failed — the real signal
 *   2  internal error: a scan root is missing, unreadable, or a path is
 *      unparseable. Never reported as a pass: a gate that cannot look is not
 *      a gate that found nothing.
 *
 * WHY A BARE `\d{6,10}` IS REJECTED. It matches build sizes, dates, byte
 * offsets and the phone number. A privacy scanner that cries wolf gets
 * `--no-verify`-ed or deleted inside a week, and then it protects nothing.
 * The digit run below only counts when it is anchored to a national-ID
 * label or when it is the exact identifier.
 *
 * WHY THE IDENTIFIER IS ASSEMBLED AT RUNTIME. The scanner is part of the
 * tree it scans. If the identifier appeared here as contiguous text, the
 * scanner would match its own source the first time it looked at
 * `scripts/`, report a leak, and be deleted as broken. `ID_PARTS` keeps the
 * two halves apart in source and joins them once, at run time. This is task
 * 1.4 of the plan, folded into this unit because the file it constrains
 * does not exist before this unit.
 *
 * NO FILE IS EVER CLASSIFIED BY NAME. Classification is by extension
 * allowlist only, so `README.sh` and `CMakeLists.txt` need no special case
 * and a new name cannot be used to smuggle a file past the scan. Symlinks
 * are skipped via `lstat` semantics, so `dist/x.html -> /etc/passwd` is
 * never read and cannot be exfiltrated through the scanner's own output.
 *
 * THE EXTENSION SETS DIFFER BY ROOT, AND THAT IS THE POINT. `dist/` is
 * build output: only extensions the build actually emits are read there.
 * `src/`, `scripts/` and `public/` are authored trees, where a text or
 * markdown file is a real source artefact and is read. So a documentation
 * file dropped into `dist/` is neither scanned nor able to crash the walk,
 * while the same file under `src/` is covered. `public/` is scanned
 * precisely because anything in it is copied verbatim into `dist/`: that is
 * the only way a `.txt` excluded from the build-output set stays covered.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = 'check-privacy';

/** The national identifier, held as two halves and joined at run time. */
const ID_PARTS = ['1004', '249850'];
const NATIONAL_ID = ID_PARTS.join('');

/**
 * The identifier used as a plain substring. Escaped rather than inlined so
 * that changing the halves cannot silently produce a broken pattern.
 */
const LITERAL = new RegExp(NATIONAL_ID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

/** `CC`, `C.C`, `CEDULA`, `CÉDULA`, `NIT`, `IDENTIFICACION` then 6-10 digits. */
const CC_ANCHORED = /(?:CC|C\.C|CEDULA|CÉDULA|NIT|IDENTIFICACION)\W{0,4}\d{6,10}/i;

/** Extensions the build can emit into `dist/`. */
const BUILD_OUTPUT_EXTENSIONS = new Set([
  '.html',
  '.css',
  '.js',
  '.mjs',
  '.map',
  '.svg',
  '.xml',
  '.json',
]);

/** Extensions an authored tree can contain, read in addition to the above. */
const AUTHORED_EXTENSIONS = new Set([
  ...BUILD_OUTPUT_EXTENSIONS,
  '.astro',
  '.ts',
  '.tsx',
  '.txt',
  '.md',
  '.mdx',
  '.yml',
  '.yaml',
]);

class InternalError extends Error {}

const argv = process.argv.slice(2);

function rootArg(name, fallback) {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const value = argv[at + 1];
  if (value === undefined) throw new InternalError(`--${name} needs a directory argument`);
  return path.resolve(process.cwd(), value);
}

const ROOTS = {
  dist: { dir: rootArg('dist', path.join(ROOT, 'dist')), extensions: BUILD_OUTPUT_EXTENSIONS },
  src: { dir: rootArg('src', path.join(ROOT, 'src')), extensions: AUTHORED_EXTENSIONS },
  scripts: { dir: rootArg('scripts', path.join(ROOT, 'scripts')), extensions: AUTHORED_EXTENSIONS },
  public: { dir: rootArg('public', path.join(ROOT, 'public')), extensions: AUTHORED_EXTENSIONS },
};

/**
 * Depth-first walk yielding `{ abs, rel }` for regular files whose extension is
 * in `extensions`. Symlinks are skipped rather than followed, and an
 * unreadable directory is an internal error, never an empty result.
 */
function* walk(root, extensions, label) {
  if (!existsSync(root)) {
    throw new InternalError(
      `scan root "${label}" is missing: ${path.relative(ROOT, root) || root}. ` +
        'A gate that cannot look is not a gate that found nothing.',
    );
  }
  const stack = [''];
  while (stack.length > 0) {
    const relative = stack.pop();
    const absolute = path.join(root, relative);
    let entries;
    try {
      entries = readdirSync(absolute, { withFileTypes: true });
    } catch (cause) {
      throw new InternalError(`cannot read ${absolute}: ${cause.message}`);
    }
    for (const entry of entries) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const childAbsolute = path.join(absolute, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        stack.push(childRelative);
      } else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
        yield { abs: childAbsolute, rel: childRelative };
      }
    }
  }
}

function* pdfs(root, label) {
  if (!existsSync(root)) return;
  const stack = [''];
  while (stack.length > 0) {
    const relative = stack.pop();
    const absolute = path.join(root, relative);
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const childAbsolute = path.join(absolute, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) stack.push(childRelative);
      else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.pdf') {
        yield { abs: childAbsolute, rel: childRelative, label };
      }
    }
  }
}

function sha256(absolute) {
  return createHash('sha256').update(readFileSync(absolute)).digest('hex');
}

/** First match of `pattern` in `text`, reported as a 1-based column. */
function firstMatch(text, pattern) {
  pattern.lastIndex = 0;
  const found = pattern.exec(text);
  return found ? { value: found[0], column: found.index + 1 } : null;
}

const failures = [];
const results = {};

// ---------------------------------------------------------------------------
// Assertion A — national identifier
// ---------------------------------------------------------------------------
/**
 * `dist/` gets the full pattern set: a rendered page is where a leak becomes
 * public, and a label-plus-digits pair is worth catching there even if it is
 * not the exact identifier. Authored trees get the exact identifier only.
 * A bare digit run in source is not evidence of anything.
 */
function assertionA() {
  let scanned = 0;
  let matched = false;

  for (const [label, { dir, extensions }] of Object.entries(ROOTS)) {
    const patterns = label === 'dist' ? [LITERAL, CC_ANCHORED] : [LITERAL];
    for (const file of walk(dir, extensions, label)) {
      scanned += 1;
      const text = readFileSync(file.abs, 'utf8');
      for (const pattern of patterns) {
        const hit = firstMatch(text, pattern);
        if (!hit) continue;
        matched = true;
        const name = pattern === LITERAL ? 'LITERAL' : 'CC_ANCHORED';
        failures.push(
          `${PREFIX}: FAIL [A] ${label}/${file.rel} column ${hit.column} ` +
            `matched ${name} — "${hit.value}"`,
        );
        break;
      }
    }
  }

  results.A = matched ? 'fail' : 'pass';
  return `${scanned} text file(s) scanned across dist/, src/, scripts/, public/`;
}

// ---------------------------------------------------------------------------
// Assertion B — PDF digest allowlist
// ---------------------------------------------------------------------------
/**
 * Every PDF in `dist/` must have a sha256 that also exists under `public/`.
 * The allowlist is derived, never hand-written: a digest nobody approved
 * cannot appear in it.
 *
 * This is the only assertion that can catch an identifier rendered as a
 * scanned image inside a PDF, which no text extraction can ever see. It is
 * vacuously satisfied today because no PDF exists, and that is the correct
 * state rather than a skipped one.
 */
function assertionB() {
  const approved = new Map();
  for (const file of pdfs(ROOTS.public.dir, 'public')) {
    approved.set(sha256(file.abs), file.rel);
  }

  const found = [];
  for (const file of pdfs(ROOTS.dist.dir, 'dist')) {
    found.push({ ...file, digest: sha256(file.abs) });
  }

  let matched = false;
  for (const file of found) {
    if (approved.has(file.digest)) continue;
    matched = true;
    const known = approved.size === 0 ? 'public/ holds no PDF' : `known: ${[...approved.values()].join(', ')}`;
    failures.push(
      `${PREFIX}: FAIL [B] dist/${file.rel} sha256=${file.digest} ` +
        `is not in the public/ allowlist (${known})`,
    );
  }

  results.B = matched ? 'fail' : 'pass';
  return `${found.length} PDF(s) in dist/ against ${approved.size} approved digest(s)`;
}

// ---------------------------------------------------------------------------

try {
  const detailA = assertionA();
  const detailB = assertionB();

  console.log(`${PREFIX}: A ${results.A} (${detailA})`);
  console.log(`${PREFIX}: B ${results.B} (${detailB})`);
  for (const line of failures) console.log(line);
  console.log(`${PREFIX}: RESULT A=${results.A} B=${results.B}`);

  process.exit(failures.length > 0 ? 1 : 0);
} catch (cause) {
  if (cause instanceof InternalError) {
    console.error(`${PREFIX}: ERROR ${cause.message}`);
    process.exit(2);
  }
  throw cause;
}

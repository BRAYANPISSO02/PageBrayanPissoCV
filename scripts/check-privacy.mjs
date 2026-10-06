#!/usr/bin/env node
/**
 * Privacy gate — assertions A and B.
 *
 *   node scripts/check-privacy.mjs [--dist <dir>] [--src <dir>]
 *                                   [--scripts <dir>] [--public <dir>]
 *
 * Zero dependencies: `node:fs`, `node:crypto`, `node:child_process`,
 * `node:path`, `node:url` only.
 *
 * EXIT CODES
 *   0  every assertion passed
 *   1  at least one assertion failed — the real signal
 *   2  internal error: a scan root is missing, unreadable, or a path is
 *      unparseable. Never reported as a pass: a gate that cannot look is not
 *      a gate that found nothing.
 *   3  degraded: assertion C had no CV text source and was SKIPPED. Named,
 *      announced and non-zero on purpose — `0` here would be a false green
 *      and `1` would blame the content for a missing file.
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

import { execFileSync } from 'node:child_process';
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
/** No CV text source: assertion C is skipped, loudly, with its own exit code. */
class Degraded extends Error {}

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
// Assertion C — content provenance, and H — the numeric guard
// ---------------------------------------------------------------------------
/**
 * WHY A COMMITTED FIXTURE AND NOT THE PDF. The source PDF is git-ignored, so a
 * gate that read it directly would degrade on every clean checkout — the
 * provenance requirement would be enforced nowhere. `CV_PATH` may still point
 * at a real redacted PDF for a local re-check; otherwise the committed extract
 * at `scripts/fixtures/cv.txt` is the source. That file is the output of
 * `pdftotext -layout` on the PDF, so both paths converge on the same text.
 *
 * THE SUBPROCESS IS HARDENED, NOT TRUSTED. `execFileSync(bin, [path, '-'])`
 * takes an argument array, so no shell is spawned and `;`, `$(…)` and
 * backticks inside the path are inert — a shell string creates `/tmp/pwned`.
 * A path beginning with `-` is rejected before the call, because `pdftotext`
 * parses its own argv and would otherwise read it as a flag.
 */
const CV_FIXTURE = path.join(ROOT, 'scripts', 'fixtures', 'cv.txt');

function cvText() {
  const fromPdf = process.env.CV_PATH;
  if (fromPdf === undefined || fromPdf === '') {
    if (!existsSync(CV_FIXTURE)) {
      throw new Degraded(`no CV text source: ${path.relative(ROOT, CV_FIXTURE)} is absent and CV_PATH is unset`);
    }
    return readFileSync(CV_FIXTURE, 'utf8');
  }
  if (fromPdf.startsWith('-')) {
    throw new InternalError(
      `CV_PATH "${fromPdf}" begins with "-", which pdftotext would read as a flag rather than a path`,
    );
  }
  try {
    return execFileSync('pdftotext', [fromPdf, '-'], { encoding: 'utf8', maxBuffer: 16 << 20 });
  } catch (cause) {
    throw new Degraded(
      `pdftotext could not read CV_PATH "${fromPdf}": ${String(cause.stderr ?? cause.message).split('\n')[0]}`,
    );
  }
}

/** NFD → strip combining marks → lowercase → collapse whitespace. */
const normalise = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The navigation table is structure, not content, so it is excluded here.
 * R-04 already governs it by a stronger test — set equality against the
 * rendered `id` attributes — and every label is one of those ids. The region
 * is blanked by an anchored match rather than a fuzzy pattern, and a table
 * that cannot be found is exit 2: a weaker audit is never a green build.
 */
const NAV_TABLE = /export const NAV_LINKS[\s\S]*?\] as const;/;

/** Literals that carry no claim about the CV, with the reason each is skipped. */
const NOT_PROVENANCE = [
  { why: 'fewer than three characters', test: (v) => v.trim().length < 3 },
  {
    why: 'a URL, an in-page anchor, or a bare URL scheme — never prose',
    test: (v) => /^(?:https?:|mailto:|tel:|data:|#)/i.test(v) || /^(?:mailto|tel|form)$/i.test(v),
  },
  {
    why: 'a file name, not a claim about the person',
    test: (v) => /\.(?:pdf|jpe?g|png|webp|gif|svg|ico|txt|md|json|ya?ml)$/i.test(v.trim()),
  },
];

/**
 * `EDITORIAL_ALLOWLIST` — the only `site.ts` strings that are not literal
 * substrings of the CV, grouped by why each group is allowed.
 *
 * Grouped rather than flattened because a flat list of thirty near-identical
 * reasons is a list nobody reads, and a reason nobody reads is not a control.
 * Each group is a category the delta spec names, or one it omits; the omitted
 * ones are recorded as corrections in `apply-progress` rather than smuggled in
 * here. Matching is exact on the normalised form, so an allowlist entry can
 * never excuse a *longer* string that merely contains it.
 */
const EDITORIAL_ALLOWLIST = [
  {
    id: 'hero-value-sentence',
    reason:
      'R-05 fixes this sentence and its clause order. It is a composition of six CV fragments, not a quote.',
    texts: [
      'Builds computer vision models end-to-end — dataset construction, PyTorch training, SageMaker deployment — cutting ≈ 2 hours of manual design time per image for a microenterprise.',
    ],
  },
  {
    id: 'target-role',
    reason:
      'R-06 requires this exact value. The CV lists a degree and no job title, so no substring of it can contain the string; it is positioning, not a claim.',
    texts: ['Machine Learning Engineer'],
  },
  {
    id: 'stack-tier-labels',
    reason:
      'R-13 fixes the three tier labels. `Programming` needs no entry: it is verbatim on the CV Programming languages line.',
    texts: ['Machine Learning & Computer Vision', 'Cloud & MLOps'],
  },
  {
    id: 'embedded-framing-sentence',
    reason:
      'R-16 requires one sentence tying the band to the telemetry project. Every clause is a fragment of the CV experience entry, recombined.',
    texts: [
      'Long-Range Telemetry Project: long-distance data acquisition over Wi-Fi HaLow connectivity, with integration into the ThingsBoard IoT monitoring and management platform.',
    ],
  },
  {
    id: 'pdf-text-reflowed',
    reason:
      "The CV's own words, re-joined. `pdftotext -layout` interleaves the date column between the two halves of a heading, and breaks `multi-hop` across a line as `multi-` + `hop`; neither survives as a contiguous substring of the extract.",
    texts: [
      'Automatic Generation of Human Vector Representations Using Deep Learning',
      'Percepción y Control Inteligente (PCI) Research Group',
      'Professor, Department of Electrical, Electronic and Communications Engineering, Universidad Nacional de Colombia',
      'Developed and implemented a pilot test at the Universidad Nacional de Colombia, La Nubia campus, of a long-distance data acquisition system for multiple electrical energy meters, using Modbus RTU/TCP and DLMS/COSEM protocols over Wi-Fi HaLow connectivity, with integration into the ThingsBoard IoT monitoring and management platform, designed to operate in self-organized multi-hop mesh network topologies.',
    ],
  },
  {
    id: 'featured-case-prose',
    reason:
      'R-09 needs a case the recruiter can scan. Each field is built from the CV project paragraph, recomposed into problem/solution/technology/impact. No figure is introduced: the only number is the CV two hours per image.',
    texts: [
      'Generating vector representations of people by hand is slow. For a microenterprise specializing in laser cutting and engraving, manual design work consumed approximately two hours per image — a direct cost on every order.',
      'An automated computer vision pipeline that generates SVG vector representations of people directly from photographs, delivering a real impact in a production environment.',
      'Deep learning models in PyTorch, including the Segment Anything Model (SAM) for interactive segmentation. A data engineering pipeline builds the dataset for supervised training of a vision model in Amazon SageMaker, focused on image-to-image translation tasks.',
      'Approximately two hours of manual design time reduced per image for a real-world business.',
    ],
  },
  {
    id: 'grouped-service-labels',
    reason:
      'The CV groups these as `AWS (Lambda, SageMaker, Bedrock, S3)` and `CNC machinery operation: Router and Laser`; the chip composes the group name with one of its members.',
    texts: ['Amazon S3', 'AWS Lambda', 'Amazon Bedrock', 'CNC Router', 'CNC Laser'],
  },
  {
    id: 'chip-respacing-and-order',
    reason:
      'The CV writes `TensorFlow/Keras` and `English B2 (CEFR), Native Spanish`. The chip re-spaces or re-orders the same words and adds nothing.',
    texts: ['TensorFlow / Keras', 'English — B2 (CEFR)', 'Spanish — Native'],
  },
  {
    id: 'experience-tag-labels',
    reason: 'The CV says `PCB routing`; the tag names the discipline that entry covers.',
    texts: ['PCB Design'],
  },
  {
    id: 'phone-display-format',
    reason:
      'The CV writes `(+57) 3152162946`. The display form drops the parentheses so the string matches the `tel:` href shape. The digits are the CV digits.',
    texts: ['+57 3152162946'],
  },
  {
    id: 'document-request-copy',
    reason:
      'R-45 reserves this category. The site ships no document link and no request form, so the wording is written for the page. Nothing in it asserts a CV fact: no title, no employer, no date.',
    texts: [
      'Documents',
      'Documents are shared on request. Tell me who you are and which one you need, and I will send it over.',
      'Request',
      'Document request',
      'Hello Brayan,',
      'Your name / your email:',
      'Send me only your name and email address, and only what the document needs. No cookies and no tracking are used on this site.',
      'You can also say no, and nothing will be sent.',
      'Curriculum Vitae',
      'PDF',
      'Machine learning and computer vision profile, project and academic record.',
    ],
  },
];

const ALLOWED = new Set(EDITORIAL_ALLOWLIST.flatMap((group) => group.texts.map(normalise)));

/**
 * R-48 has no metrics to check, because none may be invented. What it does have
 * is the padding that stands in for a missing metric. A closed deny-list, matched
 * on word boundaries so `proven` cannot fire on `provenance` and `scalable` cannot
 * fire on `scalability`.
 */
const HEDGE_TERMS = [
  'high accuracy',
  'highly accurate',
  'significant improvement',
  'excellent performance',
  'state-of-the-art',
  'best-in-class',
  'world-class',
  'robust solution',
  'optimized performance',
  'superior performance',
  'proven',
  'scalable',
];

function assertionC() {
  const pdf = normalise(cvText());
  const source = readFileSync(path.join(ROOT, 'src', 'lib', 'site.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

  const nav = source.match(NAV_TABLE);
  if (!nav) {
    throw new InternalError(
      'cannot locate `export const NAV_LINKS … ] as const;` in src/lib/site.ts — the audit would be blind to the nav',
    );
  }
  // Same-length blanking keeps every subsequent line number true to the file.
  const scoped =
    source.slice(0, nav.index) + ' '.repeat(nav[0].length) + source.slice(nav.index + nav[0].length);

  const lines = [];
  for (const match of scoped.matchAll(/'((?:[^'\\]|\\[\s\S])*)'|"((?:[^"\\]|\\[\s\S])*)"/g)) {
    const text = match[1] !== undefined ? match[1] : match[2];
    const skip = NOT_PROVENANCE.find((rule) => rule.test(text));
    if (skip) continue;
    lines.push({ text, line: scoped.slice(0, match.index).split('\n').length });
  }

  if (lines.length === 0) {
    throw new InternalError('extracted 0 string literals from src/lib/site.ts — the audit is not running');
  }

  const seen = new Set();
  let matched = false;
  let checked = 0;
  for (const { text, line } of lines) {
    if (seen.has(text)) continue;
    seen.add(text);
    const form = normalise(text);
    checked += 1;
    if (!pdf.includes(form) && !ALLOWED.has(form)) {
      matched = true;
      failures.push(
        `${PREFIX}: FAIL [C] site.ts:${line} "${text}" is neither a substring of ` +
          `scripts/fixtures/cv.txt nor an EDITORIAL_ALLOWLIST entry`,
      );
    }
  }

  results.C = matched ? 'fail' : 'pass';
  return `${checked} distinct string(s) checked against the CV, ${EDITORIAL_ALLOWLIST.length} allowlist group(s)`;
}

/** The deny-list pass. Separate from C because its failure is a different crime. */
function assertionH() {
  const source = readFileSync(path.join(ROOT, 'src', 'lib', 'site.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

  let matched = false;
  let hits = 0;
  for (const term of HEDGE_TERMS) {
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    for (const match of source.matchAll(pattern)) {
      hits += 1;
      matched = true;
      failures.push(
        `${PREFIX}: FAIL [H] site.ts:${source.slice(0, match.index).split('\n').length} ` +
          `"${match[0]}" is a hedge term standing in for a number the CV does not carry`,
      );
    }
  }

  results.H = matched ? 'fail' : 'pass';
  return `${HEDGE_TERMS.length} hedge term(s) deny-listed, ${hits} hit(s)`;
}

// ---------------------------------------------------------------------------

try {
  const detailA = assertionA();
  const detailB = assertionB();
  const detailC = assertionC();
  const detailH = assertionH();

  console.log(`${PREFIX}: A ${results.A} (${detailA})`);
  console.log(`${PREFIX}: B ${results.B} (${detailB})`);
  console.log(`${PREFIX}: C ${results.C} (${detailC})`);
  console.log(`${PREFIX}: H ${results.H} (${detailH})`);
  for (const line of failures) console.log(line);
  console.log(`${PREFIX}: RESULT A=${results.A} B=${results.B} C=${results.C} H=${results.H}`);

  process.exit(failures.length > 0 ? 1 : 0);
} catch (cause) {
  if (cause instanceof Degraded) {
    // R-46: named, announced, and never a pass. A and B really did run; saying
    // so is the difference between "skipped" and "silently green".
    console.error(`${PREFIX}: WARN SKIPPED: assertion C — ${cause.message}`);
    console.error(`${PREFIX}: WARN assertion H did not run either; it reads the same source tree.`);
    console.error(
      `${PREFIX}: RESULT A=${results.A} B=${results.B} C=skipped H=skipped — this is NOT a pass`,
    );
    process.exit(3);
  }
  if (cause instanceof InternalError) {
    console.error(`${PREFIX}: ERROR ${cause.message}`);
    process.exit(2);
  }
  throw cause;
}

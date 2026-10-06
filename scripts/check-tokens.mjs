#!/usr/bin/env node
/**
 * Token-layer gate — the mechanical half of R-18, R-19, R-22, R-23 and R-27,
 * plus the two contracts a comment cannot enforce (DR-5, and the `SCHEME_COLORS`
 * pairing stated in `src/lib/theme.ts`).
 *
 *   node scripts/check-tokens.mjs [--build-log <file>]
 *
 *   1  exactly one `@media (prefers-color-scheme: dark)` block
 *   2  that block holds >= 15 custom-property reassignments
 *   3  that block holds 0 selector rules, counted as 0 NON-`:root` selectors
 *   4  that block holds 0 `!important`, counted by block extent
 *   5  0 `--dark*` custom properties anywhere in the stylesheet
 *   6  0 hex literals outside `:root`, excluding the `@media print` block
 *   7  0 `will-change` anywhere under `src/`
 *   8  0 Vite "externalized for browser compatibility" warnings in the build log
 *   9  `SCHEME_COLORS.light`/`.dark` equal `--bg` in `:root` and in the dark block
 *
 * EXIT CODES
 *   0  every assertion held
 *   1  at least one assertion failed — the real signal
 *   2  the input is not measurable: no stylesheet, an unparseable token table, or
 *      no build log. Never reported as a pass: a gate that cannot look is not a
 *      gate that found nothing.
 *
 * ASSERTION 3 COUNTS NON-`:root` SELECTORS. The dark block's only legal child
 * is a `:root` wrapper, and `:root` IS a selector. Counting it as one makes the
 * gate fail on the exact stylesheet it was written to approve, which is how a
 * gate gets deleted. A rule like `.btn { color: red }` inside the block still
 * fails.
 *
 * ASSERTION 4 COUNTS BY BLOCK EXTENT, NOT BY FILE TOTAL. `global.css` carries 4
 * `!important` declarations file-wide — 3 in `@media (prefers-reduced-motion)`
 * and 1 in `@media print`. The dark block holds 0. Measuring the file total
 * would fail a correct stylesheet over a pre-existing, deliberate declaration.
 *
 * ASSERTION 8 READS THE BUILD LOG, NOT `dist/`. Grepping the bundle for the
 * literal `node:fs` is vacuous: a bundled string is minified and renamed, so
 * the needle is absent whether or not the import exists. Vite's own warning is
 * the signal that survives. The build writes `node_modules/.astro-build.log`,
 * inside the git-ignored dependency tree, so the log needs no `.gitignore` entry
 * and can never reach the deployed artifact.
 *
 * ALL CSS IS PARSED WITH COMMENTS BLANKED, not deleted, so line numbers stay
 * true to the file and a selector written inside a comment cannot fake a rule.
 * The parser understands at-rules, one level of nesting and declarations. It is
 * not a CSS parser and does not pretend to be.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = 'check-tokens';
const STYLESHEET = path.join(ROOT, 'src', 'styles', 'global.css');
const THEME = path.join(ROOT, 'src', 'lib', 'theme.ts');
const BUILD_LOG_DEFAULT = path.join(ROOT, 'node_modules', '.astro-build.log');

class InternalError extends Error {}

const argv = process.argv.slice(2);
const logAt = argv.indexOf('--build-log');
const BUILD_LOG =
  logAt === -1 ? BUILD_LOG_DEFAULT : path.resolve(process.cwd(), argv[logAt + 1] ?? '');

const failures = [];
let checks = 0;

/** Assert one invariant. A false `ok` is a failure carrying `detail`. */
function assert(id, ok, detail) {
  checks += 1;
  if (!ok) failures.push(`${PREFIX}: FAIL [${id}] ${detail}`);
}

/** Comments blanked to spaces, so offsets and line numbers are unchanged. */
function blankComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '));
}

/**
 * Every brace-delimited block with its header and 1-based line extent. Header
 * text accumulates until a `{` and resets at `;`, which is exact for this
 * stylesheet: a header is a selector or an at-rule prelude, and a declaration
 * value is always terminated by the `;` that clears the buffer.
 */
function parseBlocks(css) {
  const blocks = [];
  const stack = [];
  let line = 1;
  let header = '';
  for (const character of css) {
    if (character === '\n') line += 1;
    else if (character === '{') {
      stack.push({ header: header.trim(), start: line, end: null });
      header = '';
    } else if (character === '}') {
      const open = stack.pop();
      if (open) {
        open.end = line;
        blocks.push(open);
      }
      header = '';
    } else if (character !== ';') header += character;
  }
  return blocks;
}

/** Every source file under `src/`, recursively. */
function authoredSources() {
  const found = [];
  const stack = [path.join(ROOT, 'src')];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(child);
      else if (entry.isFile()) found.push(child);
    }
  }
  return found;
}

function measure() {
  if (!existsSync(STYLESHEET)) {
    throw new InternalError(`no stylesheet at ${path.relative(ROOT, STYLESHEET)}`);
  }
  const stylesheet = blankComments(readFileSync(STYLESHEET, 'utf8'));
  const lines = stylesheet.split('\n');
  const blocks = parseBlocks(stylesheet);
  const region = (start, end) => lines.slice(start - 1, end).join('\n');
  const contains = (line) => blocks.filter((block) => block.start <= line && line <= block.end);
  const hexOf = (start, end) => (/^\s*--bg\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/m.exec(region(start, end)) ?? [])[1];

  // 1 — one dark block, so a second one cannot quietly override the first.
  const dark = blocks.filter(
    (block) => /^@media\b/.test(block.header) && /prefers-color-scheme:\s*dark/.test(block.header),
  );
  assert(
    '1',
    dark.length === 1,
    `expected exactly 1 prefers-color-scheme: dark block, found ${dark.length}`,
  );

  if (dark.length === 1) {
    const [block] = dark;
    const inside = region(block.start, block.end);

    // 2 — the block is a token map, so it must carry a map's worth of tokens.
    const reassignments = (inside.match(/^\s*--[\w-]+\s*:/gm) ?? []).length;
    assert(
      '2',
      reassignments >= 15,
      `the dark block holds ${reassignments} custom-property reassignment(s); R-18 requires at least 15`,
    );

    // 3 — descendants that are not the `:root` wrapper. See the header note.
    const selectors = blocks.filter(
      (child) => child.start > block.start && child.end <= block.end && child.header !== ':root',
    );
    assert(
      '3',
      selectors.length === 0,
      `the dark block holds ${selectors.length} selector rule(s) — ${selectors
        .map((rule) => `${rule.header} at line ${rule.start}`)
        .join(', ')}. It must be a token map and nothing else.`,
    );

    // 4 — by extent. See the header note.
    const important = (inside.match(/!important/g) ?? []).length;
    assert(
      '4',
      important === 0,
      `the dark block holds ${important} \`!important\` declaration(s); a token map overrides nothing by force`,
    );
  }

  // 5 — role-based names only. A colour-named token has to be inverted twice.
  const colourNamed = [...new Set([...stylesheet.matchAll(/--dark[\w-]*/g)].map((hit) => hit[0]))];
  assert(
    '5',
    colourNamed.length === 0,
    `${colourNamed.length} colour-named token reference(s) survive: ${colourNamed.join(', ')}`,
  );

  // 6 — literals confined to the token layer, with `@media print` exempt by R-27.
  const stray = [];
  for (const match of stylesheet.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const line = stylesheet.slice(0, match.index).split('\n').length;
    const owners = contains(line).map((block) => block.header);
    if (owners.includes(':root') || owners.some((owner) => /^@media\s+print/.test(owner))) continue;
    stray.push(`line ${line} (${owners.join(' > ') || 'top level'})`);
  }
  assert(6, stray.length === 0, `${stray.length} hex literal(s) outside the token layer: ${stray.join(', ')}`);

  // 7 — a promoted layer that is never released costs memory for the page's life.
  const promoted = [];
  for (const file of authoredSources()) {
    if (!/\.(?:css|astro)$/.test(file)) continue;
    const hits = (readFileSync(file, 'utf8').match(/will-change/g) ?? []).length;
    if (hits > 0) promoted.push(`${path.relative(ROOT, file)} (${hits})`);
  }
  assert(7, promoted.length === 0, `will-change appears in: ${promoted.join(', ')}`);

  // 8 — the build log, because the bundle is minified and the literal is not there.
  if (!existsSync(BUILD_LOG)) {
    throw new InternalError(
      `no build log at ${path.relative(ROOT, BUILD_LOG) || BUILD_LOG} — run \`npm run build\` first. ` +
        'A client-bundle leak cannot be observed without the build that produced it.',
    );
  }
  const externalised = (readFileSync(BUILD_LOG, 'utf8').match(/externalized for browser compatibility/g) ?? []).length;
  assert(
    '8',
    externalised === 0,
    `the build log carries ${externalised} "externalized for browser compatibility" warning(s). ` +
      'A Node builtin reached the client bundle: `src/lib/cv.ts` is build-time only and MUST NOT be ' +
      'imported from `src/scripts/main.ts`.',
  );

  // 9 — the pairing `src/lib/theme.ts` states in a comment, asserted mechanically.
  const theme = readFileSync(THEME, 'utf8');
  const scheme = {};
  for (const match of theme.matchAll(/\b(light|dark):\s*'(#[0-9a-fA-F]{3,8})'/g)) scheme[match[1]] = match[2];
  if (scheme.light === undefined || scheme.dark === undefined) {
    throw new InternalError(
      'cannot read `light:` and `dark:` hex values out of src/lib/theme.ts — the theme-color pairing is unverifiable',
    );
  }
  const root = blocks.find((block) => block.header === ':root' && contains(block.start).length === 1);
  if (!root) throw new InternalError('no top-level `:root` token block found in src/styles/global.css');
  assert(
    '9a',
    hexOf(root.start, root.end) === scheme.light,
    `SCHEME_COLORS.light is ${scheme.light} but :root --bg is ${hexOf(root.start, root.end)}`,
  );
  if (dark.length === 1) {
    assert(
      '9b',
      hexOf(dark[0].start, dark[0].end) === scheme.dark,
      `SCHEME_COLORS.dark is ${scheme.dark} but the dark block --bg is ${hexOf(dark[0].start, dark[0].end)}`,
    );
  }

  return [
    `1 dark block (lines ${dark.length === 1 ? `${dark[0].start}-${dark[0].end}` : 'none'})`,
    `${(region(root.start, root.end).match(/^\s*--[\w-]+\s*:/gm) ?? []).length} tokens in :root`,
    `--bg light ${scheme.light} / dark ${scheme.dark}`,
    `${externalised} build-log warning(s)`,
  ];
}

try {
  const measurements = measure();
  for (const line of failures) console.log(line);
  for (const line of measurements) console.log(`${PREFIX}: measured ${line}`);
  console.log(`${PREFIX}: RESULT ${failures.length > 0 ? 'fail' : 'pass'} (${checks} assertion(s))`);
  process.exit(failures.length > 0 ? 1 : 0);
} catch (cause) {
  if (cause instanceof InternalError) {
    console.error(`${PREFIX}: ERROR ${cause.message}`);
    process.exit(2);
  }
  throw cause;
}

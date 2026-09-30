#!/usr/bin/env node
/**
 * Byte budgets for the shipped site.
 *
 *   node scripts/check-budget.mjs
 *
 *   CSS     dist/_astro/*.css   total   ≤  24 576 B
 *   OG card public/og.jpg              ≤  61 440 B
 *
 * EXIT CODES
 *   0  every budget held
 *   1  at least one budget was exceeded — the message carries the measured
 *      size, because "too big" is not an actionable review comment
 *   2  the input is not measurable: no build output, or a missing asset
 *
 * RUN ORDER. This reads `dist/`, which Astro empties before every build, so
 * it must run AFTER `astro build`:
 *
 *   npm run check && npm run build && npm run check:privacy \
 *     && npm run check:tokens && npm run check:budget
 *
 * The delta spec's R-47/R-55 read `check:privacy && check && build`. That
 * order is wrong for the same reason: it scans a directory the build has not
 * produced yet. The corrected order is the one above, and it is the one the
 * CI workflow carries.
 *
 * CSS IS SUMMED, NOT READ FROM ONE FILE. The budget is on what the browser
 * downloads, so every stylesheet Astro emits counts. A site that today ships
 * one file and tomorrow ships six must not pass by pointing at the smallest.
 *
 * NOT HERE: the build-time clause of R-57. A gate that runs after the build
 * cannot observe the build's own duration — by the time it runs, the clock
 * it would need has already been read. Timing belongs in the CI job that
 * wraps the build, and it is recorded as open rather than approximated with
 * a number that would be noise.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = 'check-budget';

const BUDGETS = [
  { label: 'CSS (dist/_astro)', dir: path.join(ROOT, 'dist', '_astro'), extension: '.css', limit: 24576 },
  { label: 'og.jpg (public)', file: path.join(ROOT, 'public', 'og.jpg'), limit: 61440 },
];

class InternalError extends Error {}

function stylesheetBytes() {
  const dir = BUDGETS[0].dir;
  if (!existsSync(dir)) {
    throw new InternalError(
      'no dist/_astro/ — run `npm run build` before this gate. It reads build output, ' +
        'and a budget measured against a missing directory is not a pass.',
    );
  }
  let total = 0;
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || !entry.isFile()) continue;
    if (path.extname(entry.name).toLowerCase() !== BUDGETS[0].extension) continue;
    const bytes = statSync(path.join(dir, entry.name)).size;
    total += bytes;
    files.push(`${entry.name} ${bytes} B`);
  }
  if (files.length === 0) {
    throw new InternalError('dist/_astro/ contains no .css file — the build produced no stylesheet.');
  }
  return { total, detail: files.join(', ') };
}

const failures = [];

try {
  const css = stylesheetBytes();
  if (css.total > BUDGETS[0].limit) {
    failures.push(
      `${PREFIX}: FAIL ${BUDGETS[0].label} is ${css.total} B, over the ` +
        `${BUDGETS[0].limit} B ceiling by ${css.total - BUDGETS[0].limit} B (${css.detail})`,
    );
  } else {
    console.log(`${PREFIX}: ok  ${BUDGETS[0].label} ${css.total} B / ${BUDGETS[0].limit} B (${css.detail})`);
  }

  const og = BUDGETS[1];
  if (!existsSync(og.file)) {
    throw new InternalError('public/og.jpg is missing — run `npm run og` to regenerate it.');
  }
  // Read rather than stat so an unreadable file is caught here instead of
  // passing on the strength of its directory entry.
  const ogBytes = readFileSync(og.file).length;
  if (ogBytes > og.limit) {
    failures.push(
      `${PREFIX}: FAIL ${og.label} is ${ogBytes} B, over the ${og.limit} B ceiling ` +
        `by ${ogBytes - og.limit} B`,
    );
  } else {
    console.log(`${PREFIX}: ok  ${og.label} ${ogBytes} B / ${og.limit} B`);
  }

  for (const line of failures) console.log(line);
  console.log(`${PREFIX}: RESULT ${failures.length > 0 ? 'fail' : 'pass'}`);
  process.exit(failures.length > 0 ? 1 : 0);
} catch (cause) {
  if (cause instanceof InternalError) {
    console.error(`${PREFIX}: ERROR ${cause.message}`);
    process.exit(2);
  }
  throw cause;
}

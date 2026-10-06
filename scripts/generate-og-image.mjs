/**
 * Generate the Open Graph share card and the Apple touch icon.
 *
 *   node scripts/generate-og-image.mjs        # writes public/, prints sha256
 *
 * WHY THIS EXISTS. The share card is the first thing a recruiter sees, and it
 * is a design asset, so it has to be reviewable in a diff. Screenshotting the
 * live page was rejected: it is not reproducible in CI without a pinned
 * headless browser, and the card would silently change every time the CSS
 * changed. A versioned SVG template cannot drift that way.
 *
 * DETERMINISM. Two runs on one host produce byte-identical files, which is
 * what makes the committed artefact reviewable: a reviewer re-runs the script
 * and compares the printed sha256 against the committed blob.
 *
 *   - libjpeg writes no timestamp unless `withMetadata()` is called. It is
 *     never called here; doing so would inject one.
 *   - `chromaSubsampling` is pinned explicitly. The libvips default varies by
 *     build, and a varying default changes the bytes on a different machine.
 *   - No SVG `filter` and no external `href`, so rasterisation has nothing
 *     that can change without a source edit.
 *   - No timestamp, no randomness, no locale-dependent number formatting.
 *
 * HONEST SCOPE OF THAT CLAIM. Text rasterisation resolves fonts through
 * fontconfig, so bytes are reproducible for a given host (same libvips, same
 * font set) but not necessarily across hosts with different fonts. That is
 * precisely why this script is not a CI gate: a runner with a different font
 * set would fail a byte comparison for a reason that has nothing to do with
 * correctness. The artefact is committed and CI only consumes it.
 *
 * JPEG, not WebP. Sources disagree about whether LinkedIn accepts WebP; JPEG
 * is the one format every source agrees on, and the byte saving next to that
 * risk is irrelevant.
 *
 * NO PERSONAL IDENTIFIER. The card is written to a public path and committed.
 * It carries a name, a role and technology terms that already appear in the
 * rendered page. It deliberately does not render a national ID, a phone
 * number, an address, a signature or any external design-tool metadata.
 */

import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Literal copy of the tokens the card paints with. The design rejected a
 * shared `src/lib/palette.ts`: a `.ts` module cannot be imported by a `.mjs`
 * script without a transpiler, and a `.mjs` twin would add an `astro check`
 * hint to a project currently at 0 errors / 0 warnings / 0 hints. A later
 * budget check greps these values back against `:root` so the two copies
 * cannot drift apart silently.
 */
const PALETTE = {
  bg: '#0e1116', // --bg        (dark)
  surface: '#161c25', // --surface   (dark)
  ink: '#f2f4f7', // --panel-ink
  ink2: '#c2cbd6', // --panel-ink-2
  ink3: '#9aa5b3', // --ink-3     (dark)
  accent: '#7ea0ff', // --accent    (dark) / --panel-accent
  line: '#2a3340', // --line      (dark)
};

/**
 * A concrete family first, then widely-installed fallbacks. Named explicitly
 * rather than left to the SVG default so the chosen face is the same on every
 * run instead of whatever fontconfig happens to rank first.
 */
const FONT = 'DejaVu Sans, Verdana, Arial, sans-serif';

const OG = { width: 1200, height: 630 };
const TOUCH = { width: 180, height: 180 };

/** The brand mark, drawn once and reused by both assets. */
const brandMark = (cx, cy, r) => `
    <g fill="none" stroke="${PALETTE.accent}" stroke-width="${r / 9}" stroke-linecap="round">
      <line x1="${cx}" y1="${cy - r * 1.6}" x2="${cx}" y2="${cy - r * 0.8}" />
      <line x1="${cx}" y1="${cy + r * 0.8}" x2="${cx}" y2="${cy + r * 1.6}" />
      <line x1="${cx - r * 1.6}" y1="${cy}" x2="${cx - r * 0.8}" y2="${cy}" />
      <line x1="${cx + r * 0.8}" y1="${cy}" x2="${cx + r * 1.6}" y2="${cy}" />
    </g>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.28}" fill="${PALETTE.accent}" />`;

/**
 * 1200x630, the universal safe default: Facebook and Slack read it natively,
 * LinkedIn accepts it and centre-crops inside its 1.91:1 frame. Text stays
 * inside a 96px inset, clear of the 50px crop-safe zone LinkedIn documents.
 *
 * The title size is not a taste call. At 76px "Machine Learning Engineer"
 * measures 1127px in the resolved face and runs 23px off the canvas, where it
 * is silently clipped rather than obviously broken; 66px measures 979px inside
 * the 1008px column.
 */
function ogSvg() {
  const left = 96;
  const column = OG.width - left * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG.width}" height="${OG.height}" viewBox="0 0 ${OG.width} ${OG.height}">
  <rect width="${OG.width}" height="${OG.height}" fill="${PALETTE.bg}" />
  <rect x="0" y="0" width="${OG.width}" height="6" fill="${PALETTE.accent}" />${brandMark(1032, 168, 44)}
  <g font-family="${FONT}" fill="${PALETTE.ink}">
    <text x="${left}" y="212" font-size="30" font-weight="700" letter-spacing="5.5" fill="${PALETTE.accent}">BRAYAN PISSO</text>
    <text x="${left}" y="308" font-size="66" font-weight="700" letter-spacing="-1.5">Machine Learning Engineer</text>
    <line x1="${left}" y1="356" x2="${left + column}" y2="356" stroke="${PALETTE.line}" stroke-width="2" />
    <text x="${left}" y="428" font-size="34" fill="${PALETTE.ink2}">Computer Vision · PyTorch · Amazon SageMaker</text>
    <text x="${left}" y="536" font-size="28" fill="${PALETTE.ink3}">Manizales, Colombia</text>
  </g>
</svg>
`;
}

/** 180x180, the same mark on the same ground, no text: it would be illegible. */
function touchIconSvg() {
  const s = TOUCH.width / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TOUCH.width}" height="${TOUCH.height}" viewBox="0 0 ${TOUCH.width} ${TOUCH.height}">
  <rect width="${TOUCH.width}" height="${TOUCH.height}" rx="${TOUCH.width * 0.22}" fill="${PALETTE.bg}" />
  <g transform="scale(${s})">${brandMark(32, 32, 15)}
    <circle cx="32" cy="32" r="15" fill="none" stroke="${PALETTE.ink}" stroke-opacity="0.16" stroke-width="1.5" />
  </g>
</svg>
`;
}

async function emit(svg, file, encode) {
  const target = path.join(ROOT, file);
  const data = await encode(sharp(Buffer.from(svg)));
  await writeFile(target, data);
  const sha256 = createHash('sha256').update(data).digest('hex');
  console.log(`${file}  ${data.length} B  sha256=${sha256}`);
  return { file, bytes: data.length, sha256 };
}

const og = await emit(ogSvg(), 'public/og.jpg', (image) =>
  image
    .flatten({ background: PALETTE.bg })
    .jpeg({
      quality: 88,
      mozjpeg: true,
      // Pinned, not defaulted: see the determinism note above.
      chromaSubsampling: '4:2:0',
    })
    .toBuffer(),
);

const touch = await emit(touchIconSvg(), 'public/apple-touch-icon.png', (image) =>
  image.png({ compressionLevel: 9 }).toBuffer(),
);

const meta = await Promise.all(
  [og, touch].map(async ({ file }) => {
    const { width, height, format } = await sharp(path.join(ROOT, file)).metadata();
    return `${file}  ${format} ${width}x${height}`;
  }),
);

console.log(meta.join('\n'));

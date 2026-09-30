/**
 * CV availability gate.
 *
 * `CV_AVAILABLE` is derived at build time from a filesystem existence check
 * rather than maintained by hand, so it can never drift from what is actually
 * published. The expected state today is `false`: the only CV PDF in this
 * repository is git-ignored because it carries a national ID and a signature.
 * A redacted text extract of that document is committed at
 * `scripts/fixtures/cv.txt` for the provenance gate.
 *
 * To publish a CV, drop the redacted PDF into `public/` under `CV_FILENAME`
 * and rebuild. The CTAs then resolve to a real file. The site must never ship
 * a download link that 404s.
 *
 * DR-5 — this module imports `node:fs` and must only ever be imported from a
 * build/server context, such as `.astro` frontmatter or a `server` island. It
 * must NOT be imported from `src/scripts/main.ts` or any other client
 * entrypoint: doing so pulls `node:fs` into the client bundle.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { CV_FILENAME } from './site';

/**
 * Resolved from the Astro project root, not from this module's location.
 *
 * Astro bundles and prerenders this module, which rewrites `import.meta.url`
 * to the emitted chunk under `dist/.prerender/`. A URL relative to that
 * resolves to `dist/public/`, which never exists, so the probe would report
 * `false` permanently and the `true` path would be unreachable. The build
 * working directory is the project root, which is where `public/` lives.
 */
const CV_PATH = join(process.cwd(), 'public', CV_FILENAME);

/** `true` only when a publishable PDF is actually present in `public/`. */
export const CV_AVAILABLE = existsSync(CV_PATH);

export { CV_FILENAME };

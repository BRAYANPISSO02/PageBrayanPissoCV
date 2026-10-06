#!/usr/bin/env node
/**
 * Publish the built site to the `gh-pages` branch with plain git.
 *
 * Why this exists: GitHub Pages hosting is free for a public repository, but
 * the workflow that built and uploaded the artifact ran on GitHub Actions,
 * which spends metered VM minutes. This script replaces that dependency so a
 * publish costs zero compute and works with Actions unavailable.
 *
 * It runs the same gates CI runs, in the same order, before it publishes:
 * `check && build && check:privacy && check:tokens && check:budget`. Every
 * gate after `build` reads dist/, which Astro empties before each build, so
 * running check:privacy first would scan a directory that does not exist yet.
 *
 * The build output is committed only to `gh-pages`, never to the working
 * branch — dist/ is gitignored, and that stays true.
 *
 * Usage: npm run publish
 */

import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const BRANCH = 'gh-pages'
const REMOTE = 'origin'
const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'dist')

/** Run a command, inheriting stdio so the user watches the real output. */
function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`)
  return execFileSync(command, args, { cwd: options.cwd ?? root, stdio: 'inherit' })
}

function fail(message) {
  console.error(`\npublish: ${message}`)
  process.exit(1)
}

// GitHub serves the gh-pages branch with Jekyll by default, which silently
// drops any path beginning with an underscore. Astro emits its bundled assets
// into _astro/, so without this file the site deploys with every stylesheet
// and script 404ing.
const NOJEKYLL = 'Astro emits assets under _astro/, which Jekyll ignores.\n'

function verifyDist() {
  let entries
  try {
    entries = readdirSync(dist)
  } catch {
    fail(`dist/ does not exist. Run \`npm run build\` first, or use \`npm run publish\`, which builds it.`)
  }
  if (!entries.includes('index.html')) {
    fail('dist/ has no index.html — refusing to publish an empty site.')
  }
}

function stageBranch() {
  // A scratch directory rather than a worktree: the publish tree must be a
  // fresh root commit with no history from the working branch, and a temp
  // directory cannot leave a worktree registration behind on failure.
  const staging = mkdtempSync(join(tmpdir(), 'gh-pages-'))
  try {
    for (const entry of readdirSync(dist)) {
      cpSync(join(dist, entry), join(staging, entry), { recursive: true })
    }
    writeFileSync(join(staging, '.nojekyll'), NOJEKYLL)

    run('git', ['init', '--quiet', '--initial-branch', BRANCH], { cwd: staging })
    // Inherit identity from the caller's config rather than hardcoding one, so
    // a maintainer's commit is attributed to them.
    run('git', ['config', 'user.name'], { cwd: staging })
    const name = execFileSync('git', ['config', 'user.name'], { cwd: root, encoding: 'utf8' }).trim()
    const email = execFileSync('git', ['config', 'user.email'], { cwd: root, encoding: 'utf8' }).trim()
    run('git', ['config', 'user.name', name], { cwd: staging })
    run('git', ['config', 'user.email', email], { cwd: staging })

    run('git', ['add', '--all'], { cwd: staging })
    run('git', ['commit', '--quiet', '-m', 'build: publish site to gh-pages'], { cwd: staging })
    run('git', ['remote', 'add', REMOTE, 'https://github.com/BRAYANPISSO02/PageBrayanPissoCV.git'], {
      cwd: staging,
    })
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    fail(error.message)
    return
  }

  // The staged tree is fully committed, so it is safe to force-push a
  // publishing branch: it carries no work worth preserving, and history
  // there is a build log, not a source of record.
  run('git', ['push', '--force', REMOTE, `${BRANCH}:${BRANCH}`], { cwd: staging })
  rmSync(staging, { recursive: true, force: true })
}

console.log('Publishing to GitHub Pages via the gh-pages branch.')
console.log('Running the same gates CI runs, in the same order.\n')

try {
  run('npm', ['run', 'check'])
  run('npm', ['run', 'build'])
  run('npm', ['run', 'check:privacy'])
  run('npm', ['run', 'check:tokens'])
  run('npm', ['run', 'check:budget'])
} catch {
  // A red gate must not leave a half-published site. The gh-pages branch is
  // only touched after every gate passes.
  fail('a gate failed — nothing was published. The gh-pages branch is unchanged.')
}

verifyDist()
stageBranch()

console.log('\nPublished: https://brayanpisso02.github.io/PageBrayanPissoCV/')
console.log('GitHub builds it in about a minute. No Actions minutes were spent.')
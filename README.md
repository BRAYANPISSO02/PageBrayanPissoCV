# PageBrayanPissoCV

Professional single-page portfolio / CV site for Brayan Pisso — Electronic Engineer specialized in
Machine Learning and Computer Vision. Static, dependency-light Astro site designed for GitHub Pages.

**Live development:** `npm run dev` — then open the printed local URL. Builds with zero runtime
frameworks: hand-written CSS tokens, inline SVG icons, and one small vanilla-TypeScript module for
the mobile menu and reveal-on-scroll.

## Quick path

```bash
npm install       # install dependencies
npm run dev       # local dev server (http://localhost:4321)
npm run build     # static build → dist/
npx astro check   # type-check the project (strict TS)
npm run preview   # serve the production build locally
```

## Deploy to GitHub Pages

The site is pre-configured (`.github/workflows/deploy.yml`) to deploy on every push to `main`:

1. Push the repository to GitHub (`BRAYANPISSO02/PageBrayanPissoCV`).
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. Push to `main` (or run the *Deploy to GitHub Pages* workflow manually) — the workflow builds with
   `withastro/action@v3` and publishes `dist/`.

The site will be live at `https://BRAYANPISSO02.github.io/PageBrayanPissoCV/`.

> **Why the base path?** `astro.config.mjs` sets `site: 'https://BRAYANPISSO02.github.io'` and
> `base: '/PageBrayanPissoCV/'`. Every internal link and asset reference in the code uses
> `import.meta.env.BASE_URL` so nothing breaks when served from a subdirectory. The PDF download
> link points to the copy in `public/`, which the build copies to `dist/` as-is.

## Project structure

| Path | Purpose |
|------|---------|
| `src/pages/index.astro` | Single page, assembles all sections |
| `src/components/` | One component per section (Nav, Hero, About, FeaturedProject, Experience, Education, Skills, Courses, References, Contact, Footer, Icon) |
| `src/layouts/BaseLayout.astro` | HTML shell: SEO, Open Graph, JSON-LD Person schema, skip link |
| `src/styles/global.css` | Design tokens (CSS custom properties) and all styles |
| `src/scripts/main.ts` | Vanilla TS: nav toggle + IntersectionObserver reveal, respects `prefers-reduced-motion` |
| `src/lib/site.ts` | Single source of truth for all CV facts (title, links, experience, skills, …) |
| `public/favicon.svg` | Inline SVG favicon |
| `public/Brayan_Ricardo_Pisso_Ramirez_CV.pdf` | Served copy of the CV (also kept at repo root) |

## Content policy

The CV PDF at the repo root (`Brayan_Ricardo_Pisso_Ramirez_CV.pdf`) is the **source of truth**.
Every fact on the site (`src/lib/site.ts`) comes from it — no invented experience, metrics, or
credentials. The national ID present in the PDF is deliberately omitted from the public page.

## Accessibility & performance

- Semantic landmarks, skip link, aria labels, visible focus states.
- Scroll animations are pure progressive enhancement: without JS everything is visible; with
  `prefers-reduced-motion: reduce` all motion is disabled.
- No web fonts, no frameworks, near-zero client JS.
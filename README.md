# blog-astro

Personal blog built with [Astro](https://astro.build/) — a static rebuild of the
[blog-nextjs](https://github.com/gbanyan/blog-nextjs) site (Next.js 16 + Velite),
migrated to Astro 7 with static output. Visually and behaviorally identical to
the production site; bilingual with **zh-TW** as the unprefixed default locale
and **en** under `/en/*`.

## Requirements

- A recent Node.js (LTS)
- npm

## Setup

```bash
# 1. Clone (then pull the content submodule — the Markdown content lives in a
#    separate `personal-blog` repository)
git clone <repo-url> && cd blog-astro
git submodule update --init --recursive

# 2. Environment: copy the example and fill in real values
cp .env.local.example .env.local
#    → site info, social links, accent colors; optionally GITHUB_USERNAME /
#      GITHUB_TOKEN for the /projects page (build-time GitHub fetch)

# 3. Install and run
npm install
npm run dev        # → http://localhost:4321
```

The build also works with **no env file at all**: every `PUBLIC_*` read has a
safe fallback default, and an unset `GITHUB_USERNAME` simply renders the
projects page's empty state.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | `astro dev` — dev server. Content **collections** are native to Astro: markdown under `content/` is loaded and hot-reloaded directly; the Velite data-generation stage from the Next.js era is gone. |
| `npm run build` | Full production build: `sync-assets` (copy `content/assets/` → `public/assets/`) → `check-i18n-content` (locale-pairing asserts on collection records) → `check-assets` (referenced assets must exist) → `astro build` (static HTML + build-time OG PNG cards) → `npx pagefind --site dist` (search index → `dist/_pagefind`). |
| `npm run preview` | `astro preview` — serve the built `dist/` locally. |
| `npm run verify` | Full local gate (CI projection): `build` + `check-i18n` + `lint` + `test`. |
| `npm run lint` | ESLint (flat config: `typescript-eslint` recommended + classic `react-hooks` rules). |
| `npm test` | Vitest unit tests for the lib contracts (seo, og, machine-readable, reading-time, locale-switcher). |
| `npm run sync-assets` | Copy `content/assets/` → `public/assets/` (also runs automatically before build). |
| `npm run check-i18n` | Locale-pairing validation over the loaded content via `scripts/i18n-validation-adapter.mjs` (routes + sitemap/feed/llms outputs). |
| `npm run check-i18n-content` | Locale-pairing asserts on the generated collection records (source ↔ English ↔ placeholder counts). |

## Architecture

- **Astro 7, static output** (no SSR adapter). i18n routing:
  `i18n: { defaultLocale: 'zh-TW', locales: ['zh-TW', 'en'], routing: { prefixDefaultLocale: false } }` —
  the URL contract is identical to production: `/`, `/blog/*`, `/pages/*`, `/tags/*`,
  `/projects`, `/en/*`. No `/zh-TW` segment ever appears.
- **Content pipeline**: `content/` git submodule (Markdown) → Astro
  **content collections** (`src/content.config.ts`: `posts` + `pages` via
  `glob()` loaders + zod schemas mirroring the old Velite field contract, entry
  ids = path relative to the collection base) → server-side adapter in
  `src/lib/content.ts` (locale pairing, placeholder handling, slug
  normalization) → pages and `src/lib/posts.ts` query helpers.
- **Markdown processing** (global, configured in `astro.config.mjs`): remark
  GFM + `remarkRemoveRawHtml` (raw HTML blocks are dropped by contract) + image
  src rewriting → rehype: callouts → built-in Shiki dual theme
  (`github-light` / `github-dark`) → slug → autolink-headings → image
  optimizer (intrinsic width/height, lazy loading) → link localizer (prefixes
  `/en` in English-source documents). Rendered HTML is emitted verbatim into
  pages — no runtime re-parse.
- **i18n**: UI strings from `src/lib/i18n/dictionaries.ts` (zh-TW default, en);
  path/alternate helpers from `src/lib/locales.ts`. `Astro.currentLocale`
  replaces the old `proxy.ts`/`x-locale` machinery.
- **Islands**: ~30 React 19 components hydrate as islands
  (`client:load`/`client:idle`/`client:visible`, search modal code-split).
  Theming is hand-rolled: an inline class-based theme script in
  `src/layouts/layout.astro` + a small `useTheme` hook (replaces
  `next-themes`; islands are separate React roots, so no shared provider).
- **Search**: Pagefind, indexed over `dist/` at build time; cmdk search modal
  island; bundle at `/_pagefind/`.
- **OG images**: generated **at build time** (satori + resvg + local Noto WOFF
  fonts) by the `src/pages/og/[...slug].png.ts` endpoint; `src/lib/og.ts`
  points metadata at the static card files. The runtime `/api/og?title=…`
  endpoint is retired; `feature_image` still takes precedence for social cards.
- **Projects page**: GitHub API fetched **at build time**
  (`src/lib/github.ts`); graceful empty-list fallback when `GITHUB_USERNAME`
  is unset.
- **Machine-readable endpoints**: `/feed.xml`, `/llms.txt`, `/ai.txt`,
  `/[locale]/feed.xml`, `/[locale]/llms.txt`, `/[locale]/sitemap.xml`,
  `/robots.txt`, `/sitemap.xml` — same paths as the source site.
- **Styling**: Tailwind CSS v4 (CSS-first, `@tailwindcss/vite`), class-based
  dark mode via `@custom-variant dark`, accent colors from `PUBLIC_COLOR_*`
  env vars as CSS variables, `@tailwindcss/typography` for prose (Shiki output
  is `.astro-code`), fonts via the Astro Fonts API (Cormorant Garamond, LXGW
  WenKai TC).
- **Layout hierarchy**: `src/layouts/layout.astro` (head/metadata/hreflang/
  fonts/theme script/`ClientRouter`) → `src/layouts/layout-shell.astro`
  (header, sidebar, footer, back-to-top) → page content.

### Content model

The full content contract (frontmatter fields, translation pairing, placeholder
semantics, slug rules) is specified in
[`docs/superpowers/specs/2026-09-18-astro-migration-design.md`](docs/superpowers/specs/2026-09-18-astro-migration-design.md).

## Content updates & deployment (fully automated)

`content/` is a git submodule pointing at `personal-blog` (Gitea origin, with a
**public GitHub mirror** at [`gbanyan/personal-blog`](https://github.com/gbanyan/personal-blog)
that CI fetches without credentials).

**Publishing a post is a single push:**

```bash
cd content && git add . && git commit -m "新文章" && git push
```

`origin` is configured with **dual push URLs** (Gitea + GitHub mirror), so one
`git push` syncs both. From there:

1. **push-triggered deploy** — `.github/workflows/deploy.yml` in this repo runs
   on `main` pushes: checkout (submodule via the public mirror, zero
   credentials) → restore build-time env from the `BLOG_ENV_FILE` secret →
   `npm run build` (astro + pagefind) → `npx wrangler deploy`.
2. **hourly catch-up** — the workflow also runs on an hourly schedule; if the
   GitHub mirror's `main` is ahead of the pinned submodule pointer, it
   fast-forwards, commits the pointer bump (bot commit), and deploys. So even
   the pointer-bump step is automated; a manual `workflow_dispatch` gives an
   instant deploy.

### Hosting (Cloudflare Workers)

- Static-assets-only Worker (`wrangler.jsonc`): `dist/` served at the edge,
  real 404s via `not_found_handling: "404-page"`, cache rules in `public/_headers`
  (`/og/*`, `/assets/*`, `/_pagefind/*` → immutable).
- Traffic attaches through an **edge route** (`blog.gbanyan.net/*` on zone
  `gbanyan.net`) with the DNS record **Proxied**. The old Vercel project is
  kept as the route-less origin — **rollback = delete the route and redeploy**
  (traffic returns to Vercel instantly; no DNS change).
- Deploy creds: `CLOUDFLARE_API_TOKEN` GitHub secret (template *"Edit
  Cloudflare Workers"*). Build-time `PUBLIC_*` config travels via the
  `BLOG_ENV_FILE` secret (full `.env.local` body; restored to `.env.local`
  before the build).

### Comments (giscus)

Comments are GitHub Discussions in the dedicated public repo
[`gbanyan/blog-comments`](https://github.com/gbanyan/blog-comments)
(`Announcements` category, mapping = `pathname`, so threads bind to page URLs
and survive code-repo changes). The `PUBLIC_GISCUS_*` values are in
`.env.local` / `BLOG_ENV_FILE`. Prerequisite that lives outside the repo: the
[giscus GitHub App](https://github.com/apps/giscus) must be installed on
`blog-comments` (otherwise the widget errors on submit). The Next.js site
never had working comments (no giscus env on Vercel) — this is a new feature,
not a migration delta.

## Environment variables

All `PUBLIC_*` vars are exposed to the browser; everything else is
build-time only. The canonical list lives in
[`.env.local.example`](.env.local.example):

| Group | Variables |
|---|---|
| Core site info | `PUBLIC_SITE_NAME`, `PUBLIC_SITE_TITLE`, `PUBLIC_SITE_DESCRIPTION`, `PUBLIC_SITE_URL`, `PUBLIC_SITE_AUTHOR`, `PUBLIC_SITE_TAGLINE`, `PUBLIC_POSTS_PER_PAGE`, `PUBLIC_DEFAULT_LOCALE`, `PUBLIC_SITE_AVATAR_URL`, `PUBLIC_SITE_ABOUT_SHORT` |
| Accent theme | `PUBLIC_COLOR_ACCENT`, `PUBLIC_COLOR_ACCENT_SOFT`, `PUBLIC_COLOR_ACCENT_TEXT_LIGHT`, `PUBLIC_COLOR_ACCENT_TEXT_DARK` |
| Social / profile | `PUBLIC_TWITTER_HANDLE`, `PUBLIC_GITHUB_URL`, `PUBLIC_LINKEDIN_URL`, `PUBLIC_EMAIL_CONTACT`, `PUBLIC_MASTODON_URL`, `PUBLIC_GITEA_URL` |
| SEO / Open Graph | `PUBLIC_OG_DEFAULT_IMAGE`, `PUBLIC_TWITTER_CARD_TYPE` |
| Giscus comments (optional) | `PUBLIC_GISCUS_REPO`, `PUBLIC_GISCUS_REPO_ID`, `PUBLIC_GISCUS_CATEGORY`, `PUBLIC_GISCUS_CATEGORY_ID`, `PUBLIC_GISCUS_MAPPING`, `PUBLIC_GISCUS_STRICT`, `PUBLIC_GISCUS_REACTIONS_ENABLED`, `PUBLIC_GISCUS_INPUT_POSITION`, `PUBLIC_GISCUS_LANG`, `PUBLIC_GISCUS_THEME_LIGHT`, `PUBLIC_GISCUS_THEME_DARK` |
| Build-time only | `GITHUB_USERNAME`, `GITHUB_TOKEN` (GitHub API for the `/projects` page) |

## Known deltas vs blog-nextjs

Accepted differences from the Next.js source (details in the design spec):

1. **Build-time GitHub data** — the `/projects` page fetches the GitHub API at
   build time (no `revalidate` ISR); data freshness comes from rebuilds.
2. **Static OG files** — per-document OG images are PNG files generated at
   build time; the runtime `/api/og` query endpoint is retired.
3. **Env-less build fallbacks** — the build succeeds with no `.env.local` at
   all (fallback defaults for every `PUBLIC_*` read; empty projects list).
4. **Markdown images as-is** — served straight from `/assets/*` (no runtime
   AVIF/WebP re-encoding; pre-optimization in `sync-assets` is a follow-up).
5. **Deployment** — Cloudflare Workers (edge route + static assets) with
   GitHub Actions CI, replacing Vercel + the Next.js runtime entirely. The
   Vercel project is retained solely as a rollback origin.

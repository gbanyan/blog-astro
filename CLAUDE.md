# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - `astro dev` dev server. Content collections (posts/pages) are native Astro loaders — markdown under `content/` hot-reloads directly; the Velite data-generation stage from the Next.js era is gone, there is no equivalent step to run.
- `npm run build` - Full production build: sync-assets → check-i18n-content → check-assets → `astro build` (static HTML + build-time OG PNG cards) → Pagefind indexing → copy Pagefind to `dist/_pagefind`
- `npm run preview` - `astro preview` — serve the built `dist/` locally
- `npm run lint` - ESLint via `eslint .` (flat config: `typescript-eslint` recommended + classic `react-hooks` rules; see `eslint.config.mjs`)
- `npm test` - Unit tests for lib contracts via Vitest
- `npm run verify` - Full local gate = build + i18n validation + ESLint + tests (CI projection)
- `npm run check-i18n` / `npm run check-i18n-content` - Validate locale pairing of the loaded content records (also run during build)
- `npm run sync-assets` - Copy `content/assets/` to `public/assets/` (also runs automatically before build)

## Architecture

**Content pipeline**: `content/` git submodule (Markdown) → Astro content collections (`src/content.config.ts`: `posts` + `pages` via `glob()` loaders, zod schema mirroring the old Velite field contract, entry id = path relative to the collection base) → server-side adapter in `src/lib/content.ts` → pages and `src/lib/posts.ts` helpers. Velite and the ignored `.velite/` directory are gone; collections are the data source.

**Routing** (static output, no adapter; bilingual with `zh-TW` as the unprefixed default):
- `i18n: { defaultLocale: 'zh-TW', locales: ['zh-TW', 'en'], routing: { prefixDefaultLocale: false } }` — URL contract identical to production: `/`, `/blog/*`, `/pages/*`, `/tags/*`, `/projects`, `/en/*`. No `/zh-TW` segment ever appears.
- `Astro.currentLocale` + a `locale` prop replace the old `proxy.ts` / `x-locale` header / `getRequestLocale` machinery; `LocalizedLink` is a plain `<a>` with `localizedPath()`, and islands needing the path receive `currentPath` as a prop.
- `/` — Home page with latest posts (`/en` for the English section)
- `/blog` — Blog index with search, sort, pagination
- `/blog/[slug]` — Single post with TOC, reading progress, prev/next, related posts
- `/pages/[slug]` — Static content pages (from `content/pages/`)
- `/tags`, `/tags/[tag]` — Tag index and per-tag post lists
- `/projects` — GitHub repo cards (fetched at **build time**; empty-state fallback when `GITHUB_USERNAME` is unset)
- `/og/[...slug].png` — Build-time OG images (satori + resvg + local Noto WOFF fonts)
- Machine-readable: `/feed.xml`, `/llms.txt`, `/ai.txt`, `/[locale]/feed.xml`, `/[locale]/llms.txt`, `/[locale]/sitemap.xml`, `/robots.txt`, `/sitemap.xml`

**Key data flow**:
- `src/lib/config.ts` — `siteConfig` object built from `PUBLIC_*` env vars (`import.meta.env`, with fallbacks for plain-Node consumers like the i18n scripts); all site metadata, social links, accent colors, pagination
- `src/lib/content.ts` — Server-side boundary over Astro collection entries (locale pairing, placeholder handling, source-path→slug normalization)
- `src/lib/posts.ts` — Query helpers: `getAllPostsSorted()`, `getPostBySlug()`, `getPageBySlug()`, `getRelatedPosts()`, `getPostNeighbors()`
- `src/lib/tags.ts` — Synchronous tag helpers (`getTagSlug()`, `getAllTagsWithCount()`)
- `src/lib/seo.ts` — `metadataForDocument()` / `metadataForPath()`, hreflang/x-default pairing, sitemap entry helpers (plain objects consumed by the `layout.astro` head assembly, replacing Next `Metadata`)
- `src/lib/og.ts` — Static OG card URLs (`documentOgUrl()`) + `socialImageUrl()`; `feature_image` takes precedence
- `src/lib/machine-readable.ts` — RSS, llms.txt, ai.txt builders (framework-neutral)
- `src/lib/mastodon.ts` — Mastodon API client for sidebar feed widget (island fetches the instance API directly)
- `src/lib/reading-time.ts` — CJK-aware word count and reading-time estimate
- `src/lib/rehype-callouts.ts` — Custom rehype plugin for GitHub-style `[!NOTE]` callout blocks

**Layout hierarchy**: `src/layouts/layout.astro` (fonts, theme CSS vars, inline theme script, ClientRouter, JSON-LD) → `src/layouts/layout-shell.astro` (header, sidebar, footer, back-to-top) → page content. UI strings come from `src/lib/i18n/dictionaries.ts`; path/alternate helpers from `src/lib/locales.ts`.

**Islands**: ~30 React 19 components hydrate as islands (`client:load`/`client:idle`/`client:visible`; the cmdk search modal is code-split out of the header bundle). Theming is hand-rolled: inline class-based script in `layout.astro` (matches `@custom-variant dark`) + a small `useTheme()` hook; `next-themes` is replaced (3 consumers: theme-toggle, mermaid-renderer, giscus-comments).

**Markdown processing** (configured in `astro.config.mjs`):
- Remark: GFM, plus a raw-HTML remover (`remarkRemoveRawHtml` — raw HTML blocks are dropped by contract, matching the Velite pipeline) and an image-src rewriter
- Rehype: callouts → built-in Shiki dual theme (`github-light` / `github-dark`, `defaultColor: false`, replacing rehype-pretty-code) → slug → autolink-headings → image optimizer → link localizer
  - `src/lib/rehype-optimize-images.ts` rewrites `../assets/` → `/assets/` and attaches intrinsic width/height + `loading=lazy` + `sizes`
  - `src/lib/rehype-localize-links.ts` prefixes `/en` to internal routes in English-source documents
- Built HTML is rendered verbatim by Astro (no runtime re-parse); Shiki CSS selectors are `.astro-code` (see `styles/globals.css`)
- smartypants is OFF — the rendered-output contract stays byte-comparable with the source site

## Styling

- Tailwind CSS v4 with CSS-first configuration (no `tailwind.config.cjs`; wired via `@tailwindcss/vite`)
- Dark mode via `@custom-variant dark` in `styles/globals.css` (class-based, toggled by the inline theme script in `layout.astro`)
- Theme customization via the `@theme` block in `styles/globals.css`: colors, fonts, easing, durations, shadows, keyframes, animations
- Accent color system via CSS variables set in `src/layouts/layout.astro` from `PUBLIC_COLOR_*` env vars: `--color-accent`, `--color-accent-soft`, `--color-accent-text-light`, `--color-accent-text-dark`
- Typography plugin (`@tailwindcss/typography`) loaded via `@plugin` directive; prose dark mode handled by custom `.dark .prose` CSS overrides
- Fonts via the Astro Fonts API (`astro.config.mjs`): Cormorant Garamond (`--font-display-latin`), LXGW WenKai TC (`--font-display-cjk`), Google provider; English headings use the serif display font, body uses the CJK-aware stack
- Search index: Pagefind over `dist/` at build time (`npx pagefind --site dist --output-path dist/_pagefind`)

## Content Submodule

The `content/` directory is a git submodule pointing to a separate `personal-blog` repository. It contains `posts/`, `pages/`, and `assets/`. After pulling new content, run `npm run sync-assets` to update `public/assets/`. The build script does this automatically.

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`). `npx tsc --noEmit` type-checks `src/**` and `scripts/**`; ESLint covers `src/**` and the root config files (plain-node `scripts/` stay out of the lint gate by choice — see `eslint.config.mjs`).

## Deployment

**Deployment is NOT yet configured for this repository.** It is Gitea-only for now (`git.gbanyan.net`); the GitHub remote and deployment pipeline are a separate follow-up. The source of record for the live site remains `blog-nextjs` (GitHub remote, `main` push triggers the pipeline).

When deployment IS configured for this repo, the content-publishing contract is the same two-step flow as the source repo (both steps required to trigger a deploy):
1. Commit and push inside `content/` submodule: `git -C content add . && git -C content commit -m "..." && git -C content push`
2. Update main repo submodule pointer and push: `git add content && git commit -m "Update content submodule" && git push`

**Code changes**: commit and push in the main repo as usual.

## Language

The site's default locale is `zh-TW`. UI text, labels, and timestamps are in Traditional Chinese.

## Design Context

The design contract (users, brand personality, aesthetic direction, design principles — calm-first, warm technicality, academic elegance, inclusive accessibility, consistent rhythm) is defined in the **source repo's** CLAUDE.md: `~/Project/personal/blog-nextjs/CLAUDE.md`. This site is visually and behaviorally identical to the production site, so the same design context applies here unchanged — consult that file rather than maintaining a duplicate.

## Known limitations

- **Soft-404 for unknown slugs is fixed by the static build.** In blog-nextjs, `cacheComponents` (PPR) rendered the streaming shell (HTTP 200) for unknown dynamic slugs. Here, unknown `/blog/*`, `/pages/*`, `/tags/*` slugs produce real 404s via static `getStaticPaths` — no equivalent of the old Next-version-specific issue exists to track.
- **Build-time GitHub data freshness.** The `/projects` page fetches the GitHub API at build time (no ISR `revalidate`). Repo data (list, star counts, "last updated") is only as fresh as the last build; an unset/failed fetch renders the graceful empty state. A scheduled rebuild is the remediation, not a runtime cache.
- **Static OG files.** Per-document OG images are PNG files generated at build time (`/og/[...slug].png`); the runtime `/api/og?title=…` endpoint is retired. OG content changes require a rebuild. `feature_image` continues to take precedence for social cards.
- **Search smoke-test caveat (headless browsers).** In a headless Chromium environment (e.g. automated smoke tests against `astro preview`), the search modal's first query can end in the error state (`全站搜尋 發生錯誤`) due to a pagefind 1.5.2 worker-init quirk — the same failure reproduces byte-identically on the untouched blog-nextjs site under the same conditions, so it is a pre-existing environment-specific behavior, not a migration regression. The index itself is verified good: direct Pagefind API searches against the served `/_pagefind/` bundle return correct, locale-correct results for both zh-TW and en.
- **Markdown images served as-is** from `/assets/*` (no runtime AVIF/WebP re-encoding; sharp pre-optimization inside `sync-assets` is an explicit follow-up).
- **No PPR/ISR at all** — everything is static at build time (feeds, sitemaps, llms.txt/ai.txt included); any dynamic freshness comes from rebuilds.
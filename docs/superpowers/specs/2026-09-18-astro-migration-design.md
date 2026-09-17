# blog-astro — Migration Design (from blog-nextjs)

Date: 2026-09-18 · Status: approved design, pre-implementation
Source repo: `~/Project/personal/blog-nextjs` (Next.js 16 App Router + Velite)

## Purpose & Decisions

Rebuild the personal blog as a static Astro site in an independent repository. Decisions settled with the user:

| Decision | Choice |
|---|---|
| Hosting (now) | Gitea only (`git.gbanyan.net`); GitHub/deploy deferred |
| Repo / local path | `blog-astro` at `~/Project/personal/blog-astro` |
| Content source | Keep `content/` git submodule → `personal-blog` |
| Scope | Full feature parity with blog-nextjs, visually indistinguishable |
| Approach | Fresh Astro scaffold; port lib/plugins/components/styles, rewrite only `app/` pages as `.astro` |

## Stack

- Astro 6 (static output, no adapter), TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), `@astrojs/react` 19.
- Fonts: Astro Fonts API — Cormorant Garamond (`--font-display-latin`), LXGW WenKai TC (`--font-display-cjk`), Google provider, preload limited to latin.
- Search: Pagefind indexed over `dist/`, bundle copied to `dist/_pagefind`.
- Tests: Vitest (ported lib-contract tests); `npm run verify` = build + i18n checks + lint + tests.

## Repository Layout

```
blog-astro/
├── astro.config.mjs          # site, i18n, markdown/shiki, fonts, react, tailwind vite plugin
├── content/                  # git submodule → personal-blog
├── public/assets/            # synced from content/assets by scripts/sync-assets.mjs
├── scripts/                  # ported from blog-nextjs: sync-assets, check-assets, check-i18n,
│                             #   check-i18n-content, create-locale-placeholders, pin-translation-ids,
│                             #   i18n-validation-adapter, subset-font
├── src/
│   ├── content.config.ts     # posts + pages collections (glob loader, zod schema)
│   ├── pages/                # zh-TW at root; en/ mirror; 404
│   │   ├── feed.xml.ts, sitemap.xml.ts, llms.txt.ts, ai.txt.ts, robots.txt.ts  (+ en/ feed.xml, sitemap.xml)
│   │   └── og/[...slug].png.ts   # build-time OG images
│   ├── layouts/              # layout.astro (head/metadata/hreflang/fonts/theme script/ClientRouter)
│   ├── components/           # React islands + .astro wrappers (header, sidebar, shell)
│   ├── lib/                  # ported: config, content adapter, posts, tags, seo, og, machine-readable,
│   │                         #   mastodon, reading-time, locales, locale-switcher, i18n/{config,dictionaries},
│   │                         #   rehype-{callouts,localize-links,optimize-images}, github, github-lang-colors,
│   │                         #   navigation, sidebar-data, utils, use-* hooks
│   └── styles/globals.css    # ported verbatim except .shiki → .astro-code
```

## Content Pipeline

- Collections replace Velite: `posts` (content/posts/**/*.md) and `pages` (content/pages/**/*.md) via `glob()` loaders; zod schema mirrors the Velite field contract (locale, translation_id/key/status, is_placeholder, dates, tags, description, feature_image, …) plus Astro's `rendered` body.
- Global markdown pipeline = current chain: remark-gfm + remarkRemoveRawHtml (kept: Astro passes raw HTML through by default, existing contract drops it) → rehype-callouts → built-in Shiki dual theme (`light: github-light`, `dark: github-dark`, `defaultColor: false`) replacing rehype-pretty-code → rehype-slug → rehype-autolink-headings (wrap) → rehype-optimize-images → rehype-localize-links. All custom plugins port unchanged (plain unified/vfile code).
- `lib/content.ts` keeps its adaptation logic (locale pairing, placeholder handling, source-path→slug normalization) but maps over Astro collection entries instead of `.velite` records. Helper signatures consumed by `posts.ts`/`tags.ts`/`seo.ts` stay stable.

## Routing & i18n

- `i18n: { defaultLocale: 'zh-TW', locales: ['zh-TW', 'en'], routing: { prefixDefaultLocale: false } }`.
- URL contract identical to production: `/`, `/blog/*`, `/pages/*`, `/tags/*`, `/projects`, `/en/*`. No `/zh-TW` segment ever appears.
- `proxy.ts`, `x-locale` header, `getRequestLocale` are deleted; `Astro.currentLocale` + a `locale` prop replace them. `LocalizedLink` becomes plain `<a>` with `localizedPath()`; islands needing the path (`language-switcher`, `search-modal`, `nav-menu`) receive `currentPath` as a prop.
- Unknown slugs produce real 404s via static `getStaticPaths` (fixes the PPR soft-404 documented in blog-nextjs).

## Interactive Layer

- ~30 React components hydrate as islands (`client:load`/`client:idle`/`client:visible` chosen per widget; heavy/modals lazy).
- Theming: hand-rolled — inline theme script in `layout.astro` (class strategy, matches `@custom-variant dark`) + small `useTheme()` hook reading `documentElement`; replaces `next-themes` (3 consumers: theme-toggle, mermaid-renderer, giscus-comments). Islands are separate React roots, so a shared provider does not work.
- Mastodon feed island fetches the instance API directly via ported `lib/mastodon.ts` (public API sends CORS `*`; verify against configured instance during implementation; empty state already handled).
- GitHub projects data fetched at build time via ported `lib/github.ts` (drop `next: { revalidate }`; keep graceful empty fallback).
- Mermaid, giscus, reading-progress, TOC, scroll-reveal, matrix-rain, cmdk search modal: port as islands with no behavioral change.
- Islands that internally use `next/image` or `LocalizedLink` (`right-sidebar`, `repo-card`, `post-card`, `language-switcher`, …) swap to plain `<img>`/`<a>` with explicit width/height (dimensions already known for local assets) — `next/image`'s runtime optimizer has no island equivalent.

## Metadata, Feeds, OG Images

- `seo.ts` logic (canonical, hreflang/x-default, alternates, sitemap records) ports; Next `Metadata` types become plain objects consumed by `layout.astro` head assembly. JSON-LD rendered inline (no island).
- `lib/machine-readable.ts` (RSS, llms.txt, ai.txt) and `localizedSitemapXml` are framework-neutral builders — endpoints emit their output at the same paths as today (per-locale + root).
- OG images: static files generated at build by a `getStaticPaths` endpoint (`/og/[...slug].png`) using satori + resvg-js and the existing `lib/og-fonts/*.woff` (satori requires TTF/OTF/WOFF, not WOFF2 — current files comply). `lib/og.ts` `ogCardUrl()`/`socialImageUrl()` point to static files. The runtime `/api/og?title=…` query interface is retired; feature_image continues to take precedence for social cards.

## Search, Errors, Transitions

- Pagefind: `npx pagefind --site dist --output-path dist/_pagefind` in build script. `data-pagefind-body`/`-meta`/`-ignore` attributes unchanged. The `.next/server/app` URL-normalization code in `search-modal.tsx` is deleted (Astro dist URLs are real URLs); bundlePath `/_pagefind/`.
- View transitions: `<ClientRouter />` in layout head replaces `experimental.viewTransition` + `template.tsx` + `nextjs-toploader`. `loading.tsx`/`error.tsx` have no equivalent and are not needed (static build, instant pages).
- `404.astro` ports `not-found.tsx`.

## Known Deltas (accepted)

1. GitHub repo data and default OG card are build-time; freshness comes from rebuilds (content-sync-style cron already redeploys on content changes; a scheduled rebuild is a later option).
2. Markdown images are served as-is from `/assets/*` in the first pass (no runtime AVIF/WebP). Sharp pre-optimization inside `sync-assets` is an explicit follow-up, not part of parity.
3. `/api/og` query URLs replaced by static per-document files.
4. Deployment not configured in this effort (Gitea-only repo).

## Verification & Acceptance

- `npm run verify` passes: production build + Pagefind, `check-i18n` + `check-i18n-content`, lint, unit tests (ported seo/reading-time/og/machine-readable/locale-switcher contracts).
- Route parity: for a sample of zh-TW + en posts/pages/tags, old URL → new `dist/` file exists with equivalent title/metadata/hreflang.
- Visual parity: side-by-side browser check of home, blog index, a post (TOC, progress bar, callouts, code blocks dark/light), tags, projects, 404, dark mode.
- Search returns results for post body text; RSS validates; OG PNGs render CJK correctly.

## Non-Goals

- No redesign, no new features, no CMS, no SSR adapter, no analytics. GitHub remote/deployment pipeline set up separately after acceptance.

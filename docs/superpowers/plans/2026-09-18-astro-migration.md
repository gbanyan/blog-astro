# Astro Migration Implementation Plan (blog-nextjs → blog-astro)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the personal blog from `~/Project/personal/blog-nextjs` (Next.js 16 + Velite) as a full-parity static Astro site in this repo.

**Architecture:** Fresh Astro 6 skeleton; `lib/` logic, unified plugins, React components, and Tailwind styles port from the source repo with minimal edits; only the rendering layer is rewritten as `.astro` pages/layouts. Content comes from the same `content/` git submodule via Astro content collections.

**Tech Stack:** Astro 6, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), `@astrojs/react` (React 19), Pagefind, satori + resvg-js (OG), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-18-astro-migration-design.md` (read it first — decisions, deltas, acceptance criteria).

## Global Constraints

- URL contract (verbatim): default locale `zh-TW` unprefixed (`/`, `/blog/*`, `/pages/*`, `/tags/*`, `/projects`), English under `/en/*`. `/zh-TW` never appears in a URL.
- All routes statically prerendered; no adapter, no SSR, no middleware.
- Source of truth for ported code: sibling repo `~/Project/personal/blog-nextjs` (branch as checked out). Copy files; do not paraphrase them.
- Lighthouse-visible features must survive: `data-pagefind-body`/`-meta`/`-ignore`, callouts, dual-theme code blocks, TOC, reading progress, scroll reveals, giscus, mermaid, i18n pairing (`translation_id`/`translation_key`, placeholders).
- Env config stays on `NEXT_PUBLIC_*` variable names inside `lib/config.ts` (renamed to plain `PUBLIC_*` in the new repo — update all reads in that one file only).
- Every task ends with a commit; `npx astro build` (or the task's stated check) must pass before committing.
- Node 22, npm; branch `main` in this repo.

---

### Task 1: Skeleton, config, tooling

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `.env.local.example` (copy + adapt from source repo), `src/styles/globals.css` (copied)
- Create: `src/pages/index.astro` (temporary smoke page, replaced in Task 7)

**Interfaces:**
- Produces: working `astro build`; `@/*` path alias; global styles wired into `src/layouts` later.

- [ ] **Step 1: Scaffold**

```bash
cd ~/Project/personal/blog-astro
npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git
npm install
npx astro add react tailwind --yes
npm i -D vitest @types/node
npm i gray-matter image-size clsx tailwind-merge react-icons react-dom cmdk @radix-ui/react-dialog @emotion/is-prop-valid nextjs-toploader@0 || true
# next-themes is NOT installed (hand-rolled theming). next/font NOT used.
```

- [ ] **Step 2: Write `astro.config.mjs`** (exact content)

```js
// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import remarkGfm from 'remark-gfm';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { visit } from 'unist-util-visit';

import { rehypeCallouts } from './src/lib/rehype-callouts';
import { rehypeLocalizeLinks } from './src/lib/rehype-localize-links';
import { rehypeOptimizeImages } from './src/lib/rehype-optimize-images';

// Velite 0.4 hard-coded allowDangerousHtml; the contract drops raw HTML
// blocks, so remove them before Astro's markdown → HTML conversion.
const remarkRemoveRawHtml = () => (tree) => {
  visit(tree, 'html', (_node, index, parent) => {
    if (!parent || typeof index !== 'number') return;
    parent.children.splice(index, 1);
    return ['skip', index];
  });
};

export default defineConfig({
  site: 'https://blog.gbanyan.net', // overridden by PUBLIC_SITE_URL at build via lib/config; keep in sync
  i18n: {
    defaultLocale: 'zh-TW',
    locales: ['zh-TW', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    gfm: false, // remark-gfm added explicitly below
    remarkPlugins: [remarkGfm, remarkRemoveRawHtml],
    rehypePlugins: [
      rehypeCallouts,
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap' }],
      rehypeOptimizeImages,
      rehypeLocalizeLinks,
    ],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-display-latin',
      subsets: ['latin'],
    },
    {
      provider: fontProviders.google(),
      name: 'LXGW WenKai TC',
      cssVariable: '--font-display-cjk',
      weights: [400, 700],
      preload: [], // CJK: do not preload
    },
  ],
});
```

Note: `gfm: false` + explicit `remark-gfm` mirrors the Velite config comment ("Keep this explicit even though Velite enables GFM by default"). If Astro requires `markdown.gfm` only as a boolean for its internal remark-gfm plugin, set `gfm: true` and drop the explicit plugin — do NOT enable both.

- [ ] **Step 3: Port styles.** Copy `~/Project/personal/blog-nextjs/styles/globals.css` → `src/styles/globals.css`, then apply: replace every `.shiki` selector with `.astro-code` (keep `--shiki-` custom property references — Astro/Shiki uses the same variable names; if any rule references `[data-theme]` pretty-code attributes, map per Shiki dual-theme docs to `.astro-code, .astro-code span { color: var(...) }` pattern). Import it once from the future layout; until Task 6, import from the smoke page.

- [ ] **Step 4: `tsconfig.json`** — ensure Astro strict base plus alias:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["astro/client"]
  },
  "include": [".astro/types.d.ts", "src/**/*", "scripts/**/*"],
  "exclude": ["dist", "content"]
}
```

- [ ] **Step 5: Copy env example** from `~/Project/personal/blog-nextjs/.env.local.example`, rename variable prefix `NEXT_PUBLIC_` → `PUBLIC_` throughout, add `GITHUB_USERNAME`/`GITHUB_TOKEN` lines if present in source env usage.

- [ ] **Step 6: Verify + commit**

```bash
npx astro build && npx tsc --noEmit
git add -A && git commit -m "chore: Astro skeleton, config, styles, tooling"
```

### Task 2: Content submodule + asset scripts

**Files:**
- Create: `content` (submodule), `scripts/sync-assets.mjs`, `scripts/check-assets.mjs`, `scripts/check-i18n.mjs`, `scripts/check-i18n-content.mjs`, `scripts/i18n-validation-adapter.mjs`, `scripts/pin-translation-ids.mjs`, `scripts/create-locale-placeholders.mjs`, `scripts/subset-font.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `content/{posts,pages,assets}/`; `public/assets/` mirror; `npm run sync-assets` / `check-assets`.

- [ ] **Step 1: Add submodule**

```bash
git submodule add ssh://git@git.gbanyan.net:30009/personal/personal-blog.git content
git submodule update --init --recursive
```

- [ ] **Step 2: Port scripts.** Copy each file verbatim from `~/Project/personal/blog-nextjs/scripts/`. Apply exactly two adaptations where present: (a) any `next`-specific logic removed (none expected — they are plain node scripts over the filesystem); (b) the i18n-validation adapter reads the new content boundary (`src/lib/content.ts` exports) instead of `.velite` — adjust its import path and shape to Task 4's exports (`getPostsByLocale`, `getPagesByLocale`, translation pairing helpers). Keep CLI contract identical.

- [ ] **Step 3: package.json scripts**

```json
{
  "sync-assets": "node scripts/sync-assets.mjs",
  "check-assets": "node scripts/check-assets.mjs",
  "check-i18n": "node scripts/check-i18n.mjs",
  "check-i18n-content": "node scripts/check-i18n-content.mjs",
  "build": "npm run sync-assets && npm run check-i18n-content && npm run check-assets && astro build && npx pagefind --site dist --output-path dist/_pagefind",
  "verify": "npm run build && npm run check-i18n && npm run lint && npm run test"
}
```

- [ ] **Step 4: Verify + commit**

```bash
npm run sync-assets && npm run check-assets && npm run check-i18n-content
ls public/assets | head   # non-empty
git add -A && git commit -m "chore: content submodule, asset/i18n scripts"
```

### Task 3: Content collections + markdown pipeline

**Files:**
- Create: `src/content.config.ts`, `src/lib/rehype-callouts.ts`, `src/lib/rehype-localize-links.ts`, `src/lib/rehype-optimize-images.ts` (copied), `src/lib/locales.ts`, `src/lib/i18n/config.ts`, `src/lib/i18n/dictionaries.ts` (copied)

**Interfaces:**
- Produces: `getCollection('posts'|'pages')` entries; zod-inferred `Post`/`Page` frontmatter types; `render(entry)` from `astro:content`.
- Produces: `localizedPath(path, locale)`, `getDocumentLocale`, `isPlaceholderDocument`, `DEFAULT_LOCALE`, `SUPPORTED_LOCALES` (same signatures as source `lib/locales.ts`).

- [ ] **Step 1: Port plugins/i18n/config libs verbatim** (copy from source `lib/`): `rehype-callouts.ts`, `rehype-localize-links.ts`, `rehype-optimize-images.ts`, `locales.ts`, `i18n/config.ts`, `i18n/dictionaries.ts`. No edits except import-path style (`@/` alias already matches).

- [ ] **Step 2: Write `src/content.config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const shared = {
  locale: z.enum(['zh-TW', 'en']).default('zh-TW'),
  translation_id: z.string().optional(),
  slug: z.string().optional(),
  translation_key: z.string().optional(),
  translation_status: z.enum(['source', 'placeholder', 'translated']).optional(),
  is_placeholder: z.boolean().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  ghost_id: z.string().optional(),
  status: z.string().optional(),
  visibility: z.string().optional(),
  featured: z.boolean().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  published_at: z.coerce.date().optional(),
  custom_excerpt: z.string().optional(),
  authors: z.array(z.string()).optional(),
  feature_image: z.string().optional(),
};

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/posts' }),
  schema: z.object({ ...shared, title: z.string(), tags: z.array(z.string()).optional() }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/pages' }),
  schema: z.object({ ...shared, title: z.string(), tags: z.array(z.string()).optional() }),
});

export const collections = { posts, pages };
```

Field names must match source frontmatter exactly — verify against 3 real files in `content/posts/` before building. The glob loader's generated `id` equals the path without extension; `entry.filePath` is the source path the rehype plugins rely on for locale detection.

- [ ] **Step 3: Verify + commit**

```bash
npx astro build   # collections load, schema validates every .md
git add -A && git commit -m "feat: content collections with ported markdown pipeline"
```

### Task 4: Port lib layer + tests

**Files:**
- Create: `src/lib/{content.ts,posts.ts,tags.ts,reading-time.ts,machine-readable.ts,seo.ts,og.ts,mastodon.ts,github.ts,github-lang-colors.ts,navigation.ts,sidebar-data.ts,utils.ts,locale-switcher.ts,use-drawer.ts,use-mounted.ts,use-modal-dialog.ts}`
- Test: `src/lib/__tests__/{seo,reading-time,og,machine-readable,locale-switcher}.test.ts` (port from source `tests/`)

**Interfaces:**
- Consumes: collections (Task 3), `lib/locales` (Task 3).
- Produces (signatures preserved from source): `getPostsByLocale(locale)`, `getPagesByLocale(locale)`, `getTranslationPair(doc, docs)`, `getAllPostsSorted(locale)` (async in source — keep async), `getPostBySlug`, `getPageBySlug`, `getRelatedPosts`, `getPostNeighbors`, `getTagSlug`, `getAllTagsWithCount`, `countWords`, `estimateReadingMinutes`, `generateRss(locale)`, `generateLlmsTxt`, `generateAiTxt`, `metadataForDocument(doc, docs)` → plain head-model object (see Step 2), `socialImageUrl`, `ogCardUrl`, `fetchPublicRepos`, `parseMastodonUrl`, `fetchAccountId`, `fetchStatuses`, `getSidebarData(locale)`.

- [ ] **Step 1: Port framework-neutral libs verbatim:** `tags.ts`, `reading-time.ts`, `machine-readable.ts`, `mastodon.ts`, `github.ts` (delete `next: { revalidate: 3600 }` fetch option), `github-lang-colors.ts`, `navigation.ts`, `sidebar-data.ts`, `utils.ts`, `locale-switcher.ts`, `use-drawer.ts`, `use-mounted.ts`, `use-modal-dialog.ts`, `og-fonts/` directory (copy to `src/lib/og-fonts/`).

- [ ] **Step 2: Adapt `content.ts`.** Replace `.velite` imports with Astro collection data. Implement `loadPosts()`/`loadPages()` that `await getCollection(...)` once (module-level promise cache) and map entries through the ported `adaptDocument` logic (keep `flattenedPath` derivation from `entry.id`, `sourcePath` from `entry.filePath`, locale/translation pairing unchanged). All exported helper signatures stay identical. `posts.ts` consumes the adapter; `getAllPostsSorted` loses `'use cache'` (plain async, memoized by the adapter cache).

- [ ] **Step 3: Adapt `seo.ts` to a head model.** Replace `Metadata` with:

```ts
export interface HeadModel {
  title: string;
  description?: string;
  canonical: string;
  alternates: { locale: string; href: string }[]; // hreflang pairs incl. x-default
  robots?: { index: boolean; follow: boolean };
  openGraph: { title?: string; description?: string; url: string; siteName: string; locale: string; images: { url: string; alt?: string }[] };
  twitter: { card: string; title?: string; description?: string; images: string[] };
  sitemap: ReturnType<typeof localizedSitemapEntries>;
}
```

Keep every URL/pairing computation identical (canonical, hreflang, alternates, sitemap records). `metadataForDocument`/`metadataForPath` return `HeadModel`.

- [ ] **Step 4: Port tests.** Copy `tests/*.test.ts` → `src/lib/__tests__/`. Adjust imports (`@/lib/...` still works). `seo.test.ts` assertions change only where they asserted Next `Metadata` object shape — map them onto `HeadModel` fields 1:1. `vitest.config.ts`: `environment: 'node'`, alias `@` → `./src`.

- [ ] **Step 5: Verify + commit**

```bash
npx vitest run && npx tsc --noEmit
git add -A && git commit -m "feat: port lib layer, content adapter, seo head model, tests"
```

### Task 5: Theming (hand-rolled)

**Files:**
- Create: `src/lib/theme.ts` (inline script source + `useTheme` hook), `src/components/theme-toggle.tsx` (adapted)

**Interfaces:**
- Produces: `THEME_INIT_SNIPPET` (string, injected in layout `<head>`); `useTheme(): { theme: 'light'|'dark'; resolvedTheme: 'light'|'dark'|undefined; toggle(): void }` — same call sites as `next-themes` consumers.

- [ ] **Step 1: Implement `src/lib/theme.ts`**

```ts
export const THEME_INIT_SNIPPET = `
(function(){try{var s=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s??(m?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.dataset.theme=t;}catch(e){}})();
`;
```

`useTheme()`: `useState` + `useEffect` subscribing to a document-level custom event `theme-change` (dispatched by `toggle()` and by the init script via a `MutationObserver` on `documentElement.dataset.theme` — 15 lines total; write it).

- [ ] **Step 2: Adapt `theme-toggle.tsx`:** same markup/labels, `useTheme` from `@/lib/theme`, `toggle()` flips class + `dataset.theme` + `localStorage('theme')`.

- [ ] **Step 3: Verify + commit** — temporary harness page rendering `<ThemeToggle client:load />`; click toggles `html.dark`; `git commit -m "feat: hand-rolled theming (class strategy, useTheme hook)"`.

### Task 6: Layout, head assembly, 404

**Files:**
- Create: `src/layouts/layout.astro`, `src/layouts/layout-shell.astro` (header/sidebar/footer wrapper — thin .astro host for islands), `src/pages/404.astro`
- Port as islands: `site-header.tsx`, `nav-menu.tsx`, `mobile-drawer.tsx`, `site-header-search.tsx`, `language-switcher.tsx`, `back-to-top.tsx`, `footer-cue.tsx`, `theme-toggle.tsx` (Task 5)

**Interfaces:**
- Consumes: `HeadModel` (Task 4), `siteConfig`, `THEME_INIT_SNIPPET` (Task 5), dictionaries.
- Produces: `<Layout head={...} locale={...}><slot /></Layout>`; `<LayoutShell locale={...} currentPath={...}><slot /></LayoutShell>`; `currentPath` prop convention for islands that had `usePathname()`.

- [ ] **Step 1: `layout.astro`** — `<html lang={locale}>`; `<head>` renders `HeadModel` fields as tags (`<title>`, description, canonical `<link rel="canonical">`, `<link rel="alternate" hreflang href>` + `x-default`, OG/Twitter metas, JSON-LD inline `<script type="application/ld+json">`), fonts via `<Font cssVariable>` from `astro:fonts` (set at Task 1 config), `THEME_INIT_SNIPPET`, `<ClientRouter />`, favicon/apple-touch-icon from `public/`. Body sets `transition-colors` classes as in source layout.

- [ ] **Step 2: Adapt shell/header components.** Rules applied to every ported React file:
  - `next/link` → `<a href={localizedPath(href, locale)}>` (or receive pre-localized `href` props from `.astro` callers).
  - `usePathname()` → `currentPath` prop (string, passed from `.astro` via `Astro.url.pathname`).
  - `next/image` → `<img src={...} width={...} height={...} loading="lazy">` (feature images: `loading="eager" fetchpriority="high"`).
  - `useTheme` from `@/lib/theme`.
  - Dictionary access: pass labels as props from `.astro` (dictionaries are server modules).

- [ ] **Step 3: `404.astro`** — port `app/[locale]/not-found.tsx` markup through `LayoutShell`, no head model beyond defaults.

- [ ] **Step 4: Verify + commit** — `npx astro build` renders `/` (smoke index) inside new layout; inspect HTML head for canonical/hreflang/fonts; commit.

### Task 7: zh-TW pages

**Files:**
- Create: `src/pages/index.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[slug].astro`, `src/pages/pages/[slug].astro`, `src/pages/tags/index.astro`, `src/pages/tags/[tag].astro`, `src/pages/projects.astro`
- Port islands used by pages: `post-list-with-controls.tsx`, `post-card.tsx`, `post-list-item.tsx`, `post-layout.tsx`, `post-toc.tsx`, `reading-progress.tsx`, `scroll-reveal.tsx`, `mermaid-renderer.tsx`, `giscus-comments.tsx`, `mastodon-feed.tsx`, `markdown-body.tsx` (server component — becomes .astro usage of `render(entry)` output; keep `dangerouslySetInnerHTML` semantics via `set:html`), `hero-section.tsx`, `timeline-wrapper.tsx`, `section-divider.tsx`, `homelab-device-hero.tsx`, `dev-env-device-hero.tsx`, `repo-card.tsx`, `right-sidebar.tsx`, `json-ld.tsx` (inline), `pagination` bits if present

**Interfaces:**
- Consumes: Layout/LayoutShell, lib helpers, collections.
- Produces: every zh-TW route with `getStaticPaths` over collection entries: `{ params: { slug } }` where `slug` = adapter's `flattenedPath` (identical URLs to production). `blog/[slug].astro` renders body via:

```astro
---
import { getCollection, render } from 'astro:content';
const posts = await getCollection('posts');
const entry = posts.find((e) => e.id === slug);
const { Content } = await render(entry);
---
<article data-pagefind-body><Content /></article>
```

- [ ] **Step 1: Home + blog index + tags pages** (list pages; `post-list-with-controls` island receives serialized post summaries + `currentPath`; keyword search stays client-side). Commit: `feat: zh-TW list pages`.
- [ ] **Step 2: `blog/[slug]` + `pages/[slug]`** — head model from `metadataForDocument`, prev/next + related via `getPostNeighbors`/`getRelatedPosts`, TOC/progress/giscus/mermaid islands wired with `client:*`, `data-pagefind-*` attributes placed exactly as source. Commit.
- [ ] **Step 3: `projects.astro`** — `fetchPublicRepos()` at build in frontmatter; `RepoCard` grid (island only if animation needed — prefer static .astro + CSS animation). Commit.
- [ ] **Step 4: Verify** — `npm run build`; spot-check `/`, `/blog`, one post, one page, `/tags`, `/tags/<tag>`, `/projects` in dist HTML (titles, hreflang, code blocks have `.astro-code`, callout markup, images have width/height).

### Task 8: en/ mirrors

**Files:**
- Create: `src/pages/en/{index.astro,blog/index.astro,blog/[slug].astro,pages/[slug].astro,tags/index.astro,tags/[tag].astro,projects.astro,feed.xml.ts,sitemap.xml.ts,robots.txt.ts,llms.txt.ts,ai.txt.ts}`

**Interfaces:**
- Consumes: same shared components, `locale='en'`, English dictionaries.

- [ ] **Step 1: Create each en page as a 10-line wrapper:** frontmatter sets `locale='en'`, `getStaticPaths` filters collection by `entry.data.locale === 'en'`, delegates to the shared `.astro` component extracted in Task 7 (pages under `src/components/pages/` if not already). No duplicated markup.
- [ ] **Step 2: Verify** — build; `/en`, `/en/blog/<en-post>`, `/en/tags/...` render; check `hreflang` pairs reference both locales; English-source markdown links got `/en` prefix via `rehype-localize-links` (pick a sample in dist).

### Task 9: Root machine-readable endpoints

**Files:**
- Create: `src/pages/feed.xml.ts`, `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts`, `src/pages/llms.txt.ts`, `src/pages/ai.txt.ts`

**Interfaces:**
- Consumes: `generateRss`, `localizedSitemapXml`, `generateLlmsTxt`, `generateAiTxt` from lib (Task 4).

- [ ] **Step 1: Endpoints** (all follow this shape):

```ts
import type { APIRoute } from 'astro';
import { generateRss } from '@/lib/machine-readable';
import { DEFAULT_LOCALE } from '@/lib/locales';

export const GET: APIRoute = () =>
  new Response(generateRss(DEFAULT_LOCALE), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
```

Sitemap concatenates both locales' records (source root behavior); robots references sitemap URL. All prerendered by default (static output).

- [ ] **Step 2: Verify + commit** — build; validate `dist/feed.xml` parses (`xmllint --noout`), sitemap URLs match produced pages, robots/llms/ai.txt match source output for same content; port any machine-readable tests already covered in Task 4.

### Task 10: Build-time OG images

**Files:**
- Create: `src/pages/og/[...slug].png.ts`, `src/lib/og-render.tsx`
- Modify: `src/lib/og.ts`

**Interfaces:**
- Produces: `/og/<flattenedPath>.png` per post/page (both locales) + `/og/default-<locale>.png`; `ogCardUrl({ locale, slug? })` → those static URLs.

- [ ] **Step 1: `npm i satori resvg-js`** (`@resvg/resvg-js`).
- [ ] **Step 2: Port the JSX card from `app/api/og/route.tsx`** into `og-render.tsx` (same layout: brand title, title, description, tags, author·date line, locale-aware date formatting — reuse `getDictionary` + the existing `toLocaleDateString` branches). Fonts: same `noto-400.woff`/`noto-700.woff` loaded from `src/lib/og-fonts/` via `readFileSync` at build.
- [ ] **Step 3: Endpoint with `getStaticPaths`** returning one path per indexable document + per-locale default; `GET` renders satori → resvg → `new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } })`. Non-indexable/placeholder docs produce no path.
- [ ] **Step 4: Update `lib/og.ts`** — `ogCardUrl` returns `/og/${slug}.png` (localized) instead of `/api/og?...`; `socialImageUrl` unchanged (feature_image first).
- [ ] **Step 5: Verify + commit** — build; render 2 sample PNGs; confirm CJK glyphs render (no tofu) in both themes; `og:image` metas point at `/og/...`.

### Task 11: Pagefind search wiring

**Files:**
- Modify: `src/components/search-modal.tsx`, `src/components/site-header-search.tsx`
- Modify: `package.json` (build script already added in Task 2)

**Interfaces:**
- Consumes: `dist/_pagefind` bundle (Task 2 build script).

- [ ] **Step 1: Edit `search-modal.tsx`:** delete `normalizePagefindUrl` and the `/server/app` + `/zh-TW` mapping entirely — `result.url` from `dist` indexing is already the public path. Keep `plain_excerpt`, `matchedMetaFields`, bundlePath `/_pagefind/`, dynamic import, debouncing.
- [ ] **Step 2: Verify + commit** — `npm run build` (pagefind runs); open `dist/index.html` via local server; Cmd+K modal opens, searching a distinctive phrase from a real post body returns that post with excerpt; tags meta shows.

### Task 12: Lint, README, docs, env, CI-less verify gate

**Files:**
- Create: `eslint.config.mjs` (flat config: `typescript-eslint` recommended, `eslint-plugin-astro`, `react-hooks`), `README.md`, `CLAUDE.md` (port commands/architecture sections from source CLAUDE.md, rewritten for Astro), `.github/dependabot.yml` (npm ecosystem)
- Modify: `package.json` (`"lint": "eslint ."`)

- [ ] **Step 1: Lint config + fix violations** (import order not enforced; just errors).
- [ ] **Step 2: README** — setup (submodule, env, dev), commands, architecture summary, ported performance notes. **CLAUDE.md** — commands (`npm run dev` = `astro dev` + `velite`-equivalent absent → `astro dev` runs collections directly; `npm run verify`), content submodule flow, i18n routing notes, known deltas (build-time GitHub/OG).
- [ ] **Step 3: `npm run dev` sanity** — collections hot-reload, islands hydrate, theme toggles, search works.
- [ ] **Step 4: Verify + commit** — `npm run verify` green end-to-end.

### Task 13: Acceptance verification

**Files:**
- Create: `scripts/parity-check.mjs` (throwaway, deleted after acceptance)

- [ ] **Step 1: Route parity script** — reads a sample (10 zh-TW + 10 en posts/pages + home/blog/tags/projects + endpoints) from source site URL list, asserts `dist/<path>/index.html` (or file) exists and contains the document `<title>`; prints table. Run: `node scripts/parity-check.mjs` → all rows OK.
- [ ] **Step 2: Visual parity** — `npx astro preview`, browser check (omp `browser` eval): home, blog index, one long post (TOC sync, progress bar, callouts, dark/light code blocks, mermaid diagram page if any, giscus iframe loads), tags, projects, 404, `/en` variants. Screenshots compared side-by-side with production URLs. Fix styling deltas found (globals.css `.astro-code` mapping most likely).
- [ ] **Step 3: RSS + OG + search final checks** — `xmllint` both feeds; OG PNGs for zh + en sample; pagefind search in both locales.
- [ ] **Step 4: Delete throwaway script; final commit.**

### Task 14: Gitea repo + push

- [ ] **Step 1: Read `skill://gitea-workflow`; verify host/owner with `tea` auth (do not guess credentials).**
- [ ] **Step 2: Create private repo `gbanyan/blog-astro` on `git.gbanyan.net`; add remote `origin ssh://git@git.gbanyan.net:30009/personal/blog-astro.git` (port matches blog-nextjs origin pattern — confirm actual owner/path from `tea` output).**
- [ ] **Step 3: `git push -u origin main` (includes submodule reference `.gitmodules`).**
- [ ] **Step 4: Report push SHA + validation limits** (what was verified locally: build, tests, lint, visual parity).

---

## Self-Review Notes

- Spec coverage: content pipeline (T3), i18n (T1 config + T7/T8), islands + theming (T5/T6), lib+tests (T4), endpoints (T9), OG (T10), Pagefind (T2 build + T11), lint/docs/verify (T12), acceptance incl. visual parity + soft-404 check (T13), Gitea (T14). Deltas accepted in spec are reflected (build-time fetch T7, static OG T10).
- Known risk flagged for implementer: Astro fonts API `preload: []` semantics — verify actual config key against Astro 6 docs at Task 1; `gfm` double-enable guard noted in T1 Step 2.
- Type consistency: `HeadModel` defined once (T4) and consumed in T6; adapter exports consumed by scripts (T2) via T4 names; `useTheme` defined T5, consumed T6.

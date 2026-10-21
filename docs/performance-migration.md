# Astro and Cloudflare migration performance checks

Measured September 18, 2026. Production origin: `https://blog.gbanyan.net`.
Worker: `blog-astro`, static-assets-only, existing `blog.gbanyan.net/*` route.
Wrangler 4.134.0 initially verified the deployed asset configuration. Cloudflare
MCP authentication subsequently succeeded, allowing the account audit below.

## Findings and changes

- Production redirected slashless canonical/internal URLs to trailing-slash
  paths. Astro now declares `trailingSlash: 'never'` and Workers uses
  `drop-trailing-slash`, avoiding that redirect while preserving old links.
- Hashed Astro fonts, scripts, and styles had `max-age=0, must-revalidate`.
  `/_astro/*` now uses a one-year immutable browser cache.
- Original images, OG images, and Pagefind entry files had a one-year immutable
  policy despite stable filenames. They now revalidate with ETags. Headers
  already stored in a visitor's browser under the old policy cannot be
  retroactively revoked by changing server headers.
- Article covers had no `srcset`; a 1920px original was sent to mobile too.
  `ContentImage` imports local content assets through Astro, produces WebP
  variants at build time, and uses the actual image aspect ratio. Remote
  images, GIFs, and unsupported formats retain the original-file fallback.
- Static HomeLab and development-device illustrations no longer hydrate React
  in the browser. Their CSS animation and server-rendered SVG markup remain.
- Wrangler's generated state is excluded from Git and ESLint.

## Measured image payload

Chrome, fresh isolated browser contexts, device pixel ratio 1. Browser Resource
Timing `encodedBodySize`, not total page size or an estimate of time saved.
Compared production's original with the optimized production build served by
local Wrangler at `127.0.0.1:4413`.

| AI-taste article cover | Bytes | Change |
| --- | ---: | ---: |
| Original JPEG (all viewport widths) | 262,072 | baseline |
| WebP at 390px viewport (480px candidate) | 16,500 | 93.7% smaller |
| WebP at 1440px viewport (1200px candidate) | 75,792 | 71.1% smaller |

Higher device pixel ratios select larger candidates. This is one representative
cover, not a site-wide average. Typography is unchanged: previously measured
cold font payloads were about 869 KB for the homepage, 873 KB for HomeLab,
1.25 MB for the Chinese AI-taste article, and 38 KB for its English version.
Immutable caching improves repeat visits, not the initial font download.

## Reproduce and validate

Run locally on macOS using Node/npm and the repository's installed dependencies:

```sh
rtk proxy npm run verify
rtk proxy npx wrangler deploy --dry-run
rtk proxy npx wrangler dev --ip 127.0.0.1 --port 4413
# In another terminal:
rtk proxy npm run check-delivery
# After deploying:
rtk proxy npm run check-delivery -- https://blog.gbanyan.net
```

`check-delivery` exercises actual HTTP responses: English/Chinese canonical
routes, slash redirects preserving query strings, responsive cover markup,
immutable font/image responses, revalidation for mutable assets, and real 404s.
Browser checks cover 390px/1440px layouts, successful image decoding, article
contents controls, and the static device illustrations.

No DevTools trace MCP was available. These are resource and behavior checks,
not field Core Web Vitals, an INP assessment, or a Lighthouse score. Remaining
opportunities include inline Markdown images, React list thumbnails, and
reducing the first-visit CJK font subset payload without changing typography.

## Cloudflare follow-up audit

The account MCP authenticated on September 18, 2026. Earlier Wrangler OAuth
403 responses for zone settings, rulesets, and DNS no longer block the audit.

- Confirmed HTTP/2, HTTP/3, Brotli, Early Hints, 0-RTT, and Always Use HTTPS are
  enabled. SSL is strict, browser cache TTL is zero (respect origin), and
  Rocket Loader is off. These settings were retained.
- Disabled the legacy **Ghost Blog Cache** rule, which matched every path on
  `blog.gbanyan.net` and forced a 7,200-second edge TTL over origin policy.
  This removes an obsolete origin-cache override; it is not a measured speed
  improvement or evidence that Workers Static Assets had been stale.
  Only this rule changed; a read-back confirmed all other cache rules were
  identical. No cache purge or DNS change was performed.
- Rollback: enable **Ghost Blog Cache** in the zone's Cache Rules dashboard.
  Its expression and action parameters are preserved. API identifiers:
  zone `73e80ae899f224ef9b568bbad958c761`, ruleset
  `1bf283fd013548f398c14645e5e1370a`, rule
  `d457170b045d4a00aeb328f28a8a47df`. Resulting ruleset version: 10.
- The proxied blog CNAME still targets Vercel as the existing rollback setup;
  the Worker route serves current traffic. Preserve both until a deliberate
  origin cutover is planned.
- The existing Cloudflare Web Analytics configuration for `gbanyan.net` is
  disabled. It was left unchanged; no field Core Web Vitals improvement can
  be established from this audit.

- Verified the production route points to `blog-astro`, with fail-open disabled.
- Verified workers.dev and preview URLs are disabled in the live account.
- Production HTML was served over HTTP/2 with Brotli compression and advertised
  HTTP/3 via `Alt-Svc`. These observations do not establish all zone settings.
- Refined search caching: content-hashed `/_pagefind/index/*` and
  `/_pagefind/fragment/*` now receive immutable caching; entry JS/JSON and WASM
  retain Cloudflare's default ETag revalidation. Removed the blanket Pagefind
  rule to avoid conflicting Cache-Control values from overlapping patterns.
- The current build has 12 index chunks (347,771 bytes) and 112 result fragments
  (337,611 bytes). A search loads only the subset it needs; caching avoids
  repeat network validation for those unchanged payloads, not this entire
  bundle on every search.
- Delivery checks now verify hashed search payload headers and entry freshness.
  By default they use filenames from the local build. CI can produce different
  hashes, so pass the live search's index/fragment paths as extra arguments
  when checking production: `npm run check-delivery -- https://blog.gbanyan.net
  /_pagefind/index/<live-file>.pf_index /_pagefind/fragment/<live-file>.pf_fragment`.
- A local Chrome repeat-visit check for the English `Cloudflare` query loaded
  one index and one result fragment: 36,931 transferred bytes on the first
  visit, zero on the second. Both searches returned the same result. The test
  disabled Pagefind's worker only in the browser evaluation so Resource Timing
  could observe its requests; production's worker setting is unchanged.

## 2026-10-21: fonts, headers, SEO metadata and 404s

Measured on a local `astro build` of the working tree (other in-flight changes
included, so page totals are not attributable to fonts alone).

- **CJK display font.** LXGW WenKai TC is no longer configured through the
  Astro Fonts API, which inlined 216 `@font-face` rules (~211 KB: 108
  unicode-range slices × 2 weights) into every HTML page and made a first zh
  visit download 0.87–1.25 MB of slices. `scripts/build-display-font.mjs`
  (run by `npm run build` and `predev`) collects every glyph that can be set
  in the display font (content titles, tags and Markdown headings,
  dictionaries, page-level strings, `PUBLIC_SITE_*`), drops what Cormorant's
  Latin subset covers, and fetches one woff2 from Google Fonts
  `css2?...&text=`. Only weight 700 ships: every display-font use is
  semibold/bold, so no element synthesizes from it. Output:
  `public/fonts/lxgw-wenkai-tc-700-<hash>.woff2` (git-ignored, immutable via
  `/fonts/*`). `src/lib/display-font.ts` + `layout.astro` inline one
  `@font-face` with a coarse `unicode-range` (English pages never download
  it) and preload it on zh-TW pages. Cache: `node_modules/.cache/display-font`
  keyed by the glyph set. A failed download fails the build in CI (`CI` set);
  locally it warns and keeps the previous subset, or headings fall back to the
  serif stack. Missing glyphs (none expected) fall back per character.
- Cormorant Garamond (Latin, 300–700) stays on the Fonts API (2 faces, ~37 KB
  each, italic only when used). Its range includes space, digits and ASCII
  punctuation, so zh headings containing them still fetch the normal face by
  design; avoiding that would change the typography.

| Measure | Before | After |
| --- | ---: | ---: |
| `404.html` | 256,106 B | 38,089 B |
| `index.html` (zh home) | 294,071 B | 83,670 B |
| Inline font CSS per page | 212,032 B (218 rules) | 1,048 B (3 rules) |
| CJK font files, zh post (cold) | 0.87–1.25 MB, many slices | 1 file, 237,684 B, cached immutably site-wide |
| CJK font files, en page | slices for any CJK char | none |

- **Early Hints.** `scripts/finalize-dist.mjs` (after `astro build`) appends
  a marker-delimited block to `dist/_headers`: `Link: rel=preload` for the
  stylesheet shared by every page on HTML routes, plus the CJK subset on zh
  routes. Workers static assets only emit Early Hints from `Link` headers the
  site sends (zone setting `early_hints` is on); Cloudflare sends 103 only for
  extensionless/`.html` URLs over HTTP/2+ and skips it when the response is
  already ready. The same script moves `dist/en/404/index.html` to
  `dist/en/404.html`.
- **404s.** The message is the `h1` (decorative "404" is `aria-hidden`), with
  home/blog/tags links, the five latest posts and a search hint.
  `src/pages/en/404.astro` adds an English page; `404-page` handling serves
  the nearest `404.html`, verified with `wrangler dev` (`/en/x` → `lang="en"`).
- **Headers.** `/*` adds `Referrer-Policy`, `Permissions-Policy` and
  `X-Frame-Options` (nosniff and HSTS come from the zone). `llms.txt`,
  `en/llms.txt`, `ai.txt`, `robots.txt` and `en/robots.txt` get
  `Content-Type: text/plain; charset=utf-8` (static endpoints cannot set
  headers; Workers inferred bare `text/plain`).
- **SEO.** The default OG image is the build-time `/og/index/<locale>.png`
  card (`/assets/og-default.*` never existed); documents without a feature
  image use their own `/og/<collection>/<path>.png` card. When
  `PUBLIC_OG_DEFAULT_IMAGE` names a missing file, `og.ts` falls back to the
  generated card and `check-assets` warns (it does not fail the build). The Organization
  logo no longer prefixes the site URL to an absolute Gravatar URL.
  `og:site_name` now matches the WebSite JSON-LD name (localized brand
  title). robots.txt dropped `/_next/`, `/api/` and `Host:`.
- **Prefetch** is now explicit: `prefetchAll` with `hover` (the previous
  ClientRouter default). `viewport` would fetch every visible article on list
  pages; zone Speed Brain also prefetches on pointerdown.
- **Zone audit (read-only).** HTML responses reach the edge with
  `text/html; charset=utf-8` and an ETag (verified with `wrangler dev`), but
  production HTML has neither. Zone settings `email_obfuscation`,
  `automatic_https_rewrites` and `server_side_exclude` are on, and all three
  rewrite HTML, which drops the ETag. HSTS max-age is 5,184,000 s with
  `preload`; the preload list requires at least 31,536,000.

## 2026-10-21: list payloads, images and islands

- **List island props.** `PostListWithControls` received whole post objects
  (rendered HTML + raw Markdown). `src/lib/post-list.ts` now passes slim
  items with build-time reading time, excerpt and thumbnail data. HTML:
  `/blog` 1,451,483 → 152,785 B, `/en/blog` 1,750,365 → 154,884 B,
  `/en/tags/writings` 1,182,164 → 135,550 B. Page and sort live in the URL.
- **List thumbnails** are 4:3 WebP `getImage()` variants (160–400 px) instead
  of originals (`/blog`'s first 7 thumbnails were 2.24 MB).
- **Inline Markdown images.** `sync-assets` generates WebP variants (480–1600
  px + intrinsic width) into `public/assets/_responsive/`; the rehype plugin
  adds a `srcset` only when every variant exists; `src` stays the original.
- **Unreferenced originals.** Reading image metadata no longer marks covers
  as referenced, and `finalize-dist` deletes the remaining inline-only
  originals Astro's glob import emits: 91 files (15 MB) → 0 in `_astro/`.
- **Islands.** Language switcher, theme toggle and right sidebar are static
  Astro; nav, search, drawers, back-to-top, TOC and the home hero hydrate on
  idle; Mastodon on visible (account id resolved at build time); the search
  modal mounts on first open; scroll reveal is a plain script that never hides
  above-the-fold content. Initial JS (brotli, module closure of
  non-deferred islands): `/tags`, 404 and a post went from ~72–86 KB to ~6 KB.

## References

- [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Cloudflare HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
- [Astro image optimization](https://docs.astro.build/en/guides/images/)
- [Astro dynamic image imports](https://docs.astro.build/en/recipes/dynamically-importing-images/)
- [Pagefind metadata freshness and index caching](https://pagefind.app/docs/search-config/#meta-cache-tag)

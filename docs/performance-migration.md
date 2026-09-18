# Astro and Cloudflare migration performance checks

Measured September 18, 2026. Production origin: `https://blog.gbanyan.net`.
Worker: `blog-astro`, static-assets-only, existing `blog.gbanyan.net/*` route.
No Cloudflare MCP tools were exposed in this session; the installed Wrangler
4.134.0 CLI verified the authenticated account and deployed asset configuration.

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

The documentation MCP connected on September 18, 2026. Account MCP servers
still reported `not_logged_in`; Wrangler's existing OAuth credential could
read Worker settings and routes, but zone settings, rulesets, and DNS reads
returned HTTP 403. No zone-wide configuration was changed.

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
  They use filenames from the local build, so production checks should run
  against the matching deployed build.
- A local Chrome repeat-visit check for the English `Cloudflare` query loaded
  one index and one result fragment: 36,931 transferred bytes on the first
  visit, zero on the second. Both searches returned the same result. The test
  disabled Pagefind's worker only in the browser evaluation so Resource Timing
  could observe its requests; production's worker setting is unchanged.

## References

- [Cloudflare static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Cloudflare HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)
- [Astro image optimization](https://docs.astro.build/en/guides/images/)
- [Astro dynamic image imports](https://docs.astro.build/en/recipes/dynamically-importing-images/)
- [Pagefind metadata freshness and index caching](https://pagefind.app/docs/search-config/#meta-cache-tag)

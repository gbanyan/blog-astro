// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { visit } from 'unist-util-visit';

import { rehypeCallouts } from './src/lib/rehype-callouts';
import { rehypeLocalizeLinks } from './src/lib/rehype-localize-links';
import { rehypeOptimizeImages } from './src/lib/rehype-optimize-images';
import { remarkRewriteImageSrcs } from './src/lib/remark-rewrite-image-srcs';

// Velite hard-coded allowDangerousHtml; the existing rendered-content
// contract drops raw HTML blocks, so remove them before Astro's
// markdown → HTML conversion.
const remarkRemoveRawHtml = () => (tree) => {
  visit(tree, 'html', (_node, index, parent) => {
    if (!parent || typeof index !== 'number') return;
    parent.children.splice(index, 1);
    return ['skip', index];
  });
};

export default defineConfig({
  // Canonical site URL; lib/config.ts may override per-env at render time.
  site: 'https://blog.gbanyan.net',
  trailingSlash: 'never',
  i18n: {
    defaultLocale: 'zh-TW',
    locales: ['zh-TW', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    // Unified pipeline (Astro 7's legacy-compatible processor): GFM on,
    // smartypants OFF (the Velite pipeline never applied typography
    // transforms — keep the rendered-output contract byte-comparable).
    processor: unified({
      remarkPlugins: [remarkRemoveRawHtml, remarkRewriteImageSrcs],
      rehypePlugins: [
        rehypeCallouts,
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        rehypeOptimizeImages,
        rehypeLocalizeLinks,
      ],
      gfm: true,
      smartypants: false,
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
  // Explicit (ClientRouter's implicit default): prefetch every internal link
  // on hover/focus. 'viewport' would fetch every visible post on list pages
  // (5+ full article documents per screen) for little gain; Cloudflare Speed
  // Brain (zone setting) additionally prefetches on pointerdown.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // @resvg/resvg-js ships a native .node binary (og-render.tsx). The dep
    // optimizer's rolldown build cannot parse it ("stream did not contain
    // valid UTF-8"), dies with an unhandled rejection on every dev start,
    // and leaves every request that needs optimized deps hanging forever.
    // Native modules must be loaded by Node at request time instead.
    optimizeDeps: { exclude: ['@resvg/resvg-js'] },
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-display-latin',
      subsets: ['latin'],
      // Source used next/font weight:'variable' (300 700 axis); without this
      // Astro defaults to static 400 and headings synthesize bold.
      weights: ['300 700'],
      // Astro appends its `fallbacks` (default ["sans-serif"]) to the CSS
      // variable; globals.css composes latin-var BEFORE cjk-var, so a generic
      // mid-list satisfies CJK glyphs from the system font and the CJK family
      // never loads (next/font's variable has no generic tail).
      fallbacks: [],
      optimizedFallbacks: false,
      display: 'swap',
    },
    // LXGW WenKai TC (--font-display-cjk) is NOT configured here: the Fonts
    // API inlined ~216 unicode-range @font-face rules (~211 KB) into every
    // page. scripts/build-display-font.mjs builds one heading-only subset
    // instead; src/lib/display-font.ts + layout.astro emit its @font-face.
  ],
});

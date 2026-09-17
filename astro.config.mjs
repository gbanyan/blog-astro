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
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-display-latin',
      subsets: ['latin'],
      display: 'swap',
    },
    {
      provider: fontProviders.google(),
      name: 'LXGW WenKai TC',
      cssVariable: '--font-display-cjk',
      weights: [400, 700],
      display: 'swap', // CJK: no preload in Astro 7 fonts API; verify emitted links
    },
  ],
});

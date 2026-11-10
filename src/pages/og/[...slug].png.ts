import type { APIRoute } from 'astro';

import { getAllDocuments } from '@/lib/content';
import { ogCardPath } from '@/lib/og';
import { defaultCardInput, renderOgCard, type OgCardInput } from '@/lib/og-render';

// Route-specific Params typing (catch-all slug: string[]) isn't expressible
// with the generic GetStaticPaths helper; Astro validates params at build.
export const getStaticPaths = async () => {
  // Cards for ALL documents (placeholders included): their (noindex) pages
  // still emit og:image. The slug comes from `ogCardPath`, the same function
  // that builds the og:image URL, so the two can't disagree.
  const documentPaths = (await getAllDocuments()).map((doc) => ({
    params: { slug: ogCardPath(doc).replace(/^\/og\//, '').replace(/\.png$/, '') },
    props: {
      input: {
        locale: doc.locale,
        title: doc.title,
        description: doc.description,
        tags: doc.tags,
        author: doc.authors?.[0],
        date: doc.published_at,
      } satisfies OgCardInput,
    },
  }));

  const defaultPaths = (['zh-TW', 'en'] as const).map((locale) => ({
    params: { slug: `index/${locale}` },
    props: { input: defaultCardInput(locale) },
  }));

  return [...documentPaths, ...defaultPaths];
};

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgCard(props.input as OgCardInput);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  });
};

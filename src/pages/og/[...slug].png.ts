import type { APIRoute } from 'astro';

import { loadContent, type Post, type Page } from '@/lib/content';
import { defaultCardInput, renderOgCard, type OgCardInput } from '@/lib/og-render';

// Route-specific Params typing (catch-all slug: string[]) isn't expressible
// with the generic GetStaticPaths helper; Astro validates params at build.
export const getStaticPaths = async () => {
  const { posts, pages } = await loadContent();

  const documents: { doc: Post | Page; collection: 'posts' | 'pages' }[] = [
    ...posts.map((doc) => ({ doc, collection: 'posts' as const })),
    ...pages.map((doc) => ({ doc, collection: 'pages' as const })),
  ];

  // Cards for ALL documents (placeholders included): their (noindex) pages
  // still emit og:image and the source route served cards for any document.
  const documentPaths = documents.map(({ doc, collection }) => ({
      params: { slug: `${collection}/${doc.flattenedPath}` },
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

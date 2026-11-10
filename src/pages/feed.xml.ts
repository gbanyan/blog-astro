import type { APIRoute } from 'astro';

import { getAllPosts } from '@/lib/content';
import { generateRss } from '@/lib/machine-readable';
import { DEFAULT_LOCALE } from '@/lib/locales';

/**
 * Root RSS feed (`/feed.xml`, zh-TW default locale). Mirrors the source
 * `app/feed.xml/route.ts`.
 */
export const GET: APIRoute = async () => {
  return new Response(generateRss(await getAllPosts(), DEFAULT_LOCALE), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};

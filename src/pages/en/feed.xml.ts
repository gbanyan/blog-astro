import type { APIRoute } from 'astro';

import { loadContent } from '@/lib/content';
import { generateRss } from '@/lib/machine-readable';
import type { Locale } from '@/lib/locales';

/**
 * English RSS feed (`/en/feed.xml`). Mirrors the source
 * `app/[locale]/feed.xml/route.ts` with `locale='en'`.
 */
const locale: Locale = 'en';

export const GET: APIRoute = async () => {
  await loadContent();

  return new Response(generateRss(locale), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};

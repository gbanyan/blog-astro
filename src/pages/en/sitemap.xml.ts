import type { APIRoute } from 'astro';

import { loadContent } from '@/lib/content';
import { localizedSitemapXml } from '@/lib/seo';
import type { Locale } from '@/lib/locales';

/**
 * English sitemap (`/en/sitemap.xml`). Mirrors the source
 * `app/[locale]/sitemap.xml/route.ts` with `locale='en'`.
 */
const locale: Locale = 'en';

export const GET: APIRoute = async () => {
  await loadContent();

  return new Response(localizedSitemapXml(locale), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};

import type { APIRoute } from 'astro';

import { loadContent } from '@/lib/content';
import { rootSitemapXml } from '@/lib/seo';

/**
 * Combined sitemap (`/sitemap.xml`) covering both locales. Mirrors the
 * source `app/sitemap.ts` (Next file-convention headers: `application/xml`
 * without charset, `max-age=0, must-revalidate`).
 */
export const GET: APIRoute = async () => {
  await loadContent();

  return new Response(rootSitemapXml(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
};

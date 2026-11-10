import type { APIRoute } from 'astro';

import { getAllDocuments } from '@/lib/content';
import { rootSitemapXml } from '@/lib/seo';

/**
 * Combined sitemap (`/sitemap.xml`) covering both locales. Mirrors the
 * source `app/sitemap.ts` (Next file-convention headers: `application/xml`
 * without charset, `max-age=0, must-revalidate`).
 */
export const GET: APIRoute = async () => {
  return new Response(rootSitemapXml(await getAllDocuments()), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
};

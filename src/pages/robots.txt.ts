import type { APIRoute } from 'astro';

import { DEFAULT_LOCALE } from '@/lib/locales';
import { localizedRobots, nextRobotsText } from '@/lib/robots';

/**
 * Root robots.txt (`/robots.txt`, zh-TW default locale). Mirrors the
 * source `app/robots.ts` (Next file-convention headers).
 */
export const GET: APIRoute = () =>
  new Response(nextRobotsText(localizedRobots(DEFAULT_LOCALE, '/sitemap.xml')), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });

import type { APIRoute } from 'astro';

import type { Locale } from '@/lib/locales';
import { localizedRobots, localizedRobotsText } from '@/lib/robots';

/**
 * English robots.txt (`/en/robots.txt`). Mirrors the source
 * `app/[locale]/robots.txt/route.ts` with `locale='en'` (manual
 * serialization, no trailing newline).
 */
const locale: Locale = 'en';

export const GET: APIRoute = () =>
  new Response(localizedRobotsText(localizedRobots(locale, '/en/sitemap.xml')), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });

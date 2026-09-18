import type { APIRoute } from 'astro';

import { loadContent } from '@/lib/content';
import { generateLlms } from '@/lib/machine-readable';
import type { Locale } from '@/lib/locales';

/**
 * English llms.txt (`/en/llms.txt`). Mirrors the source
 * `app/[locale]/llms.txt/route.ts` with `locale='en'`.
 */
const locale: Locale = 'en';

export const GET: APIRoute = async () => {
  await loadContent();

  return new Response(generateLlms(locale), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
};

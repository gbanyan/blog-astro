import type { APIRoute } from 'astro';

import { loadContent } from '@/lib/content';
import { generateLlms } from '@/lib/machine-readable';
import { DEFAULT_LOCALE } from '@/lib/locales';

/**
 * Root llms.txt (`/llms.txt`, zh-TW default locale). Mirrors the source
 * `app/llms.txt/route.ts`.
 */
export const GET: APIRoute = async () => {
  await loadContent();

  return new Response(generateLlms(DEFAULT_LOCALE), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
};

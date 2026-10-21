import { siteConfig } from '@/lib/config';
import type { Locale } from '@/lib/locales';

/** Rule shape mirroring the source `app/robots.ts` (Next `MetadataRoute.Robots`). */
export interface RobotsRule {
  userAgent: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
}

export interface RobotsMetadata {
  rules: RobotsRule[];
  sitemap: string;
}

/**
 * Port of the source `app/robots.ts` `localizedRobots`: open site with
 * `/admin/` disallowed, plus the same rule repeated for known AI crawlers.
 * The Next.js-era `/api/` and `/_next/` disallows are gone (neither path
 * exists on the static Astro build), as is the non-standard `Host:` line.
 * The `locale` argument is kept for signature symmetry; the policy itself
 * is locale-independent.
 */
export function localizedRobots(
  _locale: Locale,
  sitemapPath: string
): RobotsMetadata {

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'Anthropic-ai',
          'ClaudeBot',
          'Claude-Web',
          'PerplexityBot',
          'Cohere-ai',
        ],
        allow: '/',
        disallow: ['/admin/'],
      },
    ],
    sitemap: `${siteConfig.url}${sitemapPath}`,
  };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Serializes the way the root `/robots.txt` is emitted by Next.js' robots
 * file convention: capitalized `User-Agent`, trailing newline.
 */
export function nextRobotsText(metadata: RobotsMetadata): string {
  const lines: string[] = [];
  for (const rule of metadata.rules) {
    for (const userAgent of toArray(rule.userAgent)) {
      lines.push(`User-Agent: ${userAgent}`);
    }
    for (const path of toArray(rule.allow)) lines.push(`Allow: ${path}`);
    for (const path of toArray(rule.disallow)) lines.push(`Disallow: ${path}`);
    lines.push('');
  }
  lines.push(`Sitemap: ${metadata.sitemap}`);

  return `${lines.join('\n')}\n`;
}

/**
 * Serializes the way the source `[locale]/robots.txt` route emits it
 * manually: `User-agent` casing, no trailing newline.
 */
export function localizedRobotsText(metadata: RobotsMetadata): string {
  const lines: string[] = [];
  for (const rule of metadata.rules) {
    for (const userAgent of toArray(rule.userAgent)) {
      lines.push(`User-agent: ${userAgent}`);
    }
    for (const path of toArray(rule.allow)) lines.push(`Allow: ${path}`);
    for (const path of toArray(rule.disallow)) lines.push(`Disallow: ${path}`);
    lines.push('');
  }
  lines.push(`Sitemap: ${metadata.sitemap}`);

  return lines.join('\n');
}

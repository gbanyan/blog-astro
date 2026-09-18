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
  host: string;
}

/**
 * Port of the source `app/robots.ts` `localizedRobots`: open site with
 * `/api/`, `/_next/`, `/admin/` disallowed, plus a strict deny list for
 * known AI crawlers. The `locale` argument is part of the source signature
 * for symmetry; the policy itself is locale-independent.
 */
export function localizedRobots(
  _locale: Locale,
  sitemapPath: string
): RobotsMetadata {
  const siteUrl = siteConfig.url;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/'],
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
        disallow: ['/api/', '/_next/', '/admin/'],
      },
    ],
    sitemap: `${siteUrl}${sitemapPath}`,
    host: siteUrl,
  };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Serializes the way the root `/robots.txt` is emitted by Next.js' robots
 * file convention: capitalized `User-Agent`, `Host` before `Sitemap`,
 * trailing newline.
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
  lines.push(`Host: ${metadata.host}`);
  lines.push(`Sitemap: ${metadata.sitemap}`);

  return `${lines.join('\n')}\n`;
}

/**
 * Serializes the way the source `[locale]/robots.txt` route emits it
 * manually: lowercase `user-agent`, `Sitemap` before `Host`, no trailing
 * newline.
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
  lines.push(`Host: ${metadata.host}`);

  return lines.join('\n');
}

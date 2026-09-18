import { siteConfig } from '@/lib/config';
import type { Locale } from '@/lib/locales';
import type { Page, Post } from '@/lib/content';

/**
 * Shared social-card URL selection used by metadata and page renderers.
 * Prefers the document feature image; callers fall back to the static
 * build-time OG card. Extracted so the head assembly and the page body
 * can't drift apart.
 */
export function socialImageUrl(featureImage?: string): string | null {
  if (!featureImage) return null;
  // Absolute remote URLs are already fully-qualified; keep them intact.
  if (/^https?:\/\//.test(featureImage)) return featureImage;
  const path = featureImage.replace('../assets', '/assets');
  return `${siteConfig.url}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Static build-time OG card URL for a document, produced by the
 * /og/[...slug].png endpoint (satori + resvg at build). Paths are unique
 * because flattenedPath already carries the en/ segment for English docs.
 */
export function documentOgUrl(doc: Post | Page): string {
  const collection = doc.__ignoredType === 'Page' ? 'pages' : 'posts';
  const url = new URL(`/og/${collection}/${doc.flattenedPath}.png`, siteConfig.url);
  return url.toString();
}

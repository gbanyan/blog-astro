import { existsSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_OG_IMAGE, siteConfig } from '@/lib/config';
import type { Page, Post } from '@/lib/content';
import type { Locale } from '@/lib/i18n/config';

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

/**
 * Site-wide default social card (site-relative path) for non-document pages.
 * Without a PUBLIC_OG_DEFAULT_IMAGE override this is the locale's build-time
 * card (`/og/index/<locale>.png`), which always exists in the build output.
 */
export function defaultOgImage(locale: Locale): string {
  const override = siteConfig.ogImage;
  if (override === DEFAULT_OG_IMAGE || !overrideResolves(override)) return `/og/index/${locale}.png`;
  return override;
}

/**
 * A site-relative override must exist in public/ (synced from content/assets
 * before the build); a stale env value must not ship a 404 social card.
 * Absolute URLs are trusted as-is.
 */
function overrideResolves(override: string): boolean {
  if (/^https?:\/\//.test(override) || /^\/og\/index\/(zh-TW|en)\.png$/.test(override)) return true;
  return existsSync(path.join(process.cwd(), 'public', override));
}

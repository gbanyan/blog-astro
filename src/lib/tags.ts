import { getPostsByLocale } from '@/lib/content';
import type { ContentLocale } from '@/lib/content';

/**
 * Normalize a tag into a URL-safe slug.
 * Kept in a separate module so the client sidebar never imports the
 * `"use cache"` helpers from `lib/posts.ts` into the browser bundle.
 */
export function getTagSlug(tag: string): string {
  // Normalize spaces and convert to lowercase
  // Replace multiple spaces/dashes with single dash
  // Next.js will handle URL encoding automatically, so we don't encode here
  return tag
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Tags with post counts, sorted by count descending.
 * Synchronous — safe to call from the client-side sidebar.
 */
export function getAllTagsWithCount(
  locale?: ContentLocale
): { tag: string; slug: string; count: number }[] {
  const map = new Map<string, number>();
  for (const post of getPostsByLocale(locale)) {
    if (!post.tags) continue;
    for (const postTag of post.tags) {
      map.set(postTag, (map.get(postTag) ?? 0) + 1);
    }
  }

  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, slug: getTagSlug(tag), count }))
    .sort((a, b) => {
      if (b.count === a.count) return a.tag.localeCompare(b.tag);
      return b.count - a.count;
    });
}

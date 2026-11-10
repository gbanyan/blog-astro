import { getPosts } from '@/lib/content';
import type { ContentLocale, Post } from '@/lib/content';

/** Normalize a tag (or an existing slug — the mapping is idempotent) into its URL slug. */
export function getTagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Default-locale route of a tag archive (pass through `localizedPath` for other locales). */
export function tagPath(tag: string): string {
  return `/tags/${encodeURIComponent(getTagSlug(tag))}`;
}

export interface TagCount {
  tag: string;
  slug: string;
  count: number;
}

/** Tags of `posts` with post counts, most-used first (ties alphabetical). */
export function countTags(posts: readonly Post[]): TagCount[] {
  const map = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, slug: getTagSlug(tag), count }))
    .sort((a, b) => (b.count === a.count ? a.tag.localeCompare(b.tag) : b.count - a.count));
}

/** Tag counts for every post of `locale`. */
export async function getTagsWithCount(locale: ContentLocale): Promise<TagCount[]> {
  return countTags(await getPosts(locale));
}

/** The original label of the first tag in `posts` whose slug is `slug` (the slug itself if none). */
export function tagLabelForSlug(slug: string, posts: readonly Post[]): string {
  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      if (getTagSlug(tag) === slug) return tag;
    }
  }
  return slug;
}

/** Posts of `posts` carrying a tag whose slug is `slug`. */
export function postsWithTag<T extends Post>(slug: string, posts: readonly T[]): T[] {
  return posts.filter((post) => post.tags?.some((tag) => getTagSlug(tag) === slug));
}

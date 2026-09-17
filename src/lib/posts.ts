import {
  DEFAULT_LOCALE,
  getPagesByLocale,
  getPostsByLocale,
  loadContent,
} from './content';
import type { ContentLocale, Page, Post } from './content';

/**
 * All posts sorted newest-first.
 *
 * Plain async over the content adapter's module-level cache (the Astro
 * replacement for Next's `"use cache"` directive).
 */
export async function getAllPostsSorted(locale: ContentLocale = DEFAULT_LOCALE): Promise<Post[]> {
  await loadContent();
  return [...getPostsByLocale(locale)].sort((a, b) => {
    const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
    const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
    return bDate - aDate;
  });
}

export function getPostBySlug(
  slug: string,
  locale: ContentLocale = DEFAULT_LOCALE
): Post | undefined {
  return getPostsByLocale(locale).find(
    (post) =>
      (post.flattenedPath === slug ||
      post.slug === slug ||
      post._raw.flattenedPath === slug)
  );
}

export function getPageBySlug(
  slug: string,
  locale: ContentLocale = DEFAULT_LOCALE
): Page | undefined {
  return getPagesByLocale(locale).find(
    (page) =>
      (page.flattenedPath === slug ||
      page.slug === slug ||
      page._raw.flattenedPath === slug)
  );
}

/**
 * Posts related to `target` by shared tags, newest-first.
 * Memoized by the content adapter's module-level cache.
 */
export async function getRelatedPosts(target: Post, limit = 3): Promise<Post[]> {
  const posts = await getAllPostsSorted(target.locale);

  const targetTags = new Set(target.tags?.map((tag) => tag.toLowerCase()) ?? []);
  const candidates = posts.filter((post) => post._id !== target._id);

  if (candidates.length === 0) return [];

  const scored = candidates
    .map((post) => {
      const sharedTags = (post.tags ?? []).reduce((acc, tag) => {
        return acc + (targetTags.has(tag.toLowerCase()) ? 1 : 0);
      }, 0);
      return { post, score: sharedTags };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score === a.score) {
        const aDate = a.post.published_at
          ? new Date(a.post.published_at).getTime()
          : 0;
        const bDate = b.post.published_at
          ? new Date(b.post.published_at).getTime()
          : 0;
        return bDate - aDate;
      }
      return b.score - a.score;
    })
    .slice(0, limit)
    .map((entry) => entry.post);

  let result: Post[];
  if (scored.length >= limit) {
    result = scored;
  } else {
    const fallback = candidates.filter(
      (post) => !scored.some((existing) => existing._id === post._id)
    );
    result = [...scored, ...fallback.slice(0, limit - scored.length)].slice(0, limit);
  }

  return result;
}

/**
 * Newer/older neighbors around `target` for prev/next navigation.
 * Memoized by the content adapter's module-level cache.
 */
export async function getPostNeighbors(target: Post): Promise<{
  newer?: Post;
  older?: Post;
}> {
  const posts = await getAllPostsSorted(target.locale);

  const index = posts.findIndex((post) => post._id === target._id);
  if (index === -1) return {};

  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index < posts.length - 1 ? posts[index + 1] : undefined
  };
}
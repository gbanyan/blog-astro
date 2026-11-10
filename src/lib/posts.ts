import { getPosts } from './content';
import type { ContentDocument, ContentLocale, Post } from './content';

function publishedTime(document: Pick<ContentDocument, 'published_at'>): number {
  return document.published_at ? new Date(document.published_at).getTime() : 0;
}

/** Newest-first copy of `documents` by `published_at` (undated last). */
export function newestFirst<T extends Pick<ContentDocument, 'published_at'>>(
  documents: readonly T[]
): T[] {
  return [...documents].sort((a, b) => publishedTime(b) - publishedTime(a));
}

/** Every post of `locale`, newest-first. */
export async function getAllPostsSorted(locale: ContentLocale): Promise<Post[]> {
  return newestFirst(await getPosts(locale));
}

/**
 * Posts related to `target` by shared tags, newest-first.
 */
export async function getRelatedPosts(target: Post, limit = 3): Promise<Post[]> {
  const posts = await getAllPostsSorted(target.locale);

  const targetTags = new Set(target.tags?.map((tag) => tag.toLowerCase()) ?? []);
  const candidates = posts.filter((post) => post.sourcePath !== target.sourcePath);

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
      if (b.score === a.score) return publishedTime(b.post) - publishedTime(a.post);
      return b.score - a.score;
    })
    .slice(0, limit)
    .map((entry) => entry.post);

  let result: Post[];
  if (scored.length >= limit) {
    result = scored;
  } else {
    const fallback = candidates.filter(
      (post) => !scored.some((existing) => existing.sourcePath === post.sourcePath)
    );
    result = [...scored, ...fallback.slice(0, limit - scored.length)].slice(0, limit);
  }

  return result;
}

/**
 * Newer/older neighbors around `target` for prev/next navigation.
 */
export async function getPostNeighbors(target: Post): Promise<{
  newer?: Post;
  older?: Post;
}> {
  const posts = await getAllPostsSorted(target.locale);

  const index = posts.findIndex((post) => post.sourcePath === target.sourcePath);
  if (index === -1) return {};

  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index < posts.length - 1 ? posts[index + 1] : undefined
  };
}

/**
 * `getStaticPaths` for the document and tag routes, shared by each route's
 * zh-TW (unprefixed) and `/en` stub so both locales enumerate their pages the
 * same way.
 */
import { getPages, getPosts } from './content';
import type { ContentLocale } from './content';
import { getTagSlug } from './tags';

/** `/blog/[slug]`: one path per post of `locale`. */
export async function postStaticPaths(locale: ContentLocale) {
  return (await getPosts(locale)).map((post) => ({
    params: { slug: post.slug || post.flattenedPath },
  }));
}

/** `/pages/[slug]`: one path per page of `locale`. */
export async function pageStaticPaths(locale: ContentLocale) {
  return (await getPages(locale)).map((page) => ({
    params: { slug: page.slug || page.flattenedPath },
  }));
}

/** `/tags/[tag]`: one path per distinct tag slug among the posts of `locale`. */
export async function tagStaticPaths(locale: ContentLocale) {
  const slugs = new Set(
    (await getPosts(locale)).flatMap((post) => (post.tags ?? []).map(getTagSlug))
  );
  return [...slugs].map((tag) => ({ params: { tag } }));
}

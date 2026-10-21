import type { ContentLocale, Post } from './content';
import { estimateReadingMinutes } from './reading-time';

/** Pre-optimized list thumbnail (build-time WebP srcset, or the original). */
export interface PostListThumbnail {
  src: string;
  srcset?: string;
  width: number;
  height: number;
}

/**
 * `sizes` for list thumbnails: a 96px (mobile) / 160px-wide (≥640px) box with
 * `object-cover` over a 4:3 crop renders ~128px / ~200px of image width.
 */
export const POST_THUMBNAIL_SIZES = '(min-width: 640px) 200px, 128px';

/**
 * Slim, serializable projection of a `Post` carrying only what the post list
 * UI (`PostListItem` / `PostListWithControls`) reads. Island props are
 * serialized into the page HTML, so the full `Post` (rendered HTML + raw
 * markdown) must never be passed to the list island.
 */
export interface PostListEntry {
  id: string;
  url: string;
  title: string;
  locale: ContentLocale;
  description?: string;
  customExcerpt?: string;
  /** First 120 chars of the raw body, only when no description/custom excerpt. */
  bodyExcerpt?: string;
  /** ISO 8601 timestamp. */
  publishedAt?: string;
  tags: string[];
  readingMinutes: number;
  thumbnail?: PostListThumbnail;
}

/** Public `/assets/...` URL of a post's local feature image, if any. */
export function postCoverSrc(post: Pick<Post, 'feature_image'>): string | undefined {
  return post.feature_image && post.feature_image.startsWith('../assets')
    ? post.feature_image.replace('../assets', '/assets')
    : undefined;
}

function toIsoString(value: Post['published_at']): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function toPostListEntry(post: Post, thumbnail?: PostListThumbnail): PostListEntry {
  const raw = post.body?.raw ?? '';
  const entry: PostListEntry = {
    id: post._id,
    url: post.url,
    title: post.title,
    locale: post.locale,
    tags: post.tags ?? [],
    readingMinutes: estimateReadingMinutes(raw),
  };
  if (post.description) entry.description = post.description;
  if (post.custom_excerpt) entry.customExcerpt = post.custom_excerpt;
  if (!post.description && !post.custom_excerpt && raw) {
    entry.bodyExcerpt = raw.slice(0, 120);
  }
  const publishedAt = toIsoString(post.published_at);
  if (publishedAt) entry.publishedAt = publishedAt;
  if (thumbnail) entry.thumbnail = thumbnail;
  return entry;
}

/** Text shown under the title (same precedence as the original list item). */
export function postListExcerpt(entry: PostListEntry): string | undefined {
  return entry.description || entry.customExcerpt || entry.bodyExcerpt;
}

/** Client-side search: title, description, custom excerpt, and tags. */
export function matchesPostQuery(entry: PostListEntry, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const haystack = [entry.title, entry.description, entry.customExcerpt, entry.tags.join(' ')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(normalizedQuery);
}

export type PostSortOrder = 'new' | 'old';

export function sortPostEntries(entries: PostListEntry[], order: PostSortOrder): PostListEntry[] {
  const time = (entry: PostListEntry) =>
    entry.publishedAt ? new Date(entry.publishedAt).getTime() : 0;
  return [...entries].sort((a, b) =>
    order === 'new' ? time(b) - time(a) : time(a) - time(b)
  );
}

export interface PostListUrlState {
  q: string;
  page: number;
  sort: PostSortOrder;
}

/** Read list state from a query string; invalid values fall back to defaults. */
export function readPostListUrlState(search: string): PostListUrlState {
  const params = new URLSearchParams(search);
  const pageParam = Number.parseInt(params.get('page') ?? '', 10);
  return {
    q: params.get('q') ?? '',
    page: Number.isFinite(pageParam) && pageParam > 1 ? pageParam : 1,
    sort: params.get('sort') === 'old' ? 'old' : 'new',
  };
}

/**
 * Write list state into a URL's query string, omitting defaults so the
 * canonical `/blog` URL stays clean. Unrelated params and the hash survive.
 */
export function writePostListUrlState(href: string, state: PostListUrlState): string {
  const url = new URL(href);
  const set = (key: string, value: string | undefined) => {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  };
  set('q', state.q.trim() ? state.q : undefined);
  set('sort', state.sort === 'old' ? 'old' : undefined);
  set('page', state.page > 1 ? String(state.page) : undefined);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Compact page list: first, last, and current ±1, with `null` marking gaps.
 * Keeps 44px touch targets from overflowing narrow screens.
 */
export function paginationItems(current: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const items: Array<number | null> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(p - sorted[i - 1] === 2 ? p - 1 : null);
    items.push(p);
  });
  return items;
}

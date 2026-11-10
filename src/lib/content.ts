import { DEFAULT_LOCALE, localizedPath, normalizeLocale } from './locales.ts';
import type { Locale } from './locales.ts';

/**
 * The content module: the single owner of how markdown documents become
 * site records, which of them are public, and how translations pair up.
 *
 * Interface:
 * - Async queries (`getPosts`, `getPages`, `getAllPosts`, `getAllPages`,
 *   `getAllDocuments`, `findPost`, `findPage`, `getContentEntry`) — loading is hidden inside;
 *   callers never prime a cache first.
 * - Pure predicates over a record (`isPublished`, `isIndexable`).
 * - Pure pairing over a record list (`translationsOf`).
 *
 * In the Astro runtime the data comes from `getCollection` (Astro's content
 * layer); under plain `node` (the build-gate scripts) and Vitest it falls
 * back to reading `content/` with gray-matter, producing entries with the same
 * shape as the glob loader.
 */

/**
 * Dates retain the value emitted by the content layer (Astro's zod
 * `z.coerce.date()` in the Astro runtime, gray-matter + coercion in the
 * plain-Node fallback).
 */
export type ContentDate = Date | string;
export { DEFAULT_LOCALE };
export type ContentLocale = Locale;
export type Collection = 'posts' | 'pages';

/** Frontmatter as emitted by the content layer (schema-validated data). */
interface ContentData {
  title: string;
  locale?: string;
  translation_id?: string;
  slug?: string;
  translation_key?: string;
  translation_status?: 'source' | 'placeholder' | 'translated';
  is_placeholder?: boolean;
  description?: string;
  type?: string;
  ghost_id?: string;
  status?: string;
  visibility?: string;
  featured?: boolean;
  created_at?: ContentDate;
  updated_at?: ContentDate;
  published_at?: ContentDate;
  custom_excerpt?: string;
  authors?: string[];
  feature_image?: string;
  tags?: string[];
  nav_category?: string;
  nav_label?: string;
  hero?: string;
  icon?: string;
  layout?: string;
}

interface DocumentFields {
  collection: Collection;
  title: string;
  locale: ContentLocale;
  /**
   * Stable key shared by a document and its translations: the explicit
   * `translation_id` (or legacy `translation_key`) frontmatter, else derived
   * from the source path with any `en/` segment removed.
   */
  translationId: string;
  /** Placeholder translations are browsable but never indexed. */
  isPlaceholder: boolean;
  /** Source-relative path without extension, e.g. `posts/en/my-post`. Unique per document. */
  sourcePath: string;
  /** Collection-relative path without extension, e.g. `en/my-post`. Equals the content-layer entry id. */
  flattenedPath: string;
  /** Site-relative, locale-prefixed route, e.g. `/en/blog/my-post`. */
  url: string;
  body: { raw: string; html: string };
  slug?: string;
  translation_status?: 'source' | 'placeholder' | 'translated';
  description?: string;
  status?: string;
  visibility?: string;
  featured?: boolean;
  created_at?: ContentDate;
  updated_at?: ContentDate;
  published_at?: ContentDate;
  custom_excerpt?: string;
  authors?: string[];
  feature_image?: string;
  tags?: string[];
}

export interface Post extends DocumentFields {
  collection: 'posts';
}

export interface Page extends DocumentFields {
  collection: 'pages';
  nav_category?: string;
  nav_label?: string;
  hero?: string;
  icon?: string;
  /** `device` opts the page into the wide content column. */
  layout?: string;
}

export type ContentDocument = Post | Page;

/**
 * Raw content-layer entry: an Astro `getCollection` record, or the plain-Node
 * fallback that mirrors it (`id` is the path relative to the collection base
 * without the extension, `body` is the raw markdown, `data` is the
 * schema-validated frontmatter).
 */
export interface RawEntry {
  id: string;
  body?: string;
  data: ContentData;
  filePath?: string;
  rendered?: { html?: string };
}

function derivedTranslationId(collection: Collection, entryId: string): string {
  const segments = entryId.split('/');
  const stablePath = segments[0] === 'en' ? segments.slice(1).join('/') : entryId;
  return `${collection}/${stablePath}`;
}

/** Turn one content-layer entry into a site record. Exported for tests. */
export function adaptDocument(entry: RawEntry, collection: 'posts'): Post;
export function adaptDocument(entry: RawEntry, collection: 'pages'): Page;
export function adaptDocument(entry: RawEntry, collection: Collection): ContentDocument;
export function adaptDocument(entry: RawEntry, collection: Collection): ContentDocument {
  const { data } = entry;
  const locale = data.locale ? normalizeLocale(data.locale) : DEFAULT_LOCALE;
  if (!locale) {
    throw new Error(`Unsupported locale "${data.locale}" in ${collection}/${entry.id}`);
  }
  const translationStatus =
    data.translation_status ?? (locale === DEFAULT_LOCALE ? 'source' : 'placeholder');
  const routeBase = collection === 'posts' ? '/blog' : '/pages';

  /* eslint-disable @typescript-eslint/no-unused-vars -- strip aliases from the record */
  const { translation_key, translation_id, is_placeholder, type, ghost_id, ...frontmatter } =
    data;
  /* eslint-enable @typescript-eslint/no-unused-vars */

  return {
    ...frontmatter,
    collection,
    locale,
    translationId:
      data.translation_id ?? data.translation_key ?? derivedTranslationId(collection, entry.id),
    // Either signal marks a placeholder; `is_placeholder: false` cannot
    // override an explicit `translation_status: placeholder`.
    isPlaceholder: data.is_placeholder === true || translationStatus === 'placeholder',
    sourcePath: `${collection}/${entry.id}`,
    flattenedPath: entry.id,
    url: localizedPath(`${routeBase}/${data.slug || entry.id}`, locale),
    body: { raw: entry.body ?? '', html: entry.rendered?.html ?? '' },
  } as ContentDocument;
}

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

const HIDDEN_STATUSES = ['draft', 'private', 'unpublished', 'scheduled'];
const HIDDEN_VISIBILITIES = ['private', 'members', 'hidden', 'unlisted'];

/** Public (legacy content predates the status field; an absent status is published). */
export function isPublished(document: ContentDocument): boolean {
  return (
    !HIDDEN_STATUSES.includes(document.status?.toLowerCase() ?? '') &&
    !HIDDEN_VISIBILITIES.includes(document.visibility?.toLowerCase() ?? '')
  );
}

/** Public and not a placeholder: eligible for sitemaps, feeds, llms.txt and indexing. */
export function isIndexable(document: ContentDocument): boolean {
  return isPublished(document) && !document.isPlaceholder;
}

// ---------------------------------------------------------------------------
// Translation pairing
// ---------------------------------------------------------------------------

export type Visibility = 'any' | 'published' | 'indexable';

const VISIBILITY_FILTERS: Record<Visibility, (document: ContentDocument) => boolean> = {
  any: () => true,
  published: isPublished,
  indexable: isIndexable,
};

/**
 * Every document in `documents` that is `document` or one of its
 * translations (same collection, same `translationId`) and passes
 * `visibility`, keyed by locale. The first match per locale wins.
 * `document` itself is only included when it passes the filter.
 */
export function translationsOf<T extends ContentDocument>(
  document: ContentDocument,
  documents: readonly T[],
  visibility: Visibility = 'any'
): Map<ContentLocale, T> {
  const keep = VISIBILITY_FILTERS[visibility];
  const result = new Map<ContentLocale, T>();
  for (const candidate of documents) {
    if (
      candidate.collection !== document.collection ||
      candidate.translationId !== document.translationId ||
      result.has(candidate.locale) ||
      !keep(candidate)
    ) {
      continue;
    }
    result.set(candidate.locale, candidate);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

interface ContentBundle {
  posts: Post[];
  pages: Page[];
}

let contentPromise: Promise<ContentBundle> | null = null;

/** Load both collections once per process. */
export function loadContent(): Promise<ContentBundle> {
  if (!contentPromise) {
    contentPromise = loadAllContent().catch((error) => {
      contentPromise = null;
      throw error;
    });
  }
  return contentPromise;
}

async function loadAllContent(): Promise<ContentBundle> {
  const [postEntries, pageEntries] = await Promise.all([
    loadRawEntries('posts'),
    loadRawEntries('pages'),
  ]);
  return {
    posts: postEntries.map((entry) => adaptDocument(entry, 'posts')),
    pages: pageEntries.map((entry) => adaptDocument(entry, 'pages')),
  };
}

/** Posts of every locale, in content-layer order. */
export async function getAllPosts(): Promise<Post[]> {
  return (await loadContent()).posts;
}

/** Pages of every locale, in content-layer order. */
export async function getAllPages(): Promise<Page[]> {
  return (await loadContent()).pages;
}

/** Posts then pages, of every locale. */
export async function getAllDocuments(): Promise<ContentDocument[]> {
  const { posts, pages } = await loadContent();
  return [...posts, ...pages];
}

export async function getPosts(locale: ContentLocale): Promise<Post[]> {
  return (await getAllPosts()).filter((post) => post.locale === locale);
}

export async function getPages(locale: ContentLocale): Promise<Page[]> {
  return (await getAllPages()).filter((page) => page.locale === locale);
}

/** The post routed at `/blog/<slug>` (slug or collection-relative path) in `locale`. */
export async function findPost(slug: string, locale: ContentLocale): Promise<Post | undefined> {
  return (await getPosts(locale)).find((post) => (post.slug || post.flattenedPath) === slug);
}

/** The page routed at `/pages/<slug>` in `locale`. */
export async function findPage(slug: string, locale: ContentLocale): Promise<Page | undefined> {
  return (await getPages(locale)).find((page) => (page.slug || page.flattenedPath) === slug);
}

/**
 * The Astro content-layer entry behind a record, for `render()`. Only
 * available in the Astro runtime.
 */
export async function getContentEntry(document: ContentDocument) {
  const { getEntry } = await import('astro:content');
  const entry = await getEntry(document.collection, document.flattenedPath);
  if (!entry) throw new Error(`No content entry for ${document.sourcePath}`);
  return entry;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

async function loadRawEntries(collection: Collection): Promise<RawEntry[]> {
  const astroContent = await resolveAstroContent();
  return astroContent
    ? await astroContent.getCollection(collection)
    : await loadEntriesFromFiles(collection);
}

type AstroContentModule = {
  getCollection: (collection: Collection) => Promise<RawEntry[]>;
};

let astroContent: AstroContentModule | null | undefined;

async function resolveAstroContent(): Promise<AstroContentModule | null> {
  if (astroContent !== undefined) return astroContent;
  try {
    // `astro:content` is a Vite virtual module that only exists inside the
    // Astro runtime; a static import would break plain-Node consumers (the
    // build-gate scripts, Vitest) at module-load time.
    const mod = await import('astro:content');
    astroContent = typeof mod.getCollection === 'function' ? mod : null;
  } catch {
    astroContent = null;
  }
  return astroContent;
}

const DATE_FIELDS = ['created_at', 'updated_at', 'published_at'] as const;

/** Mirror the content schema's `z.coerce.date()` for plain-Node data. */
function coerceDates(data: ContentData): ContentData {
  for (const field of DATE_FIELDS) {
    if (typeof data[field] === 'string') data[field] = new Date(data[field]);
  }
  return data;
}

type MatterFunction = (input: string) => {
  data: ContentData;
  content: string;
};

async function loadEntriesFromFiles(collection: Collection): Promise<RawEntry[]> {
  // Node builtins: unavailable in the browser and in the Astro client
  // bundle, so they cannot be static imports.
  const { promises: fsp } = await import('node:fs');
  const { default: path } = await import('node:path');
  // gray-matter is CJS; its ESM namespace shape differs between the Node
  // loader and Vite's SSR pre-bundling, so tolerate both interop forms.
  const matterModule = await import('gray-matter');
  const matter =
    (matterModule as unknown as { default?: MatterFunction }).default ??
    (matterModule as unknown as MatterFunction);

  const base = path.join(process.cwd(), 'content', collection);
  const files = (await fsp.readdir(base, { recursive: true, encoding: 'utf8' }))
    .map((file) => file.replace(/\\/g, '/'))
    .filter((file) => file.endsWith('.md'))
    .sort();

  const entries: RawEntry[] = [];
  for (const file of files) {
    const filePath = path.join(base, file);
    let text = await fsp.readFile(filePath, 'utf8');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const { data, content } = matter(text);
    entries.push({
      id: file.replace(/\.md$/, ''),
      body: content,
      data: coerceDates(data),
      filePath,
    });
  }
  return entries;
}

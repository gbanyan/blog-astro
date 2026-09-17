import { DEFAULT_LOCALE, localizedPath } from './locales.ts';
import type { Locale } from './locales.ts';

/**
 * The stable shape consumed by the application. Dates retain the value
 * emitted by the content layer (Astro's zod `z.coerce.date()` in the Astro
 * runtime, gray-matter in the plain-Node fallback) instead of being
 * normalized to a new value.
 */
export type ContentDate = Date | string;
export { DEFAULT_LOCALE };
export type ContentLocale = Locale;

export interface RawDocumentData {
  sourceFilePath: string;
  sourceFileName: string;
  sourceFileDir: string;
  contentType: 'markdown';
  flattenedPath: string;
}

export interface MarkdownBody {
  raw: string;
  html: string;
  /** Compatibility alias for consumers that read a compiled body as code. */
  code: string;
}

interface SharedContentFields {
  title: string;
  locale: ContentLocale;
  /** Stable key shared by the source document and its translations. */
  translationId: string;
  /** Public camelCase alias used by locale-aware consumers. */
  translationKey: string;
  /** Deterministic pairing metadata for switchers and SEO. */
  pairing: { key: string; locale: ContentLocale };
  /** Original frontmatter field, retained for data consumers. */
  translation_id?: string;
  slug?: string;
  translation_key?: string;
  translation_status?: 'source' | 'placeholder' | 'translated';
  is_placeholder?: boolean;
  /** Derived, explicit SEO status for the bilingual placeholder phase. */
  translationStatus: 'source' | 'placeholder' | 'translated';
  isPlaceholder: boolean;
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
  /** Source-relative path, e.g. `posts/en/my-post` (extension stripped). */
  sourcePath: string;
  /** Raw markdown body with frontmatter stripped. */
  raw: string;
  body: MarkdownBody;
  _id: string;
  _raw: RawDocumentData;
  flattenedPath: string;
  url: string;
}

export interface Post extends SharedContentFields {
  __ignoredType: 'Post';
}

export interface Page extends SharedContentFields {
  __ignoredType: 'Page';
  layout?: string;
  nav_category?: string;
  nav_label?: string;
  hero?: string;
  icon?: string;
}

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
  layout?: string;
  nav_category?: string;
  nav_label?: string;
  hero?: string;
  icon?: string;
}

/**
 * Raw content-layer entry: an Astro `getCollection` record, or the plain-Node
 * fallback that mirrors it (same field contract as `src/content.config.ts`'s
 * glob loader: `id` is the path relative to the collection base without the
 * extension, `body` is the raw markdown, `data` is the schema-validated
 * frontmatter).
 */
interface RawEntry {
  id: string;
  body?: string;
  data: ContentData;
  filePath?: string;
  rendered?: { html?: string };
}

function removeCollectionPrefix(sourcePath: string, collection: 'posts' | 'pages') {
  const prefix = `${collection}/`;
  return sourcePath.startsWith(prefix) ? sourcePath.slice(prefix.length) : sourcePath;
}

function sourceFileDir(path: string) {
  const separator = path.lastIndexOf('/');
  return separator === -1 ? '' : path.slice(0, separator);
}

function translationId(
  sourcePath: string,
  collection: 'posts' | 'pages',
  explicitId?: string
) {
  if (explicitId) return explicitId;

  const relativePath = removeCollectionPrefix(sourcePath, collection);
  const segments = relativePath.split('/');
  const localeSegment = segments[0];
  const stablePath = localeSegment === 'en' ? segments.slice(1).join('/') : relativePath;
  return `${collection}/${stablePath}`;
}

function adaptDocument(document: RawEntry, collection: 'posts'): Post;
function adaptDocument(document: RawEntry, collection: 'pages'): Page;
function adaptDocument(document: RawEntry, collection: 'posts' | 'pages'): Post | Page {
  // Velite emitted `sourcePath` relative to the content root without the
  // extension (e.g. `posts/en/my-post`); the glob loader's id is relative to
  // the collection base, so `collection/id` reproduces that contract.
  const contentPath = `${collection}/${document.id}`;
  const flattenedPath = removeCollectionPrefix(contentPath, collection);
  const filePath = `${contentPath}.md`;
  const rawBody = document.body ?? '';
  const htmlBody = document.rendered?.html ?? '';
  const data = document.data;
  const stableTranslationId = translationId(
    contentPath,
    collection,
    data.translation_id ?? data.translation_key
  );

  const locale = (data.locale ?? DEFAULT_LOCALE) as ContentLocale;
  const translationStatus =
    data.translation_status ?? (locale === 'en' ? 'placeholder' : 'source');
  const isPlaceholder = data.is_placeholder ?? translationStatus === 'placeholder';
  const adapted = {
    ...data,
    locale,
    translationStatus,
    isPlaceholder,
    translationId: stableTranslationId,
    translationKey: stableTranslationId,
    pairing: { key: stableTranslationId, locale },
    sourcePath: contentPath,
    raw: rawBody,
    body: {
      raw: rawBody,
      html: htmlBody,
      code: htmlBody
    },
    _id: filePath,
    _raw: {
      sourceFilePath: filePath,
      sourceFileName: filePath.slice(filePath.lastIndexOf('/') + 1),
      sourceFileDir: sourceFileDir(filePath),
      contentType: 'markdown' as const,
      flattenedPath: contentPath
    },
    __ignoredType: collection === 'posts' ? ('Post' as const) : ('Page' as const),
    flattenedPath,
    url: localizedPath(
      `/${collection === 'posts' ? 'blog' : 'pages'}/${data.slug || flattenedPath}`,
      locale
    )
  };

  return adapted as unknown as Post | Page;
}

/**
 * Module-level content cache, primed by {@link loadContent}. The arrays stay
 * mutable so consumers that hold them (and tests that swap the module)
 * observe the same references the source Velite-based adapter exposed.
 */
export const allPostsByLocale: Post[] = [];
export const allPagesByLocale: Page[] = [];

/** Existing exports remain the default Chinese content for route compatibility. */
export const allPosts: Post[] = [];
export const allPages: Page[] = [];

export interface ContentBundle {
  posts: Post[];
  pages: Page[];
}

let contentPromise: Promise<ContentBundle> | null = null;

/**
 * Load both collections once per process and adapt them through
 * {@link adaptDocument}. In the Astro runtime the data comes from
 * `getCollection` (Astro's content layer); under plain `node` (the i18n
 * verification scripts) it falls back to reading the `content/` markdown
 * files directly with gray-matter, producing entries with the same shape as
 * the glob loader.
 */
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
  const [posts, pages] = await Promise.all([loadPosts(), loadPages()]);

  allPostsByLocale.length = 0;
  allPostsByLocale.push(...posts);
  allPagesByLocale.length = 0;
  allPagesByLocale.push(...pages);
  allPosts.length = 0;
  allPosts.push(...posts.filter((post) => post.locale === DEFAULT_LOCALE));
  allPages.length = 0;
  allPages.push(...pages.filter((page) => page.locale === DEFAULT_LOCALE));

  return { posts, pages };
}

async function loadPosts(): Promise<Post[]> {
  const entries = await loadRawEntries('posts');
  return entries.map((entry) => adaptDocument(entry, 'posts'));
}

async function loadPages(): Promise<Page[]> {
  const entries = await loadRawEntries('pages');
  return entries.map((entry) => adaptDocument(entry, 'pages'));
}

async function loadRawEntries(collection: 'posts' | 'pages'): Promise<RawEntry[]> {
  const astroContent = await resolveAstroContent();
  return astroContent
    ? await astroContent.getCollection(collection)
    : await loadEntriesFromFiles(collection);
}

type AstroContentModule = {
  getCollection: (collection: 'posts' | 'pages') => Promise<RawEntry[]>;
};

let astroContent: AstroContentModule | null | undefined;

async function resolveAstroContent(): Promise<AstroContentModule | null> {
  if (astroContent !== undefined) return astroContent;
  try {
    // `astro:content` is a Vite virtual module that only exists inside the
    // Astro runtime; a static import would break plain-Node consumers (the
    // i18n verification scripts) at module-load time.
    const mod = await import('astro:content');
    astroContent = typeof mod.getCollection === 'function' ? mod : null;
  } catch {
    // Plain-Node context (verification scripts): fall back to file reads.
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

async function loadEntriesFromFiles(collection: 'posts' | 'pages'): Promise<RawEntry[]> {
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
    .filter((file) => file.endsWith('.md'));

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
      filePath
    });
  }
  return entries;
}

export function getPostsByLocale(locale: ContentLocale = DEFAULT_LOCALE): Post[] {
  return allPostsByLocale.filter((post) => post.locale === locale);
}

export function getPagesByLocale(locale: ContentLocale = DEFAULT_LOCALE): Page[] {
  return allPagesByLocale.filter((page) => page.locale === locale);
}

export interface TranslationPair<T extends Post | Page> {
  source: T;
  translation?: T;
}

export function getTranslationPair<T extends Post | Page>(
  document: T,
  documents: readonly T[]
): TranslationPair<T> {
  const source = documents.find(
    (candidate) =>
      candidate.translationId === document.translationId && candidate.locale === DEFAULT_LOCALE
  );
  const translation = documents.find(
    (candidate) =>
      candidate.translationId === document.translationId && candidate.locale !== DEFAULT_LOCALE
  );

  return { source: source ?? document, translation };
}

export function getPostTranslationPair(post: Post): TranslationPair<Post> {
  return getTranslationPair(post, allPostsByLocale);
}

export function getPageTranslationPair(page: Page): TranslationPair<Page> {
  return getTranslationPair(page, allPagesByLocale);
}
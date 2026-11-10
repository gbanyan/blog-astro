import { isIndexable, translationsOf } from './content';
import type { ContentDocument } from './content';
import { contentAssetSize } from './content-assets';
import {
  absoluteUrl,
  DEFAULT_LOCALE,
  documentPath,
  localizedPath,
  localeToOpenGraph,
  SUPPORTED_LOCALES,
  type Locale,
} from './locales';
import { siteConfig } from './config';
import { getDictionary } from './i18n/dictionaries';
import { defaultOgImage, documentOgUrl, socialImageUrl } from './og';
import { tagPath } from './tags';
import { escapeXml } from './xml';

export type { ContentDocument };


/**
 * Framework-neutral head model consumed by the Astro `astro:content`-free
 * head helpers: everything a document page needs for `<title>`, description,
 * canonical/hreflang links, robots, Open Graph, and Twitter cards.
 */
export interface HeadModel {
  title: string;
  /** Render <title> without the "| <site>" template suffix (home pages). */
  titleAbsolute?: boolean;
  description?: string;
  canonical: string;
  alternates: { locale: string; href: string }[]; // hreflang pairs incl. x-default
  robots?: { index: boolean; follow: boolean };
  /** Extra `<meta name="googlebot">` content (Next page-level `googleBot` mirror). */
  googlebot?: string;
  openGraph: {
    title?: string;
    description?: string;
    url: string;
    siteName: string;
    locale: string;
    /** Serialized as `og:type`; defaults to `website` (source root layout constant). */
    type?: 'website' | 'article';
    /** Serialized as `article:published_time`. */
    publishedTime?: string;
    /** Serialized as one `article:author` meta each. */
    authors?: string[];
    /** Serialized as one `article:tag` meta each. */
    tags?: string[];
    images: { url: string; alt?: string; width?: number; height?: number }[];
  };
  twitter: {
    card: string;
    title?: string;
    description?: string;
    images: string[];
  };
}

/** Structural stand-in for Next's `MetadataRoute.Sitemap` record. */
export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  priority?: number;
  alternates?: { languages: Record<string, string> };
}

type LocalizedMetadataOptions = {
  title: string;
  description?: string;
  path: string;
  locale?: Locale;
  openGraph?: Partial<HeadModel['openGraph']>;
  twitter?: HeadModel['twitter'];
};

/** Absolute URL of `document` in its own locale. */
function documentUrl(document: ContentDocument): string {
  return absoluteUrl(documentPath(document));
}

/**
 * hreflang map for a document page: itself plus every published
 * translation, and `x-default` pointing at the default-locale version (or
 * itself when it is the default-locale version).
 */
function documentAlternates(
  document: ContentDocument,
  documents: readonly ContentDocument[]
): Record<string, string> {
  const alternates: Record<string, string> = { [document.locale]: documentUrl(document) };
  const translations = translationsOf(document, documents, 'published');
  for (const [locale, candidate] of translations) alternates[locale] = documentUrl(candidate);

  const defaultDocument = translations.get(DEFAULT_LOCALE);
  if (defaultDocument) alternates['x-default'] = documentUrl(defaultDocument);
  else if (document.locale === DEFAULT_LOCALE) alternates['x-default'] = documentUrl(document);
  return alternates;
}

/** Social card image: the feature image (with its intrinsic size when local), else the 1200×630 OG card. */
function documentImage(document: ContentDocument): HeadModel['openGraph']['images'][number] {
  const featureUrl = socialImageUrl(document.feature_image);
  if (!featureUrl) {
    return { url: documentOgUrl(document), alt: document.title, width: 1200, height: 630 };
  }
  const size = document.feature_image ? contentAssetSize(document.feature_image) : undefined;
  return { url: featureUrl, alt: document.title, ...size };
}

/** One-line summary used for meta, Open Graph and Twitter descriptions alike. */
export function documentDescription(document: ContentDocument): string {
  return document.description || document.custom_excerpt || document.title;
}

function isoDate(value: ContentDocument['published_at']): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Complete head model for a post or page. `documents` is the record list to
 * find translations in (any superset of the document's collection works).
 * Posts additionally get `og:type=article` metadata and a googlebot hint.
 */
export function metadataForDocument(
  document: ContentDocument,
  documents: readonly ContentDocument[]
): HeadModel {
  const url = documentUrl(document);
  const description = documentDescription(document);
  const image = documentImage(document);
  const isPost = document.collection === 'posts';

  return {
    title: document.title,
    description,
    canonical: url,
    alternates: Object.entries(documentAlternates(document, documents)).map(
      ([locale, href]) => ({ locale, href })
    ),
    robots: { index: !document.isPlaceholder, follow: true },
    ...(isPost && { googlebot: document.isPlaceholder ? 'noindex, follow' : 'index, follow' }),
    openGraph: {
      title: document.title,
      description,
      url,
      siteName: getDictionary(document.locale).brand.title,
      locale: localeToOpenGraph(document.locale),
      images: [image],
      ...(isPost && {
        type: 'article' as const,
        publishedTime: isoDate(document.published_at),
        authors: document.authors?.length ? document.authors : [siteConfig.author],
        tags: document.tags,
      }),
    },
    twitter: {
      card: siteConfig.twitterCard,
      title: document.title,
      description,
      images: [image.url],
    },
  };
}

export type Section = 'home' | 'blog' | 'tags' | 'projects';

/** Head model for a section landing page (home, blog index, tags index, projects). */
export function metadataForSection(section: Section, locale: Locale): HeadModel {
  const dictionary = getDictionary(locale);
  const sections: Record<Section, { title: string; description: string; path: string }> = {
    home: {
      title: `${siteConfig.name} — ${dictionary.common.latestPosts}`,
      description: dictionary.brand.description,
      path: '/',
    },
    blog: {
      title: dictionary.common.allPosts,
      description: dictionary.common.allPostsDescription,
      path: '/blog',
    },
    tags: { title: dictionary.tags.title, description: dictionary.tags.description, path: '/tags' },
    projects: {
      title: dictionary.projects.title,
      description: dictionary.projects.description,
      path: '/projects',
    },
  };
  return metadataForPath({ ...sections[section], locale });
}

/** Head model for a tag archive page, titled with the original tag label. */
export function metadataForTag(tagLabel: string, locale: Locale): HeadModel {
  const title = `${getDictionary(locale).tags.title}: ${tagLabel}`;
  return metadataForPath({ title, description: title, path: tagPath(tagLabel), locale });
}

export function metadataForPath({
  title,
  description,
  path,
  locale = DEFAULT_LOCALE,
  openGraph,
  twitter,
}: LocalizedMetadataOptions): HeadModel {
  const url = absoluteUrl(localizedPath(path, locale));
  const languages: Record<string, string> = Object.fromEntries(
    SUPPORTED_LOCALES.map((candidate) => [
      candidate,
      absoluteUrl(localizedPath(path, candidate)),
    ])
  );
  languages['x-default'] = languages[DEFAULT_LOCALE];
  const defaultImage = absoluteUrl(defaultOgImage(locale));

  return {
    title,
    // Live-source behavior: the home page title is absolute (no suffix).
    titleAbsolute: path === '/' || path === '',
    description,
    canonical: url,
    alternates: Object.entries(languages).map(([candidateLocale, href]) => ({
      locale: candidateLocale,
      href
    })),
    openGraph: {
      title,
      description,
      url,
      siteName: getDictionary(locale).brand.title,
      locale: localeToOpenGraph(locale),
      images: [{ url: defaultImage, alt: title }],
      ...openGraph,
    },
    twitter: twitter ?? {
      card: siteConfig.twitterCard,
      title,
      description,
      images: [defaultImage],
    },
  };
}

/**
 * Absolute site logo for JSON-LD (Organization.logo / publisher.logo). The
 * avatar may already be an absolute URL (e.g. Gravatar); only site-relative
 * paths get the site origin. Returns null when no avatar is configured.
 */
export function siteLogoUrl(): string | null {
  const avatar = siteConfig.avatar;
  if (!avatar) return null;
  // URL resolution keeps absolute avatars intact and prefixes relative ones.
  return absoluteUrl(avatar);
}

function sitemapRecord(
  document: ContentDocument,
  documents: readonly ContentDocument[],
  changeFrequency: 'weekly' | 'monthly',
  priority: number
): SitemapEntry {
  const languages: Record<string, string> = {};
  for (const [locale, candidate] of translationsOf(document, documents, 'indexable')) {
    languages[locale] = documentUrl(candidate);
  }
  if (languages[DEFAULT_LOCALE]) languages['x-default'] = languages[DEFAULT_LOCALE];

  return {
    url: documentUrl(document),
    lastModified: new Date(
      document.updated_at || document.published_at || document.created_at || Date.now()
    ),
    changeFrequency,
    priority,
    alternates: { languages },
  };
}

/**
 * Sitemap entries for `locale` (or both locales): section pages, every
 * indexable post/page among `documents`, and tag archives.
 */
export function localizedSitemapEntries(
  documents: readonly ContentDocument[],
  locale?: Locale
): SitemapEntry[] {
  const indexable = documents.filter(isIndexable);
  const contentEntries = indexable
    .filter((document) => !locale || document.locale === locale)
    .map((document) =>
      document.collection === 'posts'
        ? sitemapRecord(document, indexable, 'weekly', 0.8)
        : sitemapRecord(document, indexable, 'monthly', 0.6)
    );

  const locales = locale ? [locale] : [...SUPPORTED_LOCALES];
  const staticEntries: SitemapEntry[] = locales.flatMap((candidate) =>
    (
      [
        ['/', 1, 'daily'],
        ['/blog', 0.9, 'daily'],
        ['/projects', 0.7, 'monthly'],
        ['/tags', 0.7, 'weekly'],
      ] as const
    ).map(([path, priority, changeFrequency]) =>
      staticSitemapRecord(path, candidate, priority, changeFrequency)
    )
  );

  const posts = documents.filter((document) => document.collection === 'posts');
  const tagEntries: SitemapEntry[] = locales.flatMap((candidate) =>
    Array.from(
      new Set(localeDocuments(posts, candidate).flatMap((post) => post.tags ?? []))
    ).map((tag) => staticSitemapRecord(tagPath(tag), candidate, 0.5, 'weekly'))
  );

  return [...staticEntries, ...contentEntries, ...tagEntries];
}

function staticSitemapRecord(
  path: string,
  locale: Locale,
  priority: number,
  changeFrequency: 'daily' | 'weekly' | 'monthly'
): SitemapEntry {
  const url = absoluteUrl(localizedPath(path, locale));
  const languages = Object.fromEntries(
    SUPPORTED_LOCALES.map((candidate) => [
      candidate,
      absoluteUrl(localizedPath(path, candidate)),
    ])
  );
  languages['x-default'] = languages[DEFAULT_LOCALE];
  return {
    url,
    changeFrequency,
    priority,
    alternates: {
      languages: {
        ...languages,
      },
    },
  };
}

export function localizedSitemapXml(
  documents: readonly ContentDocument[],
  locale: Locale
): string {
  const entries = localizedSitemapEntries(documents, locale);
  const urls = entries
    .map((entry) => {
      const alternates = entry.alternates?.languages
        ? Object.entries(entry.alternates.languages)
            .map(
              ([language, href]) =>
                `<xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(href || '')}"/>`
            )
            .join('')
        : '';
      return `<url><loc>${escapeXml(entry.url.toString())}</loc>${alternates}</url>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
}

/**
 * Serializes the combined (both-locale) sitemap the way the source root
 * `app/sitemap.ts` emits it through Next.js' file convention: one element
 * per line, space before the `xhtml:link` self-closing slash, `lastmod`
 * (ISO milliseconds) before `changefreq`/`priority`, trailing newline.
 */
export function rootSitemapXml(documents: readonly ContentDocument[]): string {
  const urls = localizedSitemapEntries(documents)
    .map((entry) => {
      const lines = [`<loc>${escapeXml(entry.url)}</loc>`];
      if (entry.alternates?.languages) {
        for (const [language, href] of Object.entries(entry.alternates.languages)) {
          lines.push(
            `<xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(href || '')}" />`
          );
        }
      }
      if (entry.lastModified) {
        lines.push(`<lastmod>${entry.lastModified.toISOString()}</lastmod>`);
      }
      lines.push(`<changefreq>${entry.changeFrequency}</changefreq>`);
      lines.push(`<priority>${entry.priority}</priority>`);
      return `<url>\n${lines.join('\n')}\n</url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

/** Indexable documents of `locale`. */
export function localeDocuments<T extends ContentDocument>(
  documents: readonly T[],
  locale: Locale
): T[] {
  return documents.filter((document) => isIndexable(document) && document.locale === locale);
}

/** `"<locale>: <absolute url>"` lines for a document's indexable translations (llms.txt). */
export function documentLanguageLinks(
  document: ContentDocument,
  documents: readonly ContentDocument[]
): string[] {
  return [...translationsOf(document, documents, 'indexable')]
    .filter(([, candidate]) => candidate.sourcePath !== document.sourcePath)
    .map(([locale, candidate]) => `${locale}: ${documentUrl(candidate)}`);
}

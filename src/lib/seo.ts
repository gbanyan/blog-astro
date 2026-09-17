import {
  allPagesByLocale,
  allPostsByLocale,
} from './content';
import type { Page, Post } from './content';
import {
  absoluteUrl,
  DEFAULT_LOCALE,
  documentPath,
  getDocumentLocale,
  getTranslationKey,
  isPlaceholderDocument,
  localizedPath,
  localeToOpenGraph,
  SUPPORTED_LOCALES,
  type Locale,
} from './locales';
import { siteConfig } from './config';
import { getTagSlug } from './tags';

export type ContentDocument = Post | Page;

/**
 * Framework-neutral head model consumed by the Astro `astro:content`-free
 * head helpers: everything a document page needs for `<title>`, description,
 * canonical/hreflang links, robots, Open Graph, and Twitter cards.
 */
export interface HeadModel {
  title: string;
  description?: string;
  canonical: string;
  alternates: { locale: string; href: string }[]; // hreflang pairs incl. x-default
  robots?: { index: boolean; follow: boolean };
  openGraph: {
    title?: string;
    description?: string;
    url: string;
    siteName: string;
    locale: string;
    images: { url: string; alt?: string }[];
  };
  twitter: {
    card: string;
    title?: string;
    description?: string;
    images: string[];
  };
  sitemap: ReturnType<typeof localizedSitemapEntries>;
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

function published(document: ContentDocument): boolean {
  // Legacy content predates the status field; an absent status is published.
  const status = document.status?.toLowerCase();
  const visibility = document.visibility?.toLowerCase();
  return (
    !['draft', 'private', 'unpublished', 'scheduled'].includes(status || '') &&
    !['private', 'members', 'hidden', 'unlisted'].includes(visibility || '')
  );
}

function indexable(document: ContentDocument): boolean {
  return published(document) && !isPlaceholderDocument(document);
}

function documentAlternates(
  document: ContentDocument,
  documents: ContentDocument[]
): Record<string, string> {
  const locale = getDocumentLocale(document);
  const key = getTranslationKey(document);
  const alternates: Record<string, string> = {
    [locale]: absoluteUrl(documentPath(document, locale)),
  };

  if (key) {
    for (const candidate of documents) {
      if (!published(candidate) || getTranslationKey(candidate) !== key) continue;
      const candidateLocale = getDocumentLocale(candidate);
      alternates[candidateLocale] = absoluteUrl(documentPath(candidate, candidateLocale));
    }
  }

  const defaultDocument = documents.find(
    (candidate) =>
      published(candidate) &&
      getTranslationKey(candidate) === key &&
      getDocumentLocale(candidate) === DEFAULT_LOCALE
  );

  if (locale === DEFAULT_LOCALE || (key && defaultDocument)) {
    alternates['x-default'] = absoluteUrl(
      defaultDocument ? documentPath(defaultDocument, DEFAULT_LOCALE) : documentPath(document, locale)
    );
  }

  return alternates;
}

export function metadataForDocument(
  document: ContentDocument,
  documents: ContentDocument[] = document.__ignoredType === 'Page'
    ? allPagesByLocale
    : allPostsByLocale
): HeadModel {
  const locale = getDocumentLocale(document);
  const url = absoluteUrl(documentPath(document, locale));
  const description = document.description || document.custom_excerpt || document.title;
  const languages = documentAlternates(document, documents);
  const image = document.feature_image
    ? {
        url: absoluteUrl(document.feature_image.replace('../assets', '/assets')),
        alt: document.title,
      }
    : {
        url: absoluteUrl(siteConfig.ogImage),
        alt: document.title,
      };

  return {
    title: document.title,
    description,
    canonical: url,
    alternates: Object.entries(languages).map(([candidateLocale, href]) => ({
      locale: candidateLocale,
      href
    })),
    openGraph: {
      title: document.title,
      description,
      url,
      siteName: siteConfig.name,
      locale: localeToOpenGraph(locale),
      images: [image],
    },
    twitter: {
      card: siteConfig.twitterCard,
      title: document.title,
      description,
      images: [image.url],
    },
    robots: isPlaceholderDocument(document)
      ? { index: false, follow: true }
      : { index: true, follow: true },
    sitemap: localizedSitemapEntries(locale),
  };
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

  return {
    title,
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
      siteName: siteConfig.name,
      locale: localeToOpenGraph(locale),
      images: [{ url: absoluteUrl(siteConfig.ogImage), alt: title }],
      ...openGraph,
    },
    twitter: twitter ?? {
      card: siteConfig.twitterCard,
      title,
      description,
      images: [siteConfig.ogImage],
    },
    sitemap: localizedSitemapEntries(locale),
  };
}

function alternateDocuments(
  document: ContentDocument,
  documents: ContentDocument[]
): ContentDocument[] {
  const key = getTranslationKey(document);
  if (!key) return [document];
  return documents.filter(
    (candidate) => indexable(candidate) && getTranslationKey(candidate) === key
  );
}

function sitemapRecord(
  document: ContentDocument,
  documents: ContentDocument[],
  changeFrequency: 'weekly' | 'monthly',
  priority: number
): SitemapEntry {
  const locale = getDocumentLocale(document);
  const paired = alternateDocuments(document, documents);
  const languages: Record<string, string> = {};

  for (const candidate of paired) {
    const candidateLocale = getDocumentLocale(candidate);
    languages[candidateLocale] = absoluteUrl(documentPath(candidate, candidateLocale));
  }

  if (languages[DEFAULT_LOCALE]) languages['x-default'] = languages[DEFAULT_LOCALE];

  return {
    url: absoluteUrl(documentPath(document, locale)),
    lastModified: new Date(
      document.updated_at || document.published_at || document.created_at || Date.now()
    ),
    changeFrequency,
    priority,
    alternates: { languages },
  };
}

export function localizedSitemapEntries(locale?: Locale): SitemapEntry[] {
  const documents = [...allPostsByLocale, ...allPagesByLocale].filter(indexable);
  const contentEntries = documents
    .filter((document) => !locale || getDocumentLocale(document) === locale)
    .map((document) =>
      sitemapRecord(
        document,
        documents,
        document.__ignoredType === 'Post' ? 'weekly' : 'monthly',
        document.__ignoredType === 'Post' ? 0.8 : 0.6
      )
    );

  const locales = locale ? [locale] : [...SUPPORTED_LOCALES];
  const staticEntries: SitemapEntry[] = locales.flatMap((candidate) =>
    [
      ['/', 1, 'daily'],
      ['/blog', 0.9, 'daily'],
      ['/projects', 0.7, 'monthly'],
      ['/tags', 0.7, 'weekly'],
    ].map(([path, priority, changeFrequency]) =>
      staticSitemapRecord(
        path as string,
        candidate,
        priority as number,
        changeFrequency as 'daily' | 'weekly' | 'monthly'
      )
    )
  );

  const tagEntries: SitemapEntry[] = locales.flatMap((candidate) =>
    Array.from(
      new Set(
        localeDocuments(allPostsByLocale, candidate)
          .filter((post) => post.tags)
          .flatMap((post) => post.tags || [])
      )
    ).map((tag) =>
      staticSitemapRecord(
        `/tags/${encodeURIComponent(getTagSlug(tag))}`,
        candidate,
        0.5,
        'weekly'
      )
    )
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

export function localizedSitemapXml(locale: Locale): string {
  const entries = localizedSitemapEntries(locale);
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function localeDocuments<T extends ContentDocument>(
  documents: T[],
  locale: Locale
): T[] {
  return documents.filter((document) => indexable(document) && getDocumentLocale(document) === locale);
}

export function documentLanguageLinks(
  document: ContentDocument,
  documents: ContentDocument[]
): string[] {
  const key = getTranslationKey(document);
  if (!key) return [];
  return alternateDocuments(document, documents)
    .filter((candidate) => candidate._id !== document._id)
    .map((candidate) => {
      const locale = getDocumentLocale(candidate);
      return `${locale}: ${absoluteUrl(documentPath(candidate, locale))}`;
    });
}

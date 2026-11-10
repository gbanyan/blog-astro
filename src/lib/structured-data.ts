/**
 * Schema.org JSON-LD for every page kind, fed by the same records and
 * helpers as the head model (`seo.ts`), so the description, image and URLs a
 * page advertises in structured data can't drift from its meta tags.
 *
 * Every builder returns a plain object; `json-ld.astro` serializes it.
 */
import type { Page, Post } from './content';
import { siteConfig } from './config';
import { getDictionary } from './i18n/dictionaries';
import { absoluteUrl, documentPath, localizedPath, type Locale } from './locales';
import { documentSocialImage } from './og';
import { countWords, estimateReadingMinutes } from './reading-time';
import { documentDescription, siteLogoUrl } from './seo';
import { tagPath, type TagCount } from './tags';

type JsonLd = Record<string, unknown>;

const CONTEXT = 'https://schema.org';

function sectionUrl(path: string, locale: Locale): string {
  return absoluteUrl(localizedPath(path, locale));
}

/** Compact BlogPosting summaries for list pages (first 10 posts). */
function blogPostSummaries(posts: readonly Post[]): JsonLd[] {
  return posts.slice(0, 10).map((post) => ({
    '@type': 'BlogPosting',
    headline: post.title,
    url: absoluteUrl(post.url),
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: { '@type': 'Person', name: siteConfig.author },
  }));
}

/** Site-wide WebSite + Organization nodes (root layout). */
export function siteSchemas(locale: Locale): JsonLd[] {
  const dictionary = getDictionary(locale);
  const logo = siteLogoUrl();
  return [
    {
      '@context': CONTEXT,
      '@type': 'WebSite',
      name: dictionary.brand.title,
      description: dictionary.brand.description,
      url: siteConfig.url,
      inLanguage: locale,
      author: { '@type': 'Person', name: siteConfig.author, url: siteConfig.url },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteConfig.url}${localizedPath('/blog', locale)}?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': CONTEXT,
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      ...(logo ? { logo } : {}),
      sameAs: [
        siteConfig.social.github,
        siteConfig.social.twitter &&
          `https://twitter.com/${siteConfig.social.twitter.replace('@', '')}`,
        siteConfig.social.mastodon,
      ].filter(Boolean),
    },
  ];
}

/** BlogPosting + BreadcrumbList for a post page. */
export function postSchemas(post: Post): JsonLd[] {
  const dictionary = getDictionary(post.locale);
  const postUrl = absoluteUrl(documentPath(post));
  const logoUrl = siteLogoUrl();
  const wordCount = countWords(post.body.raw);
  const readingMinutes = estimateReadingMinutes(post.body.raw);

  return [
    {
      '@context': CONTEXT,
      '@type': 'BlogPosting',
      headline: post.title,
      description: documentDescription(post),
      image: documentSocialImage(post),
      datePublished: post.published_at,
      dateModified: post.updated_at || post.published_at,
      author: {
        '@type': 'Person',
        name: post.authors?.[0] || siteConfig.author,
        url: siteConfig.url,
      },
      publisher: {
        '@type': 'Organization',
        name: siteConfig.name,
        ...(logoUrl ? { logo: { '@type': 'ImageObject', url: logoUrl } } : {}),
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': postUrl,
        // Speakable belongs to the page, not a top-level node (schema.org).
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['article[data-toc-content]', '.prose h2', '.prose h3', '.prose p'],
        },
      },
      ...(post.tags && post.tags.length > 0
        ? { keywords: post.tags.join(', '), articleSection: post.tags[0] }
        : {}),
      ...(wordCount > 0 ? { wordCount, readingTime: `${readingMinutes} min read` } : {}),
      url: postUrl,
      inLanguage: post.locale,
    },
    {
      '@context': CONTEXT,
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: dictionary.navigation.home,
          item: sectionUrl('/', post.locale),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: dictionary.common.allPosts,
          item: sectionUrl('/blog', post.locale),
        },
        { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
      ],
    },
  ];
}

/** WebPage node for a static content page. */
export function pageSchema(page: Page): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'WebPage',
    name: page.title,
    description: documentDescription(page),
    url: absoluteUrl(documentPath(page)),
    image: documentSocialImage(page),
    inLanguage: page.locale,
    isPartOf: {
      '@type': 'WebSite',
      name: getDictionary(page.locale).brand.title,
      url: siteConfig.url,
    },
    ...(page.published_at ? { datePublished: page.published_at } : {}),
    ...(page.updated_at ? { dateModified: page.updated_at } : {}),
  };
}

/** CollectionPage for the home page. */
export function homeSchema(locale: Locale): JsonLd {
  const dictionary = getDictionary(locale);
  const url = sectionUrl('/', locale);
  return {
    '@context': CONTEXT,
    '@type': 'CollectionPage',
    name: `${siteConfig.name} — ${dictionary.common.latestPosts}`,
    description: dictionary.brand.description,
    url,
    inLanguage: locale,
    isPartOf: { '@type': 'WebSite', name: dictionary.brand.title, url },
    about: {
      '@type': 'Blog',
      name: dictionary.brand.title,
      description: dictionary.brand.description,
    },
  };
}

/** Blog node for the blog index (`posts` newest-first). */
export function blogIndexSchema(locale: Locale, posts: readonly Post[]): JsonLd {
  const dictionary = getDictionary(locale);
  return {
    '@context': CONTEXT,
    '@type': 'Blog',
    name: dictionary.common.allPosts,
    description: dictionary.common.allPostsDescription,
    url: sectionUrl('/blog', locale),
    inLanguage: locale,
    blogPost: blogPostSummaries(posts),
  };
}

/** CollectionPage + ItemList for the tags index. */
export function tagsIndexSchema(locale: Locale, tags: readonly TagCount[]): JsonLd {
  const dictionary = getDictionary(locale);
  return {
    '@context': CONTEXT,
    '@type': 'CollectionPage',
    name: dictionary.tags.title,
    description: dictionary.tags.description,
    url: sectionUrl('/tags', locale),
    inLanguage: locale,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: tags.map((tag, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: tag.tag,
        url: sectionUrl(tagPath(tag.slug), locale),
        item: {
          '@type': 'Thing',
          name: tag.tag,
          description: dictionary.tags.count(tag.count),
        },
      })),
    },
  };
}

/** CollectionPage for one tag archive (`posts` in display order). */
export function tagSchema(locale: Locale, tagLabel: string, posts: readonly Post[]): JsonLd {
  const title = `${getDictionary(locale).tags.title}: ${tagLabel}`;
  return {
    '@context': CONTEXT,
    '@type': 'CollectionPage',
    name: title,
    description: title,
    url: sectionUrl(tagPath(tagLabel), locale),
    inLanguage: locale,
    about: { '@type': 'Thing', name: tagLabel },
    mainEntity: { '@type': 'Blog', blogPost: blogPostSummaries(posts) },
  };
}


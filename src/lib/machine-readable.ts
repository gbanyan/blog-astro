import { statSync } from 'node:fs';
import path from 'node:path';

import { allPagesByLocale, allPostsByLocale } from '@/lib/content';
import { siteConfig } from '@/lib/config';
import {
  absoluteUrl,
  documentPath,
  localeToRss,
  localizedEndpoint,
  type Locale,
} from '@/lib/locales';
import { documentLanguageLinks, localeDocuments } from '@/lib/seo';
import { getDictionary } from '@/lib/i18n/dictionaries';

/**
 * Enclosure tag for the post's feature image, if any. Reads the mirrored
 * asset's size for the length field; missing/unknown files fall back to
 * length 0 (strictly invalid, but tolerated by most feed readers).
 */
function enclosureFor(featureImage?: string): string {
  if (!featureImage) return '';
  const publicRel = featureImage.replace('../assets', 'assets');
  let length = 0;
  try {
    length = statSync(path.join(process.cwd(), 'public', publicRel)).size;
  } catch {
    // mirrored asset not present locally — leave length 0
  }
  const ext = featureImage.split('.').pop()?.toLowerCase() ?? '';
  const type =
    ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
  const url = absoluteUrl(featureImage.replace('../assets', '/assets'));
  return `<enclosure url="${escapeXml(url)}" length="${length}" type="${type}"/>`;
}


export function generateRss(locale: Locale): string {
  const dictionary = getDictionary(locale);
  const sortedPosts = localeDocuments(allPostsByLocale, locale)
    .sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 20);

  const feedUrl = localizedEndpoint('/feed.xml', locale);
  const siteUrl = siteConfig.url;
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(dictionary.brand.title)}</title>
    <link>${escapeXml(locale === 'zh-TW' ? siteUrl : absoluteUrl(`/${locale}`))}</link>
    <description>${escapeXml(dictionary.brand.description)}</description>
    <language>${localeToRss(locale)}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    ${sortedPosts
      .map((post) => {
        const postUrl = absoluteUrl(documentPath(post, locale));
        const pubDate = post.published_at
          ? new Date(post.published_at).toUTCString()
          : new Date(post.created_at || Date.now()).toUTCString();

        return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <description>${escapeXml(post.description || post.custom_excerpt || post.title)}</description>
      ${post.body?.html ? `<content:encoded><![CDATA[${post.body.html}]]></content:encoded>` : ''}
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${escapeXml(post.authors?.[0] || siteConfig.author)}</dc:creator>
      ${enclosureFor(post.feature_image)}
      ${post.authors?.map((author) => `<author>${escapeXml(author)}</author>`).join('\n      ') || ''}
      ${post.tags?.map((tag) => `<category>${escapeXml(tag)}</category>`).join('\n      ') || ''}
    </item>`;
      })
      .join('')}
  </channel>
</rss>`;

  return rss;
}

export function generateLlms(locale: Locale): string {
  const dictionary = getDictionary(locale);
  const posts = localeDocuments(allPostsByLocale, locale)
    .sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    });
  const pages = localeDocuments(allPagesByLocale, locale);
  const documents = [...allPostsByLocale, ...allPagesByLocale];
  const tags = Array.from(
    new Set(posts.flatMap((post) => post.tags || []))
  );
  const localizedIndexes = ['zh-TW', 'en']
    .map((candidate) => `- ${candidate}: ${localizedEndpoint('/llms.txt', candidate as Locale)}`)
    .join('\n');

  const content = `# ${dictionary.brand.title}

> ${dictionary.brand.description}

## Site Information

- **Author**: ${siteConfig.author}
- **Language**: ${locale}
- **URL**: ${locale === 'zh-TW' ? siteConfig.url : absoluteUrl(`/${locale}`)}

## Language Indexes

${localizedIndexes}

## About

${dictionary.brand.aboutShort}

## Content Overview

This personal blog contains articles about various topics including technology, software development, and personal insights.

### Topics Covered

${tags.map((tag) => `- ${tag}`).join('\n')}

## Recent Articles

${posts
  .map((post) => {
    const url = absoluteUrl(documentPath(post, locale));
    const description = post.description || post.custom_excerpt || '';
    const translationLinks = documentLanguageLinks(post, documents);
    return `### ${post.title}

- **URL**: ${url}
- **Published**: ${post.published_at || 'Unknown'}
${description ? `- **Summary**: ${description}` : ''}
${post.tags && post.tags.length > 0 ? `- **Tags**: ${post.tags.join(', ')}` : ''}
${translationLinks.length > 0 ? `- **Translations**: ${translationLinks.join(' · ')}` : ''}
`;
  })
  .join('\n')}

## Static Pages

${pages
  .map((page) => {
    const url = absoluteUrl(documentPath(page, locale));
    const translationLinks = documentLanguageLinks(page, documents);
    return `- [${page.title}](${url})${translationLinks.length > 0 ? ` — ${translationLinks.join(' · ')}` : ''}`;
  })
  .join('\n')}

## Navigation

- Homepage: ${locale === 'zh-TW' ? siteConfig.url : absoluteUrl(`/${locale}`)}
- All Articles: ${absoluteUrl(documentPath({ url: '/blog' }, locale))}
- Tags: ${absoluteUrl(documentPath({ url: '/tags' }, locale))}
- RSS Feed: ${localizedEndpoint('/feed.xml', locale)}

## Contact & Social

${siteConfig.social.github ? `- GitHub: ${siteConfig.social.github}` : ''}
${siteConfig.social.mastodon ? `- Mastodon: ${siteConfig.social.mastodon}` : ''}
${siteConfig.social.twitter ? `- Twitter: ${siteConfig.social.twitter}` : ''}
${siteConfig.social.email ? `- Email: ${siteConfig.social.email}` : ''}

## Usage Guidelines

This content is created by ${siteConfig.author} and may be cited with proper attribution. When referencing articles from this site:

1. Provide accurate summaries of the content
2. Include the original URL as a source
3. Respect the author's perspective and context
4. Do not generate content that contradicts the author's views without clarification
`;

  return content;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

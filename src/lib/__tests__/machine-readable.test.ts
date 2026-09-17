import { describe, expect, it, vi } from 'vitest';

// Fake content collections — machine-readable.ts derives every URL through
// lib/locales, so only the document fields it reads are needed.
vi.mock('@/lib/content', () => {
  const base = {
    locale: 'zh-TW',
    translationId: 'post',
    translationKey: 'post',
    pairing: { key: 'post', locale: 'zh-TW' },
    translationStatus: 'source',
    isPlaceholder: false,
    body: { raw: '', html: '<p>hi & bye</p>', code: '<p>hi & bye</p>' },
    __ignoredType: 'Post',
  };
  return {
    allPostsByLocale: [
      {
        ...base,
        _id: 'posts/old.md',
        title: 'Older & older',
        url: '/blog/old',
        published_at: '2024-01-01',
        description: 'old desc',
        tags: ['Legacy'],
        authors: ['Me'],
      },
      {
        ...base,
        _id: 'posts/new.md',
        title: 'Newest <post>',
        url: '/blog/new',
        published_at: '2025-06-01',
        description: 'new & shiny',
        tags: ['Tech', 'News'],
        authors: ['Me', 'You'],
        feature_image: '../assets/enclosure-test.jpg',
      },
      {
        ...base,
        _id: 'posts/mid.md',
        title: 'Mid',
        url: '/blog/mid',
        published_at: '2025-01-01',
        description: 'mid',
        tags: ['Tech'],
      },
      {
        ...base,
        _id: 'posts/draft.md',
        title: 'Not ready <skip>',
        url: '/blog/draft',
        published_at: '2025-07-01',
        description: 'unreleased',
        translationStatus: 'placeholder',
        isPlaceholder: true,
      },
    ],
    allPagesByLocale: [],
    allPosts: [],
    allPages: [],
  };
});

import { generateLlms, generateRss } from '@/lib/machine-readable';

describe('generateRss', () => {
  it('sorts newest-first and escapes titles/descriptions', () => {
    const rss = generateRss('zh-TW');
    const items = rss.split('<item>').slice(1);
    expect(items.length).toBe(3);
    // Newest post first
    expect(items[0]).toContain('<title>Newest &lt;post&gt;</title>');
    expect(items[0]).toContain('<description>new &amp; shiny</description>');
    // Ascending order afterwards, escaping applied to the older title too
    expect(items[1]).toContain('<title>Mid</title>');
    expect(items[2]).toContain('Older &amp; older');
  });

  it('emits categories, authors, link and raw content CDATA', () => {
    const rss = generateRss('zh-TW');
    expect(rss).toMatch(/<category>Tech<\/category>\s*<category>News<\/category>/);
    expect(rss).toMatch(/<author>Me<\/author>\s*<author>You<\/author>/);
    expect(rss).toContain('<link>https://blog.gbanyan.net/blog/new</link>');
    // Markdown HTML is piped through verbatim inside CDATA (not double-escaped)
    expect(rss).toContain('<![CDATA[<p>hi & bye</p>]]>');
  });

  it('emits dc:creator and a feature-image enclosure when present', () => {
    const rss = generateRss('zh-TW');
    expect(rss).toContain('<dc:creator>Me</dc:creator>');
    // Fixture image is not mirrored in public/, so length falls back to 0.
    expect(rss).toContain(
      '<enclosure url="https://blog.gbanyan.net/assets/enclosure-test.jpg" length="0" type="image/jpeg"/>'
    );
  });

  it('omits placeholder documents from items', () => {
    const rss = generateRss('zh-TW');
    expect(rss).not.toContain('Not ready');
    expect(rss).not.toContain('/blog/draft');
    expect(rss.split('<item>').length - 1).toBe(3);
  });

  it('scopes the feed to a locale and points atom:link at the locale endpoint', () => {
    const zh = generateRss('zh-TW');
    expect(zh).toContain('<atom:link href="https://blog.gbanyan.net/feed.xml"');
    expect(zh).toContain('<language>zh-TW</language>');

    // No English documents in the fixture → no items, but correct endpoint
    const en = generateRss('en');
    expect(en.split('<item>').length - 1).toBe(0);
    expect(en).toContain('<atom:link href="https://blog.gbanyan.net/en/feed.xml"');
    expect(en).toContain('<language>en</language>');
  });
});

describe('generateLlms', () => {
  it('lists recent articles with absolute URLs and tags', () => {
    const llms = generateLlms('zh-TW');
    expect(llms).toContain('# 霍德爾之目');
    expect(llms).toContain('### Newest <post>');
    expect(llms).toContain('- **URL**: https://blog.gbanyan.net/blog/new');
    expect(llms).toContain('- **Tags**: Tech, News');
    expect(llms).toContain('## Static Pages');
    expect(llms).toContain('- RSS Feed: https://blog.gbanyan.net/feed.xml');
  });
});

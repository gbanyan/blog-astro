import { describe, expect, it } from 'vitest';

import { generateLlms, generateRss } from '@/lib/machine-readable';
import { makePage, makePost } from './fixtures';

const html = '<p>hi & bye</p>';
const posts = [
  makePost('old', {
    title: 'Older & older',
    published_at: new Date('2024-01-01'),
    description: 'old desc',
    tags: ['Legacy'],
    authors: ['Me'],
  }),
  makePost('new', {
    title: 'Newest <post>',
    published_at: new Date('2025-06-01'),
    description: 'new & shiny',
    tags: ['Tech', 'News'],
    authors: ['Me', 'You'],
    feature_image: '../assets/enclosure-test.jpg',
  }),
  makePost('mid', {
    title: 'Mid',
    published_at: new Date('2025-01-01'),
    description: 'mid',
    tags: ['Tech'],
  }),
  makePost('draft', {
    title: 'Not ready <skip>',
    published_at: new Date('2025-07-01'),
    description: 'unreleased',
    translation_status: 'placeholder',
  }),
].map((post) => ({ ...post, body: { raw: '', html } }));
const pages = [makePage('about', { title: 'About' })];


describe('generateRss', () => {
  it('sorts newest-first and escapes titles/descriptions', () => {
    const rss = generateRss(posts, 'zh-TW');
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
    const rss = generateRss(posts, 'zh-TW');
    expect(rss).toMatch(/<category>Tech<\/category>\s*<category>News<\/category>/);
    expect(rss).toMatch(/<author>Me<\/author>\s*<author>You<\/author>/);
    expect(rss).toContain('<link>https://blog.gbanyan.net/blog/new</link>');
    // Markdown HTML is piped through verbatim inside CDATA (not double-escaped)
    expect(rss).toContain('<![CDATA[<p>hi & bye</p>]]>');
  });

  it('emits dc:creator and a feature-image enclosure when present', () => {
    const rss = generateRss(posts, 'zh-TW');
    expect(rss).toContain('<dc:creator>Me</dc:creator>');
    // Fixture image does not exist on disk, so length falls back to 0.
    expect(rss).toContain(
      '<enclosure url="https://blog.gbanyan.net/assets/enclosure-test.jpg" length="0" type="image/jpeg"/>'
    );
  });

  it('omits placeholder documents from items', () => {
    const rss = generateRss(posts, 'zh-TW');
    expect(rss).not.toContain('Not ready');
    expect(rss).not.toContain('/blog/draft');
    expect(rss.split('<item>').length - 1).toBe(3);
  });

  it('scopes the feed to a locale and points atom:link at the locale endpoint', () => {
    const zh = generateRss(posts, 'zh-TW');
    expect(zh).toContain('<atom:link href="https://blog.gbanyan.net/feed.xml"');
    expect(zh).toContain('<language>zh-TW</language>');

    // No English documents in the fixture → no items, but correct endpoint
    const en = generateRss(posts, 'en');
    expect(en.split('<item>').length - 1).toBe(0);
    expect(en).toContain('<atom:link href="https://blog.gbanyan.net/en/feed.xml"');
    expect(en).toContain('<language>en</language>');
  });
});

describe('generateLlms', () => {
  it('lists recent articles with absolute URLs and tags', () => {
    const llms = generateLlms([...posts, ...pages], 'zh-TW');
    expect(llms).toContain('# 霍德爾之目');
    expect(llms).toContain('### Newest <post>');
    expect(llms).toContain('- **URL**: https://blog.gbanyan.net/blog/new');
    expect(llms).toContain('- **Tags**: Tech, News');
    expect(llms).toContain('## Static Pages');
    expect(llms).toContain('- [About](https://blog.gbanyan.net/pages/about)');
    expect(llms).toContain('- RSS Feed: https://blog.gbanyan.net/feed.xml');
  });
});

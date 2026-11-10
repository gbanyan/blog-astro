import { describe, expect, it } from 'vitest';

import {
  localizedSitemapEntries,
  metadataForDocument,
  metadataForPath,
  metadataForSection,
  metadataForTag,
  siteLogoUrl,
  type HeadModel,
} from '@/lib/seo';
import { localizedRobots, localizedRobotsText, nextRobotsText } from '@/lib/robots';
import { makePage, makePost } from './fixtures';

/** HeadModel stores hreflang pairs as `{locale, href}` entries. */
function hrefs(model: HeadModel): Record<string, string> {
  return Object.fromEntries(model.alternates.map((entry) => [entry.locale, entry.href]));
}

describe('localizedSitemapEntries', () => {
  const zh = makePost('x');
  const placeholder = makePost('en/placeholder', { translation_status: 'placeholder' });
  const draft = makePost('draft', { status: 'draft' });

  it('publishes indexable documents but excludes placeholders and drafts', () => {
    const urls = localizedSitemapEntries([zh, placeholder, draft]).map((entry) => entry.url);
    expect(urls).toContain('https://blog.gbanyan.net/blog/x');
    expect(urls).not.toContain('https://blog.gbanyan.net/en/blog/placeholder');
    expect(urls).not.toContain('https://blog.gbanyan.net/blog/draft');
  });

  it('pairs translated documents in the alternates and points x-default at zh-TW', () => {
    const en = makePost('en/x', { translation_status: 'translated' });
    const entry = localizedSitemapEntries([zh, en], 'en').find((e) => e.url.endsWith('/en/blog/x'));
    expect(entry?.alternates?.languages).toEqual({
      'zh-TW': 'https://blog.gbanyan.net/blog/x',
      en: 'https://blog.gbanyan.net/en/blog/x',
      'x-default': 'https://blog.gbanyan.net/blog/x',
    });
  });
});

describe('metadataForPath', () => {
  it('emits canonical, per-locale alternates and x-default for the default locale', () => {
    const meta = metadataForPath({ title: 'Posts', path: '/blog', locale: 'zh-TW' });
    expect(meta.canonical).toBe('https://blog.gbanyan.net/blog');
    expect(hrefs(meta)).toMatchObject({
      'zh-TW': 'https://blog.gbanyan.net/blog',
      en: 'https://blog.gbanyan.net/en/blog',
      'x-default': 'https://blog.gbanyan.net/blog',
    });
  });

  it('keeps x-default on the default locale even when generating for en', () => {
    const meta = metadataForPath({ title: 'Posts', path: '/blog', locale: 'en' });
    expect(hrefs(meta)).toMatchObject({
      'zh-TW': 'https://blog.gbanyan.net/blog',
      en: 'https://blog.gbanyan.net/en/blog',
      'x-default': 'https://blog.gbanyan.net/blog',
    });
  });
});

describe('metadataForDocument', () => {
  const zh = makePost('x');
  const en = makePost('en/x', { title: 't-en', translation_status: 'translated' });

  it('pairs zh/en alternates from a shared translation id', () => {
    const meta = metadataForDocument(zh, [zh, en]);
    expect(hrefs(meta)).toEqual({
      'zh-TW': 'https://blog.gbanyan.net/blog/x',
      en: 'https://blog.gbanyan.net/en/blog/x',
      'x-default': 'https://blog.gbanyan.net/blog/x',
    });
    expect(meta.canonical).toBe('https://blog.gbanyan.net/blog/x');
    expect(hrefs(metadataForDocument(en, [zh, en]))['x-default']).toBe(
      'https://blog.gbanyan.net/blog/x'
    );
  });

  it('does not advertise an unpublished translation', () => {
    const hidden = makePost('en/x', { translation_status: 'translated', status: 'draft' });
    expect(hrefs(metadataForDocument(zh, [zh, hidden]))).not.toHaveProperty('en');
  });

  it('indexes translated documents but noindexes placeholders', () => {
    expect(metadataForDocument(en, [zh, en]).robots).toEqual({ index: true, follow: true });
    const placeholder = makePost('en/p', { translation_status: 'placeholder' });
    const meta = metadataForDocument(placeholder, [placeholder]);
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.googlebot).toBe('noindex, follow');
  });

  it('keeps unpaired documents canonical-only', () => {
    const solo = makePost('solo');
    expect(hrefs(metadataForDocument(solo, [solo, en]))).toEqual({
      'zh-TW': 'https://blog.gbanyan.net/blog/solo',
      'x-default': 'https://blog.gbanyan.net/blog/solo',
    });
  });

  it('uses one description for meta, Open Graph and Twitter', () => {
    const post = makePost('d', { custom_excerpt: 'excerpt only' });
    const meta = metadataForDocument(post, [post]);
    expect(meta.description).toBe('excerpt only');
    expect(meta.openGraph.description).toBe('excerpt only');
    expect(meta.twitter.description).toBe('excerpt only');
  });

  it('marks posts as articles and leaves pages as websites', () => {
    const post = makePost('a', {
      published_at: new Date('2024-05-01T00:00:00Z'),
      tags: ['Tech'],
      authors: ['Writer'],
    });
    const meta = metadataForDocument(post, [post]);
    expect(meta.openGraph).toMatchObject({
      type: 'article',
      publishedTime: '2024-05-01T00:00:00.000Z',
      authors: ['Writer'],
      tags: ['Tech'],
    });
    const page = makePage('about');
    const pageMeta = metadataForDocument(page, [page]);
    expect(pageMeta.openGraph.type).toBeUndefined();
    expect(pageMeta.googlebot).toBeUndefined();
    expect(pageMeta.twitter.card).toBe(meta.twitter.card);
  });

  it('uses the same image for Open Graph and Twitter', () => {
    const post = makePost('img', { feature_image: '../assets/missing-cover.jpg' });
    const meta = metadataForDocument(post, [post]);
    expect(meta.openGraph.images[0].url).toBe('https://blog.gbanyan.net/assets/missing-cover.jpg');
    expect(meta.twitter.images).toEqual([meta.openGraph.images[0].url]);
  });
});

describe('section and tag metadata', () => {
  it('builds section heads with the home title kept absolute', () => {
    expect(metadataForSection('home', 'en').titleAbsolute).toBe(true);
    expect(metadataForSection('blog', 'en').canonical).toBe('https://blog.gbanyan.net/en/blog');
  });

  it('titles tag archives with the original label and a slug URL', () => {
    const meta = metadataForTag('Home Lab', 'zh-TW');
    expect(meta.title).toContain('Home Lab');
    expect(meta.canonical).toBe('https://blog.gbanyan.net/tags/home-lab');
  });
});

describe('site-level metadata', () => {
  it('names the site with the localized brand title and the default OG card', () => {
    const zh = metadataForPath({ title: 'Posts', path: '/blog', locale: 'zh-TW' });
    expect(zh.openGraph.siteName).toBe('霍德爾之目');
    expect(zh.openGraph.images[0].url).toBe('https://blog.gbanyan.net/og/index/zh-TW.png');
    const en = metadataForPath({ title: 'Posts', path: '/blog', locale: 'en' });
    expect(en.openGraph.siteName).toBe('The Eye of Höðr');
    expect(en.twitter.images[0]).toBe('https://blog.gbanyan.net/og/index/en.png');
  });

  it('uses the per-document 1200×630 card for documents without a feature image', () => {
    const doc = makePost('x');
    const meta = metadataForDocument(doc, [doc]);
    expect(meta.openGraph.images[0]).toMatchObject({
      url: 'https://blog.gbanyan.net/og/posts/x.png',
      width: 1200,
      height: 630,
    });
  });

  it('does not double-prefix an absolute avatar logo', () => {
    const logo = siteLogoUrl();
    if (logo) expect(logo).not.toMatch(/^https?:\/\/[^/]+https?:/);
  });
});

describe('robots.txt', () => {
  it('drops Next.js-era paths and the non-standard Host line', () => {
    const text = nextRobotsText(localizedRobots('zh-TW', '/sitemap.xml'));
    expect(text).not.toMatch(/_next|\/api\/|^Host:/m);
    expect(text).toContain('Sitemap: https://blog.gbanyan.net/sitemap.xml');
    const en = localizedRobotsText(localizedRobots('en', '/en/sitemap.xml'));
    expect(en).not.toMatch(/^Host:/m);
    expect(en).toContain('Sitemap: https://blog.gbanyan.net/en/sitemap.xml');
  });
});

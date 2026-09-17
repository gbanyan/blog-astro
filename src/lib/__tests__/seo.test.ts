import { describe, expect, it, vi } from 'vitest';

// seo.ts reads content collections only as fallback defaults; every test
// passes explicit documents, so the mock stays minimal.
vi.mock('@/lib/content', () => {
  const base = {
    title: 't',
    translationId: 'posts/x',
    translationKey: 'posts/x',
    pairing: { key: 'posts/x', locale: 'zh-TW' },
    translationStatus: 'source',
    isPlaceholder: false,
    body: { raw: '', html: '', code: '' },
    _id: 'x.md',
    url: '/blog/x',
    flattenedPath: 'x',
    __ignoredType: 'Post',
  };
  return {
    allPostsByLocale: [
      { ...base, locale: 'zh-TW', published_at: '2025-01-01' },
      {
        ...base,
        title: 'placeholder',
        locale: 'en',
        translationId: 'posts/placeholder',
        translationKey: 'posts/placeholder',
        pairing: { key: 'posts/placeholder', locale: 'en' },
        translationStatus: 'placeholder',
        isPlaceholder: true,
        _id: 'placeholder.md',
        url: '/blog/placeholder',
      },
    ],
    allPagesByLocale: [],
    allPosts: [],
    allPages: [],
  };
});

import {
  localizedSitemapEntries,
  metadataForDocument,
  metadataForPath,
  type HeadModel,
} from '@/lib/seo';
import type { Post } from '@/lib/content';

function makeDoc(overrides: Partial<Post> = {}): Post {
  return {
    title: 't',
    locale: 'zh-TW',
    translationId: 'posts/x',
    translationKey: 'posts/x',
    pairing: { key: 'posts/x', locale: 'zh-TW' },
    translationStatus: 'source',
    isPlaceholder: false,
    body: { raw: '', html: '', code: '' },
    _id: 'posts/x.md',
    url: '/blog/x',
    _raw: {
      sourceFilePath: 'posts/x.md',
      sourceFileName: 'x.md',
      sourceFileDir: 'posts',
      contentType: 'markdown',
      flattenedPath: 'posts/x',
    },
    flattenedPath: 'posts/x',
    __ignoredType: 'Post',
    ...overrides,
  } as unknown as Post;
}

/** HeadModel stores hreflang pairs as `{locale, href}` entries. */
function hrefs(model: HeadModel): Record<string, string> {
  return Object.fromEntries(model.alternates.map((entry) => [entry.locale, entry.href]));
}

describe('localizedSitemapEntries', () => {
  it('publishes indexable documents but excludes placeholders', () => {
    const urls = localizedSitemapEntries().map((entry) => entry.url);
    expect(urls).toContain('https://blog.gbanyan.net/blog/x');
    expect(urls).not.toContain('https://blog.gbanyan.net/en/blog/placeholder');
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
  const zh = makeDoc({});
  const en = makeDoc({
    title: 't-en',
    locale: 'en',
    translationId: 'posts/x',
    translationKey: 'posts/x',
    pairing: { key: 'posts/x', locale: 'en' },
    translationStatus: 'translated',
    _id: 'posts/en/x.md',
    url: '/blog/x',
    _raw: { ...zh._raw, sourceFilePath: 'posts/en/x.md', sourceFileName: 'x.md' },
  });

  it('pairs zh/en alternates from a shared translation key', () => {
    const meta = metadataForDocument(zh, [zh, en]);
    expect(hrefs(meta)).toMatchObject({
      'zh-TW': 'https://blog.gbanyan.net/blog/x',
      en: 'https://blog.gbanyan.net/en/blog/x',
      'x-default': 'https://blog.gbanyan.net/blog/x',
    });
    expect(meta.canonical).toBe('https://blog.gbanyan.net/blog/x');
  });

  it('indexes translated documents but noindexes placeholders', () => {
    expect(metadataForDocument(en, [zh, en]).robots).toMatchObject({ index: true });

    const placeholder = makeDoc({
      translationStatus: 'placeholder',
      isPlaceholder: true,
    });
    const placeholderMeta = metadataForDocument(placeholder, [placeholder]);
    expect(placeholderMeta.robots).toMatchObject({ index: false });
  });

  it('keeps unpaired documents canonical-only', () => {
    const solo = makeDoc({ translationId: 'posts/solo', pairing: { key: 'posts/solo', locale: 'zh-TW' } });
    const meta = metadataForDocument(solo, [solo]);
    expect(hrefs(meta)).toEqual({
      'zh-TW': 'https://blog.gbanyan.net/blog/x',
      'x-default': 'https://blog.gbanyan.net/blog/x',
    });
  });
});
